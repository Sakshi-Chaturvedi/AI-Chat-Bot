import express from "express";
import {
  createConversation,
  deleteConversationController,
  getSingleConversationController,
  getUserConversationController,
  updateConversationController,
} from "../controllers/conversation.controller.js";
import authMiddleWare from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/check", (req, res) => {
  res.send("Conversation is creating Successfully.");
});

router.post("/", authMiddleWare, createConversation);
router.get("/conversations", authMiddleWare, getUserConversationController);
router.get(
  "/conversation/:id",
  authMiddleWare,
  getSingleConversationController,
);
router.put("/updateTitle/:id", authMiddleWare, updateConversationController);
router.delete("/deleteConversation/:id", authMiddleWare, deleteConversationController);

export default router;
