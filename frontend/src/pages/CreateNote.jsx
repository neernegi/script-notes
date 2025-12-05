import { useState } from "react";
import { createNote } from "../api/notesApi";
import { useNavigate } from "react-router-dom";

export default function CreateNote() {
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return setError("Title is required");

    setCreating(true);
    setError("");

    try {
      const note = await createNote({ title: title.trim() });
      navigate(`/note/${note._id}`);
    } catch (err) {
      setError(err.message || "Failed to create note");
      setCreating(false);
    }
  };

  return (
    <div className="page-container">
      <h2>Create a Note Room</h2>
      <p className="subtitle">Start collaborating in real-time</p>

      <form onSubmit={handleCreate} className="create-form">
        <div className="form-group">
          <label htmlFor="title">Note Title</label>
          <input
            id="title"
            type="text"
            placeholder="Enter a title for your note..."
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError("");
            }}
            disabled={creating}
            autoFocus
          />
        </div>

        <button
          type="submit"
          disabled={creating || !title.trim()}
          className="create-btn"
        >
          {creating ? "Creating..." : "Create Note Room"}
        </button>
      </form>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      <div className="info-box">
        <p>
          Once created, you'll get a unique URL to share with collaborators.
        </p>
        <p>All changes sync in real-time automatically.</p>
      </div>
    </div>
  );
}
