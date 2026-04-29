import express from "express";
import { createMessageController } from "../controllers/message.controller.js";

const route = express.Router();

route.get("/check", (req, res) => {
  res.send("Message API working Properly.");
});

route.post("/createMessage", createMessageController)

export default route;
