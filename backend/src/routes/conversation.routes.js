import express from "express";
import {
  archiveConversationController,
  createConversation,
  deleteConversationController,
  exportConversationController,
  getSharedConversationController,
  getSingleConversationController,
  getUserConversationController,
  searchConversationController,
  shareConversationController,
  togglePinConversationController,
  unshareConversationController,
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
  createConversation,
);

router.get("/conversations", authMiddleWare, getUserConversationController);

router.get("/searchConversation", authMiddleWare, searchConversationController);

router.get("/:id/export", authMiddleWare, exportConversationController);

router.patch("/:id/share", authMiddleWare, shareConversationController);

router.patch("/:id/unshare", authMiddleWare, unshareConversationController);

router.get("/shared/:id", getSharedConversationController);

router.get(
  "/conversation/:id",
  authMiddleWare,
  getSingleConversationController,
);

router.patch(
  "/updateTitle/:id",
  authMiddleWare,
  validate(updateConversationValidation),
  updateConversationController,
);

router.delete(
  "/deleteConversation/:id",
  authMiddleWare,
  deleteConversationController,
);

router.patch(
  "/pinnedconversation/:id",
  authMiddleWare,
  togglePinConversationController,
);

router.patch(
  "/archiveconversation/:id",
  authMiddleWare,
  archiveConversationController,
);

export default router;
