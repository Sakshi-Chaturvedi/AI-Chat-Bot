import { ErrorHandler } from "../middlewares/error.middleware.js";
import Conversation from "../models/conversation.model.js";
import messageModel from "../models/message.model.js";
import mongoose from "mongoose";

// ! Title Generator Function ----------------->>>>>>>>>>>>>>>>>>>>>>>>>>.............................
const generateTitleFromMessage = (content = "") => {
  const cleanText = content.trim().replace(/\s+/g, " ");

  if (!cleanText) return "New Chat";

  return cleanText.length > 35 ? cleanText.slice(0, 35) + "..." : cleanText;
};

// ! Create Message Service API -------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>>>.......................
export const createMessageService = async (userMessage = {}) => {
  const conversationId = userMessage.conversationId;
  const userId = userMessage.user;
  const content = userMessage.content?.trim();

  if (!conversationId || !userId || !content) {
    throw new ErrorHandler(
      "Conversation ID, user ID and message content are required.",
      400,
    );
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    user: userId,
  });

  if (!conversation) {
    throw new ErrorHandler("Conversation not found or unauthorized.", 404);
  }

  const existingMessages = await messageModel.countDocuments({
    conversation: conversationId,
    user: userId,
  });

  // ? Save user message
  const message = await messageModel.create({
    conversation: conversationId,
    user: userId,
    role: "user",
    content,
    status: "completed",
  });

  // ? Generate Conversation title if it's new conversation
  if (existingMessages === 0 && conversation.title === "New Chat") {
    conversation.title = generateTitleFromMessage(content);
  }

  // ? Create assistant pending message
  let assistantMessage = await messageModel.create({
    conversation: conversationId,
    user: userId,
    role: "assistant",
    content: "",
    status: "pending",
  });

  // ? Dummy AI response — ABHI YAHI LIKHNA HAI
  const aiResponse = `You asked: ${content}. I am your AI assistant 🤖`;

  // ? Update assistant message
  assistantMessage.content = aiResponse;
  assistantMessage.status = "completed";
  await assistantMessage.save();

  conversation.lastMessageAt = new Date();
  await conversation.save();

  return { message, assistantMessage };
};

// ! Get All Messages Service API -------------------->>>>>>>>>>>>>>>>>>>>>>>>..........................
export const getAllMessagesService = async (userData = {}) => {
  const cid = userData.conversationId;
  const uid = userData.userId;

  if (!cid) {
    throw new ErrorHandler("Conversation id is required.", 400);
  }

  if (!uid) {
    throw new ErrorHandler("User id is required.", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(cid)) {
    throw new ErrorHandler("Invalid conversation id.", 400);
  }

  const conversation = await Conversation.findById(cid);

  if (!conversation) {
    throw new ErrorHandler("Conversation not found.", 404);
  }

  if (conversation.user.toString() !== uid.toString()) {
    throw new ErrorHandler("Unauthorized access.", 403);
  }

  const messages = await messageModel
    .find({ conversation: cid })
    .select("-__v")
    .sort({ createdAt: 1 })
    .lean();

  return messages;
};

// ! Edit Message Service --------------------->>>>>>>>>>>>>>>>>........................
export const editMessageService = async (userMessage = {}) => {
  const mid = userMessage.messageId;
  const uid = userMessage.userId;
  const content = userMessage.content?.trim();

  if (!mid) {
    throw new ErrorHandler("Message ID is required.", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(mid)) {
    throw new ErrorHandler("Invalid message ID.", 400);
  }

  if (!uid) {
    throw new ErrorHandler("Unauthorized.", 401);
  }

  if (!content) {
    throw new ErrorHandler("Message content is required.", 400);
  }

  const message = await messageModel.findById(mid);

  if (!message) {
    throw new ErrorHandler("Message not found.", 404);
  }

  if (message.role !== "user") {
    throw new ErrorHandler("Only user messages can be edited.", 400);
  }

  const conversation = await Conversation.findOne({
    _id: message.conversation,
    user: uid,
  });

  if (!conversation) {
    throw new ErrorHandler("Conversation not found or unauthorized.", 404);
  }

  message.content = content;
  await message.save();

  let assistantReply = await messageModel
    .findOne({
      conversation: message.conversation,
      user: uid,
      role: "assistant",
      createdAt: { $gt: message.createdAt },
    })
    .sort({ createdAt: 1 });

  const updatedAiAnswer = `You asked: ${content}. This is your updated answer 🤖`;

  if (assistantReply) {
    assistantReply.content = updatedAiAnswer;
    assistantReply.status = "completed";
    await assistantReply.save();
  } else {
    assistantReply = await messageModel.create({
      conversation: message.conversation,
      user: uid,
      role: "assistant",
      content: updatedAiAnswer,
      status: "completed",
    });
  }

  conversation.updatedAt = new Date();
  await conversation.save();

  return {
    userMessage: message,
    assistantReply,
  };
};

// ! Regenerate Assistant reply for particular chat Service ------------>>>>>>>>>>>>>>>>>>>.................
export const regenerateReplyService = async (messageData = {}) => {
  const mid = messageData.mid;
  const uid = messageData.uid;

  if (!mid) {
    throw new ErrorHandler("Message id is required.", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(mid)) {
    throw new ErrorHandler("Invalid message ID.", 400);
  }

  if (!uid) {
    throw new ErrorHandler("User id is required.", 401);
  }

  const assistantMessage = await messageModel.findById(mid);

  if (!assistantMessage) {
    throw new ErrorHandler("Assistant message not found.", 404);
  }

  if (assistantMessage.role !== "assistant") {
    throw new ErrorHandler("Only assistant messages can be regenerated.", 400);
  }

  const conversation = await Conversation.findOne({
    _id: assistantMessage.conversation,
    user: uid,
  });

  if (!conversation) {
    throw new ErrorHandler("Conversation not Found.", 404);
  }

  const previousUserMessage = await messageModel
    .findOne({
      conversation: assistantMessage.conversation,
      user: uid,
      role: "user",
      createdAt: { $lt: assistantMessage.createdAt },
    })
    .sort({ createdAt: -1 });

  if (!previousUserMessage) {
    throw new ErrorHandler("Previous user message not found.", 404);
  }

  assistantMessage.status = "pending";
  assistantMessage.content = "";
  await assistantMessage.save();

  const regeneratedAnswer = `Regenerated answer for: ${previousUserMessage.content} 🤖`;

  assistantMessage.content = regeneratedAnswer;
  assistantMessage.status = "completed";
  await assistantMessage.save();

  conversation.updatedAt = new Date();
  await conversation.save();

  return assistantMessage;
};
