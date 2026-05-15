import express from "express";
import {
  changePasswordController,
  forgotPasswordController,
  loginController,
  logoutController,
  registerController,
  resendEmailVerification,
  resetPassWordController,
  updateProfilePicController,
  userProfileController,
  userVerification,
} from "../controllers/auth.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "../validations/auth.validation.js";
import upload from "../middlewares/upload.middleware.js";
import { authLimiter, loginLimiter, otpLimiter } from "../middlewares/authLimiter.middleware.js";

const router = express.Router();

router.get("/check", (req, res) => {
  res.send("API testing.....");
});

router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  registerController,
);

router.get("/verify", otpLimiter, userVerification);

router.post("/login", loginLimiter, validate(loginSchema), loginController);

router.get("/profile", authMiddleware, userProfileController);

router.post("/logout", authMiddleware, logoutController);

router.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  forgotPasswordController,
);

router.patch(
  "/reset-password/:token",
  authLimiter,
  validate(resetPasswordSchema),
  resetPassWordController,
);

router.post(
  "/resend-verification",
  authLimiter,
  validate(resendVerificationSchema),
  resendEmailVerification,
);

router.patch(
  "/changePassword",
  authLimiter,
  authMiddleware,
  validate(changePasswordSchema),
  changePasswordController,
);

router.patch(
  "/profile",
  authMiddleware,
  upload.single("avatar"),
  validate(updateProfileSchema),
  updateProfilePicController,
);

export default router;
