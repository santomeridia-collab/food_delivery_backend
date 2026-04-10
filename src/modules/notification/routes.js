const express = require("express");
const router = express.Router();

const authenticate = require("../../common/middleware/authenticate");
const notificationController = require("./controller");

router.get("/", authenticate, notificationController.getNotifications);

module.exports = router;