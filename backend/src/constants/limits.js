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
    monthlyExports: 0,
    monthlyShares: 5,
    allowedModels: ["basic"],

    features: {
      streaming: true,
      exportConversation: false,
      shareConversation: true,
      customInstructions: false,
      aiModes: false,
      fileUpload: false,
      rag: false,
    },
  },

  [USER_PLANS.PRO]: {
    monthlyMessages: 200,
    monthlyTokens: 500000,
    maxConversations: 100,
    monthlyExports: 50,
    monthlyShares: 100,
    allowedModels: ["basic", "standard"],

    features: {
      streaming: true,
      exportConversation: true,
      shareConversation: true,
      customInstructions: true,
      aiModes: true,
      fileUpload: false,
      rag: false,
    },
  },

  [USER_PLANS.PREMIUM]: {
    monthlyMessages: 1000,
    monthlyTokens: 2000000,
    maxConversations: 500,
    monthlyExports: 200,
    monthlyShares: 500,
    allowedModels: ["basic", "standard", "advanced"],

    features: {
      streaming: true,
      exportConversation: true,
      shareConversation: true,
      customInstructions: true,
      aiModes: true,
      fileUpload: true,
      rag: true,
    },
  },
};
