const prisma = require('../utils/db');

exports.createNote = async (req, res) => {
  try {
    const { title, content, projectId, authorId } = req.body;
    
    if (!title || !projectId || !authorId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Intelligent auto-tagging
    const textBody = (title + " " + (content || "")).toLowerCase();
    const possibleTags = ["api", "auth", "schema", "backend", "frontend", "bug", "feature", "deployment"];
    const tagsFound = possibleTags.filter(t => textBody.includes(t));

    const note = await prisma.note.create({
      data: {
        title,
        content: content || "",
        projectId,
        authorId,
        status: "Draft",
        tags: tagsFound.join(",")
      }
    });

    res.status(201).json(note);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getProjectNotes = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const notes = await prisma.note.findMany({
      where: { projectId },
      include: {
        author: { select: { id: true, name: true, email: true } },
        approver: { select: { id: true, name: true, email: true } },
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json(notes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getNoteById = async (req, res) => {
  try {
    const { id } = req.params;
    const note = await prisma.note.findUnique({
      where: { id },
      include: { 
        author: { select: { id: true, name: true } },
        tasks: true,
        linksOut: { include: { target: true } }
      }
    });
    
    if (!note) return res.status(404).json({ error: "Note not found" });
    res.json(note);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.updateNoteStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approverId } = req.body;
    
    // Simple RBAC or Approval Workflow updates
    const updated = await prisma.note.update({
      where: { id },
      data: { 
        status, 
        approverId: approverId || null 
      }
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, tags } = req.body;
    
    const data = {};
    if (title !== undefined) data.title = title;
    if (content !== undefined) data.content = content;
    if (tags !== undefined) data.tags = tags;

    if (content !== undefined) {
      await prisma.noteVersion.create({
        data: {
          noteId: id,
          content: content
        }
      });
    }

    const updated = await prisma.note.update({
      where: { id },
      data
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.linkNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { targetId } = req.body;
    const link = await prisma.noteLink.create({ data: { sourceId: id, targetId } });
    res.json(link);
  } catch(e) {
    res.status(500).json({error: "Server Error"});
  }
};

