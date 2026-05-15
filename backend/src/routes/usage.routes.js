import express from "express";
import authMiddleWare from "../middlewares/auth.middleware.js";
import { getMyUsageController } from "../controllers/usage.controller.js";

const router = express.Router();

router.get("/me", authMiddleWare, getMyUsageController);

export default router;
