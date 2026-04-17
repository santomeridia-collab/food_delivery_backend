'use strict';

const service = require('./service');
const { success } = require('../../common/utils/response');

const GET = (fn) => async (req, res, next) => {
  try { return success(res, fn.name.replace(/([A-Z])/g, ' $1').trim() + ' retrieved', await fn(req.user.id, req.query)); }
  catch (err) { next(err); }
};

/** GET /vendor/dashboard */
async function getDashboard(req, res, next) {
  try {
    return success(res, 'Dashboard retrieved', await service.getDashboard(req.user.id));
  } catch (err) { next(err); }
}

/** GET /vendor/orders/incoming */
async function getIncomingOrders(req, res, next) {
  try {
    return success(res, 'Incoming orders retrieved', await service.getIncomingOrders(req.user.id));
  } catch (err) { next(err); }
}

/** GET /vendor/orders/active */
async function getActiveOrders(req, res, next) {
  try {
    return success(res, 'Active orders retrieved', await service.getActiveOrders(req.user.id));
  } catch (err) { next(err); }
}

/** GET /vendor/orders/completed */
async function getCompletedOrders(req, res, next) {
  try {
    const { page, limit } = req.query;
    return success(res, 'Completed orders retrieved', await service.getCompletedOrders(req.user.id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    }));
  } catch (err) { next(err); }
}

/** POST /vendor/orders/:orderId/accept */
async function acceptOrder(req, res, next) {
  try {
    return success(res, 'Order accepted', await service.acceptOrder(req.user.id, req.params.orderId));
  } catch (err) { next(err); }
}

/** POST /vendor/orders/:orderId/reject */
async function rejectOrder(req, res, next) {
  try {
    return success(res, 'Order rejected', await service.rejectOrder(req.user.id, req.params.orderId));
  } catch (err) { next(err); }
}

/** POST /vendor/orders/:orderId/ready */
async function markReady(req, res, next) {
  try {
    return success(res, 'Order marked ready', await service.markReady(req.user.id, req.params.orderId));
  } catch (err) { next(err); }
}

/** POST /vendor/orders/:orderId/delay */
async function delayOrder(req, res, next) {
  try {
    return success(res, 'Order marked as delayed', await service.delayOrder(req.user.id, req.params.orderId));
  } catch (err) { next(err); }
}

/** POST /vendor/orders/accept-all */
async function acceptAllOrders(req, res, next) {
  try {
    return success(res, 'All pending orders accepted', await service.acceptAllOrders(req.user.id));
  } catch (err) { next(err); }
}

/** GET /vendor/profile */
async function getProfile(req, res, next) {
  try {
    return success(res, 'Restaurant profile retrieved', await service.getProfile(req.user.id));
  } catch (err) { next(err); }
}

/** PUT /vendor/profile */
async function updateProfile(req, res, next) {
  try {
    return success(res, 'Restaurant profile updated', await service.updateProfile(req.user.id, req.body));
  } catch (err) { next(err); }
}

/** POST /vendor/profile/toggle-open */
async function toggleOpen(req, res, next) {
  try {
    return success(res, 'Restaurant status toggled', await service.toggleOpen(req.user.id));
  } catch (err) { next(err); }
}

/** GET /vendor/menu */
async function getMenu(req, res, next) {
  try {
    return success(res, 'Menu retrieved', await service.getMenu(req.user.id, req.query));
  } catch (err) { next(err); }
}

/** POST /vendor/menu */
async function addMenuItem(req, res, next) {
  try {
    return success(res, 'Menu item added', await service.addMenuItem(req.user.id, req.body), 201);
  } catch (err) { next(err); }
}

/** PUT /vendor/menu/:itemId */
async function updateMenuItem(req, res, next) {
  try {
    return success(res, 'Menu item updated', await service.updateMenuItem(req.user.id, req.params.itemId, req.body));
  } catch (err) { next(err); }
}

/** PATCH /vendor/menu/:itemId/toggle */
async function toggleMenuItemAvailability(req, res, next) {
  try {
    return success(res, 'Menu item availability toggled', await service.toggleMenuItemAvailability(req.user.id, req.params.itemId));
  } catch (err) { next(err); }
}

/** DELETE /vendor/menu/:itemId */
async function deleteMenuItem(req, res, next) {
  try {
    await service.deleteMenuItem(req.user.id, req.params.itemId);
    return success(res, 'Menu item deleted', null);
  } catch (err) { next(err); }
}

module.exports = {
  getDashboard,
  getIncomingOrders, getActiveOrders, getCompletedOrders,
  acceptOrder, rejectOrder, markReady, delayOrder, acceptAllOrders,
  getProfile, updateProfile, toggleOpen,
  getMenu, addMenuItem, updateMenuItem, toggleMenuItemAvailability, deleteMenuItem,
};
