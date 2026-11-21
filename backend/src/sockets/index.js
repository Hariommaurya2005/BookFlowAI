const User = require('../models/User');
const Organization = require('../models/Organization');
const { isAuthVersionCurrent } = require('../utils/authSession');
const { verifyAccessToken } = require('../utils/tokens');
const logger = require('../utils/logger');
const { isAllowedEmail } = require('../utils/businessEmail');

const initSocket = (io) => {
  // Authenticate the socket connection before it can receive organization events.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.accessToken;
      if (!token) return next(new Error('Authentication required'));

      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.id).select('_id email organizationId role isActive authVersion');
      if (!user || !user.isActive || !user.organizationId || !isAllowedEmail(user.email) || !isAuthVersionCurrent(decoded.authVersion, user.authVersion)) {
        return next(new Error('Unauthorized socket connection'));
      }
      const organization = await Organization.findById(user.organizationId).select('active');
      if (!organization || !organization.active) return next(new Error('Organization is inactive')); 

      socket.data.userId = user._id.toString();
      socket.data.organizationId = user.organizationId.toString();
      socket.data.role = user.role;
      return next();
    } catch (error) {
      logger.warn(`Socket authentication rejected: ${error.name || 'authentication error'}`);
      return next(new Error('Unauthorized socket connection'));
    }
  });

  io.on('connection', (socket) => {
    const ownOrganizationId = socket.data.organizationId;
    logger.info(`Authenticated socket connected: ${socket.id}`);

    // Join only the organization derived from the authenticated database user.
    socket.join(ownOrganizationId);

    // Preserve compatibility with older clients without trusting their supplied ID.
    socket.on('join:org', (requestedOrganizationId) => {
      if (String(requestedOrganizationId) !== ownOrganizationId) {
        logger.warn(`Socket ${socket.id} attempted to join an unauthorized organization room`);
        socket.emit('socket:error', { message: 'You cannot join that organization room.' });
        return;
      }
      socket.join(ownOrganizationId);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = initSocket;
