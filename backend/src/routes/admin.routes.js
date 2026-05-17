import express from "express";
import {
  getAdminDashboardController,
  resetUserUsageController,
  updateUserPlanController,
} from "../controllers/admin.controller.js";
import authMiddleWare from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authorizeRoles.middleware.js";
const router = express.Router();

router.patch(
  "/users/:userId/usage/reset",
  authMiddleWare,
  authorizeRoles("admin"),
  resetUserUsageController,
);

router.patch(
  "/users/:userId/plan",
  authMiddleWare,
  authorizeRoles("admin"),
  updateUserPlanController,
);

router.get(
  "/dashboard",
  authMiddleWare,
  authorizeRoles("admin"),
  getAdminDashboardController,
);

export default router;
