import { useEffect, useRef } from "react";
import { stringToColor } from "../utils/helperFunctions";

export default function CursorPresence({ users = [], noteId, socket }) {
  const cursorContainerRef = useRef(null);
  const cursorRefs = useRef({});

  useEffect(() => {
    if (!socket || !cursorContainerRef.current) return;

    const handleCursorUpdate = ({ userId, cursorPosition, selection }) => {
      let cursorEl = cursorRefs.current[userId];
      
      if (!cursorEl) {
        cursorEl = document.createElement("div");
        cursorEl.className = "remote-cursor";
        cursorEl.dataset.userId = userId;
        
        const user = users.find(u => u.id === userId);
        if (user) {
          const color = stringToColor(user.name);
          cursorEl.style.borderLeftColor = color;
          
          const label = document.createElement("div");
          label.className = "cursor-label";
          label.textContent = user.name;
          label.style.backgroundColor = color;
          cursorEl.appendChild(label);
        }
        
        cursorContainerRef.current.appendChild(cursorEl);
        cursorRefs.current[userId] = cursorEl;
      }

      if (cursorPosition) {
        cursorEl.style.left = `${cursorPosition.x}px`;
        cursorEl.style.top = `${cursorPosition.y}px`;
        cursorEl.style.display = "block";
      }

      if (selection) {
        cursorEl.style.height = `${selection.height}px`;
      }
    };

    const handleCursorLeave = ({ userId }) => {
      const cursorEl = cursorRefs.current[userId];
      if (cursorEl) {
        cursorEl.style.display = "none";
      }
    };

    socket.on("cursor_update", handleCursorUpdate);
    socket.on("cursor_leave", handleCursorLeave);

    return () => {
      socket.off("cursor_update", handleCursorUpdate);
      socket.off("cursor_leave", handleCursorLeave);
    };
  }, [socket, users]);

  // Clean up cursors when users leave
  useEffect(() => {
    const currentUserIds = users.map(u => u.id);
    Object.keys(cursorRefs.current).forEach(userId => {
      if (!currentUserIds.includes(userId)) {
        const cursorEl = cursorRefs.current[userId];
        if (cursorEl && cursorEl.parentNode) {
          cursorEl.parentNode.removeChild(cursorEl);
        }
        delete cursorRefs.current[userId];
      }
    });
  }, [users]);

  return <div ref={cursorContainerRef} className="cursor-container"></div>;
}

