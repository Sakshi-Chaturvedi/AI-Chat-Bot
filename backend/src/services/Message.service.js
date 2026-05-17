import { ErrorHandler } from "../middlewares/error.middleware.js";
import Conversation from "../models/conversation.model.js";
import messageModel from "../models/message.model.js";
import mongoose from "mongoose";
import userModel from "../models/user.model.js";
// import { MESSAGE_LIMITS } from "../constants/limits.js";
import { generateAIResponse } from "../ai/ai.service.js";
import { generateOpenRouterStream } from "../ai/providers/openrouter-stream.provider.js";
import { readOpenRouterStream } from "../utils/readOpenRouterStream.js";
import { checkPlanLimit } from "./plan.service.js";
import { estimateTokens } from "../utils/estimateTokens.js";
import { incrementUsage } from "./usage.service.js";
import { PLAN_ACTIONS } from "../constants/planActions.js";
import { resolveModelForUser } from "../utils/resolveModelForUser.js";
import { PLAN_LIMITS } from "../constants/limits.js";

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
  const requestedModel = userMessage.requestedModel || "basic";

  if (!conversationId || !userId || !content) {
    throw new ErrorHandler(
      "Conversation ID, user ID and message content are required.",
      400,
    );
  }

  const estimatedInputTokens = estimateTokens(content);

  // 1. Check plan limits and requested model access
  const planCheck = await checkPlanLimit({
    userId,
    action: PLAN_ACTIONS.SEND_MESSAGE,
    requestedModel,
    estimatedTokens: estimatedInputTokens,
  });

  const { selectedModel, modelConfig } = resolveModelForUser({
    requestedModel,
    limits: planCheck.limits,
  });

  // 2. Find user
  const user = await userModel.findById(userId);

  if (!user) {
    throw new ErrorHandler("User not found.", 404);
  }

  // 3. Safely initialize daily usage if missing
  if (!user.usage) {
    user.usage = {
      dailyMessages: 0,
      lastResetDate: new Date(),
    };
  }

  // 4. Find conversation and verify ownership
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

  // 5. Save user message
  const message = await messageModel.create({
    conversation: conversationId,
    user: userId,
    role: "user",
    content,
    status: "completed",
    selectedModel,
  });

  // 6. Increment daily usage
  user.usage.dailyMessages += 1;
  user.usage.lastResetDate = user.usage.lastResetDate || new Date();

  await user.save({ validateBeforeSave: false });

  // 7. Fetch previous conversation history only
  // Important: current user message ko history me include mat karo,
  // warna AI ko same prompt duplicate mil sakta hai.
  const recentMessages = await messageModel
    .find({
      conversation: conversationId,
      user: userId,
      status: "completed",
      createdAt: { $lt: message.createdAt },
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .select("role content")
    .lean();

  const conversationHistory = recentMessages
    .reverse()
    .filter((msg) => msg.content?.trim())
    .map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

  // 8. Generate conversation title if first message
  if (existingMessages === 0 && conversation.title === "New Chat") {
    conversation.title = generateTitleFromMessage(content);
  }

  // 9. Create assistant pending message
  const assistantMessage = await messageModel.create({
    conversation: conversationId,
    user: userId,
    role: "assistant",
    content: "",
    status: "pending",
    selectedModel,
    provider: modelConfig.provider,
    model: modelConfig.model,
    tokensUsed: 0,
  });

  try {
    // 10. Generate AI response using resolved provider/model
    const aiResponse = await generateAIResponse({
      prompt: content,
      history: conversationHistory,
      provider: modelConfig.provider,
      model: modelConfig.model,
    });

    if (!aiResponse?.response) {
      throw new ErrorHandler("Empty AI response received.", 500);
    }

    // 11. Update assistant message
    assistantMessage.content = aiResponse.response;
    assistantMessage.status = "completed";
    assistantMessage.selectedModel = selectedModel;
    assistantMessage.provider = aiResponse.provider || modelConfig.provider;
    assistantMessage.model = aiResponse.model || modelConfig.model;
    assistantMessage.tokensUsed = aiResponse.tokensUsed || 0;
    assistantMessage.errorMessage = null;

    await assistantMessage.save();

    // 12. Update conversation
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // 13. Increment monthly usage
    await incrementUsage({
      userId,
      messages: 1,
      tokens: aiResponse.tokensUsed || estimatedInputTokens,
    });

    return {
      message,
      assistantMessage,
    };
  } catch (error) {
    assistantMessage.content =
      "Sorry, I couldn't generate a response. Please try again.";
    assistantMessage.status = "failed";
    assistantMessage.errorMessage =
      error.message || "AI response generation failed.";
    assistantMessage.selectedModel = selectedModel;
    assistantMessage.provider = modelConfig.provider;
    assistantMessage.model = modelConfig.model;

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
  const requestedModel = userMessage.requestedModel || "basic";

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

  const estimatedInputTokens = estimateTokens(content);

  const planCheck = await checkPlanLimit({
    userId: uid,
    action: PLAN_ACTIONS.SEND_MESSAGE,
    requestedModel,
    estimatedTokens: estimatedInputTokens,
  });

  const { selectedModel, modelConfig } = resolveModelForUser({
    requestedModel,
    limits: planCheck.limits,
  });

  // Update user message
  message.content = content;
  message.selectedModel = selectedModel;
  await message.save();

  let assistantReply = await messageModel
    .findOne({
      conversation: message.conversation,
      user: uid,
      role: "assistant",
      createdAt: { $gt: message.createdAt },
    })
    .sort({ createdAt: 1 });

  if (assistantReply) {
    assistantReply.status = "pending";
    assistantReply.content = "";
    assistantReply.errorMessage = null;
    assistantReply.selectedModel = selectedModel;
    assistantReply.provider = modelConfig.provider;
    assistantReply.model = modelConfig.model;
    assistantReply.tokensUsed = 0;
    await assistantReply.save();
  } else {
    assistantReply = await messageModel.create({
      conversation: message.conversation,
      user: uid,
      role: "assistant",
      content: "",
      status: "pending",
      selectedModel,
      provider: modelConfig.provider,
      model: modelConfig.model,
      tokensUsed: 0,
    });
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

  try {
    const updatedAiAnswer = await generateAIResponse({
      prompt: content,
      history,
      provider: modelConfig.provider,
      model: modelConfig.model,
    });

    if (!updatedAiAnswer?.response) {
      throw new ErrorHandler("Empty AI response received.", 500);
    }

    assistantReply.content = updatedAiAnswer.response;
    assistantReply.status = "completed";
    assistantReply.selectedModel = selectedModel;
    assistantReply.provider = updatedAiAnswer.provider || modelConfig.provider;
    assistantReply.model = updatedAiAnswer.model || modelConfig.model;
    assistantReply.tokensUsed = updatedAiAnswer.tokensUsed || 0;
    assistantReply.errorMessage = null;

    await assistantReply.save();

    conversation.lastMessageAt = new Date();
    await conversation.save();

    await incrementUsage({
      userId: uid,
      messages: 1,
      tokens: updatedAiAnswer.tokensUsed || estimatedInputTokens,
    });

    return {
      userMessage: message,
      assistantReply,
    };
  } catch (error) {
    assistantReply.content =
      "Sorry, I couldn't generate a response. Please try again.";
    assistantReply.status = "failed";
    assistantReply.errorMessage =
      error.message || "AI response generation failed.";
    assistantReply.selectedModel = selectedModel;
    assistantReply.provider = modelConfig.provider;
    assistantReply.model = modelConfig.model;

    await assistantReply.save();

    conversation.lastMessageAt = new Date();
    await conversation.save();

    throw new ErrorHandler(
      error.message || "AI response generation failed.",
      error.statusCode || 500,
    );
  }
};

// ! Regenerate Assistant reply for particular chat Service ------------>>>>>>>>>>>>>>>>>>>.................
export const regenerateReplyService = async ({ mid, uid, requestedModel }) => {
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

  const selectedRequestedModel =
    requestedModel ||
    assistantMessage.selectedModel ||
    previousUserMessage.selectedModel ||
    "basic";

  const estimatedInputTokens = estimateTokens(previousUserMessage.content);

  const planCheck = await checkPlanLimit({
    userId: uid,
    action: PLAN_ACTIONS.SEND_MESSAGE,
    requestedModel: selectedRequestedModel,
    estimatedTokens: estimatedInputTokens,
  });

  const { selectedModel, modelConfig } = resolveModelForUser({
    requestedModel: selectedRequestedModel,
    limits: planCheck.limits,
  });

  assistantMessage.status = "pending";
  assistantMessage.content = "";
  assistantMessage.errorMessage = null;
  assistantMessage.selectedModel = selectedModel;
  assistantMessage.provider = modelConfig.provider;
  assistantMessage.model = modelConfig.model;
  assistantMessage.tokensUsed = 0;

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
      provider: modelConfig.provider,
      model: modelConfig.model,
    });

    if (!aiResult?.response) {
      throw new ErrorHandler("Empty AI response received.", 500);
    }

    assistantMessage.content = aiResult.response;
    assistantMessage.status = "completed";
    assistantMessage.selectedModel = selectedModel;
    assistantMessage.provider = aiResult.provider || modelConfig.provider;
    assistantMessage.model = aiResult.model || modelConfig.model;
    assistantMessage.tokensUsed = aiResult.tokensUsed || 0;
    assistantMessage.errorMessage = null;

    await assistantMessage.save();

    conversation.lastMessageAt = new Date();
    await conversation.save();

    await incrementUsage({
      userId: uid,
      messages: 1,
      tokens: aiResult.tokensUsed || estimatedInputTokens,
    });

    return assistantMessage;
  } catch (error) {
    assistantMessage.content =
      "Sorry, I couldn't generate a response. Please try again.";
    assistantMessage.status = "failed";
    assistantMessage.errorMessage =
      error.message || "AI response generation failed.";
    assistantMessage.selectedModel = selectedModel;
    assistantMessage.provider = modelConfig.provider;
    assistantMessage.model = modelConfig.model;

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
export const retryFailedMessageService = async ({
  mid,
  uid,
  requestedModel,
}) => {
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

  const selectedRequestedModel =
    requestedModel ||
    message.selectedModel ||
    previousUserMessage.selectedModel ||
    "basic";

  const estimatedInputTokens = estimateTokens(previousUserMessage.content);

  const planCheck = await checkPlanLimit({
    userId: uid,
    action: PLAN_ACTIONS.SEND_MESSAGE,
    requestedModel: selectedRequestedModel,
    estimatedTokens: estimatedInputTokens,
  });

  const { selectedModel, modelConfig } = resolveModelForUser({
    requestedModel: selectedRequestedModel,
    limits: planCheck.limits,
  });

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
  message.errorMessage = null;
  message.selectedModel = selectedModel;
  message.provider = modelConfig.provider;
  message.model = modelConfig.model;
  message.tokensUsed = 0;

  await message.save();

  try {
    const aiResult = await generateAIResponse({
      prompt: previousUserMessage.content.trim(),
      history,
      provider: modelConfig.provider,
      model: modelConfig.model,
    });

    if (!aiResult?.response) {
      throw new ErrorHandler("Empty AI response received.", 500);
    }

    message.content = aiResult.response;
    message.status = "completed";
    message.selectedModel = selectedModel;
    message.provider = aiResult.provider || modelConfig.provider;
    message.model = aiResult.model || modelConfig.model;
    message.tokensUsed = aiResult.tokensUsed || 0;
    message.errorMessage = null;

    await message.save();

    conversation.lastMessageAt = new Date();
    await conversation.save();

    await incrementUsage({
      userId: uid,
      tokens: aiResult.tokensUsed || estimatedInputTokens,
    });

    return message;
  } catch (error) {
    message.content =
      "Sorry, I couldn't generate a response. Please try again.";
    message.status = "failed";
    message.errorMessage = error.message || "AI response generation failed.";
    message.selectedModel = selectedModel;
    message.provider = modelConfig.provider;
    message.model = modelConfig.model;

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
  requestedModel = "basic",
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

  const estimatedInputTokens = estimateTokens(content);

  // ✅ Plan + model + monthly usage check
  const planCheck = await checkPlanLimit({
    userId,
    action: PLAN_ACTIONS.SEND_MESSAGE,
    requestedModel,
    estimatedTokens: estimatedInputTokens,
  });

  const { selectedModel, modelConfig } = resolveModelForUser({
    requestedModel,
    limits: planCheck.limits,
  });

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
    selectedModel,
  });

  const assistantMessage = await messageModel.create({
    conversation: conversationId,
    user: userId,
    role: "assistant",
    content: "",
    status: "pending",
    selectedModel,
    provider: modelConfig.provider,
    model: modelConfig.model,
    tokensUsed: 0,
  });

  user.usage.dailyMessages += 1;
  user.usage.lastResetDate = user.usage.lastResetDate || new Date();
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
        createdAt: { $lt: userMessage.createdAt },
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

    const { stream, model, provider } = await generateOpenRouterStream({
      prompt: content.trim(),
      history,
      model: modelConfig.model,
    });

    for await (const chunkText of readOpenRouterStream(stream)) {
      if (!chunkText) continue;

      fullResponse += chunkText;

      sendEvent("chunk", {
        assistantMessageId: assistantMessage._id,
        text: chunkText,
      });
    }

    if (!fullResponse.trim()) {
      throw new ErrorHandler("Empty AI stream response received.", 500);
    }

    const latestAssistantMessage = await messageModel.findById(
      assistantMessage._id,
    );

    if (latestAssistantMessage?.status === "cancelled") {
      sendEvent("done", {
        userMessageId: userMessage._id,
        assistantMessageId: latestAssistantMessage._id,
        status: "cancelled",
        fullResponse: latestAssistantMessage.content || fullResponse,
      });

      return {
        userMessage,
        assistantMessage: latestAssistantMessage,
      };
    }

    assistantMessage.content = fullResponse;
    assistantMessage.status = "completed";
    assistantMessage.selectedModel = selectedModel;
    assistantMessage.provider = provider || modelConfig.provider;
    assistantMessage.model = model || modelConfig.model;
    assistantMessage.tokensUsed = estimatedInputTokens;
    assistantMessage.errorMessage = null;

    await assistantMessage.save();

    conversation.lastMessageAt = new Date();
    await conversation.save();

    await incrementUsage({
      userId,
      messages: 1,
      tokens: estimatedInputTokens,
    });

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
    assistantMessage.selectedModel = selectedModel;
    assistantMessage.provider = modelConfig.provider;
    assistantMessage.model = modelConfig.model;

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
