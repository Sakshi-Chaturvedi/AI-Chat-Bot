import express from "express";
import {
  createMessageController,
  editMessageController,
  getMessageController,
  regenerateMessageController,
  searchMessagecontroller,
} from "../controllers/message.controller.js";
import validate from "../middlewares/validate.middleware.js";
import authMiddleWare from "../middlewares/auth.middleware.js";
import { createMessageValidation } from "../validations/message.validation.js";

const router = express.Router();

router.get("/check", (req, res) => {
  res.send("Message API working properly.");
});

router.post(
  "/:id",
  authMiddleWare,
  validate(createMessageValidation),
  createMessageController,
);

router.get("/searchMessage/:id", authMiddleWare, searchMessagecontroller);

router.get("/:id", authMiddleWare, getMessageController);

router.patch("/:id", authMiddleWare, editMessageController);

router.patch(
  "/regenrateReply/:id",
  authMiddleWare,
  regenerateMessageController,
);

export default router;
