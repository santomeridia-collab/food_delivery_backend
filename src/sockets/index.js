const { Server } = require("socket.io");
const { verifyToken } = require("../common/utils/jwt");
const { DELIVERY } = require("../common/constants/roles");
const prisma = require("../config/db");

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

    // Delivery agents join the shared broadcast room
    if (role === DELIVERY) {
      socket.join("delivery_agents");
    }

    // Everyone joins their personal room
    socket.join(`user:${userId}`);

    /**
     * 16.5 — Customer joins an order-specific room to receive scoped location updates.
     * Emitted by the client after placing/tracking an order.
     * Event: join_order_room  payload: { order_id }
     */
    socket.on("join_order_room", ({ order_id } = {}) => {
      if (!order_id) return;
      socket.join(`order:${order_id}`);
    });

    /**
     * 16.2 — Delivery agent emits location update via socket (alternative to HTTP endpoint).
     * Persists to DB and broadcasts to the order room.
     * Event: location:update  payload: { order_id, lat, lng }
     */
    socket.on("location:update", async ({ order_id, lat, lng } = {}) => {
      if (!order_id || lat == null || lng == null) return;
      if (role !== DELIVERY) return;

      try {
        const tracking = await prisma.deliveryTracking.findUnique({
          where: { orderId: order_id },
          include: { order: true },
        });

        if (!tracking || tracking.riderName !== String(userId)) return;

        // 16.3 — Persist latest rider location
        await prisma.deliveryTracking.update({
          where: { orderId: order_id },
          data: { currentLat: lat, currentLng: lng },
        });

        // 16.4 — Emit to order-specific room so only the relevant customer receives it
        io.to(`order:${order_id}`).emit("delivery_location", {
          order_id,
          lat,
          lng,
        });
      } catch (err) {
        console.error("[Socket] location:update error:", err.message);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id} (user: ${userId})`);
    });
  });

  return io;
}

module.exports = { initSocket };
