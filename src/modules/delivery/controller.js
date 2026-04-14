'use strict';

const service = require('./service');
const { success } = require('../../common/utils/response');

/** POST /delivery/:orderId/accept */
async function acceptOrder(req, res, next) {
  try {
    const order = await service.acceptOrder(req.params.orderId, req.user.id);
    return success(res, 'Order accepted successfully', order);
  } catch (err) {
    next(err);
  }
}

/** POST /delivery/:orderId/location */
async function updateLocation(req, res, next) {
  try {
    const io = req.app.get('io');
    const tracking = await service.updateLocation(
      req.params.orderId,
      req.user.id,
      req.body.lat,
      req.body.lng,
      io
    );
    return success(res, 'Location updated successfully', tracking);
  } catch (err) {
    next(err);
  }
}

/** POST /delivery/:orderId/complete */
async function completeOrder(req, res, next) {
  try {
    const io = req.app.get('io');
    const order = await service.completeOrder(req.params.orderId, req.user.id, io);
    return success(res, 'Order completed successfully', order);
  } catch (err) {
    next(err);
  }
}

module.exports = { acceptOrder, updateLocation, completeOrder };
