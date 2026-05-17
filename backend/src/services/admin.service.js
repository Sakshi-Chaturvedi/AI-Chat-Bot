import { PLAN_LIMITS } from "../constants/limits.js";
import { ErrorHandler } from "../middlewares/error.middleware.js";
import Usage from "../models/usage.model.js";
import userModel from "../models/user.model.js";
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

// ! Update User Service ---------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>>
export const updateUserPlanService = async ({
  userId,
  plan,
  subscriptionStatus = "active",
  subscriptionExpiresAt,
}) => {
  if (!userId) {
    throw new ErrorHandler("User ID is required.", 400);
  }

  if (!plan || !PLAN_LIMITS[plan]) {
    throw new ErrorHandler("Invalid plan selected.", 400);
  }

  const user = await userModel.findById(userId);

  if (!user) {
    throw new ErrorHandler("User not found.", 404);
  }

  user.plan = plan;
  user.subscriptionStatus = subscriptionStatus;
  user.subscriptionStartedAt = new Date();

  if (subscriptionExpiresAt) {
    user.subscriptionExpiresAt = new Date(subscriptionExpiresAt);
  }

  await user.save({ validateBeforeSave: false });

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    plan: user.plan,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionStartedAt: user.subscriptionStartedAt,
    subscriptionExpiresAt: user.subscriptionExpiresAt,
  };
};
