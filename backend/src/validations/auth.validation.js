import Joi from "joi";

export const registerSchema = Joi.object({
  name: Joi.string().required().messages({
    "string.empty": "Name is required",
  }),
  email: Joi.string().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Invalid email format",
  }),
  password: Joi.string().min(6).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 6 characters",
  }),
  avatar: Joi.object({
    public_id: Joi.string(),
    url: Joi.string(),
  }).optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Invalid email format",
  }),
  password: Joi.string().required().messages({
    "string.empty": "Password is required",
  }),
});

export const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.empty": "Email is required",
        "string.email": "Invalid email format",
    }),
});

export const resetPasswordSchema = Joi.object({
    password: Joi.string().min(6).required().messages({
        "string.empty": "Password is required",
        "string.min": "Password must be at least 6 characters",
    }),
    confirmPassword: Joi.string().required().valid(Joi.ref("password")).messages({
        "string.empty": "Confirm password is required",
        "any.only": "Passwords do not match",
    }),
});

export const resendVerificationSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.empty": "Email is required.",
    "string.email": "Please enter a valid email address.",
    "any.required": "Email is required.",
  }),
});