const http = require('http-errors');

const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return http.error(res, status, message);
};

module.exports = errorHandler;
