import catchAsyncError from "../middlewares/catchAsyncError.js";
import { createConversationService, getUserConversation, getUserConversationService } from "../services/conversation.service.js";

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


export const getUserConversationController = catchAsyncError(async (req, res, next) => {
    const userId = req.user._id;

    const userConversations = await getUserConversationService
})