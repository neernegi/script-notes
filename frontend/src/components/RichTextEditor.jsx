import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "github-markdown-css";

export default function RichTextEditor({ value, onChange, disabled }) {
  const [activeTab, setActiveTab] = useState("write");
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  return (
    <div className="rich-text-editor">
      <div className="editor-tabs">
        <button
          className={`tab-btn ${activeTab === "write" ? "active" : ""}`}
          onClick={() => setActiveTab("write")}
        >
          ✍️ Write
        </button>
        <button
          className={`tab-btn ${activeTab === "preview" ? "active" : ""}`}
          onClick={() => setActiveTab("preview")}
        >
          👁️ Preview
        </button>
        <button
          className={`tab-btn ${activeTab === "both" ? "active" : ""}`}
          onClick={() => setActiveTab("both")}
        >
          📊 Both
        </button>
      </div>

      <div className="editor-content">
        {activeTab === "write" && (
          <div className="write-view">
            <textarea
              value={localValue}
              onChange={handleChange}
              placeholder="Start typing in Markdown... Use # for headers, **bold**, *italic*, etc."
              disabled={disabled}
              className="markdown-input"
            />
            <div className="markdown-help">
              <h4>Markdown Tips:</h4>
              <ul>
                <li><code># Header 1</code></li>
                <li><code>## Header 2</code></li>
                <li><code>**Bold**</code></li>
                <li><code>*Italic*</code></li>
                <li><code>- List item</code></li>
                <li><code>[Link](url)</code></li>
                <li><code>```code block```</code></li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === "preview" && (
          <div className="preview-view markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {localValue || "*Nothing to preview*"}
            </ReactMarkdown>
          </div>
        )}

        {activeTab === "both" && (
          <div className="split-view">
            <div className="split-left">
              <textarea
                value={localValue}
                onChange={handleChange}
                placeholder="Write Markdown here..."
                disabled={disabled}
                className="markdown-input"
              />
            </div>
            <div className="split-right markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {localValue || "*Preview will appear here*"}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}