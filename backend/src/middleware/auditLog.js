const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const auditLog = (action, resource) => async (req, res, next) => {
  res.on('finish', async () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        await AuditLog.create({
          organizationId: req.organizationId,
          userId: req.user?._id,
          action,
          resource,
          resourceId: req.params?.id,
          description: `${action} on ${resource}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });
      } catch (err) {
        logger.error('Audit log error:', err.message);
      }
    }
  });
  next();
};

module.exports = auditLog;
