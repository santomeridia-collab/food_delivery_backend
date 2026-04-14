const { Server } = require("socket.io");
const { verifyToken } = require("../common/utils/jwt");
const { DELIVERY_PARTNER } = require("../common/constants/roles");

/**
 * Initialize Socket.IO on the given HTTP server.
 * @param {import("http").Server} httpServer
 * @returns {import("socket.io").Server}
 */
function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  // JWT auth middleware
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) {
      return next(new Error("Authentication error: token missing"));
    }

    try {
      const decoded = verifyToken(token);
      socket.data.userId = decoded.id;
      socket.data.role = decoded.role;
      next();
    } catch {
      next(new Error("Authentication error: invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const { userId, role } = socket.data;

    // Delivery agents join the shared room; everyone else joins their own room
    if (role === DELIVERY_PARTNER) {
      socket.join("delivery_agents");
    }
    socket.join(`user:${userId}`);

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id} (user: ${userId})`);
    });
  });

  return io;
}

module.exports = { initSocket };
