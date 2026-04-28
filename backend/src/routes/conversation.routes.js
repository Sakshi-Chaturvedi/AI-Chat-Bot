import express from "express";
import { createConversation, getUserConversationController } from "../controllers/conversation.controller.js";
import authMiddleWare from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/check", (req, res) => {
    res.send("Conversation is creating Successfully.")
})

router.post("/", authMiddleWare, createConversation);
router.get("/conversations",authMiddleWare,getUserConversationController)

export default router