const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestApp, lastLinkTo } = require('./helpers');

let api;
let teardown;

before(async () => {
  ({ api, teardown } = await setupTestApp());
});
after(() => teardown());

// Creates an admin with a project, plus an employee who joined through an email invite.
async function teamWithProject() {
  const admin = await api.register('admin');
  const project = (await admin.post('/api/projects').send({ name: 'Launch', workspaceId: admin.workspaceId })).body;

  const email = `emp-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const invite = await admin.post('/api/auth/invite').send({ workspaceId: admin.workspaceId, email, role: 'Employee' });
  assert.equal(invite.status, 201, JSON.stringify(invite.body));
  const token = lastLinkTo(api.sentEmails, email).searchParams.get('token');
  const joined = await api.request().post('/api/auth/register-invite').send({ token, email, password: 'password123', name: 'Emp' });
  assert.equal(joined.status, 201, JSON.stringify(joined.body));
  const employee = api.withAuth(joined.body.token, joined.body.user);

  await admin.post(`/api/projects/${project.id}/members`).send({ targetUserId: employee.user.id }).expect(201);
  return { admin, employee, project };
}

test('health check reports database status', async () => {
  const res = await api.request().get('/api/health').expect(200);
  assert.deepEqual(res.body, { status: 'ok', database: 'ok' });
});

test('private endpoints require a valid token', async () => {
  await api.request().get('/api/projects/anything').expect(401);
  await api.request().get('/api/projects/anything').set('Authorization', 'Bearer not-a-token').expect(401);
});

test('registration makes the user Admin of a new workspace and never returns the password hash', async () => {
  const res = await api
    .request()
    .post('/api/auth/register')
    .send({ email: 'New.Person@Example.com', password: 'password123', name: 'New' })
    .expect(201);
  assert.equal(res.body.user.email, 'new.person@example.com');
  assert.equal(res.body.user.role, 'Admin');
  assert.equal(res.body.user.workspaces.length, 1);
  assert.ok(!JSON.stringify(res.body).includes('password'));

  await api.request().post('/api/auth/register').send({ email: 'new.person@example.com', password: 'password123' }).expect(409);
  await api.request().post('/api/auth/register').send({ email: 'short@example.com', password: 'short' }).expect(400);
});

test('login works with and without a role and rejects wrong passwords', async () => {
  await api.request().post('/api/auth/register').send({ email: 'login@example.com', password: 'password123' }).expect(201);
  await api.request().post('/api/auth/login').send({ email: 'login@example.com', password: 'password123' }).expect(200);
  await api.request().post('/api/auth/login').send({ email: 'login@example.com', password: 'password123', role: 'Admin' }).expect(200);
  await api.request().post('/api/auth/login').send({ email: 'login@example.com', password: 'password123', role: 'Employee' }).expect(403);
  await api.request().post('/api/auth/login').send({ email: 'login@example.com', password: 'wrong-password' }).expect(401);
  await api.request().post('/api/auth/login').send({ email: 'nobody@example.com', password: 'password123' }).expect(401);
});

test('users cannot see or change another workspace', async () => {
  const alice = await api.register('alice');
  const mallory = await api.register('mallory');
  const project = (await alice.post('/api/projects').send({ name: 'Secret', workspaceId: alice.workspaceId }).expect(201)).body;
  const note = (await alice.post('/api/notes').send({ title: 'Plans', content: 'top secret', projectId: project.id }).expect(201)).body;

  await mallory.get(`/api/projects/${alice.workspaceId}`).expect(404);
  await mallory.get(`/api/workspaces/${alice.workspaceId}/members`).expect(404);
  await mallory.get(`/api/notes/${note.id}`).expect(404);
  await mallory.patch(`/api/notes/${note.id}`).send({ content: 'hacked' }).expect(404);
  await mallory.post('/api/projects').send({ name: 'x', workspaceId: alice.workspaceId }).expect(404);
  await mallory.patch(`/api/workspaces/${alice.workspaceId}`).send({ name: 'pwned' }).expect(404);
  await mallory.post('/api/auth/invite').send({ workspaceId: alice.workspaceId, email: 'evil@example.com', role: 'Admin' }).expect(404);
  await mallory.get(`/api/workspaces/${alice.workspaceId}/search?q=secret`).expect(404);

  const stillThere = await alice.get(`/api/notes/${note.id}`).expect(200);
  assert.equal(stillThere.body.content, 'top secret');
});

test('employees are limited by role and project membership', async () => {
  const { admin, employee, project } = await teamWithProject();
  assert.equal(employee.user.role, 'Employee');

  await employee.post('/api/projects').send({ name: 'Nope', workspaceId: admin.workspaceId }).expect(403);
  await employee.post('/api/tasks').send({ projectId: project.id, name: 'Nope' }).expect(403);
  await employee.post('/api/auth/invite').send({ workspaceId: admin.workspaceId, email: 'x@example.com', role: 'Admin' }).expect(403);

  // Employees only see projects they belong to.
  const hidden = (await admin.post('/api/projects').send({ name: 'Hidden', workspaceId: admin.workspaceId })).body;
  const visible = (await employee.get(`/api/projects/${admin.workspaceId}`).expect(200)).body.map((p) => p.id);
  assert.deepEqual(visible, [project.id]);
  await employee.get(`/api/tasks/${hidden.id}`).expect(404);
});

test('task lists never include password hashes', async () => {
  const { admin, employee, project } = await teamWithProject();
  await admin.post('/api/tasks').send({ projectId: project.id, name: 'Ship it', assigneeId: employee.user.id }).expect(201);
  const res = await admin.get(`/api/tasks/${project.id}`).expect(200);
  assert.equal(res.body[0].assignees[0].user.id, employee.user.id);
  assert.ok(!JSON.stringify(res.body).includes('password'));
});

test('task assignment and completion create notifications', async () => {
  const { admin, employee, project } = await teamWithProject();
  const task = (await admin.post('/api/tasks').send({ projectId: project.id, name: 'Write docs', assigneeId: 'auto' }).expect(201)).body;
  assert.equal(task.assignees.length, 1);

  const other = (await admin.post('/api/tasks').send({ projectId: project.id, name: 'Not yours' }).expect(201)).body;
  await employee.patch(`/api/tasks/${other.id}/status`).send({ status: 'Done' }).expect(403);

  const assignee = task.assignees[0].userId === employee.user.id ? employee : admin;
  await assignee.patch(`/api/tasks/${task.id}/status`).send({ status: 'Bogus' }).expect(400);
  await assignee.patch(`/api/tasks/${task.id}/status`).send({ status: 'Done' }).expect(200);

  if (assignee === employee) {
    const empNotes = (await employee.get(`/api/notifications/${admin.workspaceId}`).expect(200)).body;
    assert.ok(empNotes.some((n) => n.title === 'New task assigned'));
    const adminNotes = (await admin.get(`/api/notifications/${admin.workspaceId}`).expect(200)).body;
    assert.ok(adminNotes.some((n) => n.title === 'Task completed'));
    await employee.patch(`/api/notifications/${adminNotes[0].id}/read`).expect(404);
  }
});

test('assigning a workspace member adds them to the project', async () => {
  const admin = await api.register('assigner');
  const project = (await admin.post('/api/projects').send({ name: 'P', workspaceId: admin.workspaceId })).body;
  const { token } = (await admin.post(`/api/projects/${project.id}/invite-link`)).body;
  const other = (await admin.post('/api/projects').send({ name: 'Other', workspaceId: admin.workspaceId })).body;
  const member = await api.register('member');
  await member.post('/api/auth/accept-invite').send({ token }).expect(200);

  await admin.post('/api/tasks').send({ projectId: other.id, name: 'T', assigneeId: member.user.id }).expect(201);
  const visible = (await member.get(`/api/projects/${admin.workspaceId}`)).body.map((p) => p.id).sort();
  assert.deepEqual(visible, [project.id, other.id].sort());
});

test('assignees must belong to the workspace', async () => {
  const admin = await api.register('lead');
  const outsider = await api.register('outsider');
  const project = (await admin.post('/api/projects').send({ name: 'P', workspaceId: admin.workspaceId })).body;
  await admin.post('/api/tasks').send({ projectId: project.id, name: 'T', assigneeId: outsider.user.id }).expect(400);
  await admin.post(`/api/projects/${project.id}/members`).send({ targetUserId: outsider.user.id }).expect(400);
});

test('note approval workflow enforces roles and notifies people', async () => {
  const { admin, employee, project } = await teamWithProject();
  const note = (await employee.post('/api/notes').send({ title: 'API design', content: 'draft', projectId: project.id }).expect(201)).body;
  assert.equal(note.tags, 'api');

  await employee.patch(`/api/notes/${note.id}/status`).send({ status: 'Approved' }).expect(403);
  await employee.patch(`/api/notes/${note.id}/status`).send({ status: 'Pending Review' }).expect(200);
  let adminInbox = (await admin.get(`/api/notifications/${admin.workspaceId}`)).body;
  assert.ok(adminInbox.some((n) => n.title === 'Note awaiting approval'));

  await admin.patch(`/api/notes/${note.id}/status`).send({ status: 'Rejected' }).expect(400);
  await admin.patch(`/api/notes/${note.id}/status`).send({ status: 'Rejected', rejectionReason: 'Needs detail' }).expect(200);
  const versions = (await employee.get(`/api/notes/${note.id}/versions`).expect(200)).body;
  assert.equal(versions[0].rejectionReason, 'Needs detail');

  await admin.patch(`/api/notes/${note.id}/status`).send({ status: 'Approved' }).expect(200);
  const empInbox = (await employee.get(`/api/notifications/${admin.workspaceId}`)).body.map((n) => n.title);
  assert.ok(empInbox.includes('Note rejected'));
  assert.ok(empInbox.includes('Note approved'));
});

test('saving notes records versions and edit logs, and versions can be restored', async () => {
  const admin = await api.register('writer');
  const project = (await admin.post('/api/projects').send({ name: 'Docs', workspaceId: admin.workspaceId })).body;
  const note = (await admin.post('/api/notes').send({ title: 'Guide', content: 'v0', projectId: project.id })).body;

  await admin.patch(`/api/notes/${note.id}`).send({ content: 'v1' }).expect(200);
  await admin.patch(`/api/notes/${note.id}`).send({ content: 'v2', tags: 'docs' }).expect(200);
  // Saving the same content again does not create a duplicate version.
  await admin.patch(`/api/notes/${note.id}`).send({ content: 'v2' }).expect(200);

  let versions = (await admin.get(`/api/notes/${note.id}/versions`)).body;
  assert.deepEqual(versions.map((v) => v.content), ['v2', 'v1']);

  const restored = (await admin.post(`/api/notes/${note.id}/versions/${versions[1].id}/restore`).expect(200)).body;
  assert.equal(restored.content, 'v1');
  assert.equal(restored.status, 'Draft');

  const logs = (await admin.get(`/api/notes/${note.id}/logs`).expect(200)).body;
  assert.ok(logs.every((l) => l.user.id === admin.user.id));
  assert.deepEqual(logs.map((l) => l.action).sort(), ['restored', 'updated', 'updated', 'updated']);
  assert.ok(!('yState' in restored));
});

test('notes can be linked only within the same workspace', async () => {
  const a = await api.register('linker');
  const b = await api.register('linker2');
  const pa = (await a.post('/api/projects').send({ name: 'A', workspaceId: a.workspaceId })).body;
  const pb = (await b.post('/api/projects').send({ name: 'B', workspaceId: b.workspaceId })).body;
  const n1 = (await a.post('/api/notes').send({ title: 'One', projectId: pa.id })).body;
  const n2 = (await a.post('/api/notes').send({ title: 'Two', projectId: pa.id })).body;
  const foreign = (await b.post('/api/notes').send({ title: 'Other', projectId: pb.id })).body;

  await a.post(`/api/notes/${n1.id}/links`).send({ targetId: n2.id }).expect(201);
  await a.post(`/api/notes/${n1.id}/links`).send({ targetId: n2.id }).expect(409);
  await a.post(`/api/notes/${n1.id}/links`).send({ targetId: n1.id }).expect(400);
  await a.post(`/api/notes/${n1.id}/links`).send({ targetId: foreign.id }).expect(404);

  const graph = (await a.get(`/api/workspaces/${a.workspaceId}/graph`).expect(200)).body;
  assert.ok(graph.links.some((l) => l.source === `note_${n1.id}` && l.target === `note_${n2.id}`));
});

test('forgot password sends a single-use link and does not change the password', async () => {
  const email = 'forgetful@example.com';
  await api.request().post('/api/auth/register').send({ email, password: 'original-pass' }).expect(201);

  await api.request().post('/api/auth/forgot-password').send({ email }).expect(200);
  await api.request().post('/api/auth/forgot-password').send({ email: 'unknown@example.com' }).expect(200);
  // Still able to log in with the old password.
  await api.request().post('/api/auth/login').send({ email, password: 'original-pass' }).expect(200);

  const link = lastLinkTo(api.sentEmails, email);
  assert.equal(link.pathname, '/reset-password');
  const token = link.searchParams.get('token');
  await api.request().post('/api/auth/reset-password').send({ token, password: 'brand-new-pass' }).expect(200);
  await api.request().post('/api/auth/reset-password').send({ token, password: 'another-pass-1' }).expect(400);

  await api.request().post('/api/auth/login').send({ email, password: 'original-pass' }).expect(401);
  await api.request().post('/api/auth/login').send({ email, password: 'brand-new-pass' }).expect(200);
});

test('change password uses the logged-in user', async () => {
  const user = await api.register('changer');
  await user.patch('/api/auth/password').send({ currentPassword: 'wrong-pass', newPassword: 'newpassword1' }).expect(400);
  await user.patch('/api/auth/password').send({ currentPassword: 'password123', newPassword: 'newpassword1' }).expect(200);
  await api.request().post('/api/auth/login').send({ email: user.user.email, password: 'newpassword1' }).expect(200);
});

test('invitations are bound to their email, single-use, and escape HTML', async () => {
  const admin = await api.register('<b>Boss</b>');
  const email = 'invitee@example.com';
  await admin.post('/api/auth/invite').send({ workspaceId: admin.workspaceId, email, role: 'Team Lead' }).expect(201);
  const mail = [...api.sentEmails].reverse().find((m) => m.to === email);
  assert.ok(!mail.html.includes('<b>Boss</b>'));
  assert.ok(!mail.text.includes('password'));

  const token = lastLinkTo(api.sentEmails, email).searchParams.get('token');
  const info = (await api.request().get(`/api/auth/invitations/${token}`).expect(200)).body;
  assert.equal(info.role, 'Team Lead');

  await api.request().post('/api/auth/register-invite').send({ token, email: 'someone-else@example.com', password: 'password123' }).expect(400);
  const ok = await api.request().post('/api/auth/register-invite').send({ token, email, password: 'password123' }).expect(201);
  assert.equal(ok.body.user.workspaces.find((w) => w.workspaceId === admin.workspaceId).role, 'Team Lead');
  await api.request().post('/api/auth/register-invite').send({ token, email: 'again@example.com', password: 'password123' }).expect(400);
});

test('existing users can accept project invite links', async () => {
  const { admin, project } = await teamWithProject();
  const existing = await api.register('existing');
  const { token } = (await admin.post(`/api/projects/${project.id}/invite-link`).expect(200)).body;

  const res = await existing.post('/api/auth/accept-invite').send({ token }).expect(200);
  assert.ok(res.body.user.workspaces.some((w) => w.workspaceId === admin.workspaceId && w.role === 'Employee'));
  const projects = (await existing.get(`/api/projects/${admin.workspaceId}`).expect(200)).body;
  assert.deepEqual(projects.map((p) => p.id), [project.id]);
});

test('deleting a project removes its notes, tasks and milestones', async () => {
  const admin = await api.register('deleter');
  const project = (await admin.post('/api/projects').send({ name: 'Temp', workspaceId: admin.workspaceId })).body;
  const note = (await admin.post('/api/notes').send({ title: 'N', projectId: project.id })).body;
  const milestone = (await admin.post('/api/milestones').send({ name: 'M1', projectId: project.id, dueDate: '2030-01-01' }).expect(201)).body;
  const task = (await admin.post('/api/tasks').send({ projectId: project.id, name: 'T', noteId: note.id }).expect(201)).body;
  await admin.post(`/api/milestones/${milestone.id}/items`).send({ targetId: task.id, targetType: 'task' }).expect(200);
  await admin.post(`/api/milestones/${milestone.id}/items`).send({ targetId: note.id, targetType: 'note' }).expect(200);

  await admin.delete(`/api/projects/${project.id}`).expect(204);
  assert.equal(await api.prisma.note.count({ where: { id: note.id } }), 0);
  assert.equal(await api.prisma.milestone.count({ where: { id: milestone.id } }), 0);
});

test('workspaces can be created, renamed, switched and deleted', async () => {
  const user = await api.register('multi');
  const created = (await user.post('/api/workspaces').send({ name: 'Second' }).expect(201)).body;
  assert.equal(created.user.workspaces.length, 2);
  await user.patch(`/api/workspaces/${created.workspace.id}`).send({ name: 'Renamed' }).expect(200);
  const me = (await user.get('/api/auth/me').expect(200)).body.user;
  assert.ok(me.workspaces.some((w) => w.workspace.name === 'Renamed'));
  const afterDelete = (await user.delete(`/api/workspaces/${created.workspace.id}`).expect(200)).body.user;
  assert.equal(afterDelete.workspaces.length, 1);
});

test('changelog annotations use the logged-in author', async () => {
  const admin = await api.register('annotator');
  const res = await admin
    .post(`/api/workspaces/${admin.workspaceId}/changelog/annotations`)
    .send({ targetId: 'note-x', text: 'Shipped', authorId: 'spoofed' })
    .expect(201);
  assert.equal(res.body.authorId, admin.user.id);
});

test('due-date reminders are sent once per task', async () => {
  const { sendDueTaskReminders } = require('../jobs/reminders');
  const { admin, employee, project } = await teamWithProject();
  const inTwoHours = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  await admin.post('/api/tasks').send({ projectId: project.id, name: 'Soon', dueDate: inTwoHours, assigneeId: employee.user.id }).expect(201);

  assert.ok((await sendDueTaskReminders()) >= 1);
  assert.equal(await sendDueTaskReminders(), 0);
  const inbox = (await employee.get(`/api/notifications/${admin.workspaceId}`)).body;
  assert.ok(inbox.some((n) => n.title === 'Task due soon'));
});

test('unknown routes and bad JSON get clean errors', async () => {
  await api.request().get('/api/does-not-exist').expect(404);
  await api.request().post('/api/auth/login').set('Content-Type', 'application/json').send('{bad').expect(400);
});

test('managers can edit and reassign tasks; employees cannot', async () => {
  const { admin, employee, project } = await teamWithProject();
  const task = (await admin.post('/api/tasks').send({ projectId: project.id, name: 'Draft', priority: 'Low' }).expect(201)).body;

  await employee.patch(`/api/tasks/${task.id}`).send({ name: 'Hacked' }).expect(403);
  const edited = (
    await admin
      .patch(`/api/tasks/${task.id}`)
      .send({ name: 'Final', priority: 'High', difficulty: 4, dueDate: '2030-05-01', assigneeId: employee.user.id })
      .expect(200)
  ).body;
  assert.equal(edited.name, 'Final');
  assert.equal(edited.priority, 'High');
  assert.equal(edited.assignees[0].userId, employee.user.id);
  const inbox = (await employee.get(`/api/notifications/${admin.workspaceId}`)).body;
  assert.ok(inbox.some((n) => n.title === 'New task assigned' && n.message.includes('Final')));

  const unassigned = (await admin.patch(`/api/tasks/${task.id}`).send({ assigneeId: null }).expect(200)).body;
  assert.equal(unassigned.assignees.length, 0);
  await admin.patch(`/api/tasks/${task.id}`).send({ priority: 'Urgent' }).expect(400);
});

test('notes, tasks and milestones can be deleted by the right people', async () => {
  const { admin, employee, project } = await teamWithProject();
  const own = (await employee.post('/api/notes').send({ title: 'Mine', projectId: project.id })).body;
  const others = (await admin.post('/api/notes').send({ title: 'Theirs', projectId: project.id })).body;
  const task = (await admin.post('/api/tasks').send({ projectId: project.id, name: 'T' })).body;
  const milestone = (await admin.post('/api/milestones').send({ name: 'M', projectId: project.id })).body;
  await admin.post(`/api/milestones/${milestone.id}/items`).send({ targetId: task.id, targetType: 'task' }).expect(200);

  await employee.delete(`/api/notes/${others.id}`).expect(403);
  await employee.delete(`/api/notes/${own.id}`).expect(204);
  await admin.delete(`/api/notes/${others.id}`).expect(204);
  await admin.get(`/api/notes/${others.id}`).expect(404);

  await employee.delete(`/api/tasks/${task.id}`).expect(403);
  await employee.delete(`/api/milestones/${milestone.id}`).expect(403);
  await admin.delete(`/api/milestones/${milestone.id}`).expect(204);
  // The task survives its milestone being deleted.
  const stillThere = (await admin.get(`/api/tasks/${project.id}`)).body.find((t) => t.id === task.id);
  assert.equal(stillThere.milestoneId, null);
  await admin.delete(`/api/tasks/${task.id}`).expect(204);
});

test('admins manage roles and members, and a workspace always keeps an Admin', async () => {
  const { admin, employee, project } = await teamWithProject();
  const ws = admin.workspaceId;
  const task = (await admin.post('/api/tasks').send({ projectId: project.id, name: 'T', assigneeId: employee.user.id })).body;

  await employee.patch(`/api/workspaces/${ws}/members/${employee.user.id}`).send({ role: 'Admin' }).expect(403);
  await admin.patch(`/api/workspaces/${ws}/members/${admin.user.id}`).send({ role: 'Employee' }).expect(400);
  await admin.delete(`/api/workspaces/${ws}/members/${admin.user.id}`).expect(400);

  await admin.patch(`/api/workspaces/${ws}/members/${employee.user.id}`).send({ role: 'Team Lead' }).expect(200);
  const inbox = (await employee.get(`/api/notifications/${ws}`)).body;
  assert.ok(inbox.some((n) => n.title === 'Your role changed'));
  await employee.post('/api/projects').send({ name: 'Now allowed', workspaceId: ws }).expect(201);

  await admin.delete(`/api/workspaces/${ws}/members/${employee.user.id}`).expect(200);
  await employee.get(`/api/projects/${ws}`).expect(404);
  const after = (await admin.get(`/api/tasks/${project.id}`)).body.find((t) => t.id === task.id);
  assert.equal(after.assignees.length, 0);
});

test('members can leave a workspace, and project members can be listed and removed', async () => {
  const { admin, employee, project } = await teamWithProject();
  const members = (await employee.get(`/api/projects/${project.id}/members`).expect(200)).body;
  assert.deepEqual(members.map((m) => m.user.id).sort(), [admin.user.id, employee.user.id].sort());
  assert.ok(!JSON.stringify(members).includes('password'));

  await employee.delete(`/api/projects/${project.id}/members/${admin.user.id}`).expect(403);
  await admin.delete(`/api/projects/${project.id}/members/${employee.user.id}`).expect(204);
  await employee.get(`/api/tasks/${project.id}`).expect(404);

  const left = (await employee.delete(`/api/workspaces/${admin.workspaceId}/members/${employee.user.id}`).expect(200)).body;
  assert.ok(!left.user.workspaces.some((w) => w.workspaceId === admin.workspaceId));
});

test('users can change their display name', async () => {
  const user = await api.register('renamer');
  const res = await user.patch('/api/auth/me').send({ name: '  New Name  ' }).expect(200);
  assert.equal(res.body.user.name, 'New Name');
  await user.patch('/api/auth/me').send({ name: '' }).expect(400);
});
