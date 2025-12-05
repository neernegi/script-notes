import http from "http";
import app from "./app.js";
import createSocketServer from "./socket.js";

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

// Initialize Socket.IO and export it
const io = createSocketServer(server);

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});

// Export io for potential use in other files
export { io };