export const USER_PLANS = {
  FREE: "free",
  PRO: "pro",
  PREMIUM: "premium",
};

export const SUBSCRIPTION_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
};

export const PLAN_LIMITS = {
  [USER_PLANS.FREE]: {
    monthlyMessages: 20,
    monthlyTokens: 50000,
    maxConversations: 10,
    allowedModels: ["basic"],
    canExportConversation: false,
    canShareConversation: true,
  },

  [USER_PLANS.PRO]: {
    monthlyMessages: 200,
    monthlyTokens: 500000,
    maxConversations: 100,
    allowedModels: ["basic", "standard"],
    canExportConversation: true,
    canShareConversation: true,
  },

  [USER_PLANS.PREMIUM]: {
    monthlyMessages: 1000,
    monthlyTokens: 2000000,
    maxConversations: 500,
    allowedModels: ["basic", "standard", "advanced"],
    canExportConversation: true,
    canShareConversation: true,
  },
};