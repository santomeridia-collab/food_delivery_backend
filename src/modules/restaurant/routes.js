'use strict';

const { Router } = require('express');
const controller = require('./controller');
const { listRestaurantsSchema, addMenuItemSchema, updateMenuItemSchema } = require('./validation');
const validate = require('../../common/middleware/validate');
const authenticate = require('../../common/middleware/authenticate');
const authorize = require('../../common/middleware/authorize');
const { RESTAURANT_OWNER } = require('../../common/constants/roles');

const router = Router();

// Public routes
router.get('/',    validate(listRestaurantsSchema, 'query'), controller.listRestaurants);
router.get('/:id', controller.getRestaurantDetails);

// Restaurant owner routes
router.post('/:id/menu',          authenticate, authorize(RESTAURANT_OWNER), validate(addMenuItemSchema),    controller.addMenuItem);
router.patch('/:id/menu/:itemId', authenticate, authorize(RESTAURANT_OWNER), validate(updateMenuItemSchema), controller.updateMenuItem);

module.exports = router;
