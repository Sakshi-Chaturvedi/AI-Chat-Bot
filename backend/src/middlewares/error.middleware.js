class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

const errorMiddleware = (err, req, res, next) => {
  let error = err;

  // ! Clone error (important for production safety)
  error = {
    message: err.message,
    statusCode: err.statusCode || 500,
    stack: err.stack,
    ...err,
  };

  // ! Invalid MongoDB ObjectId
  if (err.name === "CastError") {
    error = new ErrorHandler(`Invalid ${err.path}`, 400);
  }

  // ! Mongoose Validation Error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    error = new ErrorHandler(message, 400);
  }

  // ! Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = new ErrorHandler(`${field} already exists`, 400);
  }

  // ! JWT Errors
  if (err.name === "JsonWebTokenError") {
    error = new ErrorHandler("Invalid token, please login again", 401);
  }

  if (err.name === "TokenExpiredError") {
    error = new ErrorHandler("Token expired, please login again", 401);
  }

  // ! Production vs Development response
  if (process.env.NODE_ENV === "PRODUCTION") {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  } else {
    // ? Development mode (detailed error)
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      stack: error.stack,
      error: err,
    });
  }
};

export { errorMiddleware, ErrorHandler };