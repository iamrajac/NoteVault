const { z } = require('zod');

const id = z.string().trim().min(1).max(64);
const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address').max(191));
const password = z.string().min(8, 'Password must be at least 8 characters').max(128);
const name = z.string().trim().min(1).max(100);
const optionalText = (max) => z.string().trim().max(max).optional().nullable();
const optionalDate = z
  .union([z.string().trim(), z.null()])
  .optional()
  .transform((v, ctx) => {
    if (v === undefined) return undefined;
    if (v === null || v === '') return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: 'custom', message: 'Invalid date' });
      return z.NEVER;
    }
    return d;
  });

const ROLE = z.enum(['Admin', 'Team Lead', 'Employee']);
const TASK_STATUS = z.enum(['To Do', 'In Progress', 'Done']);
const PRIORITY = z.enum(['Low', 'Medium', 'High', 'Critical']);
const NOTE_STATUS = z.enum(['Draft', 'Pending Review', 'Approved', 'Rejected']);
const MILESTONE_STATUS = z.enum(['Active', 'Completed']);

module.exports = {
  auth: {
    register: z.object({ email, password, name: name.optional() }),
    login: z.object({ email, password: z.string().min(1).max(128), role: ROLE.optional() }),
    forgotPassword: z.object({ email }),
    resetPassword: z.object({ token: z.string().min(10).max(200), password }),
    changePassword: z.object({ currentPassword: z.string().min(1).max(128), newPassword: password }),
    registerWithInvite: z.object({ token: z.string().min(10).max(200), email, password, name: name.optional() }),
    acceptInvite: z.object({ token: z.string().min(10).max(200) }),
    invite: z.object({ workspaceId: id, email, role: ROLE, name: name.optional() }),
    updateProfile: z.object({ name }),
  },
  projects: {
    create: z.object({ name: z.string().trim().min(1).max(191), description: optionalText(191), workspaceId: id }),
    addMember: z.object({ targetUserId: id }),
    inviteEmail: z.object({ email }),
  },
  tasks: {
    create: z.object({
      projectId: id,
      name: z.string().trim().min(1).max(191),
      description: optionalText(5000),
      priority: PRIORITY.optional(),
      difficulty: z.coerce.number().int().min(1).max(5).optional(),
      dueDate: optionalDate,
      noteId: id.optional().nullable(),
      assigneeId: z.string().trim().max(64).optional().nullable(), // user id or 'auto'
    }),
    updateStatus: z.object({ status: TASK_STATUS }),
    update: z.object({
      name: z.string().trim().min(1).max(191).optional(),
      description: optionalText(5000),
      priority: PRIORITY.optional(),
      difficulty: z.coerce.number().int().min(1).max(5).optional(),
      dueDate: optionalDate,
      assigneeId: z.string().trim().max(64).optional().nullable(), // user id, or null to unassign
    }),
  },
  notes: {
    create: z.object({ title: z.string().trim().min(1).max(191), content: z.string().max(2_000_000).optional(), projectId: id }),
    update: z.object({
      title: z.string().trim().min(1).max(191).optional(),
      content: z.string().max(2_000_000).optional(),
      tags: z.string().trim().max(191).optional(),
      saveToVersion: z.boolean().optional(),
      versionNumber: z.coerce.number().int().positive().optional().nullable(),
    }),
    updateStatus: z.object({ status: NOTE_STATUS, rejectionReason: optionalText(2000) }),
    link: z.object({ targetId: id }),
  },
  milestones: {
    create: z.object({ name: z.string().trim().min(1).max(191), description: optionalText(191), dueDate: optionalDate, projectId: id }),
    updateStatus: z.object({ status: MILESTONE_STATUS }),
    linkItem: z.object({ targetId: id, targetType: z.enum(['task', 'note']) }),
  },
  workspaces: {
    update: z.object({ name: z.string().trim().min(1).max(191) }),
    annotation: z.object({ targetId: z.string().trim().min(1).max(120), text: z.string().trim().min(1).max(2000) }),
    search: z.object({ q: z.string().trim().max(100).optional().default('') }),
    create: z.object({ name: z.string().trim().min(1).max(191) }),
    memberRole: z.object({ role: ROLE }),
  },
};
