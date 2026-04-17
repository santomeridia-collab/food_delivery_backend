'use strict';

const service = require('./service');
const profileService = require('./profile.service');
const { success } = require('../../common/utils/response');

/** GET /delivery/dashboard */
async function getDashboard(req, res, next) {
  try {
    const data = await service.getDashboard(req.user.id);
    return success(res, 'Dashboard retrieved', data);
  } catch (err) { next(err); }
}

/** POST /delivery/online */
async function goOnline(req, res, next) {
  try {
    const result = await service.goOnline(req.user.id);
    return success(res, result.message, result.session || null);
  } catch (err) { next(err); }
}

/** POST /delivery/offline */
async function goOffline(req, res, next) {
  try {
    const result = await service.goOffline(req.user.id);
    return success(res, result.message, result.session || null);
  } catch (err) { next(err); }
}

/** GET /delivery/orders/available */
async function getAvailableOrders(req, res, next) {
  try {
    const { page, limit } = req.query;
    const result = await service.getAvailableOrders({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
    return success(res, 'Available orders retrieved', result);
  } catch (err) { next(err); }
}

/** GET /delivery/orders/active */
async function getActiveDelivery(req, res, next) {
  try {
    const tracking = await service.getActiveDelivery(req.user.id);
    return success(res, 'Active delivery retrieved', tracking);
  } catch (err) { next(err); }
}

/** GET /delivery/orders/history */
async function getDeliveryHistory(req, res, next) {
  try {
    const { page, limit } = req.query;
    const result = await service.getDeliveryHistory(req.user.id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
    return success(res, 'Delivery history retrieved', result);
  } catch (err) { next(err); }
}

/** POST /delivery/:orderId/accept */
async function acceptOrder(req, res, next) {
  try {
    const order = await service.acceptOrder(req.params.orderId, req.user.id);
    return success(res, 'Order accepted successfully', order);
  } catch (err) { next(err); }
}

/** POST /delivery/:orderId/reject */
async function rejectOrder(req, res, next) {
  try {
    // Rejection is a no-op for the agent — order stays available for others
    return success(res, 'Order rejected', null);
  } catch (err) { next(err); }
}

/** POST /delivery/:orderId/location */
async function updateLocation(req, res, next) {
  try {
    const io = req.app.get('io');
    const tracking = await service.updateLocation(
      req.params.orderId, req.user.id, req.body.lat, req.body.lng, io
    );
    return success(res, 'Location updated successfully', tracking);
  } catch (err) { next(err); }
}

/** POST /delivery/:orderId/complete */
async function completeOrder(req, res, next) {
  try {
    const io = req.app.get('io');
    const order = await service.completeOrder(req.params.orderId, req.user.id, io);
    return success(res, 'Order completed successfully', order);
  } catch (err) { next(err); }
}

// ─── Profile ──────────────────────────────────────────────────────────────────

/** GET /delivery/profile */
async function getFullProfile(req, res, next) {
  try {
    const profile = await profileService.getFullProfile(req.user.id);
    return success(res, 'Profile retrieved', profile);
  } catch (err) { next(err); }
}

/** GET /delivery/profile/vehicle */
async function getVehicle(req, res, next) {
  try {
    const vehicle = await profileService.getVehicle(req.user.id);
    return success(res, 'Vehicle details retrieved', vehicle);
  } catch (err) { next(err); }
}

/** PUT /delivery/profile/vehicle */
async function upsertVehicle(req, res, next) {
  try {
    const vehicle = await profileService.upsertVehicle(req.user.id, req.body);
    return success(res, 'Vehicle details saved', vehicle);
  } catch (err) { next(err); }
}

/** GET /delivery/profile/documents */
async function getDocuments(req, res, next) {
  try {
    const docs = await profileService.getDocuments(req.user.id);
    return success(res, 'Documents retrieved', docs);
  } catch (err) { next(err); }
}

/** PUT /delivery/profile/documents/:type */
async function upsertDocument(req, res, next) {
  try {
    const doc = await profileService.upsertDocument(req.user.id, req.params.type, req.body);
    return success(res, 'Document saved', doc);
  } catch (err) { next(err); }
}

/** GET /delivery/profile/bank */
async function getBankDetail(req, res, next) {
  try {
    const bank = await profileService.getBankDetail(req.user.id);
    return success(res, 'Bank details retrieved', bank);
  } catch (err) { next(err); }
}

/** PUT /delivery/profile/bank */
async function upsertBankDetail(req, res, next) {
  try {
    const bank = await profileService.upsertBankDetail(req.user.id, req.body);
    return success(res, 'Bank details saved', bank);
  } catch (err) { next(err); }
}

module.exports = {
  getDashboard, goOnline, goOffline,
  getAvailableOrders, getActiveDelivery, getDeliveryHistory,
  acceptOrder, rejectOrder, updateLocation, completeOrder,
  getFullProfile, getVehicle, upsertVehicle,
  getDocuments, upsertDocument, getBankDetail, upsertBankDetail,
};
