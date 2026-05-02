import express from "express";
import {
  loginController,
  logoutController,
  registerController,
  userProfileController,
  userVerification,
} from "../controllers/auth.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import authLimiter from "../middlewares/authLimiter.middleware.js";

const router = express.Router();

router.get("/check", (req, res) => {
  res.send("API testing.....");
});

router.post("/register", authLimiter, registerController);
router.get("/verify", authLimiter, userVerification);
router.post("/login", authLimiter, loginController);
router.get("/profile", authMiddleware, userProfileController);
router.get("/logout", authMiddleware, logoutController);

export default router;