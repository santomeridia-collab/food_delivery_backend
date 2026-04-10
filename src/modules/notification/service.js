const prisma = require("../../config/db");
const AppError = require("../../common/utils/AppError");
const env = require("../../config/env");

const createNotification = async ({ userId, title, message, type }) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }

  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      isRead: false
    }
  });

  return notification;
};

// Mock FCM dispatch for now
const sendPushNotification = async ({ userId, title, message, type }) => {
  console.log("Mock push notification sent:", {
    fcmKeyConfigured: !!env.FCM_SERVER_KEY,
    userId,
    title,
    message,
    type
  });

  return {
    success: true,
    message: "Push notification dispatched (mock)"
  };
};

const getNotifications = async ({ userId, page = 1, limit = 10 }) => {
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.notification.count({
      where: { userId }
    })
  ]);

  return {
    notifications,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

module.exports = {
  createNotification,
  sendPushNotification,
  getNotifications
};