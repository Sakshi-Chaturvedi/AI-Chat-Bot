import catchAsyncError from "../middlewares/catchAsyncError.js";
import { resetUserUsageService } from "../services/admin.service.js";

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
