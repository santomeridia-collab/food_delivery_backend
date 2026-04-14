/**
 * Emit an order status update to the relevant customer.
 * Satisfies Requirement 11.3
 * @param {import("socket.io").Server} io
 * @param {string} customerId
 * @param {object} payload
 */
function emitOrderStatusUpdate(io, customerId, payload) {
  io.to(`user:${customerId}`).emit("order_status_update", payload);
}

/**
 * Emit a new order notification to the relevant restaurant owner.
 * Satisfies Requirement 11.5
 * @param {import("socket.io").Server} io
 * @param {string} ownerId
 * @param {object} payload
 */
function emitNewOrder(io, ownerId, payload) {
  io.to(`user:${ownerId}`).emit("new_order", payload);
}

module.exports = { emitOrderStatusUpdate, emitNewOrder };
