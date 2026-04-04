import catchAsyncError from "../middlewares/catchAsyncError";
import { ErrorHandler } from "../middlewares/error.middleware";
import {
  loginUserService,
  registerUserService,
} from "../services/auth.service";
import sendToken from "../utils/sendToken";
import sendEmail from "../utils/sendVerificationMail";
import { loginSchema, registerSchema } from "../validations/auth.validation";
import crypto from "crypto";

export const registerController = catchAsyncError(async (req, res, next) => {
  const { error } = registerSchema.validate(req.body);

  if (error) {
    return next(
      new ErrorHandler(error?.details?.[0]?.message || "Invalid input", 400),
    );
  }

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

export const loginController = catchAsyncError(async (req, res, next) => {
  const { error } = loginSchema.validate(req.body);

  if (error) {
    return next(
      new ErrorHandler(error?.details?.[0]?.message || "Invalid input", 400),
    );
  }

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

export const logoutController = catchAsyncError(async (req, res) => {
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
