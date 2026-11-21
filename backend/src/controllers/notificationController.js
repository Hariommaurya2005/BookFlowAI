const { getUserNotifications, markAsRead, markAllAsRead } = require('../services/notificationService');
const { sendSuccess } = require('../utils/response');
const { parsePagination } = require('../utils/platformAdminRules');

const getNotifications = async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
    const data = await getUserNotifications(req.user._id, page, limit, req.organizationId);
    sendSuccess(res, 'Notifications retrieved', data);
  } catch (err) { next(err); }
};

const readNotification = async (req, res, next) => {
  try {
    const notification = await markAsRead(req.params.id, req.user._id, req.organizationId);
    sendSuccess(res, 'Marked as read', notification);
  } catch (err) { next(err); }
};

const readAllNotifications = async (req, res, next) => {
  try {
    await markAllAsRead(req.user._id, req.organizationId);
    sendSuccess(res, 'All notifications marked as read');
  } catch (err) { next(err); }
};

module.exports = { getNotifications, readNotification, readAllNotifications };
