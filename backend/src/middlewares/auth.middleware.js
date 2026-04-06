import userModel from "../models/user.model.js";
import catchAsyncError from "./catchAsyncError.js";
import { ErrorHandler } from "./error.middleware.js";
import jwt from "jsonwebtoken";

const authMiddleWare = catchAsyncError(async (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return next(new ErrorHandler("Please Login First", 401));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  const user = await userModel.findById(decoded.id);

  if (!user) {
    return next(new ErrorHandler("User not Found", 404));
  }

  req.user = user;

  next();
});

export default authMiddleWare;