'use strict';

const { Server } = require('socket.io');

/**
 * Initialize Socket.IO on the HTTP server.
 * Stub — full implementation in task 11.1
 * @param {import('http').Server} server
 * @returns {import('socket.io').Server}
 */
function initSockets(server) {
  const io = new Server(server, {
    cors: { origin: '*' },
  });

  return io;
}

module.exports = { initSockets };
