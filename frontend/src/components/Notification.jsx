import { useEffect, useState } from "react";

export default function Notification({
  message,
  type = "success",
  duration = 3000,
  onClose,
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        if (onClose) onClose();
      }, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const bgColor =
    type === "success"
      ? "bg-green-100 border-green-400 text-green-700"
      : type === "error"
      ? "bg-red-100 border-red-400 text-red-700"
      : "bg-blue-100 border-blue-400 text-blue-700";

  return (
    <div className={`notification ${bgColor}`}>
      <div className="notification-content">
        {type === "success" && <span className="notification-icon">✓</span>}
        {type === "error" && <span className="notification-icon">✕</span>}
        <span className="notification-message">{message}</span>
      </div>
      <button
        onClick={() => {
          setIsVisible(false);
          if (onClose) onClose();
        }}
        className="notification-close"
      >
        ×
      </button>
    </div>
  );
}
