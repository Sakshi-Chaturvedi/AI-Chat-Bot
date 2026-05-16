import express from "express";
import { resetUserUsageController } from "../controllers/admin.controller.js";
import authMiddleWare from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authorizeRoles.middleware.js";
const router = express.Router();

router.patch(
  "/users/:userId/usage/reset",
  authMiddleWare,
  authorizeRoles("admin"),
  resetUserUsageController,
);

export default router;
