'use strict';

const { Router } = require('express');
const router = Router();

const authenticate = require('../../common/middleware/authenticate');
const authorize = require('../../common/middleware/authorize');
const validate = require('../../common/middleware/validate');

const controller = require('./controller');
const { acceptOrderSchema, updateLocationSchema, completeOrderSchema } = require('./validation');

// All delivery routes require authentication and the 'delivery' role
router.post('/:orderId/accept',   authenticate, authorize('delivery'), validate(acceptOrderSchema),   controller.acceptOrder);
router.post('/:orderId/location', authenticate, authorize('delivery'), validate(updateLocationSchema), controller.updateLocation);
router.post('/:orderId/complete', authenticate, authorize('delivery'), validate(completeOrderSchema),  controller.completeOrder);

module.exports = router;
