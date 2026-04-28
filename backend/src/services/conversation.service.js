import mongoose from "mongoose";
import { ErrorHandler } from "../middlewares/error.middleware.js";
import Conversation from "../models/conversation.model.js";
import User from "../models/user.model.js";


export const createConversationService = async (userData = {}) => {
  const userId = userData.user;
  const title = userData.title?.trim() || "New Chat";

  if (!userId) {
    throw new ErrorHandler("Login first.", 401);
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ErrorHandler("Invalid user id.", 400);
  }

  const userExists = await User.findById(userId);

  if (!userExists) {
    throw new ErrorHandler("User not found.", 404);
  }

  const conversation = await Conversation.create({
    user: userId,
    title,
  });

  return conversation;
};


export const getUserConversationService = async (userId) => {
  if (!userId) {
    throw new ErrorHandler("Login first", 401);
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ErrorHandler("Invalid user id", 400);
  }

  const conversations = await Conversation.find({ user: userId })
    .sort({ updatedAt: -1 });

  return conversations;
};