import { ErrorHandler } from "../middlewares/error.middleware.js";
import Conversation from "../models/conversation.model.js";
import messageModel from "../models/message.model.js";
import mongoose from "mongoose";
import userModel from "../models/user.model.js";
import { MESSAGE_LIMITS } from "../constants/limits.js";
// import { generateAIResponse } from "./ai.service.js";
// import { generateAIStream } from "../utils/generateAIStream.js";
import { generateAIResponse } from "../ai/ai.service.js";
import { generateOpenRouterStream } from "../ai/providers/openrouter-stream.provider.js";
import {readOpenRouterStream} from "../utils/readOpenRouterStream.js"
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

  
  
  const user = await userModel.findById(userId);


  if (!user) throw new ErrorHandler("User not found.", 400);

  if (!user.usage) {
    user.usage = {
      dailyMessages: 0,
      lastResetDate: new Date(),
    };
  }

  const today = new Date().toDateString();
  const lastResetDate = new Date(user.usage.lastResetDate).toDateString();

  if (today !== lastResetDate) {
    user.usage.dailyMessages = 0;
    user.usage.lastResetDate = new Date();
    await user.save({ validateBeforeSave: false });
  }
  const userPlan = user.plan || "free";
  const dailyLimit = MESSAGE_LIMITS[userPlan] || MESSAGE_LIMITS.free;

  

  if (user.usage.dailyMessages >= dailyLimit) {
    throw new ErrorHandler(
      `Daily message limit reached. Your ${userPlan} plan allows ${dailyLimit} messages per day.`,
      429,
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

  console.log(existingMessages);

  // ? Save user message
  const message = await messageModel.create({
    conversation: conversationId,
    user: userId,
    role: "user",
    content,
    status: "completed",
  });

  user.usage.dailyMessages += 1;
  await user.save({ validateBeforeSave: false });

  // ? Fetch recent conversation history for AI context
  const recentMessages = await messageModel
    .find({
      conversation: conversationId,
      user: userId,
      status: "completed",
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .select("role content")
    .lean();

  const conversationHistory = recentMessages.reverse();

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

  // ? Failure Handling in the Chatbot
  try {
    const aiResponse = await generateAIResponse({
      prompt: content,
      history: conversationHistory,
    });

    assistantMessage.content = aiResponse.response;
    assistantMessage.status = "completed";
    assistantMessage.model = aiResponse.model;
    assistantMessage.tokensUsed = aiResponse.tokensUsed;
    await assistantMessage.save();

    conversation.lastMessageAt = new Date();
    await conversation.save();

    return { message, assistantMessage };
  } catch (error) {
    assistantMessage.content =
      "Sorry, I couldn't generate a response. Please try again.";
    assistantMessage.status = "failed";
    assistantMessage.errorMessage = error.message;
    await assistantMessage.save();

    conversation.lastMessageAt = new Date();
    await conversation.save();

    throw new ErrorHandler(
      error.message || "AI response generation failed.",
      error.statusCode || 500,
    );
  }
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

  try {
    const updatedAiAnswer = await generateAIResponse({ prompt: content });

    if (assistantReply) {
      assistantReply.content = updatedAiAnswer.response;
      assistantReply.status = "completed";
      assistantReply.model = updatedAiAnswer.model;
      assistantReply.tokensUsed = updatedAiAnswer.tokensUsed;
      assistantReply.errorMessage = undefined;
      await assistantReply.save();
    } else {
      assistantReply = await messageModel.create({
        conversation: message.conversation,
        user: uid,
        role: "assistant",
        content: updatedAiAnswer.response,
        status: "completed",
        model: updatedAiAnswer.model,
        tokensUsed: updatedAiAnswer.tokensUsed,
      });
    }

    conversation.lastMessageAt = new Date();
    await conversation.save();

    return {
      userMessage: message,
      assistantReply,
    };
  } catch (error) {
    if (assistantReply) {
      assistantReply.content =
        "Sorry, I couldn't generate a response. Please try again.";
      assistantReply.status = "failed";
      assistantReply.errorMessage = error.message;
      await assistantReply.save();
    } else {
      assistantReply = await messageModel.create({
        conversation: message.conversation,
        user: uid,
        role: "assistant",
        content: "Sorry, I couldn't generate a response. Please try again.",
        status: "failed",
        errorMessage: error.message,
      });
    }

    conversation.lastMessageAt = new Date();
    await conversation.save();

    throw new ErrorHandler(
      error.message || "AI response generation failed.",
      error.statusCode || 500,
    );
  }
};

// ! Regenerate Assistant reply for particular chat Service ------------>>>>>>>>>>>>>>>>>>>.................
export const regenerateReplyService = async ({ mid, uid }) => {
  if (!mid) {
    throw new ErrorHandler("Message ID is required.", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(mid)) {
    throw new ErrorHandler("Invalid message ID.", 400);
  }

  if (!uid) {
    throw new ErrorHandler("Unauthorized.", 401);
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
    throw new ErrorHandler("Conversation not found or unauthorized.", 404);
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

  if (!previousUserMessage.content?.trim()) {
    throw new ErrorHandler("Previous user message content is empty.", 400);
  }

  assistantMessage.status = "pending";
  assistantMessage.content = "";
  assistantMessage.errorMessage = undefined;
  await assistantMessage.save();

  const recentMessages = await messageModel
    .find({
      conversation: assistantMessage.conversation,
      user: uid,
      status: "completed",
      createdAt: { $lt: assistantMessage.createdAt },
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .select("role content")
    .lean();

  const history = recentMessages
    .reverse()
    .filter((msg) => msg.content?.trim())
    .map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

  try {
    const aiResult = await generateAIResponse({
      prompt: previousUserMessage.content.trim(),
      history,
    });

    if (!aiResult?.response) {
      throw new ErrorHandler("Empty AI response received.", 500);
    }

    assistantMessage.content = aiResult.response;
    assistantMessage.status = "completed";
    assistantMessage.model = aiResult.model;
    assistantMessage.tokensUsed = aiResult.tokensUsed || 0;
    assistantMessage.errorMessage = undefined;

    await assistantMessage.save();

    conversation.lastMessageAt = new Date();
    await conversation.save();

    return assistantMessage;
  } catch (error) {
    assistantMessage.content =
      "Sorry, I couldn't generate a response. Please try again.";
    assistantMessage.status = "failed";
    assistantMessage.errorMessage =
      error.message || "AI response generation failed.";

    await assistantMessage.save();

    conversation.lastMessageAt = new Date();
    await conversation.save();

    throw new ErrorHandler(
      error.message || "AI response generation failed.",
      error.statusCode || 500,
    );
  }
};

// ! Search Message Service -------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>......................
export const searchMessageService = async (searchData = {}) => {
  const uid = searchData.uid;
  const cid = searchData.cid;

  const query = searchData.query;

  if (!uid) throw new ErrorHandler("Unauthorized Access!", 401);

  if (!cid) throw new ErrorHandler("Conversation id is required.", 400);

  if (!mongoose.Types.ObjectId.isValid(cid))
    throw new ErrorHandler("Invalid Conversation id.", 400);

  if (!query) throw new ErrorHandler("Query is required for the search.", 400);

  const conversation = await Conversation.findById({
    _id: cid,
    user: uid,
  });

  if (!conversation) throw new ErrorHandler("Conversation not Found.", 400);

  const messages = await messageModel
    .find({
      conversation: cid,
      content: {
        $regex: query,
        $options: "i",
      },
    })
    .sort({ createdAt: 1 });

  return messages;
};

// ! Retry Failed Messages Service ----------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>
export const retryFailedMessageService = async ({ mid, uid }) => {
  if (!uid) {
    throw new ErrorHandler("User ID is required.", 400);
  }

  if (!mid) {
    throw new ErrorHandler("Message ID is required.", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(mid)) {
    throw new ErrorHandler("Invalid message ID.", 400);
  }

  const message = await messageModel.findById(mid);

  if (!message) {
    throw new ErrorHandler("Message not found.", 404);
  }

  if (message.user.toString() !== uid.toString()) {
    throw new ErrorHandler("Unauthorized user.", 403);
  }

  if (message.status !== "failed" || message.role !== "assistant") {
    throw new ErrorHandler(
      "Only failed assistant messages can be retried.",
      400,
    );
  }

  const conversation = await Conversation.findOne({
    _id: message.conversation,
    user: uid,
  });

  if (!conversation) {
    throw new ErrorHandler("Conversation not found or unauthorized.", 404);
  }

  const previousUserMessage = await messageModel
    .findOne({
      conversation: message.conversation,
      user: uid,
      role: "user",
      createdAt: { $lt: message.createdAt },
    })
    .sort({ createdAt: -1 });

  if (!previousUserMessage) {
    throw new ErrorHandler("Previous user message not found.", 404);
  }

  if (!previousUserMessage.content?.trim()) {
    throw new ErrorHandler("Previous user message content is empty.", 400);
  }

  const recentMessages = await messageModel
    .find({
      conversation: message.conversation,
      user: uid,
      status: "completed",
      createdAt: { $lt: message.createdAt },
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .select("role content")
    .lean();

  const history = recentMessages
    .reverse()
    .filter((msg) => msg.content?.trim())
    .map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

  message.status = "pending";
  message.content = "";
  message.errorMessage = undefined;
  await message.save();

  try {
    const aiResult = await generateAIResponse({
      prompt: previousUserMessage.content.trim(),
      history,
    });

    if (!aiResult?.response) {
      throw new ErrorHandler("Empty AI response received.", 500);
    }

    message.content = aiResult.response;
    message.status = "completed";
    message.model = aiResult.model;
    message.tokensUsed = aiResult.tokensUsed || 0;
    message.errorMessage = undefined;

    await message.save();

    conversation.lastMessageAt = new Date();
    await conversation.save();

    return message;
  } catch (error) {
    message.content =
      "Sorry, I couldn't generate a response. Please try again.";
    message.status = "failed";
    message.errorMessage = error.message || "AI response generation failed.";

    await message.save();

    conversation.lastMessageAt = new Date();
    await conversation.save();

    throw new ErrorHandler(
      error.message || "AI response generation failed.",
      error.statusCode || 500,
    );
  }
};

// ! Cancel Assistent Message Generation --------------------->>>>>>>>>>>>>>>>>>>>>>
export const cancelMessageGenerationService = async ({ uid, amid }) => {
  if (!uid) {
    throw new ErrorHandler("User ID is required.", 400);
  }

  if (!amid) {
    throw new ErrorHandler("Assistant message ID is required.", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(amid)) {
    throw new ErrorHandler("Invalid assistant message ID.", 400);
  }

  const assistantMessage = await messageModel.findById(amid);

  if (!assistantMessage) {
    throw new ErrorHandler("Assistant message not found.", 404);
  }

  if (assistantMessage.role !== "assistant") {
    throw new ErrorHandler("Only assistant messages can be cancelled.", 400);
  }

  if (assistantMessage.status !== "pending") {
    throw new ErrorHandler("Only pending messages can be cancelled.", 400);
  }

  const conversation = await Conversation.findOne({
    _id: assistantMessage.conversation,
    user: uid,
  });

  if (!conversation) {
    throw new ErrorHandler("Conversation not found or unauthorized.", 404);
  }

  assistantMessage.status = "cancelled";
  assistantMessage.content = "Response generation stopped.";
  assistantMessage.errorMessage = undefined;

  await assistantMessage.save();

  conversation.lastMessageAt = new Date();
  await conversation.save();

  return assistantMessage;
};

// ! Stream Message Response ---------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
export const streamMessageService = async ({
  userId,
  conversationId,
  content,
  sendEvent,
}) => {
  if (!userId) {
    throw new ErrorHandler("User ID is required.", 401);
  }

  if (!conversationId) {
    throw new ErrorHandler("Conversation ID is required.", 400);
  }

  if (!content || !content.trim()) {
    throw new ErrorHandler("Message content is required.", 400);
  }

  const user = await userModel.findById(userId);

  if (!user) {
    throw new ErrorHandler("User not found.", 404);
  }

  if (!user.usage) {
    user.usage = {
      dailyMessages: 0,
      lastResetDate: new Date(),
    };
  }

  const today = new Date().toDateString();
  const lastResetDate = new Date(user.usage.lastResetDate).toDateString();

  if (today !== lastResetDate) {
    user.usage.dailyMessages = 0;
    user.usage.lastResetDate = new Date();
    await user.save({ validateBeforeSave: false });
  }

  const userPlan = user.plan || "free";
  const dailyLimit = MESSAGE_LIMITS[userPlan] || MESSAGE_LIMITS.free;

  if (user.usage.dailyMessages >= dailyLimit) {
    throw new ErrorHandler(
      `Daily message limit reached. Your ${userPlan} plan allows ${dailyLimit} messages per day.`,
      429,
    );
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    user: userId,
  });

  if (!conversation) {
    throw new ErrorHandler("Conversation not found or unauthorized.", 404);
  }

  const userMessage = await messageModel.create({
    conversation: conversationId,
    user: userId,
    role: "user",
    content: content.trim(),
    status: "completed",
  });

  const assistantMessage = await messageModel.create({
    conversation: conversationId,
    user: userId,
    role: "assistant",
    content: "",
    status: "pending",
  });

  user.usage.dailyMessages += 1;
  await user.save({ validateBeforeSave: false });

  sendEvent("start", {
    userMessageId: userMessage._id,
    assistantMessageId: assistantMessage._id,
  });

  let fullResponse = "";

  try {
    const recentMessages = await messageModel
      .find({
        conversation: conversationId,
        user: userId,
        status: "completed",
        createdAt: { $lt: assistantMessage.createdAt },
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("role content")
      .lean();

    const history = recentMessages
      .reverse()
      .filter((msg) => msg.content?.trim())
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

    const { stream, model } = await generateOpenRouterStream({
      prompt: content.trim(),
      history,
    });

    for await (const chunkText of readOpenRouterStream(stream)) {
  if (!chunkText) continue;

  fullResponse += chunkText;

  sendEvent("chunk", {
    assistantMessageId: assistantMessage._id,
    text: chunkText,
  });
}

    const latestAssistantMessage = await messageModel.findById(
      assistantMessage._id,
    );

    if (latestAssistantMessage.status === "cancelled") {
      return {
        userMessage,
        assistantMessage: latestAssistantMessage,
      };
    }

    assistantMessage.content = fullResponse;
    assistantMessage.status = "completed";
    assistantMessage.model = model;
    assistantMessage.tokensUsed = 0;
    assistantMessage.errorMessage = undefined;

    await assistantMessage.save();

    conversation.lastMessageAt = new Date();
    await conversation.save();

    sendEvent("done", {
      userMessageId: userMessage._id,
      assistantMessageId: assistantMessage._id,
      fullResponse,
    });

    return {
      userMessage,
      assistantMessage,
    };
  } catch (error) {
    assistantMessage.content =
      fullResponse ||
      "Sorry, I couldn't generate a response. Please try again.";
    assistantMessage.status = "failed";
    assistantMessage.errorMessage =
      error.message || "AI streaming generation failed.";

    await assistantMessage.save();

    conversation.lastMessageAt = new Date();
    await conversation.save();

    sendEvent("error", {
      message: error.message || "AI streaming generation failed.",
      assistantMessageId: assistantMessage._id,
    });

    throw error;
  }
};
