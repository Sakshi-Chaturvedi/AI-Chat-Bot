import { ErrorHandler } from "../middlewares/error.middleware.js";
import Conversation from "../models/conversation.model.js";
import messageModel from "../models/message.model.js";

export const createMessageService = async (userMessage) => {
  const conversationId = userMessage.conversationId?.trim();
  const content = userMessage.content?.trim();

  if (!conversationId || !content) {
    throw new ErrorHandler(
      "Conversation ID and message content are required",
      400,
    );
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    user,
  });

  if (!conversation) {
    throw new ErrorHandler("Conversation not found.", 400);
  }

  const message = await messageModel.create({
    conversation: conversationId,
    user: userMessage.user,
    role: "user",
    content,
    status: "completed",
  });

  conversation.lastMessageAt = new Date();
  await conversation.save();

  return message;
};
