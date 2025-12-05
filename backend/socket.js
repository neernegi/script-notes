import { Server } from "socket.io";
import Note from "./models/note.model.js";
import NoteVersion from "./models/noteVersion.model.js";

const AUTO_SAVE_INTERVAL = parseInt(
  process.env.AUTO_SAVE_INTERVAL_MS || "5000",
  10
);

// Track intervals per note
const autoSaveIntervals = new Map();
// Track cursor positions per user
const cursorPositions = new Map();

export default function createSocketServer(httpServer) {
  const allowedOrigins = ["http://localhost:5173", process.env.CLIENT_URL];
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
      transports: ["websocket", "polling"],
    },
    allowEIO3: true,
  });


  const activeMap = new Map();

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join_note", async ({ noteId, userName }) => {
      if (!noteId) {
        return socket.emit("error", { message: "noteId required" });
      }

      // Validate note exists
      try {
        const note = await Note.findById(noteId);
        if (!note) {
          return socket.emit("error", { message: "Note not found" });
        }
      } catch (err) {
        console.error("Error finding note:", err);
        return socket.emit("error", { message: "Invalid note ID" });
      }

      socket.join(noteId);
      // attach metadata
      socket.data.noteId = noteId;
      socket.data.userName = userName || `User-${socket.id.slice(0, 6)}`;

      // add to active map
      let users = activeMap.get(noteId);
      if (!users) {
        users = new Map();
        activeMap.set(noteId, users);
      }
      users.set(socket.id, {
        id: socket.id,
        name: socket.data.userName,
        joinedAt: new Date(),
      });

      // send current note content to the new user
      try {
        const note = await Note.findById(noteId);
        const versions = await NoteVersion.find({ noteId })
          .sort({ createdAt: -1 })
          .limit(20)
          .lean();

        if (note) {
          socket.emit("note_loaded", {
            noteId,
            content: note.content,
            updatedAt: note.updatedAt,
            versions,
          });
        }
      } catch (err) {
        console.error("Error loading note:", err);
      }

      // broadcast active users to room
      broadcastActiveUsers(io, noteId, activeMap);

      // start autosave if not already running
      if (!autoSaveIntervals.has(noteId)) {
        startAutoSaveForNote(io, noteId, activeMap, autoSaveIntervals);
      }
    });

    socket.on("note_update", async ({ noteId, content }) => {
      if (!noteId || content === undefined) {
        return socket.emit("error", { message: "noteId and content required" });
      }

      try {
        // Update note in DB
        const updatedNote = await Note.findByIdAndUpdate(
          noteId,
          {
            content,
            updatedAt: new Date(),
          },
          { new: true }
        );

        if (!updatedNote) {
          return socket.emit("error", { message: "Note not found" });
        }

        // Save version for this update
        await NoteVersion.create({
          noteId: updatedNote._id,
          content,
          meta: { socketUpdate: true, userId: socket.id },
        });

        // Get updated versions list
        const versions = await NoteVersion.find({ noteId })
          .sort({ createdAt: -1 })
          .limit(20)
          .lean();

        // Broadcast to all others in room (excluding sender)
        socket.to(noteId).emit("note_update_broadcast", {
          noteId,
          content,
          updatedAt: updatedNote.updatedAt,
        });

        // Send versions update to all in room
        io.in(noteId).emit("versions_updated", { versions });
      } catch (err) {
        console.error("Note update error:", err);
        socket.emit("error", { message: "Failed to update note" });
      }
    });

    socket.on("cursor_update", ({ cursorPosition, selection, noteId }) => {
      if (!noteId) return;

      // Store cursor position
      cursorPositions.set(socket.id, {
        userId: socket.id,
        cursorPosition,
        selection,
        userName: socket.data.userName,
        updatedAt: new Date(),
      });

      // Broadcast to others in the same room
      socket.to(noteId).emit("cursor_update", {
        userId: socket.id,
        cursorPosition,
        selection,
        userName: socket.data.userName,
      });
    });

    socket.on("disconnect", () => {
      const noteId = socket.data.noteId;

      // Broadcast cursor leave
      if (noteId) {
        socket.to(noteId).emit("cursor_leave", { userId: socket.id });
        cursorPositions.delete(socket.id);
      }

      if (!noteId) {
        console.log("Socket disconnected:", socket.id);
        return;
      }

      const users = activeMap.get(noteId);
      if (users) {
        users.delete(socket.id);
        if (users.size === 0) {
          activeMap.delete(noteId);
          // Stop autosave interval
          const interval = autoSaveIntervals.get(noteId);
          if (interval) {
            clearInterval(interval);
            autoSaveIntervals.delete(noteId);
          }
        } else {
          broadcastActiveUsers(io, noteId, activeMap);
        }
      }
      console.log("Socket disconnected:", socket.id, "from note:", noteId);
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  });

  return io;
}

// Helper function to broadcast active users
function broadcastActiveUsers(io, noteId, activeMap) {
  const users = activeMap.get(noteId);
  const usersArr = users ? Array.from(users.values()) : [];
  io.in(noteId).emit("active_users", { noteId, users: usersArr });
}

// Auto-save function
function startAutoSaveForNote(io, noteId, activeMap, autoSaveIntervals) {
  const interval = setInterval(async () => {
    const users = activeMap.get(noteId);

    // Stop if no users
    if (!users || users.size === 0) {
      clearInterval(interval);
      autoSaveIntervals.delete(noteId);
      return;
    }

    try {
      const note = await Note.findById(noteId);
      if (note) {
        // Save a version snapshot
        await NoteVersion.create({
          noteId: note._id,
          content: note.content,
          meta: { autoSave: true },
        });

        // Get updated versions
        const versions = await NoteVersion.find({ noteId })
          .sort({ createdAt: -1 })
          .limit(20)
          .lean();

        // Notify clients about autosave
        io.in(noteId).emit("autosave", {
          noteId,
          updatedAt: note.updatedAt,
        });

        // Send updated versions
        io.in(noteId).emit("versions_updated", { versions });

        console.log(`Auto-saved version for note: ${noteId}`);
      }
    } catch (err) {
      console.error("Autosave error for note", noteId, err);
    }
  }, AUTO_SAVE_INTERVAL);

  autoSaveIntervals.set(noteId, interval);
}
