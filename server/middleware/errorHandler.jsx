const { logger } = require('./logger');

const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Default error
  let error = {
    message: err.message || 'Internal Server Error',
    status: err.status || 500
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    error.status = 400;
    error.message = 'Validation Error';
    error.details = err.details;
  }

  if (err.name === 'UnauthorizedError') {
    error.status = 401;
    error.message = 'Unauthorized';
  }

  // MySQL error codes
  if (err.code === 'ER_DUP_ENTRY') { // MySQL duplicate entry
    error.status = 409;
    error.message = 'Resource already exists';
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') { // MySQL foreign key constraint violation
    error.status = 400;
    error.message = 'Referenced resource does not exist';
  }

  if (err.code === 'ER_ROW_IS_REFERENCED_2') { // MySQL row is referenced
    error.status = 400;
    error.message = 'Cannot delete resource as it is referenced by other resources';
  }

  if (err.code === 'ER_BAD_FIELD_ERROR') { // MySQL bad field error
    error.status = 400;
    error.message = 'Invalid field specified';
  }

  if (err.code === 'ER_PARSE_ERROR') { // MySQL parse error
    error.status = 400;
    error.message = 'Invalid query syntax';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.status = 401;
    error.message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    error.status = 401;
    error.message = 'Token expired';
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error.status = 400;
    error.message = 'File too large';
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error.status = 400;
    error.message = 'Unexpected file field';
  }

  // Send error response
  res.status(error.status).json({
    success: false,
    message: error.message,
    status: error.status,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    ...(error.details && { details: error.details })
  });
};

module.exports = { errorHandler }; 