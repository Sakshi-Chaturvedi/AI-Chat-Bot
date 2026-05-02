import Joi from "joi";

export const createMessageValidation = Joi.object({
  conversationId: Joi.string().hex().length(24).required().messages({
    "string.empty": "Conversation ID is required.",
    "any.required": "Conversation ID is required.",
    "string.hex": "Invalid Conversation ID.",
    "string.length": "Invalid Conversation ID.",
  }),

  content: Joi.string().trim().min(1).max(4000).required().messages({
    "string.empty": "Message content is required.",
    "any.required": "Message content is required.",
    "string.min": "Message content must be at least 1 character.",
    "string.max": "Message content cannot be more than 4000 characters.",
  }),
});

export const updateMessageValidation = Joi.object({
  content: Joi.string().trim().min(1).max(4000).required().messages({
    "string.empty": "Message content is required.",
    "any.required": "Message content is required.",
    "string.min": "Message content must be at least 1 character.",
    "string.max": "Message content cannot be more than 4000 characters.",
  }),
});