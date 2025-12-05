import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo
} from "react";
import { fetchNoteById, updateNoteById } from "../api/notesApi";
import { io } from "socket.io-client";

const NotesContext = createContext();

export const useNotes = () => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error("useNotes must be used within NotesProvider");
  }
  return context;
};

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";

export const NotesProvider = ({ children }) => {
  const [note, setNote] = useState(null);
  const [content, setContent] = useState("");
  const [lastSaved, setLastSaved] = useState(null);
  const [users, setUsers] = useState([]);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  const socketRef = useRef(null);
  const debounceRef = useRef(null);
  const isInitialMount = useRef(true);
  const textareaRef = useRef(null);
  const cursorDebounceRef = useRef(null);

  // Stable loadNote function
  const loadNote = useCallback(async (id) => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNoteById(id);
      setNote(data.note);
      setContent(data.note.content || "");
      setLastSaved(data.note.updatedAt || new Date().toISOString());
      setVersions(data.versions || []);
    } catch (err) {
      setError(err.message);
      console.error("Failed to load note:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Send cursor position to server
  const sendCursorPosition = useCallback((cursorPosition, selection) => {
    if (!socketRef.current || !socketConnected) return;
    
    if (cursorDebounceRef.current) {
      clearTimeout(cursorDebounceRef.current);
    }
    
    cursorDebounceRef.current = setTimeout(() => {
      socketRef.current.emit("cursor_update", {
        cursorPosition,
        selection,
        noteId: note?._id
      });
    }, 100);
  }, [socketConnected, note]);

  // Handle textarea cursor events
  const handleTextareaCursor = useCallback((e) => {
    if (!textareaRef.current || !note?._id) return;
    
    const textarea = textareaRef.current;
    const cursorPos = e.target.selectionStart;
    const text = textarea.value;
    
    // Calculate cursor position in pixels
    const tempDiv = document.createElement("div");
    tempDiv.style.cssText = window.getComputedStyle(textarea).cssText;
    tempDiv.style.position = "absolute";
    tempDiv.style.visibility = "hidden";
    tempDiv.style.whiteSpace = "pre-wrap";
    tempDiv.style.wordWrap = "break-word";
    tempDiv.style.width = textarea.clientWidth + "px";
    document.body.appendChild(tempDiv);
    
    const textBeforeCursor = text.substring(0, cursorPos);
    tempDiv.textContent = textBeforeCursor;
    
    const cursorPosition = {
      x: tempDiv.clientWidth,
      y: tempDiv.clientHeight
    };
    
    document.body.removeChild(tempDiv);
    
    // Get selection info
    const selection = {
      start: e.target.selectionStart,
      end: e.target.selectionEnd,
      height: e.target.offsetHeight / 20 // Approximate line height
    };
    
    sendCursorPosition(cursorPosition, selection);
  }, [note, sendCursorPosition]);

  // Stable connectSocket function
  const connectSocket = useCallback((noteId) => {
    if (!noteId || socketRef.current?.connected) return;

    // Disconnect existing socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const userName = `User-${Math.random().toString(36).slice(2, 8)}`;
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      setSocketConnected(true);
      socket.emit("join_note", { noteId, userName });
    });

    socket.on("note_loaded", ({ content: serverContent, updatedAt, versions: serverVersions }) => {
      console.log("Note loaded from server");
      setContent(prev => prev || serverContent || "");
      if (updatedAt) setLastSaved(updatedAt);
      if (serverVersions) setVersions(serverVersions);
    });

    socket.on("note_update_broadcast", ({ content: newContent, updatedAt }) => {
      console.log("Received broadcast update");
      setContent(prev => prev === newContent ? prev : newContent);
      if (updatedAt) setLastSaved(updatedAt);
    });

    socket.on("active_users", ({ users: activeUsers }) => {
      console.log("Active users updated:", activeUsers.length);
      setUsers(activeUsers || []);
    });

    socket.on("cursor_update", ({ userId, cursorPosition, selection }) => {
      // This would be handled by the CursorPresence component
      console.log("Cursor update from:", userId);
    });

    socket.on("autosave", ({ updatedAt }) => {
      console.log("Autosave completed");
      if (updatedAt) setLastSaved(updatedAt);
    });

    socket.on("versions_updated", ({ versions: newVersions }) => {
      setVersions(newVersions);
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
      setError(error.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      setSocketConnected(false);
      setUsers([]);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
      setSocketConnected(false);
    });

    return socket;
  }, []);

  // Stable sendUpdate function
  const sendUpdate = useCallback((noteId, value) => {
    if (!socketRef.current || !socketConnected) {
      console.warn("Socket not connected, falling back to API");
      updateNoteById(noteId, value)
        .then(updatedNote => {
          setLastSaved(updatedNote.updatedAt);
        })
        .catch(err => console.error("API update failed:", err));
      return;
    }
    
    socketRef.current.emit("note_update", { noteId, content: value });
  }, [socketConnected]);

  // Stable handleContentChange function
  const handleContentChange = useCallback((noteId, value) => {
    setContent(value);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      sendUpdate(noteId, value);
    }, 300);
  }, [sendUpdate]);

  // Stable saveNote function
  const saveNote = useCallback(async (noteId) => {
    if (!noteId) return;
    
    try {
      const updatedNote = await updateNoteById(noteId, content);
      setLastSaved(updatedNote.updatedAt);
      
      // Refresh versions after manual save
      if (noteId === note?._id) {
        const data = await fetchNoteById(noteId);
        setVersions(data.versions || []);
      }
      
      console.log("Manual save successful");
    } catch (err) {
      console.error("Save failed:", err.message);
      setError(err.message);
    }
  }, [content, note]);

  // Function to restore a version
  const restoreVersion = useCallback(async (versionContent) => {
    if (!note?._id) return;
    
    try {
      setContent(versionContent);
      sendUpdate(note._id, versionContent);
      
      const updatedNote = await updateNoteById(note._id, versionContent);
      setLastSaved(updatedNote.updatedAt);
      
      // Refresh versions
      const data = await fetchNoteById(note._id);
      setVersions(data.versions || []);
      
      console.log("Version restored successfully");
    } catch (err) {
      console.error("Version restore failed:", err.message);
      setError(err.message);
    }
  }, [note, sendUpdate]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (cursorDebounceRef.current) {
        clearTimeout(cursorDebounceRef.current);
      }
    };
  }, []);

  // Memoized context value
  const contextValue = useMemo(() => ({
    note,
    content,
    lastSaved,
    users,
    versions,
    loading,
    error,
    socketConnected,
    socket: socketRef.current,
    textareaRef,
    loadNote,
    connectSocket,
    handleContentChange,
    handleTextareaCursor,
    saveNote,
    restoreVersion,
  }), [
    note,
    content,
    lastSaved,
    users,
    versions,
    loading,
    error,
    socketConnected,
    loadNote,
    connectSocket,
    handleContentChange,
    handleTextareaCursor,
    saveNote,
    restoreVersion,
  ]);

  return (
    <NotesContext.Provider value={contextValue}>
      {children}
    </NotesContext.Provider>
  );
};