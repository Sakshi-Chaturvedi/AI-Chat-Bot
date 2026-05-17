import catchAsyncError from "../middlewares/catchAsyncError.js";
import { resetUserUsageService, updateUserPlanService } from "../services/admin.service.js";

// ! Reset User Usage Controller --------------------------->>>>>>>>>>>>>>>>>>>>>>........................
export const resetUserUsageController = catchAsyncError(
  async (req, res, next) => {
    const userId = req.user?.id || req.user?._id;

    const { month } = req.body;

    const usage = await resetUserUsageService({ userId, month });

    res.status(200).json({
      success: true,
      message: "User usage has been reset successfully.",
      usage,
    });
  },
);

// ! Uodate User Plan Controller ------------------------>>>>>>>>>>>>>>>>>>>>>>>>>>>>>..............................
export const updateUserPlanController = catchAsyncError(
  async (req, res, next) => {
    const userId = req.params?.userId;
    const { plan, subscriptionStatus, subscriptionExpiresAt } = req.body;

    const user = await updateUserPlanService({
      userId,
      plan,
      subscriptionStatus,
      subscriptionExpiresAt,
    });

    res.status(200).json({
      success: true,
      message: "User plan updated successfully.",
      user,
    });
  },
);
