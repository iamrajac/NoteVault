const prisma = require('../utils/db');

// Get all members of a workspace
exports.getWorkspaceMembers = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json(members);
  } catch (error) {
    console.error('Fetch Workspace Members Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getKnowledgeGraph = async (req, res) => {
  try {
     const { workspaceId } = req.params;
     const projects = await prisma.project.findMany({ where: { workspaceId }, select: { id: true, name: true }});
     const notes = await prisma.note.findMany({ where: { project: { workspaceId } }, select: { id: true, title: true, projectId: true }});
     const tasks = await prisma.task.findMany({ where: { project: { workspaceId } }, select: { id: true, name: true, projectId: true }});

     const nodes = [];
     const links = [];

     projects.forEach((p) => {
       nodes.push({ id: `proj_${p.id}`, group: 'project', label: p.name, x: 400 + (Math.random()*400-200), y: 300 + (Math.random()*400-200), color: '#3B82F6' });
     });

     notes.forEach((n) => {
       nodes.push({ id: `note_${n.id}`, group: 'note', label: n.title, x: 400 + (Math.random()*400-200), y: 300 + (Math.random()*400-200), color: '#10B981' });
       links.push({ source: `proj_${n.projectId}`, target: `note_${n.id}` });
     });

     const noteIds = notes.map(n => n.id);
     const noteLinks = await prisma.noteLink.findMany({
       where: { sourceId: { in: noteIds } }
     });
     noteLinks.forEach(nl => {
       links.push({ source: `note_${nl.sourceId}`, target: `note_${nl.targetId}` });
     });

     tasks.forEach((t) => {
       nodes.push({ id: `task_${t.id}`, group: 'task', label: t.name, x: 400 + (Math.random()*400-200), y: 300 + (Math.random()*400-200), color: '#F59E0B' });
       links.push({ source: `proj_${t.projectId}`, target: `task_${t.id}` });
     });

     res.json({ nodes, links });
  } catch(e) { 
     res.status(500).json({error: "Server Error"}); 
  }
};

exports.getChangelog = async (req, res) => {
  try {
     const { workspaceId } = req.params;
     
     const notes = await prisma.note.findMany({
        where: { project: { workspaceId } },
        include: { author: true, project: true },
        orderBy: { updatedAt: 'desc' },
        take: 15
     });

     const tasks = await prisma.task.findMany({
        where: { project: { workspaceId } },
        include: { assignees: { include: { user: true } }, project: true },
        orderBy: { updatedAt: 'desc' },
        take: 15
     });

     const events = [];

     notes.forEach(n => {
        events.push({
           id: `note-${n.id}`,
           type: 'Document',
           title: n.title,
           action: n.status === 'Approved' ? 'approved the document' : (n.status === 'Draft' ? 'drafted the document' : 'updated the document'),
           project: n.project.name,
           author: n.author ? n.author.name : 'Workspace Member',
           authorImage: n.author && n.author.name ? n.author.name.charAt(0) : 'U',
           date: new Date(n.updatedAt).toLocaleString(),
           timestamp: new Date(n.updatedAt).getTime()
        });
     });

     tasks.forEach(t => {
        const authorName = t.assignees && t.assignees.length > 0 ? t.assignees[0].user.name : 'Workspace Member';
        events.push({
           id: `task-${t.id}`,
           type: 'Task',
           title: t.name,
           action: t.status === 'Done' ? 'completed the task' : `moved task to ${t.status}`,
           project: t.project.name,
           author: authorName,
           authorImage: authorName.charAt(0),
           date: new Date(t.updatedAt).toLocaleString(),
           timestamp: new Date(t.updatedAt).getTime()
        });
     });

     const allAnnotations = await prisma.changelogAnnotation.findMany({
        where: { workspaceId }
     });

     // Sort by most recent
     events.sort((a, b) => b.timestamp - a.timestamp);

     const finalEvents = events.slice(0, 30).map(e => ({
        ...e,
        annotations: allAnnotations.filter(a => a.targetId === e.id)
     }));

     res.json(finalEvents);
  } catch(e) {
     res.status(500).json({error: "Server Error"});
  }
};

exports.updateWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, url } = req.body;
    
    // Simplification for the dummy settings page behavior.
    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { name: name }
    });
    
    res.json(updated);
  } catch(e) {
    console.error(e);
    res.status(500).json({error: "Server Error"});
  }
};

exports.addChangelogAnnotation = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { targetId, text, authorId, authorName } = req.body;
    const annotation = await prisma.changelogAnnotation.create({
      data: { targetId, workspaceId, text, authorId, authorName }
    });
    res.json(annotation);
  } catch(e) {
    console.error(e);
    res.status(500).json({error: "Server Error"});
  }
};


exports.globalSearch = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { q } = req.query;
    if (!q) return res.json({ notes: [], tasks: [], milestones: [] });

    const notes = await prisma.note.findMany({
      where: { project: { workspaceId }, OR: [{ title: { contains: q }}, { content: { contains: q }}] },
      take: 10
    });
    const tasks = await prisma.task.findMany({
      where: { project: { workspaceId }, OR: [{ name: { contains: q }}, { description: { contains: q }}] },
      take: 10
    });
    const milestones = await prisma.milestone.findMany({
      where: { project: { workspaceId }, OR: [{ name: { contains: q }}, { description: { contains: q }}] },
      take: 10
    });

    res.json({ notes, tasks, milestones });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: "Server Error" });
  }
};

