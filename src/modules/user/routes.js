'use strict';

const { Router } = require('express');
const controller = require('./controller');
const { updateProfileSchema, addAddressSchema } = require('./validation');
const validate = require('../../common/middleware/validate');
const authenticate = require('../../common/middleware/authenticate');
const authorize = require('../../common/middleware/authorize');

const router = Router();

router.get('/me',             authenticate,                                    controller.getProfile);
router.patch('/me',           authenticate, validate(updateProfileSchema),     controller.updateProfile);
router.post('/addresses',     authenticate, authorize('customer'), validate(addAddressSchema), controller.addAddress);
router.delete('/addresses/:id', authenticate, authorize('customer'),           controller.deleteAddress);

module.exports = router;
