import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useNotes } from "../context/NotesContext";
import RichTextEditor from "../components/RichTextEditor";
import VersionHistory from "../components/VersionHistory";
import CursorPresence from "../components/CursorPresence";
import Notification from "../components/Notification";
import ActiveUsers from "../components/ActiveUser";
import { stringToColor } from "../utils/helperFunctions";

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
    textareaRef,
    loadNote,
    connectSocket,
    handleContentChange,
    handleTextareaCursor,
    saveNote,
    restoreVersion,
  } = useNotes();

  const [notification, setNotification] = useState(null);
  const hasLoaded = useRef(false);
  const socketInitialized = useRef(false);

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
        <button onClick={() => (window.location.href = "/")}>Go Home</button>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="not-found">
        <h3>Note not found</h3>
        <button onClick={() => (window.location.href = "/")}>
          Create New Note
        </button>
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
            <CursorPresence users={users} noteId={id} socket={socket} />
          </div>

          <VersionHistory
            noteId={id}
            versions={versions}
            onRestore={restoreVersion}
          />

          {!socketConnected && (
            <div className="disconnected-warning">
              <p>⚠️ Reconnecting to server... Updates may not sync.</p>
            </div>
          )}
        </div>

        <aside className="editor-side">
          <ActiveUsers users={users} />

          <div className="stats-box">
            <h4>📊 Note Statistics</h4>
            <div className="stat-item">
              <span>Characters:</span>
              <span>{content.length}</span>
            </div>
            <div className="stat-item">
              <span>Words:</span>
              <span>
                {content.trim() ? content.trim().split(/\s+/).length : 0}
              </span>
            </div>
            <div className="stat-item">
              <span>Lines:</span>
              <span>{content.split("\n").length}</span>
            </div>
            <div className="stat-item">
              <span>Active Collaborators:</span>
              <span>{users.length}</span>
            </div>
            <div className="stat-item">
              <span>Versions Saved:</span>
              <span>{versions.length}</span>
            </div>
          </div>

          <div className="cursor-help">
            <h4>🖱️ Live Cursors</h4>
            <p>See where others are typing in real-time!</p>
            <div className="cursor-examples">
              {users.slice(0, 3).map((user) => {
                const color = stringToColor(user.name);
                return (
                  <div key={user.id} className="cursor-example">
                    <div
                      className="cursor-sample"
                      style={{ borderLeftColor: color }}
                    ></div>
                    <span>{user.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
