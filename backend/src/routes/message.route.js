import express from "express";
import { createMessageController } from "../controllers/message.controller.js";
import validate from "../middlewares/validate.middleware.js";
import { createMessageValidation } from "../validations/message.validation.js";
import authMiddleWare from "../middlewares/auth.middleware.js";

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

export default router;
