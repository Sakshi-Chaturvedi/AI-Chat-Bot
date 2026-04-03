import catchAsyncError from "../middlewares/catchAsyncError";
import { ErrorHandler } from "../middlewares/error.middleware";
import {
  loginUserService,
  registerUserService,
} from "../services/auth.service";
import sendToken from "../utils/sendToken";
import { loginSchema, registerSchema } from "../validations/auth.validation";

export const registerController = catchAsyncError(async (req, res, next) => {
  const { error } = registerSchema.validate(req.body);

  if (error) {
    return next(new ErrorHandler(error.details[0].message, 400));
  }

  // sanitize input
  const { name, email, password } = req.body;

  const user = await registerUserService({ name, email, password });

  return sendToken(user, 201, res);
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
