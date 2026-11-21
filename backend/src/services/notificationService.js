const Notification = require('../models/Notification');

const createNotification = async ({ organizationId, userId, title, message, type = 'system', link = null }) => {
  return Notification.create({ organizationId, userId, title, message, type, link });
};

const getUserNotifications = async (userId, page = 1, limit = 20, organizationId) => {
  const skip = (page - 1) * limit;
  const scope = { userId, ...(organizationId ? { organizationId } : {}) };
  const [notifications, total, unread] = await Promise.all([
    Notification.find(scope).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(scope),
    Notification.countDocuments({ ...scope, read: false }),
  ]);
  return { notifications, total, unread, page, totalPages: Math.ceil(total / limit) };
};

const markAsRead = async (notificationId, userId, organizationId) => {
  return Notification.findOneAndUpdate(
    { _id: notificationId, userId, ...(organizationId ? { organizationId } : {}) },
    { read: true },
    { new: true }
  );
};

const markAllAsRead = async (userId, organizationId) => {
  return Notification.updateMany({ userId, read: false, ...(organizationId ? { organizationId } : {}) }, { read: true });
};

module.exports = { createNotification, getUserNotifications, markAsRead, markAllAsRead };
