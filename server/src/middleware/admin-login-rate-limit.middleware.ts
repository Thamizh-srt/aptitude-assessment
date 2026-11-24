import { rateLimit } from "express-rate-limit";

export const adminLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "LOGIN_RATE_LIMITED",
      message: "Too many sign-in attempts. Please wait 15 minutes before trying again.",
    },
  },
});
