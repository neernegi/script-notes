import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useNotes } from "../context/NotesContext";
import RichTextEditor from "../components/RichTextEditor";
import VersionHistory from "../components/VersionHistory";
import Notification from "../components/Notification";
import ActiveUsers from "../components/ActiveUser";
import { useNavigate } from "react-router-dom";

export default function NoteEditor() {
  const { id } = useParams();
  const {
    note,
    content,
    lastSaved,
    users,
    versions,
    loading,
    error,
    socketConnected,
    socket,
    loadNote,
    connectSocket,
    handleContentChange,
    saveNote,
  } = useNotes();

  const [notification, setNotification] = useState(null);
  const hasLoaded = useRef(false);
  const socketInitialized = useRef(false);
  const navigate = useNavigate();

  // Load note only once when ID changes
  useEffect(() => {
    if (id && !hasLoaded.current) {
      hasLoaded.current = true;
      loadNote(id);
    }
  }, [id, loadNote]);

  // Connect socket only once after note is loaded
  useEffect(() => {
    if (id && note && !socketInitialized.current) {
      socketInitialized.current = true;
      const socketInstance = connectSocket(id);

      return () => {
        if (socketInstance) {
          socketInstance.disconnect();
        }
        socketInitialized.current = false;
      };
    }
  }, [id, note, connectSocket]);

  // Before unload warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (content !== note?.content) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [content, note]);

  // Handle copy link with notification
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNotification({
        message: "Link copied to clipboard!",
        type: "success",
      });
    } catch (err) {
      console.error("Failed to copy link:", err);
      setNotification({
        message: "Failed to copy link. Please try again.",
        type: "error",
      });
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading note...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Error</h3>
        <p>{error}</p>
        <button onClick={() => navigate("/")}>Go Home</button>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="not-found">
        <h3>Note not found</h3>
        <button onClick={() => navigate("/")}>Create New Note</button>
      </div>
    );
  }

  return (
    <div className="editor-page">
      {/* Notification Popup */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="editor-header">
        <div className="header-left">
          <h2>{note.title}</h2>
          <div className="status-indicators">
            <span
              className={`connection-status ${
                socketConnected ? "connected" : "disconnected"
              }`}
            >
              ● {socketConnected ? "Connected" : "Disconnected"}
            </span>
            <span className="last-saved">
              Last saved:{" "}
              {lastSaved ? new Date(lastSaved).toLocaleTimeString() : "Never"}
            </span>
            <span className="collaborators-count">
              👥 {users.length} active
            </span>
          </div>
        </div>
        <div className="header-actions">
          <button
            onClick={() => saveNote(id)}
            className="save-btn"
            disabled={!socketConnected}
          >
            💾 Save Now
          </button>
          <button
            onClick={handleCopyLink}
            className="share-btn"
            title="Copy shareable link to clipboard"
          >
            🔗 Copy Share Link
          </button>
        </div>
      </div>

      <div className="editor-body">
        <div className="editor-main">
          <div className="editor-container" style={{ position: "relative" }}>
            <RichTextEditor
              value={content}
              onChange={(value) => handleContentChange(id, value)}
              disabled={!socketConnected}
            />
          </div>

          <VersionHistory noteId={id} versions={versions} />

          {!socketConnected && (
            <div className="disconnected-warning">
              <p>⚠️ Reconnecting to server... Updates may not sync.</p>
            </div>
          )}
        </div>

        <aside className="editor-side">
          <ActiveUsers users={users} />
        </aside>
      </div>
    </div>
  );
}
