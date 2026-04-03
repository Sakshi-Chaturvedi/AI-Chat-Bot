import userModel from "../models/user.model";
import { ErrorHandler } from "../middlewares/error.middleware";

export const registerUserService = async (userData) => {
  const { name, email, password } = userData;

  // optional check (UX purpose)
  const existingUser = await userModel.findOne({ email });

  if (existingUser) {
    throw new ErrorHandler("Email is already registered", 400);
  }

  const user = await userModel.create({
    name,
    email,
    password,
  });

  return user;
};

export const loginUserService = async (userData) => {
  const { email, password } = userData;

  if (!email || !password) {
    throw new ErrorHandler("Email and password are required", 400);
  }

  const user = await userModel
    .findOne({ email: email.toLowerCase().trim() })
    .select("+password +loginAttempts +lockUntil");

  if (!user) {
    throw new ErrorHandler("Invalid email or password", 401);
  }

  // ! Account lock check
  if (user.lockUntil && user.lockUntil > Date.now()) {
    throw new ErrorHandler("Account temporarily locked. Try later.", 403);
  }

  // ! Email verification
  if (!user.isVerified) {
    throw new ErrorHandler("Please verify your email first", 403);
  }

  const isPasswordCorrect = await user.comparePassword(password);

  if (!isPasswordCorrect) {
    user.loginAttempts += 1;

    if (user.loginAttempts >= 5) {
      user.lockUntil = Date.now() + 30 * 60 * 1000;
    }

    await user.save({ validateBeforeSave: false });

    throw new ErrorHandler("Invalid email or password", 401);
  }

  // ✅ Successful login reset
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLogin = Date.now();

  await user.save({ validateBeforeSave: false });

  return user;
};