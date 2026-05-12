import catchAsyncError from "../middlewares/catchAsyncError.js";
import Conversation from "../models/conversation.model.js";
import {
  archiveConversationService,
  createConversationService,
  deleteConversationService,
  exportConversationService,
  getSingleConversationService,
  getUserConversationService,
  searchConversationService,
  shareConversationService,
  togglePinConversationService,
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
  },
);

// ! Get Single Conversation API ------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>.........................
export const getSingleConversationController = catchAsyncError(
  async (req, res, next) => {
    const conversationId = req.params.id;
    const userId = req.user.id;

    const conversation = await getSingleConversationService(
      conversationId,
      userId,
    );

    res.status(200).json({
      success: true,
      message: "Conversation fetched successfully.",
      conversation,
    });
  },
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

// ! Toggle Pin Conversation Controller ------------->>>>>>>>>>>>>>>>>>>>........................
export const togglePinConversationController = catchAsyncError(
  async (req, res, next) => {
    const conversationId = req.params.id;
    const userId = req.user.id;

    const conversation = await togglePinConversationService({
      conversationId,
      userId,
    });

    res.status(200).json({
      success: true,
      message: conversation.isPinned
        ? "Conversation pinned successfully."
        : "Conversation unpinned successfully.",
      conversation,
    });
  },
);

// ! Archieve Conversation Controller -------------------->>>>>>>>>>>>>>>>>>>>>>......................
export const archiveConversationController = catchAsyncError(
  async (req, res, next) => {
    const cid = req.params.id;
    const uid = req.user?._id || req.user?.id;

    const archivedConversation = await archiveConversationService({
      cid,
      uid,
    });

    res.status(200).json({
      success: true,
      message: archivedConversation.isArchived
        ? "Conversation archived successfully."
        : "Conversation unarchived successfully.",
      conversation: archivedConversation,
    });
  },
);

// ! Search Conversation Controller -------------------->>>>>>>>>>>>>>>>>>>>>>>>........................

export const searchConversationController = catchAsyncError(
  async (req, res, next) => {
    const uid = req.user?._id || req.user?.id;
    const searchQuery = req.query.q;

    const conversations = await searchConversationService({
      uid,
      searchQuery,
    });

    res.status(200).json({
      success: true,
      message: "Conversations fetched successfully.",
      count: conversations.length,
      conversations,
    });
  },
);

// ! Export Conversation Controller ---------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>.......................
export const exportConversationController = catchAsyncError(
  async (req, res, next) => {
    const uid = req.user?.id || req.user?._id;
    const cid = req.params?.id;
    const format = req.query?.format || "json";

    const exportedChats = await exportConversationService({
      uid,
      cid,
      format,
    });

    if (format === "markdown") {
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${exportedChats.fileName || "conversation.md"}"`,
      );

      return res.status(200).send(exportedChats.data);
    }

    return res.status(200).json({
      success: true,
      message: "Conversation has been exported successfully.",
      exportedChats,
    });
  },
);

// ! Share Conversation Controller ----------------------->>>>>>>>>>>>>>>>>>>>>>>......................
export const shareConversationController = catchAsyncError(
  async (req, res, next) => {
    const uid = req.user?.id || req.user?._id;
    const cid = req.params?.id;

    const sharedData = await shareConversationService({ uid, cid });

    res.status(200).json({
      success: true,
      message: "Share link generated successfully.",
      data: {
        shareId: "abc123...",
        shareUrl: "http://localhost:5173/share/abc123...",
        isShared: true,
        sharedAt: "2026-05-12T...",
      },
    });
  },
);
