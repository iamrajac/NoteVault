const bcrypt = require('bcrypt');
const prisma = require('../utils/db');
const config = require('../config');
const { signAccessToken } = require('../middleware/auth');
const { sendEmail, escapeHtml } = require('../utils/mailer');
const { generateToken, hashToken } = require('../utils/tokens');
const { requireWorkspaceMember } = require('../utils/access');
const { badRequest, conflict, forbidden, unauthorized } = require('../utils/errors');
const { notify } = require('../utils/notify');

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const ROLE_RANK = { Employee: 0, 'Team Lead': 1, Admin: 2 };

// Used when an email isn't registered, so login takes the same time either way.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

// The user object the frontend stores after login. Never includes the password hash.
async function sessionUser(userId, preferredRole) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      workspaces: { include: { workspace: true }, orderBy: { workspace: { createdAt: 'asc' } } },
    },
  });
  const active =
    (preferredRole && user.workspaces.find((w) => w.role === preferredRole)) || user.workspaces[0] || null;
  return { ...user, activeWorkspaceId: active?.workspaceId ?? null, role: active?.role ?? null };
}

exports.register = async (req, res) => {
  const { email, password, name } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw conflict('An account with this email already exists.');

  const user = await prisma.user.create({
    data: {
      email,
      password: await bcrypt.hash(password, BCRYPT_ROUNDS),
      name: name || email.split('@')[0],
      // The person who creates a workspace is its Admin.
      workspaces: {
        create: {
          role: 'Admin',
          workspace: { create: { name: `${name || email.split('@')[0]}'s Workspace`, colorTheme: 'blue' } },
        },
      },
    },
  });

  res.status(201).json({ token: signAccessToken(user.id), user: await sessionUser(user.id) });
};

exports.login = async (req, res) => {
  const { email, password, role } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
  if (!user || !valid) throw unauthorized('Invalid email or password');

  // The role only chooses which workspace opens first; it never blocks login. Permissions are
  // checked per workspace on every request, and people without any workspace must still be able
  // to log in (e.g. to accept an invitation).
  res.json({ token: signAccessToken(user.id), user: await sessionUser(user.id, role) });
};

exports.me = async (req, res) => {
  res.json({ user: await sessionUser(req.user.id) });
};

exports.updateProfile = async (req, res) => {
  await prisma.user.update({ where: { id: req.user.id }, data: { name: req.body.name } });
  res.json({ user: await sessionUser(req.user.id) });
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const genericResponse = { message: 'If an account exists for this email, a password reset link has been sent.' };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.json(genericResponse);

  // Only the newest link works. The current password keeps working until the link is used.
  const token = generateToken();
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
    }),
  ]);

  const link = `${config.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: user.email,
    subject: 'Reset your NoteVault password',
    text: `Someone asked to reset the password for your NoteVault account.\n\nOpen this link within 1 hour to choose a new password:\n${link}\n\nIf this wasn't you, ignore this email. Your password has not changed.`,
    html: `<h3>Reset your NoteVault password</h3><p>Open this link within 1 hour to choose a new password:</p><p><a href="${escapeHtml(link)}">Reset password</a></p><p>If this wasn't you, ignore this email. Your password has not changed.</p>`,
  });

  res.json(genericResponse);
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;

  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw badRequest('This reset link is invalid or has expired. Request a new one.');
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password: await bcrypt.hash(password, BCRYPT_ROUNDS) } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  res.json({ message: 'Your password has been reset. You can now log in.' });
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!(await bcrypt.compare(currentPassword, user.password))) throw badRequest('Current password is incorrect');

  await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) } });
  res.json({ message: 'Password updated successfully' });
};

// ---- Invitations ----

