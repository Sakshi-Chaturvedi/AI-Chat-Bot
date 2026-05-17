import User from "../models/user.model.js";
import { getOrCreateMonthlyUsage } from "./usage.service.js";
import { ErrorHandler } from "../middlewares/error.middleware.js";
import { PLAN_LIMITS, USER_PLANS } from "../constants/limits.js";

export const checkPlanLimit = async ({
  userId,
  action,
  requestedModel,
  estimatedTokens = 0,
}) => {
  if (!userId) {
    throw new ErrorHandler("User ID is required.", 400);
  }

  const user = await User.findById(userId).select(
    "plan subscriptionStatus subscriptionExpiresAt",
  );

  if (!user) {
    throw new ErrorHandler("User not found.", 404);
  }

  const plan = user.plan || USER_PLANS.FREE;
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS[USER_PLANS.FREE];

  // Paid plans should have active subscription.
  // Free plan should not be blocked by inactive subscription status.
  const isPaidPlan = plan !== USER_PLANS.FREE;

  if (isPaidPlan && user.subscriptionStatus !== "active") {
    throw new ErrorHandler("Your subscription is not active.", 403);
  }

  if (
    isPaidPlan &&
    user.subscriptionExpiresAt &&
    user.subscriptionExpiresAt < new Date()
  ) {
    throw new ErrorHandler("Your subscription has expired.", 403);
  }

  const usage = await getOrCreateMonthlyUsage(user._id);

  if (action === "send_message") {
    if (usage.messagesUsed >= limits.monthlyMessages) {
      throw new ErrorHandler(
        `Monthly message limit reached for ${plan} plan.`,
        403,
      );
    }

    if (
      estimatedTokens > 0 &&
      usage.tokensUsed + estimatedTokens > limits.monthlyTokens
    ) {
      throw new ErrorHandler(
        `Monthly token limit reached for ${plan} plan.`,
        403,
      );
    }
  }

  if (action === "create_conversation") {
    if (usage.conversationsCreated >= limits.maxConversations) {
      throw new ErrorHandler(
        `Monthly conversation limit reached for ${plan} plan.`,
        403,
      );
    }
  }

  if (action === "export_conversation") {
    if (!limits.canExportConversation) {
      throw new ErrorHandler(
        "Conversation export is not available in your current plan.",
        403,
      );
    }
  }

  if (action === "share_conversation") {
    if (!limits.canShareConversation) {
      throw new ErrorHandler(
        "Conversation sharing is not available in your current plan.",
        403,
      );
    }
  }

  if (requestedModel) {
    if (!limits.allowedModels?.includes(requestedModel)) {
      throw new ErrorHandler(
        `${requestedModel} model is not available in your current plan.`,
        403,
      );
    }
  }

  return {
    allowed: true,
    user,
    usage,
    limits,
    plan,
  };
};
