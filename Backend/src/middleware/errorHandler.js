function errorHandler(error, req, res, next) {
  if (!error.statusCode || error.statusCode >= 500) console.error(error);

  if (res.headersSent) {
    return next(error);
  }

  const status = error.statusCode || 500;
  const message = status >= 500 ? 'Something went wrong on the server' : error.message;

  return res.status(status).json({ success: false, message });
}

module.exports = errorHandler;
