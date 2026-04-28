import catchAsyncError from "../middlewares/catchAsyncError.js";
import Conversation from "../models/conversation.model.js";
import {
  createConversationService,
  getSingleConversationService,
  getUserConversationService,
  updateConversationService
} from "../services/conversation.service.js";

export const createConversation = catchAsyncError(async (req, res, next) => {
  const user = req.user.id;
  const title = req.body?.title?.trim() || "New Chat";

  const conversation = await createConversationService({
    user,
    title,
  });

  res.status(201).json({
    success: true,
    message: "Conversation Created Successfully.",
    conversation,
  });
});

export const getUserConversationController = catchAsyncError(
  async (req, res, next) => {
    const userId = req.user.id;

    const conversations = await getUserConversationService(userId);
    // console.log(conversations);

    res.status(200).json({
      success: true,
      message: "Conversations fetched Successfully.",
      conversations,
    });
  },
);

export const getSingleConversationController = catchAsyncError(
  async (req, res, next) => {
    const id = req.params.id;
    const userId = req.user.id;

    const conversation = await getSingleConversationService(id, userId);

    res.status(200).json({
      success: true,
      message: "Conversation fetched successfully.",
      conversation,
    });
  },
);


export const updateConversationController = catchAsyncError(
  async (req, res, next) => {
    const conversationId = req.params.id;
    const userId = req.user.id;
    const { title } = req.body;

    const updatedConversation = await updateConversationService({
      conversationId,
      userId,
      title,
    });

    res.status(200).json({
      success: true,
      message: "Conversation updated successfully.",
      conversation: updatedConversation,
    });
  }
);