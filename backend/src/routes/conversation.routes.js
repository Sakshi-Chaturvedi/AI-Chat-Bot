import express from "express";
import {
  createConversation,
  deleteConversationController,
  getSingleConversationController,
  getUserConversationController,
  updateConversationController,
} from "../controllers/conversation.controller.js";

import authMiddleWare from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";

import {
  createConversationValidation,
  updateConversationValidation,
} from "../validations/conversation.validation.js";

const router = express.Router();

router.get("/check", (req, res) => {
  res.send("Conversation route is working successfully.");
});

router.post(
  "/",
  authMiddleWare,
  validate(createConversationValidation),
  createConversation
);

router.get(
  "/conversations",
  authMiddleWare,
  getUserConversationController
);

router.get(
  "/conversation/:id",
  authMiddleWare,
  getSingleConversationController
);

router.put(
  "/updateTitle/:id",
  authMiddleWare,
  validate(updateConversationValidation),
  updateConversationController
);

router.delete(
  "/deleteConversation/:id",
  authMiddleWare,
  deleteConversationController
);

export default router;