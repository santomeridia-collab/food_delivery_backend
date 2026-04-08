'use strict';

const service = require('./service');
const { success } = require('../../common/utils/response');

/** GET /restaurants */
async function listRestaurants(req, res, next) {
  try {
    const result = await service.listRestaurants(req.query);
    return success(res, result);
  } catch (err) { next(err); }
}

/** GET /restaurants/:id */
async function getRestaurantDetails(req, res, next) {
  try {
    const restaurant = await service.getRestaurantDetails(Number(req.params.id));
    return success(res, restaurant);
  } catch (err) { next(err); }
}

/** POST /restaurants/:id/menu */
async function addMenuItem(req, res, next) {
  try {
    const item = await service.addMenuItem(Number(req.params.id), req.user.id, req.body);
    return success(res, item, 201);
  } catch (err) { next(err); }
}

/** PATCH /restaurants/:id/menu/:itemId */
async function updateMenuItem(req, res, next) {
  try {
    const item = await service.updateMenuItem(
      Number(req.params.id),
      Number(req.params.itemId),
      req.user.id,
      req.body,
    );
    return success(res, item);
  } catch (err) { next(err); }
}

module.exports = { listRestaurants, getRestaurantDetails, addMenuItem, updateMenuItem };
