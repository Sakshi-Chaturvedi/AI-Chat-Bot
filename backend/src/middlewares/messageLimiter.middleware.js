import rateLimit from "express-rate-limit";

export const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 1 minute me max 10 messages
  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },

  message: {
    success: false,
    message: "Too many messages. Please slow down.",
  },
});