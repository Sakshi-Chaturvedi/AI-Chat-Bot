import { ErrorHandler } from "../middlewares/error.middleware.js";
import Usage from "../models/usage.model.js";
import { getCurrentUsageMonth } from "../utils/usageMonth.js";

// ! Reset User Usage Service --------------------->>>>>>>>>>>>>>>>>>>>>>>>>
export const resetUserUsageService = async ({ userId, month }) => {
  if (!userId) {
    throw new ErrorHandler("User ID is required.", 400);
  }

  const usageMonth = month || getCurrentUsageMonth();

  const usage = await Usage.findOneAndUpdate(
    {
      user: userId,
      month: usageMonth,
    },
    {
      $set: {
        messagesUsed: 0,
        tokensUsed: 0,
        conversationsCreated: 0,
        exportsUsed: 0,
        lastUsedAt: null,
      },
    },
    {
      new: true,
      upsert: true,
    },
  );

  return usage;
};
