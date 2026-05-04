import express from "express";
import {
  forgotPasswordController,
  loginController,
  logoutController,
  registerController,
  resetPassWordController,
  userProfileController,
  userVerification,
} from "../controllers/auth.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import authLimiter from "../middlewares/authLimiter.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../validations/auth.validation.js";

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

router.get("/verify", authLimiter, userVerification);

router.post("/login", authLimiter, validate(loginSchema), loginController);

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

export default router;
