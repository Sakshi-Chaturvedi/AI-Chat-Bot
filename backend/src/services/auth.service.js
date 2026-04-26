import userModel from "../models/user.model.js";
import { ErrorHandler } from "../middlewares/error.middleware.js";

export const registerUserService = async (userData) => {
  // ! Basic validation (extra safety)
  const { name, email, password } = {
    name: userData.name?.trim(),
    email: userData.email?.toLowerCase().trim(),
    password: userData.password?.trim(),
  };

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

export const verifyUser = async (verifyLink, user) => {
  if (!verifyLink) {
    throw new ErrorHandler("Invalid verification link", 400);
  }

  // 🔥 token match check
  if (verifyLink !== user.verificationToken) {
    throw new ErrorHandler("Invalid verification link", 400);
  }

  // 🔥 expiry check
  if (user.verificationExpire < Date.now()) {
    throw new ErrorHandler("Verification link expired", 400);
  }

  // 🔥 verify user
  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationExpire = undefined;

  // 🔥 save to DB
  await user.save();

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


export const getUserProfileService = async (id) => {
  if (!id) {
    throw new ErrorHandler("User Id is required", 400);
  }

  const user = await userModel
    .findById(id)
    .select("-password -verificationToken -verificationExpire").lean();
  
  console.log("Service\n",user);
  

  if (!user) {
    throw new ErrorHandler("User not found", 404);
  }

  console.log("Hello");
  
  return user;
};