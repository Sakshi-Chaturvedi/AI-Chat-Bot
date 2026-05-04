import { log } from "console";
import catchAsyncError from "../middlewares/catchAsyncError.js";
import { ErrorHandler } from "../middlewares/error.middleware.js";
import userModel from "../models/user.model.js";
import {
  forgotPasswordService,
  getUserProfileService,
  loginUserService,
  registerUserService,
  resetPasswordService,
  verifyUser,
} from "../services/auth.service.js";
import sendToken from "../utils/sendToken.js";
import sendEmail from "../utils/sendVerificationMail.js";
import { loginSchema, registerSchema } from "../validations/auth.validation.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";

// ! User Register Token --------------->>>>>>>>>>>>>>>>>>>>>>>>>>>
export const registerController = catchAsyncError(async (req, res, next) => {
  const name = req.body?.name || "";
  const email = req.body?.email || "";
  const password = req.body?.password || "";

  const sanitizedData = {
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: password.trim(),
  };

  if (process.env.NODE_ENV !== "PRODUCTION") {
    console.log("New user registering:", sanitizedData.email);
  }

  const user = await registerUserService(sanitizedData);

  // ! Generate verification token
  const rawToken = crypto.randomBytes(32).toString("hex");

  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  user.verificationToken = hashedToken;
  user.verificationExpire = Date.now() + 15 * 60 * 1000;

  await user.save({ validateBeforeSave: false });

  const verifyURL = `${process.env.FRONTEND_URL}/verify-email/${rawToken}`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Verify your Email",
      message: `Click to verify your email : ${verifyURL}`,
    });

    // ! Recommended: don't auto-login before email verification
    return res.status(201).json({
      success: true,
      message: "User registered successfully. Please verify your email.",
    });
  } catch (error) {
    user.verificationToken = undefined;
    user.verificationExpire = undefined;

    await user.save({ validateBeforeSave: false });

    return next(new ErrorHandler("Email could not be sent", 500));
  }
});

// ! User Verification Controller ---------->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
export const userVerification = catchAsyncError(async (req, res, next) => {
  const { token } = req.query;

  if (!token) {
    return next(new ErrorHandler("Token is required.", 400));
  }

  const user = await userModel.findOne({
    verificationToken: token,
  });

  if (!user) {
    return next(new ErrorHandler("User not Found.", 400));
  }

  verifyUser(token, user);

  res.status(200).json({
    success: true,
    message: "User verified Successfully.",
    user,
  });
});

// ! User Login Controller ------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>>>
export const loginController = catchAsyncError(async (req, res, next) => {
  const emailInput = req.body?.email || "";
  const passwordInput = req.body?.password || "";

  const sanitizedData = {
    email: emailInput.toLowerCase().trim(),
    password: passwordInput.trim(),
  };

  if (process.env.NODE_ENV !== "PRODUCTION") {
    console.log("Login attempt:", sanitizedData.email);
  }

  const user = await loginUserService(sanitizedData);

  return sendToken(user, 200, res);
});

// ! Refresh Token Controller ---------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>>
export const refreshTokenController = catchAsyncError(
  async (req, res, next) => {
    const token = req.cookies.refreshToken;

    if (!token) {
      return next(new ErrorHandler("No refresh token", 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const user = await userModel.findById(decoded.id);

    if (!user || user.refreshToken !== token) {
      return next(new ErrorHandler("Invalid refresh token", 401));
    }

    const newAccessToken = await user.generateAccessToken();

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "PRODUCTION",
      sameSite: "lax",
    });

    res.status(200).json({
      success: true,
    });
  },
);

// ! User Logout Controller ----------------------->>>>>>>>>>>>>>>>>>>>>>>>>>
export const logoutController = catchAsyncError(async (req, res, next) => {
  const user = req.user;

  // ! Remove refresh token from DB
  user.refreshToken = null;
  await user.save({ validateBeforeSave: false });

  res
    .cookie("accessToken", null, { expires: new Date(0) })
    .cookie("refreshToken", null, { expires: new Date(0) })
    .status(200)
    .json({
      success: true,
      message: "Logged out successfully",
    });
});

// ! Get User Profile --------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
export const userProfileController = catchAsyncError(async (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return next(new ErrorHandler("Login First.", 400));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  const user = await getUserProfileService(decoded.id);

  res.status(200).json({
    success: true,
    message: "User Fetched Successfully",
    user,
  });
});

// ! Forgot Password Contoller -------------------------->>>>>>>>>>>>>>>>>>>>>>>>>
export const forgotPasswordController = catchAsyncError(
  async (req, res, next) => {
    const email = req.body.email?.toLowerCase().trim();

    const resetToken = await forgotPasswordService({ email });

    const resetPasswordURL = `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/reset-password/${resetToken}`;

    try {
      await sendEmail({
        email,
        subject: "Reset your password",
        message: `Click here to reset your password: ${resetPasswordURL}`,
      });

      res.status(200).json({
        success: true,
        message: `Password reset email sent to: ${email}`,
      });
    } catch (error) {
      const user = await userModel.findOne({ email });

      if (user) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });
      }

      return next(
        new ErrorHandler("Reset password email could not be sent.", 500),
      );
    }
  },
);

// ! Reset Password Controller ---------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>>>
export const resetPassWordController = catchAsyncError(
  async (req, res, next) => {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    const resetPassword = await resetPasswordService({
      token,
      password,
      confirmPassword,
    });

    res.status(200).json({
      success: true,
      message: "Password has been reset",
      resetPassword,
    });
  },
);
