import { ACCOUNT_STATUS } from "../constants/limits.js";
import userModel from "../models/user.model.js";
import catchAsyncError from "./catchAsyncError.js";
import { ErrorHandler } from "./error.middleware.js";
import jwt from "jsonwebtoken";

const authMiddleWare = catchAsyncError(async (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return next(new ErrorHandler("Please login first.", 401));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  const user = await userModel.findById(decoded.id);

  if (!user) {
    return next(new ErrorHandler("User not found.", 404));
  }

  const accountStatus = user.accountStatus || ACCOUNT_STATUS.ACTIVE;

  if (accountStatus === ACCOUNT_STATUS.BLOCKED) {
    return next(
      new ErrorHandler(
        "Your account has been blocked. Please contact support.",
        403,
      ),
    );
  }

  if (accountStatus === ACCOUNT_STATUS.SUSPENDED) {
    return next(
      new ErrorHandler(
        "Your account has been suspended. Please contact support.",
        403,
      ),
    );
  }

  req.user = user;

  next();
});

export default authMiddleWare;
