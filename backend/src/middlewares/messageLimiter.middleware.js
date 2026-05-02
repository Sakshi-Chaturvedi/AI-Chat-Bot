import rateLimit from "express-rate-limit";

export const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many messages. Please slow down.",
  },
});