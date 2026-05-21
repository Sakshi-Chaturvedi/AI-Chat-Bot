import express from "express";
import {
  getAdminDashboardController,
  getAllUsersController,
  getFailedMessageStatsController,
  getSingleUserDetailsController,
  resetUserUsageController,
  topUsersController,
  updateUserPlanController,
} from "../controllers/admin.controller.js";
import authMiddleWare from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authorizeRoles.middleware.js";
const router = express.Router();

router.get(
  "/dashboard",
  authMiddleWare,
  authorizeRoles("admin"),
  getAdminDashboardController,
);

router.get(
  "/users",
  authMiddleWare,
  authorizeRoles("admin"),
  getAllUsersController,
);

router.get(
  "/users/:userId",
  authMiddleWare,
  authorizeRoles("admin"),
  getSingleUserDetailsController,
);

router.get(
  "/messages/failed",
  authMiddleWare,
  authorizeRoles("admin"),
  getFailedMessageStatsController,
);

router.get(
  "/usage/top-users",
  authMiddleWare,
  authorizeRoles("admin"),
  topUsersController,
);

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

export default router;
