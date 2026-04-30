import { ErrorHandler } from "../middlewares/error.middleware.js";
import Conversation from "../models/conversation.model.js";
import messageModel from "../models/message.model.js";

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

  // ? Save user message
  const message = await messageModel.create({
    conversation: conversationId,
    user: userId,
    role: "user",
    content,
    status: "completed",
  });

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