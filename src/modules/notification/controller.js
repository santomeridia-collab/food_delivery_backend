const notificationService = require("./service");
const { success } = require("../../common/utils/response");

const getNotifications = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await notificationService.getNotifications({
      userId: req.user.id,
      page,
      limit
    });

    return success(res, "Notifications fetched successfully", result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getNotifications
};