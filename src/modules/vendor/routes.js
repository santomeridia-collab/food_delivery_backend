'use strict';

const { Router } = require('express');
const router = Router();
const authenticate = require('../../common/middleware/authenticate');
const authorize = require('../../common/middleware/authorize');
const controller = require('./controller');

const guard = [authenticate, authorize('restaurant_owner')];

// Dashboard
router.get('/dashboard',                    ...guard, controller.getDashboard);

// Orders
router.get('/orders/incoming',              ...guard, controller.getIncomingOrders);
router.get('/orders/active',                ...guard, controller.getActiveOrders);
router.get('/orders/completed',             ...guard, controller.getCompletedOrders);
router.post('/orders/accept-all',           ...guard, controller.acceptAllOrders);
router.post('/orders/:orderId/accept',      ...guard, controller.acceptOrder);
router.post('/orders/:orderId/reject',      ...guard, controller.rejectOrder);
router.post('/orders/:orderId/ready',       ...guard, controller.markReady);
router.post('/orders/:orderId/delay',       ...guard, controller.delayOrder);

// Restaurant profile
router.get('/profile',                      ...guard, controller.getProfile);
router.put('/profile',                      ...guard, controller.updateProfile);
router.post('/profile/toggle-open',         ...guard, controller.toggleOpen);

// Menu management
router.get('/menu',                         ...guard, controller.getMenu);
router.post('/menu',                        ...guard, controller.addMenuItem);
router.put('/menu/:itemId',                 ...guard, controller.updateMenuItem);
router.patch('/menu/:itemId/toggle',        ...guard, controller.toggleMenuItemAvailability);
router.delete('/menu/:itemId',              ...guard, controller.deleteMenuItem);

module.exports = router;
