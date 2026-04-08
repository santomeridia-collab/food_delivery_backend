'use strict';

const service = require('./service');
const { success } = require('../../common/utils/response');

/** GET /users/me */
async function getProfile(req, res, next) {
  try {
    const profile = await service.getProfile(req.user.id);
    return success(res, profile);
  } catch (err) { next(err); }
}

/** PATCH /users/me */
async function updateProfile(req, res, next) {
  try {
    const profile = await service.updateProfile(req.user.id, req.body);
    return success(res, profile);
  } catch (err) { next(err); }
}

/** POST /users/addresses */
async function addAddress(req, res, next) {
  try {
    const address = await service.addAddress(req.user.id, req.body);
    return success(res, address, 201);
  } catch (err) { next(err); }
}

/** DELETE /users/addresses/:id */
async function deleteAddress(req, res, next) {
  try {
    await service.deleteAddress(req.user.id, parseInt(req.params.id, 10));
    return success(res, { message: 'Address deleted' });
  } catch (err) { next(err); }
}

module.exports = { getProfile, updateProfile, addAddress, deleteAddress };
