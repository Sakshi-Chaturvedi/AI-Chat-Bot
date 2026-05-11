import express from "express";
import {
  cancelReplyGenerationController,
  createMessageController,
  editMessageController,
  getMessageController,
  regenerateMessageController,
  retryFailedMessageController,
  searchMessagecontroller,
  streamMessageController,
} from "../controllers/message.controller.js";
import validate from "../middlewares/validate.middleware.js";
import authMiddleWare from "../middlewares/auth.middleware.js";
import {
  createMessageValidation,
  updateMessageValidation,
} from "../validations/message.validation.js";
import { messageLimiter } from "../middlewares/messageLimiter.middleware.js";

const router = express.Router();

router.get("/check", (req, res) => {
  res.send("Message API working properly.");
});

router.post(
  "/:id",
  authMiddleWare,
  messageLimiter,
  validate(createMessageValidation),
  createMessageController,
);

router.post(
  "/stream/:id",
  authMiddleWare,
  messageLimiter,
  validate(createMessageValidation),
  streamMessageController,
);

router.get("/searchMessage/:id", authMiddleWare, searchMessagecontroller);

router.patch(
  "/regenerate-reply/:id",
  authMiddleWare,
  messageLimiter,
  regenerateMessageController,
);

router.get("/:id", authMiddleWare, getMessageController);

router.patch(
  "cancel-message/:id",
  authMiddleWare,
  cancelReplyGenerationController,
);

router.patch(
  "/:id",
  authMiddleWare,
  validate(updateMessageValidation),
  editMessageController,
);

router.post(
  "/retry/:id",
  authMiddleWare,
  messageLimiter,
  retryFailedMessageController,
);



export default router;
