/**
 * Centralized API response helpers
 * Konsistensi format response untuk semua API
 */

/**
 * Format successful response
 * @param {Object} res - Express response object
 * @param {Number} status - HTTP status code
 * @param {Object|Array|String} data - Data yang akan dikirim ke client
 * @param {String} message - Optional message
 * @returns {Object} Formatted JSON response
 */
const success = (res, status, data, message = '') => {
  return res.status(status).json({
    status: "success",
    statusCode: status,
    data: data,
    message: message || getDefaultMessage(status)
  });
};

/**
 * Format error response
 * @param {Object} res - Express response object
 * @param {Number} status - HTTP status code
 * @param {String} message - Error message
 * @param {Object} errors - Optional validation errors
 * @returns {Object} Formatted JSON error response
 */
const error = (res, status, message, errors = null) => {
  return res.status(status).json({
    status: "error",
    statusCode: status,
    message: message || getDefaultMessage(status),
    errors: errors
  });
};

/**
 * Get default message berdasarkan status code
 * @param {Number} status - HTTP status code
 * @returns {String} Default message for status code
 */
const getDefaultMessage = (status) => {
  const messages = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    500: 'Internal Server Error'
  };
  
  return messages[status] || 'Unknown Status';
};

module.exports = {
  success,
  error
};
