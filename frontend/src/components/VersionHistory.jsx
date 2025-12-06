import { useState, useEffect } from "react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function VersionHistory({ noteId, versions = [] }) {
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <div className="version-history-collapsed">
        <button onClick={() => setExpanded(true)} className="expand-btn">
          📜 Show History ({versions.length} versions)
        </button>
      </div>
    );
  }

  return (
    <div className="version-history">
      <div className="version-header">
        <h4>Version History</h4>
        <button onClick={() => setExpanded(false)} className="close-btn">
          ✕
        </button>
      </div>

      <div className="version-list">
        {versions.length === 0 ? (
          <p className="no-versions">No versions saved yet.</p>
        ) : (
          <ul>
            {versions.map((version, index) => (
              <li
                key={version._id || index}
                className={`version-item ${
                  selectedVersion?._id === version._id ? "selected" : ""
                }`}
                onClick={() => setSelectedVersion(version)}
              >
                <div className="version-info">
                  <span className="version-time">
                    {format(
                      new Date(version.createdAt),
                      "MMM dd, yyyy HH:mm:ss"
                    )}
                  </span>
                  <span className="version-meta">
                    {version.meta?.autoSave
                      ? "Auto-save"
                      : version.meta?.apiUpdate
                      ? "Manual save"
                      : version.meta?.socketUpdate
                      ? "Real-time update"
                      : "Update"}
                  </span>
                </div>
                <div className="version-preview">
                  {version.content?.substring(0, 100)}
                  {version.content?.length > 100 ? "..." : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedVersion && (
        <div className="version-detail">
          <div className="detail-header">
            <h5>Version Preview</h5>
            <small>{format(new Date(selectedVersion.createdAt), "PPpp")}</small>
          </div>
          <div className="detail-content markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {selectedVersion.content}
            </ReactMarkdown>
          </div>
          <div className="detail-actions">
            <button
              onClick={() => setSelectedVersion(null)}
              className="cancel-btn"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
