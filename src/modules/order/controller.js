'use strict';

const service = require('./service');
const { success } = require('../../common/utils/response');

/** POST /orders */
async function createOrder(req, res, next) {
  try {
    const order = await service.createOrder(req.user.id, req.body);
    return success(res, order, 201);
  } catch (err) { next(err); }
}

/** GET /orders */
async function getOrders(req, res, next) {
  try {
    const { page, limit } = req.query;
    const result = await service.getOrders(req.user.id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
    return success(res, result);
  } catch (err) { next(err); }
}

/** POST /orders/:id/cancel */
async function cancelOrder(req, res, next) {
  try {
    const order = await service.cancelOrder(parseInt(req.params.id, 10), req.user.id);
    return success(res, order);
  } catch (err) { next(err); }
}

/** PATCH /orders/:id/status */
async function updateOrderStatus(req, res, next) {
  try {
    const io = req.app.get('io');
    const order = await service.updateOrderStatus(
      parseInt(req.params.id, 10),
      req.body.status,
      io
    );
    return success(res, order);
  } catch (err) { next(err); }
}

module.exports = { createOrder, getOrders, cancelOrder, updateOrderStatus };
