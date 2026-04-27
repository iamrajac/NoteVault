const prisma = require('../utils/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendEmail } = require('../utils/mailer');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

exports.register = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const allowedRoles = ['Admin', 'Team Lead', 'Employee'];
    const userRole = allowedRoles.includes(role) ? role : 'Employee'; // Default to Employee

    // Create user and a default personal workspace
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        workspaces: {
          create: {
            role: userRole,
            workspace: {
              create: {
                name: `${name || email}'s Workspace`,
                colorTheme: 'blue'
              }
            }
          }
        }
      },
      include: {
        workspaces: {
          include: { workspace: true }
        }
      }
    });

    // Optionally set their chosen role in the new workspace if they chose Team Lead/Employee? 
    // Usually, creating a workspace makes you the Admin. We'll leave it as Admin for now.

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        workspaces: user.workspaces,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Admins creating users and immediately associating them with the workspace
exports.inviteUser = async (req, res) => {
  try {
    const { adminUserId, adminRole, workspaceId, newEmail, newPassword, newName, newRole } = req.body;

    // RBAC: Only Admins can create new logins
    if (adminRole !== 'Admin') {
      return res.status(403).json({ error: 'Only Admins can invite new users to NoteVault.' });
    }

    if (!workspaceId || !newEmail || !newPassword || !newRole) {
      return res.status(400).json({ error: 'Missing req fields (newEmail, newPassword, newRole, workspaceId)' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Create NoteVault user
    const newUser = await prisma.user.create({
      data: {
        email: newEmail,
        password: hashedPassword,
        name: newName,
        workspaces: {
          create: {
            workspaceId: workspaceId,
            role: newRole // Assign them Admin, Team Lead, or Employee role specifically in this workspace
          }
        }
      }
    });

    await sendEmail({
      to: newEmail,
      subject: "You've been invited to a NoteVault Workspace!",
      text: `Hello ${newName || ''},\n\nYou have been invited to join a NoteVault Workspace. Your temporary login password is: ${newPassword}\n\nPlease log in and change your password as soon as possible.`,
      html: `<h3>Welcome to NoteVault!</h3><p>You have been invited to join a workspace.</p><p>Your temporary login password is: <strong>${newPassword}</strong></p><p>Please log in and update your password immediately.</p>`
    });

    res.status(201).json({ message: 'User created and invited successfully', invitedUserId: newUser.id });
  } catch (error) {
    console.error('Invite Admin Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const allowedRoles = ['Admin', 'Team Lead', 'Employee'];
    if (!role || !allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'A valid role (Admin, Team Lead, Employee) is required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        workspaces: {
          include: { workspace: true }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Validate that the user has the requested role in at least one workspace
    const userRoles = user.workspaces.map(ws => ws.role);
    if (!userRoles.includes(role)) {
      return res.status(403).json({
        error: `You do not have ${role} access in any workspace. Your available roles are: ${userRoles.join(', ')}`
      });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        workspaces: user.workspaces,
        role: role // Use the validated role
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // To avoid leaking which emails exist, respond with success either way
    if (!user) {
      return res.json({ message: 'If an account exists for this email, a reset instruction has been generated.' });
    }

    const tempPassword = crypto.randomBytes(4).toString('hex'); // 8-char temp password
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });

    await sendEmail({
      to: email,
      subject: "NoteVault Password Reset",
      text: `Hello,\n\nYour temporary password is: ${tempPassword}\n\nPlease log in and change your password immediately.`,
      html: `<h3>NoteVault Password Reset</h3><p>Your temporary password is: <strong>${tempPassword}</strong></p><p>Please log in and change your password immediately.</p>`
    });

    return res.json({
      message: 'A temporary password has been sent to your email. Please login and secure your account.',
    });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.registerWithInvite = async (req, res) => {
  try {
    const { token, email, password, name } = req.body;
    
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid or expired invite token' });
    }

    const { projectId, workspaceId } = decoded;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use. Log in directly instead.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 1. Create User & associate with Workspace as 'Employee'
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        workspaces: {
          create: {
            workspaceId: workspaceId,
            role: 'Employee' // Invites default to Employee Role, making them only capable of updating tasks
          }
        }
      }
    });

    // 2. Add them explicitly to the Project
    await prisma.projectMember.create({
        data: {
            projectId,
            userId: newUser.id
        }
    });

    const authToken = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ 
      message: 'Joined NoteVault workspace and project successfully', 
      token: authToken, 
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: 'Employee',
        workspaces: [{ workspaceId, role: 'Employee' }]
      }
    });
  } catch (error) {
    console.error('Invite Register Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;
    
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Incorrect current password' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change Pass Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
