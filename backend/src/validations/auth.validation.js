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

export const changePasswordSchema = Joi.object({
  currPassword: Joi.string().min(6).required().messages({
    "string.empty": "Old password is required",
    "string.min": "Old password must be at least 6 characters",
    "any.required": "Old password is required",
  }),

  newPassword: Joi.string()
    .min(6)
    .invalid(Joi.ref("oldPassword"))
    .required()
    .messages({
      "string.empty": "New password is required",
      "string.min": "New password must be at least 6 characters",
      "any.invalid": "New password cannot be the same as old password",
      "any.required": "New password is required",
    }),

  confirmPassword: Joi.string()
    .required()
    .valid(Joi.ref("newPassword"))
    .messages({
      "string.empty": "Confirm password is required",
      "any.only": "New Password and Confirm Password do not match",
      "any.required": "Confirm password is required",
    }),
});

export const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).optional().messages({
    "string.empty": "Name cannot be empty.",
    "string.min": "Name must be at least 2 characters.",
    "string.max": "Name cannot be more than 50 characters.",
  }),
});
