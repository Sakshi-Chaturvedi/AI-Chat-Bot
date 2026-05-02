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

export const pinConversationValidation = Joi.object({
  isPinned: Joi.boolean().required().messages({
    "boolean.base": "isPinned must be true or false.",
    "any.required": "isPinned is required.",
  }),
});

export const archiveConversationValidation = Joi.object({
  isArchived: Joi.boolean().required().messages({
    "boolean.base": "isArchived must be true or false.",
    "any.required": "isArchived is required.",
  }),
});

export const searchConversationValidation = Joi.object({
  query: Joi.string().trim().min(1).max(100).required().messages({
    "string.empty": "Search query is required.",
    "any.required": "Search query is required.",
    "string.min": "Search query must be at least 1 character.",
    "string.max": "Search query cannot be more than 100 characters.",
  }),
});