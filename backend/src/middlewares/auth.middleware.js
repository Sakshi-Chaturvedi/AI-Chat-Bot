import userModel from "../models/user.model.js";
import catchAsyncError from "./catchAsyncError.js";
import { ErrorHandler } from "./error.middleware.js";
import jwt from "jsonwebtoken";

const authMiddleWare = catchAsyncError(async (req, res, next) => {
  const token = req.cookies.accessToken;

  // console.log(token);
  

  if (!token) {
    return next(new ErrorHandler("Please Login First", 401));
  }

  // console.log("Trying to login");
  
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  // console.log(decoded)

  const user = await userModel.findById(decoded.id);

  // console.log(user);
  

  if (!user) {
    return next(new ErrorHandler("User not Found", 404));
  }

  req.user = user;

  next();
});

export default authMiddleWare;