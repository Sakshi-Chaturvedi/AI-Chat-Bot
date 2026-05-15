import Usage from "../models/usage.model.js";
import { getCurrentUsageMonth } from "../utils/usageMonth.js";

export const incrementUsage = async ({
  userId,
  messages = 0,
  tokens = 0,
  conversations = 0,
  exports = 0,
}) => {
  const month = getCurrentUsageMonth();

  const usage = await Usage.findOneAndUpdate(
    {
      user: userId,
      month,
    },
    {
      $inc: {
        messagesUsed: messages,
        tokensUsed: tokens,
        conversationsCreated: conversations,
        exportsUsed: exports,
      },
      $set: {
        lastUsedAt: new Date(),
      },
      $setOnInsert: {
        user: userId,
        month,
      },
    },
    {
      new: true,
      upsert: true,
    }
  );

  return usage;
};