async function createInvitation({ workspaceId, projectId = null, email = null, role = 'Employee', invitedById }) {
  const token = generateToken();
  await prisma.invitation.create({
    data: {
      tokenHash: hashToken(token),
      workspaceId,
      projectId,
      email,
      role,
      invitedById,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });
  return { token, link: `${config.frontendUrl}/invite?token=${encodeURIComponent(token)}` };
}
exports.createInvitation = createInvitation;

async function sendInviteEmail({ to, link, inviterName, workspaceName, projectName }) {
  const target = projectName ? `the project "${projectName}" in ${workspaceName}` : `the workspace "${workspaceName}"`;
  return sendEmail({
    to,
    subject: `${inviterName} invited you to NoteVault`,
    text: `${inviterName} invited you to join ${target} on NoteVault.\n\nAccept the invitation (valid for 7 days):\n${link}`,
    html: `<h3>You're invited!</h3><p>${escapeHtml(inviterName)} invited you to join ${escapeHtml(target)} on NoteVault.</p><p><a href="${escapeHtml(link)}" style="padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px">Accept invitation</a></p><p>This link is valid for 7 days. If the button doesn't work, paste this into your browser:<br>${escapeHtml(link)}</p>`,
  });
}
exports.sendInviteEmail = sendInviteEmail;

// Admins invite someone to their workspace with a given role.
exports.inviteUser = async (req, res) => {
  const { workspaceId, email, role } = req.body;
  await requireWorkspaceMember(req.user.id, workspaceId, ['Admin']);

  const existingMember = await prisma.workspaceMember.findFirst({ where: { workspaceId, user: { email } } });
  if (existingMember) throw conflict('That person is already a member of this workspace.');

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  const { link } = await createInvitation({ workspaceId, email, role, invitedById: req.user.id });
  const sent = await sendInviteEmail({ to: email, link, inviterName: req.user.name || req.user.email, workspaceName: workspace.name });

  res.status(201).json({ message: sent ? `Invitation sent to ${email}.` : 'Invitation created, but the email could not be sent.', link, emailSent: sent });
};

async function findUsableInvitation(token) {
  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { workspace: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } },
  });
  if (!invitation || invitation.expiresAt < new Date() || (invitation.email && invitation.acceptedAt)) {
    throw badRequest('This invitation is invalid or has expired. Ask for a new one.');
  }
  return invitation;
}

// Public: lets the invite page show what the invitation is for.
exports.getInvitation = async (req, res) => {
  const invitation = await findUsableInvitation(req.params.token);
  res.json({
    workspaceName: invitation.workspace.name,
    projectName: invitation.project?.name ?? null,
    email: invitation.email,
    role: invitation.role,
  });
};

// Adds the user to the invitation's workspace (and project). Never lowers an existing role.
async function applyInvitation(tx, invitation, userId) {
  const existing = await tx.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId: invitation.workspaceId } },
  });
  if (!existing) {
    await tx.workspaceMember.create({ data: { userId, workspaceId: invitation.workspaceId, role: invitation.role } });
  } else if (ROLE_RANK[invitation.role] > ROLE_RANK[existing.role]) {
    await tx.workspaceMember.update({ where: { id: existing.id }, data: { role: invitation.role } });
  }
  if (invitation.projectId) {
    await tx.projectMember.upsert({
      where: { projectId_userId: { projectId: invitation.projectId, userId } },
      create: { projectId: invitation.projectId, userId },
      update: {},
    });
  }
  if (invitation.email) {
    await tx.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
  }
}

exports.registerWithInvite = async (req, res) => {
  const { token, email, password, name } = req.body;
  const invitation = await findUsableInvitation(token);

  if (invitation.email && invitation.email !== email) {
    throw badRequest(`This invitation was sent to ${invitation.email}. Register with that address.`);
  }
  if (await prisma.user.findUnique({ where: { email } })) {
    throw conflict('An account with this email already exists. Log in, then open the invitation link again to accept it.');
  }

  const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { email, password: hashed, name: name || email.split('@')[0] } });
    await applyInvitation(tx, invitation, created.id);
    return created;
  });

  await notify([invitation.invitedById], {
    workspaceId: invitation.workspaceId,
    title: 'Invitation accepted',
    message: `${user.name} joined ${invitation.project?.name ?? invitation.workspace.name}.`,
    link: '/team',
  });

  res.status(201).json({ token: signAccessToken(user.id), user: await sessionUser(user.id) });
};

// A logged-in user accepting an invitation.
exports.acceptInvite = async (req, res) => {
  const invitation = await findUsableInvitation(req.body.token);
  if (invitation.email && invitation.email !== req.user.email) {
    throw forbidden(`This invitation was sent to ${invitation.email}, but you are logged in as ${req.user.email}.`);
  }

  await prisma.$transaction((tx) => applyInvitation(tx, invitation, req.user.id));
  await notify([invitation.invitedById], {
    workspaceId: invitation.workspaceId,
    title: 'Invitation accepted',
    message: `${req.user.name || req.user.email} joined ${invitation.project?.name ?? invitation.workspace.name}.`,
    link: '/team',
    excludeUserId: req.user.id,
  });

  res.json({ user: await sessionUser(req.user.id), workspaceId: invitation.workspaceId });
};

exports.sessionUser = sessionUser;
