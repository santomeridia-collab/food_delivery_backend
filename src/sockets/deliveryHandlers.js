/**
 * Emit a delivery location update to the relevant customer.
 * Satisfies Requirement 11.4
 * @param {import("socket.io").Server} io
 * @param {string} customerId
 * @param {object} payload
 */
function emitDeliveryLocation(io, customerId, payload) {
  io.to(`user:${customerId}`).emit("delivery_location", payload);
}

/**
 * Emit a new delivery request to all available delivery agents.
 * Satisfies Requirement 11.6
 * @param {import("socket.io").Server} io
 * @param {object} payload
 */
function emitNewDeliveryRequest(io, payload) {
  io.to("delivery_agents").emit("new_delivery_request", payload);
}

module.exports = { emitDeliveryLocation, emitNewDeliveryRequest };
