import mongoose from "mongoose";
import { ErrorHandler } from "../middlewares/error.middleware.js";
import Conversation from "../models/conversation.model.js";
import User from "../models/user.model.js";


// ! Create Conversation Service -------------------->>>>>>>>>>>>>>>>>>>>>>>>>>..............................
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


// ! Get User Conversation Service ---------------------->>>>>>>>>>>>>>>>>>>>>>>>>>.........................
export const getUserConversationService = async (userId) => {
  if (!userId) {
    throw new ErrorHandler("Login first", 401);
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ErrorHandler("Invalid user id", 400);
  }

  const conversations = await Conversation.find({ user: userId }).sort({
    updatedAt: -1,
  });

  return conversations;
};


// ! Get Single Conversation Service --------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>..........................
export const getSingleConversationService = async (id, userId) => {
  if (!id) {
    throw new ErrorHandler("Conversation ID is required.", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ErrorHandler("Invalid Conversation ID.", 400);
  }

  const conversation = await Conversation.findById(id);

  if (!conversation) {
    throw new ErrorHandler("Conversation not found.", 404);
  }

  // 🔥 Security check
  if (conversation.user.toString() !== userId.toString()) {
    throw new ErrorHandler("Unauthorized access.", 403);
  }

  return conversation;
};


// ! Update Conversation Service ----------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>>.......................
export const updateConversationService = async ({
  conversationId,
  userId,
  title,
}) => {
  if (!conversationId || !userId) {
    throw new ErrorHandler("Conversation ID and user ID are required.", 400);
  }

  const trimmedTitle = title?.trim();

  if (!trimmedTitle) {
    throw new ErrorHandler("Title is required.", 400);
  }

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    throw new ErrorHandler("Conversation not found.", 404);
  }

  if (conversation.user.toString() !== userId.toString()) {
    throw new ErrorHandler("Unauthorized access.", 403);
  }

  conversation.title = trimmedTitle;

  await conversation.save();

  return conversation;
};


// ! Delete Conversation Service --------------------------->>>>>>>>>>>>>>>>>>>>>>>............................
export const deleteConversationService = async ({
  userId,
  conversationId,
}) => {
  if (!userId || !conversationId) {
    throw new ErrorHandler("User ID and Conversation ID are required.", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new ErrorHandler("Invalid Conversation ID.", 400);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ErrorHandler("User not found.", 404);
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new ErrorHandler("Conversation not found.", 404);
  }

  // 🔥 Security check
  if (conversation.user.toString() !== userId.toString()) {
    throw new ErrorHandler("Unauthorized access.", 403);
  }

  await conversation.deleteOne();

  return { message: "Conversation deleted successfully." };
};
