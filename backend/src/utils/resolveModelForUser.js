import { MODEL_CONFIG } from "../constants/aiModels.js";
import { ErrorHandler } from "../middlewares/error.middleware.js";

export const resolveModelForUser = ({ requestedModel, limits }) => {
  if (!limits) {
    throw new ErrorHandler("Plan limits are required.", 500);
  }

  if (!Array.isArray(limits.allowedModels) || limits.allowedModels.length === 0) {
    throw new ErrorHandler("No models are available for your current plan.", 403);
  }

  const selectedModel = requestedModel || limits.allowedModels[0];

  if (!limits.allowedModels.includes(selectedModel)) {
    throw new ErrorHandler(
      "Requested model is not available in your current plan.",
      403
    );
  }

  const modelConfig = MODEL_CONFIG[selectedModel];

  if (!modelConfig) {
    throw new ErrorHandler("Selected model configuration was not found.", 500);
  }

  return {
    selectedModel,
    modelConfig,
  };
};