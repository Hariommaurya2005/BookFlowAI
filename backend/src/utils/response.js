const sendResponse = (res, statusCode, success, message, data = null, meta = null) => {
  const response = { success, message };
  if (data !== null) response.data = data;
  if (meta !== null) response.meta = meta;
  return res.status(statusCode).json(response);
};

// Keep the existing argument order and allow paginated endpoints to attach metadata.
const sendSuccess = (res, message, data = null, statusCode = 200, meta = null) =>
  sendResponse(res, statusCode, true, message, data, meta);

const sendError = (res, message, statusCode = 400, data = null) =>
  sendResponse(res, statusCode, false, message, data);

module.exports = { sendSuccess, sendError };
