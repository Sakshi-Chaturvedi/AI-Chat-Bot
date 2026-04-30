import express from "express";
import { createMessageController, getMessageController } from "../controllers/message.controller.js";
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

router.get("/:id", authMiddleWare, getMessageController);

export default router;
