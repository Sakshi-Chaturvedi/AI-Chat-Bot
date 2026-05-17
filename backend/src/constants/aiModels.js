export const AI_MODELS = {
  BASIC: "basic",
  STANDARD: "standard",
  ADVANCED: "advanced",
};

export const MODEL_CONFIG = {
  basic: {
    provider: "openrouter",
    model: "openrouter/free",
    label: "Basic",
  },

  standard: {
    provider: "openrouter",
    model: "openrouter/free", 
    label: "Standard",
    // TODO: Replace with cheaper paid model for Pro users
  },

  advanced: {
    provider: "openrouter",
    model: "openrouter/free",
    label: "Advanced",
    // TODO: Replace with premium model for Premium users
  },
};