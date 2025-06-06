module.exports = {
  // Flexible success response: (res, data), (res, status, data), (res, status, message, data)
  success: function () {
    const args = Array.from(arguments);
    let res, statusCode = 200, message = undefined, data = undefined;
    if (args.length === 2) {
      [res, data] = args;
    } else if (args.length === 3) {
      [res, statusCode, data] = args;
    } else if (args.length === 4) {
      [res, statusCode, message, data] = args;
    }
    const out = {};
    if (typeof message !== 'undefined') out.message = message;
    if (typeof data !== 'undefined') out.data = data;
    return res.status(statusCode).json(out);
  }
};
