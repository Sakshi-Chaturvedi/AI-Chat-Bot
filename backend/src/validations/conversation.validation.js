import Joi from "joi";

export const createConversationValidation = Joi.object({
  title: Joi.string().trim().min(1).max(100).optional().messages({
    "string.empty": "Title cannot be empty.",
    "string.min": "Title must be at least 1 character.",
    "string.max": "Title cannot be more than 100 characters.",
  }),
});

export const updateConversationValidation = Joi.object({
  title: Joi.string().trim().min(1).max(100).required().messages({
    "string.empty": "Title is required.",
    "any.required": "Title is required.",
    "string.min": "Title must be at least 1 character.",
    "string.max": "Title cannot be more than 100 characters.",
  }),
});