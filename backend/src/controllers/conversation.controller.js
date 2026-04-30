import catchAsyncError from "../middlewares/catchAsyncError.js";
import Conversation from "../models/conversation.model.js";
import {
  createConversationService,
  deleteConversationService,
  getSingleConversationService,
  getUserConversationService,
  updateConversationService,
} from "../services/conversation.service.js";

// ! Create Conversation API -------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>>.........................
export const createConversation = catchAsyncError(async (req, res, next) => {
  const user = req.user.id;
  const title = req.body?.title || "New Chat";

  const conversation = await createConversationService({
    user,
    title,
  });

  res.status(201).json({
    success: true,
    message: "Conversation created successfully.",
    conversation,
  });
});

// ! Get User Conversation API ------------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>>..........................
export const getUserConversationController = catchAsyncError(
  async (req, res, next) => {
    const userId = req.user.id;

    const conversations = await getUserConversationService(userId);

    res.status(200).json({
      success: true,
      message: "Conversations fetched successfully.",
      conversations,
    });
  }
);

// ! Get Single Conversation API ------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>.........................
export const getSingleConversationController = catchAsyncError(
  async (req, res, next) => {
    const conversationId = req.params.id;
    const userId = req.user.id;

    const conversation = await getSingleConversationService(
      conversationId,
      userId
    );

    res.status(200).json({
      success: true,
      message: "Conversation fetched successfully.",
      conversation,
    });
  }
);


// ! Update Conversation API ------------------------>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>............................
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
  },
);

// ! Delete Conversation API ---------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>>..............................
export const deleteConversationController = catchAsyncError(
  async (req, res, next) => {
    const userId = req.user.id;

    const conversationId = req.params.id;

    const conversations = await deleteConversationService({
      userId,
      conversationId,
    });

    res.status(200).json({
      success: true,
      message: "Conversation Deleted Successfully.",
      conversations,
    });
  },
);
