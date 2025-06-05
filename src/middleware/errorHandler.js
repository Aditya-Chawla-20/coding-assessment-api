const errorHandler = (err, req, res, next) => {
  console.error('❌ Error occurred:', err);

  // Default error
  let error = {
    message: err.message || 'Internal Server Error',
    status: err.status || 500
  };

  // Validation errors
  if (err.name === 'ValidationError') {
    error.message = Object.values(err.errors).map(val => val.message).join(', ');
    error.status = 400;
  }

  // Duplicate key error
  if (err.code === 11000) {
    error.message = 'Duplicate field value entered';
    error.status = 400;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token';
    error.status = 401;
  }

  // JWT expired error
  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired';
    error.status = 401;
  }

  // Syntax error in JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error.message = 'Invalid JSON format in request body';
    error.status = 400;
  }

  // Custom application errors
  if (err.name === 'IngestionError') {
    error.status = 400;
  }

  if (err.name === 'RateLimitError') {
    error.status = 429;
  }

  // Type errors (usually from invalid input)
  if (err instanceof TypeError) {
    error.message = 'Invalid input type';
    error.status = 400;
  }

  const response = {
    error: error.message,
    timestamp: new Date().toISOString()
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(error.status).json(response);
};

module.exports = errorHandler;
