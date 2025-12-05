import Note from "../models/note.model.js";
import NoteVersion from "../models/noteVersion.model.js";

/**
 * Create new note
 */
export async function createNote(req, res, next) {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ 
        success: false,
        message: "Title is required" 
      });
    }
    
    const note = await Note.create({ 
      title: title.trim(),
      content: ""
    });
    
    return res.status(201).json({
      success: true,
      message: "Note successfully created",
      data: note,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get note by ID
 */
export async function getNoteById(req, res, next) {
  try {
    const { id } = req.params;
    
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid note ID format"
      });
    }

    const note = await Note.findById(id);
    if (!note) {
      return res.status(404).json({ 
        success: false,
        message: "Note not found" 
      });
    }
    
    // Fetch latest versions
    const versions = await NoteVersion.find({ noteId: note._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("content createdAt meta")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Note fetched successfully",
      data: { note, versions },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update note content (fallback for socket updates)
 */
export async function updateNote(req, res, next) {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid note ID format"
      });
    }

    const note = await Note.findById(id);
    if (!note) {
      return res.status(404).json({ 
        success: false,
        message: "Note not found" 
      });
    }

    // Update content
    note.content = typeof content === "string" ? content : note.content;
    note.updatedAt = new Date();
    await note.save();

    // Store version
    await NoteVersion.create({
      noteId: note._id,
      content: note.content,
      meta: { apiUpdate: true }
    });

    // Get updated versions
    const versions = await NoteVersion.find({ noteId: note._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("content createdAt meta")
      .lean();

    return res.status(200).json({ 
      success: true, 
      message: "Note updated successfully", 
      data: { note, versions }
    });
  } catch (err) {
    next(err);
  }
}