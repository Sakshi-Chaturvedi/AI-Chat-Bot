import User from "../models/user.model.js";
import { getOrCreateMonthlyUsage } from "./usage.service.js";
import { ErrorHandler } from "../middlewares/error.middleware.js";
import { PLAN_LIMITS } from "../constants/limits.js";

export const checkPlanLimit = async ({
  userId,
  action,
  requestedModel,
  estimatedTokens = 0,
}) => {
  const user = await User.findById(userId).select(
    "plan subscriptionStatus subscriptionExpiresAt"
  );

  if (!user) {
    throw new ErrorHandler("User not found.", 404);
  }

  if (user.subscriptionStatus !== "active") {
    throw new ErrorHandler("Your subscription is not active.", 403);
  }

  if (
    user.subscriptionExpiresAt &&
    user.subscriptionExpiresAt < new Date()
  ) {
    throw new ErrorHandler("Your subscription has expired.", 403);
  }

  const plan = user.plan || "free";
  const limits = PLAN_LIMITS[plan];

  if (!limits) {
    throw new ErrorHandler("Invalid user plan.", 400);
  }

  const usage = await getOrCreateMonthlyUsage(user._id);

  if (action === "send_message") {
    if (usage.messagesUsed >= limits.monthlyMessages) {
      throw new ErrorHandler(
        `Monthly message limit reached for ${plan} plan.`,
        403
      );
    }

    if (
      estimatedTokens > 0 &&
      usage.tokensUsed + estimatedTokens > limits.monthlyTokens
    ) {
      throw new ErrorHandler(
        `Monthly token limit reached for ${plan} plan.`,
        403
      );
    }
  }

  if (action === "create_conversation") {
    if (usage.conversationsCreated >= limits.maxConversations) {
      throw new ErrorHandler(
        `Monthly conversation limit reached for ${plan} plan.`,
        403
      );
    }
  }

  if (action === "export_conversation") {
    if (!limits.canExportConversation) {
      throw new ErrorHandler(
        "Conversation export is not available in your current plan.",
        403
      );
    }
  }

  if (action === "share_conversation") {
    if (!limits.canShareConversation) {
      throw new ErrorHandler(
        "Conversation sharing is not available in your current plan.",
        403
      );
    }
  }

  if (requestedModel) {
    if (!limits.allowedModels.includes(requestedModel)) {
      throw new ErrorHandler(
        `${requestedModel} model is not available in your current plan.`,
        403
      );
    }
  }

  return {
    allowed: true,
    user,
    usage,
    limits,
  };
};