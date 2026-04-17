'use strict';

/**
 * Exports a configured Express app for use with supertest.
 * Uses the real module routes (not the stubs in server.js).
 * Does NOT call server.listen().
 */

require('dotenv').config({ path: '.env.test' });

const express = require('express');
const http = require('http');
const { initSocket } = require('../../src/sockets');
const errorHandler = require('../../src/common/middleware/errorHandler');

// Real module routes
const authRoutes = require('../../src/modules/auth/routes');
const userRoutes = require('../../src/modules/user/routes');
const restaurantRoutes = require('../../src/modules/restaurant/routes');
const orderRoutes = require('../../src/modules/order/routes');
const deliveryRoutes = require('../../src/modules/delivery/routes');
const paymentRoutes = require('../../src/modules/payment/routes');
const notificationRoutes = require('../../src/modules/notification/routes');
const adminRoutes = require('../../src/modules/admin/routes');
const cartRoutes = require('../../src/modules/cart/routes');
const vendorRoutes = require('../../src/modules/vendor/routes');

function createApp() {
  const app = express();
  const server = http.createServer(app);
  const io = initSocket(server);

  app.use(express.json());

  app.get('/', (req, res) => res.json({ success: true, message: 'API is running' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/restaurants', restaurantRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/delivery', deliveryRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/vendor', vendorRoutes);

  app.set('io', io);
  app.use(errorHandler);

  return { app, server, io };
}

module.exports = { createApp };
