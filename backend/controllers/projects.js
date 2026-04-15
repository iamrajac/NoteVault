const prisma = require('../utils/db');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../utils/mailer');

// Creates a new project in the active workspace. Requires Admin or Team Lead role.
exports.createProject = async (req, res) => {
  try {
    // In a real app with auth middleware, you'd extract userId from req.user
    // For this demonstration step before complex JWT extraction wrapper, we assume token gives userId and we expect workspaceId + role
    const { name, description, workspaceId, userId, userRole } = req.body;

    if (!name || !workspaceId || !userId) {
      return res.status(400).json({ error: 'Name, workspaceId, and userId required' });
    }

    // Role check: Only Admin and Team Lead can create projects
    if (userRole === 'Employee') {
      return res.status(403).json({ error: 'Employees are not authorized to create projects.' });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        workspaceId,
        createdById: userId,
        members: {
          create: {
            userId: userId // Automatically make the creator a member
          }
        }
      },
      include: {
        members: true
      }
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('Project Creation Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Gets all projects visible to the user in a workspace
exports.getWorkspaceProjects = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { userId, userRole } = req.query; // Usually extracted from JWT token in headers

    if (!workspaceId || !userId) {
      return res.status(400).json({ error: 'workspaceId and userId required' });
    }

    let projects;
    
    // Admins and Team Leads can see ALL projects in the workspace.
    if (userRole === 'Admin' || userRole === 'Team Lead') {
      projects = await prisma.project.findMany({
        where: { workspaceId },
        include: { _count: { select: { tasks: true, members: true } } }
      });
    } else {
      // Employees can ONLY see projects they are explicitly a member of.
      projects = await prisma.project.findMany({
        where: {
          workspaceId,
          members: {
            some: {
              userId: userId
            }
          }
        },
        include: { _count: { select: { tasks: true, members: true } } }
      });
    }

    res.json(projects);
  } catch (error) {
    console.error('Fetch Projects Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Admins/Team Leads adding an existing Workspace Employee to a specific Project
exports.addProjectMember = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { targetUserId, inviterRole } = req.body;

    if (inviterRole === 'Employee') {
      return res.status(403).json({ error: 'Employees cannot add members to projects.' });
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId: targetUserId
      }
    });

    res.status(201).json(member);
  } catch (error) {
    // Handling unique constraint bypass natively
    if (error.code === 'P2002') return res.status(400).json({ error: 'User is already a member.' });
    console.error('Add Project Member Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.generateInviteLink = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { inviterRole, workspaceId } = req.body;

    if (inviterRole !== 'Admin' && inviterRole !== 'Team Lead') {
      return res.status(403).json({ error: 'Only Admins or Team Leads can generate invite links.' });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
    // The token includes exactly which project they will fall into
    const token = jwt.sign({ projectId, workspaceId }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(200).json({ token, link: `http://localhost:3000/invite?token=${token}` });
  } catch (error) {
    console.error('Generate Link Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.inviteByEmail = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { email, inviterRole, workspaceId } = req.body;

    if (inviterRole !== 'Admin' && inviterRole !== 'Team Lead') {
      return res.status(403).json({ error: 'Only Admins or Team Leads can invite via email.' });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
    const token = jwt.sign({ projectId, workspaceId }, JWT_SECRET, { expiresIn: '7d' });
    const link = `http://localhost:3000/invite?token=${token}`;

    await sendEmail({
      to: email,
      subject: "You've been invited to collab on NoteVault",
      text: `Hello,\n\nYou have been invited to join a specific project on NoteVault. Click the following link to join:\n${link}`,
      html: `<h3>You're Invited!</h3><p>You have been invited to a NoteVault project.</p><br/><a href="${link}" style="padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Accept Invitation</a><br/><br/><p>If the button doesn't work, copy and paste this link: ${link}</p>`
    });

    res.status(200).json({ message: 'Invitation email sent successfully.' });
  } catch (error) {
    console.error('Invite By Email Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
