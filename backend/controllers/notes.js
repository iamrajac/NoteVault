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
    const { status, approverId, rejectionReason } = req.body;
    
    // Get current note to check if we need to create a version
    const currentNote = await prisma.note.findUnique({ where: { id } });
    if (!currentNote) {
      return res.status(404).json({ error: "Note not found" });
    }

    // If rejecting, create a version snapshot before updating status
    if (status === "Rejected") {
      // Get the latest version number
      const latestVersion = await prisma.noteVersion.findFirst({
        where: { noteId: id },
        orderBy: { version: 'desc' }
      });
      const newVersion = (latestVersion?.version || 0) + 1;

      // Create version snapshot with rejection reason
      await prisma.noteVersion.create({
        data: {
          noteId: id,
          version: newVersion,
          title: currentNote.title,
          tags: currentNote.tags,
          content: currentNote.content,
          rejectionReason: rejectionReason || "No reason provided"
        }
      });

      // Log the rejection
      await prisma.noteEditLog.create({
        data: {
          noteId: id,
          userId: approverId,
          action: 'status_changed',
          details: JSON.stringify({ 
            from: currentNote.status, 
            to: 'Rejected', 
            reason: rejectionReason 
          })
        }
      });
    }

    // Simple RBAC or Approval Workflow updates
    const updated = await prisma.note.update({
      where: { id },
      data: { 
        status, 
        approverId: approverId || null,
        rejectionReason: status === "Rejected" ? rejectionReason : null
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
    const { title, content, tags, userId, saveToVersion, versionNumber } = req.body;
    
    // Get current note
    const currentNote = await prisma.note.findUnique({ where: { id } });
    if (!currentNote) {
      return res.status(404).json({ error: "Note not found" });
    }

    const data = {};
    if (title !== undefined) data.title = title;
    if (content !== undefined) data.content = content;
    if (tags !== undefined) data.tags = tags;

    // Create version snapshot if content changed
    if (content !== undefined && content !== currentNote.content) {
      if (saveToVersion && versionNumber) {
        // Update existing version
        const existingVersion = await prisma.noteVersion.findFirst({
          where: { noteId: id, version: parseInt(versionNumber) }
        });
        
        if (existingVersion) {
          await prisma.noteVersion.update({
            where: { id: existingVersion.id },
            data: {
              title: title || currentNote.title,
              tags: tags !== undefined ? tags : currentNote.tags,
              content: content,
              authorId: userId || null
            }
          });
        } else {
          // Version doesn't exist, create new one
          const latestVersion = await prisma.noteVersion.findFirst({
            where: { noteId: id },
            orderBy: { version: 'desc' }
          });
          const newVersion = (latestVersion?.version || 0) + 1;
          
          await prisma.noteVersion.create({
            data: {
              noteId: id,
              version: newVersion,
              title: title || currentNote.title,
              tags: tags !== undefined ? tags : currentNote.tags,
              content: content,
              authorId: userId || null
            }
          });
        }
      } else {
        // Create new version
        const latestVersion = await prisma.noteVersion.findFirst({
          where: { noteId: id },
          orderBy: { version: 'desc' }
        });
        const newVersion = (latestVersion?.version || 0) + 1;

        await prisma.noteVersion.create({
          data: {
            noteId: id,
            version: newVersion,
            title: title || currentNote.title,
            tags: tags !== undefined ? tags : currentNote.tags,
            content: content,
            authorId: userId || null
          }
        });
      }
      
      // Log the update
      await prisma.noteEditLog.create({
        data: {
          noteId: id,
          userId: userId || 'unknown',
          action: 'updated',
          details: JSON.stringify({ 
            saveToVersion: saveToVersion,
            versionNumber: versionNumber,
            savedBy: userId
          })
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

// Get version history for a note
exports.getNoteVersions = async (req, res) => {
  try {
    const { id } = req.params;
    
    const versions = await prisma.noteVersion.findMany({
      where: { noteId: id },
      orderBy: { version: 'desc' },
      include: {
        author: { select: { id: true, name: true, email: true } }
      }
    });

    res.json(versions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get specific version details
exports.getNoteVersion = async (req, res) => {
  try {
    const { id, versionId } = req.params;
    
    const version = await prisma.noteVersion.findFirst({
      where: { 
        noteId: id,
        id: versionId
      }
    });

    if (!version) {
      return res.status(404).json({ error: "Version not found" });
    }

    res.json(version);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Restore note to a specific version
exports.restoreNoteVersion = async (req, res) => {
  try {
    const { id, versionId } = req.params;
    const { userId } = req.body;
    
    // Get the version to restore
    const version = await prisma.noteVersion.findFirst({
      where: { 
        noteId: id,
        id: versionId
      }
    });

    if (!version) {
      return res.status(404).json({ error: "Version not found" });
    }

    // Get current note state
    const currentNote = await prisma.note.findUnique({ where: { id } });
    if (!currentNote) {
      return res.status(404).json({ error: "Note not found" });
    }

    // Create a new version with current state before restoring
    const latestVersion = await prisma.noteVersion.findFirst({
      where: { noteId: id },
      orderBy: { version: 'desc' }
    });
    const newVersionNum = (latestVersion?.version || 0) + 1;

    await prisma.noteVersion.create({
      data: {
        noteId: id,
        version: newVersionNum,
        title: currentNote.title,
        tags: currentNote.tags,
        content: currentNote.content,
        rejectionReason: null
      }
    });

    // Restore to the selected version
    const restored = await prisma.note.update({
      where: { id },
      data: {
        title: version.title,
        tags: version.tags,
        content: version.content,
        status: "Draft", // Reset to Draft after restore
        rejectionReason: null
      }
    });

    // Log the restore action
    await prisma.noteEditLog.create({
      data: {
        noteId: id,
        userId: userId,
        action: 'restored',
        details: JSON.stringify({ 
          restoredFromVersion: version.version 
        })
      }
    });

    res.json(restored);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get edit logs for a note
exports.getNoteEditLogs = async (req, res) => {
  try {
    const { id } = req.params;
    
    const logs = await prisma.noteEditLog.findMany({
      where: { noteId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

