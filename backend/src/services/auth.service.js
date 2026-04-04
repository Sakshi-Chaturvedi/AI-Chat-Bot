import userModel from "../models/user.model";
import { ErrorHandler } from "../middlewares/error.middleware";

export const registerUserService = async (userData) => {
  const { name, email, password } = userData;

  // ! Basic validation (extra safety)
  if (!name || !email || !password) {
    throw new ErrorHandler("All fields are required", 400);
  }

  // ! Sanitize input
  name = name.trim();
  email = email.toLowerCase().trim();
  password = password.trim();

  try {
    // ! Create user (MongoDB unique index will handle duplicates)
    const user = await userModel.create({
      name,
      email,
      password,
    });

    return user;
  } catch (err) {
    // ! Handle duplicate email error safely
    if (err.code === 11000) {
      throw new ErrorHandler("Email already exists", 400);
    }

    throw err; // ! other errors
  }
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
