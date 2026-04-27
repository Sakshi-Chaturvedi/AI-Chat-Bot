import express from "express";
import { createConversation } from "../controllers/conversation.controller.js";
import authMiddleWare from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/check", (req, res) => {
    res.send("Conversation is creating Successfully.")
})

router.post("/",authMiddleWare, createConversation);

export default router