class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const errorMiddleware = (err, req, res, next) => {
  let error = Object.create(err);

  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // MongoDB Cast Error
  if (error.name === "CastError") {
    error = new ErrorHandler(`Invalid ${error.path}`, 400);
  }

  // Validation Error
  if (error.name === "ValidationError") {
    const message = Object.values(error.errors)
      .map((val) => val.message)
      .join(", ");
    error = new ErrorHandler(message, 400);
  }

  // Duplicate Key
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    error = new ErrorHandler(
      `${field} already exists. Please use another ${field}`,
      400,
    );
  }

  // JWT Errors
  if (error.name === "JsonWebTokenError") {
    error = new ErrorHandler("Invalid token, please login again", 401);
  }

  if (error.name === "TokenExpiredError") {
    error = new ErrorHandler("Token expired, please login again", 401);
  }

  // Response
  if (process.env.NODE_ENV === "PRODUCTION") {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  } else {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      stack: error.stack,
    });
  }
};

export { errorMiddleware, ErrorHandler };
