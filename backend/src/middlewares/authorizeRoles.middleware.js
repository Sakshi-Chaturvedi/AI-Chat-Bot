import { ErrorHandler } from "./error.middleware.js";

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(
        new ErrorHandler("You are not allowed to access this resource.", 403),
      );
    }

    next();
  };
};

export default authorizeRoles;
