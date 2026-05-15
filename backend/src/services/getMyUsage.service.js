import User from "../models/user.model.js";
import { getOrCreateMonthlyUsage } from "./usage.service.js";
import { getRemainingLimit } from "../utils/getRemainingLimit.js";
import { ErrorHandler } from "../middlewares/error.middleware.js";
import { PLAN_LIMITS } from "../constants/limits.js";

export const getMyUsageService = async ({ uid }) => {
  if (!uid) {
    throw new ErrorHandler("User ID is required.", 400);
  }

  const user = await User.findById(uid).select(
    "plan subscriptionStatus subscriptionStartedAt subscriptionExpiresAt"
  );

  if (!user) {
    throw new ErrorHandler("User not found.", 404);
  }

  const plan = user.plan || "free";
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  const usage = await getOrCreateMonthlyUsage(uid);

  return {
    plan,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionStartedAt: user.subscriptionStartedAt,
    subscriptionExpiresAt: user.subscriptionExpiresAt,

    currentMonth: usage.month,

    usage: {
      messagesUsed: usage.messagesUsed || 0,
      tokensUsed: usage.tokensUsed || 0,
      conversationsCreated: usage.conversationsCreated || 0,
      exportsUsed: usage.exportsUsed || 0,
    },

    limits: {
      monthlyMessages: limits.monthlyMessages,
      monthlyTokens: limits.monthlyTokens,
      maxConversations: limits.maxConversations,
      allowedModels: limits.allowedModels,
      canExportConversation: limits.canExportConversation,
      canShareConversation: limits.canShareConversation,
    },

    remaining: {
      messages: getRemainingLimit(
        limits.monthlyMessages,
        usage.messagesUsed || 0
      ),

      tokens: getRemainingLimit(
        limits.monthlyTokens,
        usage.tokensUsed || 0
      ),

      conversations: getRemainingLimit(
        limits.maxConversations,
        usage.conversationsCreated || 0
      ),
    },
  };
};