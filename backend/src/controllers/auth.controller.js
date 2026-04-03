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
