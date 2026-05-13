import mongoose from "mongoose";
import { ErrorHandler } from "../middlewares/error.middleware.js";
import Conversation from "../models/conversation.model.js";
import User from "../models/user.model.js";
import messageModel from "../models/message.model.js";
import crypto from "crypto";

// ! Create Conversation Service -------------------->>>>>>>>>>>>>>>>>>>>>>>>>>..............................
export const createConversationService = async (userData = {}) => {
  const userId = userData.user;
  const title = userData.title?.trim() || "New Chat";

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
    throw new ErrorHandler("Unauthorized", 401);
  }

  const conversations = await Conversation.find({ user: userId })
    .select("title createdAt updatedAt")
    .sort({ isPinned: -1, updatedAt: -1 })
    .lean();

  const conversationsWithDetails = await Promise.all(
    conversations.map(async (conversation) => {
      const lastMessage = await messageModel
        .findOne({
          conversation: conversation._id,
          user: userId,
        })
        .select("content role createdAt")
        .sort({ createdAt: -1 })
        .lean();

      const messageCount = await messageModel.countDocuments({
        conversation: conversation._id,
        user: userId,
      });

      return {
        ...conversation,
        lastMessage: lastMessage?.content || null,
        lastMessageRole: lastMessage?.role || null,
        messageCount,
      };
    }),
  );

  return conversationsWithDetails;
};

// ! Get Single Conversation Service --------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>..........................
export const getSingleConversationService = async (id, userId) => {
  if (!id) {
    throw new ErrorHandler("Conversation ID is required.", 400);
  }

  if (!userId) {
    throw new ErrorHandler("Unauthorized.", 401);
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ErrorHandler("Invalid Conversation ID.", 400);
  }

  const conversation = await Conversation.findOne({
    _id: id,
    user: userId,
  }).lean();

  if (!conversation) {
    throw new ErrorHandler("Conversation not found or unauthorized.", 404);
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

  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new ErrorHandler("Invalid Conversation ID.", 400);
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
export const deleteConversationService = async ({ userId, conversationId }) => {
  if (!userId || !conversationId) {
    throw new ErrorHandler("User ID and Conversation ID are required.", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new ErrorHandler("Invalid Conversation ID.", 400);
  }

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    throw new ErrorHandler("Conversation not found.", 404);
  }

  if (conversation.user.toString() !== userId.toString()) {
    throw new ErrorHandler("Unauthorized access.", 403);
  }

  await messageModel.deleteMany({ conversation: conversationId });
  await conversation.deleteOne();

  return { message: "Conversation deleted successfully." };
};

// ! IsPinned Conversation Service ---------------------->>>>>>>>>>>>>>>>>>>............................
export const togglePinConversationService = async (conversationData = {}) => {
  const cid = conversationData.conversationId;
  const uid = conversationData.userId;

  if (!uid) {
    throw new ErrorHandler("Unauthorized.", 401);
  }

  if (!cid) {
    throw new ErrorHandler("Conversation id is required.", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(cid)) {
    throw new ErrorHandler("Invalid Conversation ID.", 400);
  }

  const conversation = await Conversation.findOne({
    _id: cid,
    user: uid,
  });

  if (!conversation) {
    throw new ErrorHandler("Conversation not found.", 404);
  }

  conversation.isPinned = !conversation.isPinned;

  await conversation.save();

  return conversation;
};

// ! Archieve Chats Conversation Service ---------------------->>>>>>>>>>>>>.........................
export const archiveConversationService = async (conversationData = {}) => {
  const cid = conversationData.cid;
  const uid = conversationData.uid;

  if (!uid) {
    throw new ErrorHandler("Unauthorized.", 401);
  }

  if (!cid) {
    throw new ErrorHandler("Conversation id is required.", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(cid)) {
    throw new ErrorHandler("Invalid Conversation id.", 400);
  }

  const conversation = await Conversation.findOne({
    _id: cid,
    user: uid,
  });

  if (!conversation) {
    throw new ErrorHandler("Conversation not found.", 404);
  }

  conversation.isArchived = !conversation.isArchived;

  await conversation.save();

  return conversation;
};

// ! Search Conversation Service --------------------->>>>>>>>>>>>>>>>>>>>>....................
// ! Search Conversations By Title Service
export const searchConversationService = async (searchData = {}) => {
  const uid = searchData.uid;
  const searchQuery = searchData.searchQuery?.trim();

  if (!uid) {
    throw new ErrorHandler("Unauthorized Access!", 401);
  }

  if (!searchQuery) {
    throw new ErrorHandler("Search query is required.", 400);
  }

  const conversations = await Conversation.find({
    user: uid,
    isArchived: false,
    title: {
      $regex: searchQuery,
      $options: "i",
    },
  }).sort({
    isPinned: -1,
    lastMessageAt: -1,
    updatedAt: -1,
  });

  return conversations;
};

// ! Export Conversation Service --------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
export const exportConversationService = async ({ uid, cid, format }) => {
  if (!uid) throw new ErrorHandler("User Id is Required.", 400);

  if (!cid) {
    throw new ErrorHandler(
      "Conversation id is required for exporting Conversation.",
      400,
    );
  }

  if (!mongoose.Types.ObjectId.isValid(cid)) {
    throw new ErrorHandler("Invalid Conversation Id.", 400);
  }

  const allowedFormats = ["json", "markdown"];

  if (!allowedFormats.includes(format)) {
    throw new ErrorHandler(
      "Invalid export format. Allowed formats are: json, markdown.",
      400,
    );
  }

  const conversation = await Conversation.findOne({
    _id: cid,
    user: uid,
  }).lean();

  if (!conversation) {
    throw new ErrorHandler("Conversation Not found.", 404);
  }

  const messages = await messageModel
    .find({
      conversation: cid,
      user: uid,
      $or: [{ status: { $ne: "pending" } }, { content: { $ne: "" } }],
    })
    .select("-__v")
    .sort({ createdAt: 1 })
    .lean();

  // ! JSON Export
  if (format === "json") {
    return {
      format: "json",
      fileName: `conversation-${cid}.json`,
      contentType: "application/json",
      data: {
        conversation: {
          id: conversation._id,
          title: conversation.title || "Untitled Conversation",
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
        messages: messages.map((msg) => ({
          id: msg._id,
          role: msg.role,
          content: msg.content,
          status: msg.status,
          provider: msg.provider,
          model: msg.model,
          tokensUsed: msg.tokensUsed,
          errorMessage: msg.errorMessage,
          createdAt: msg.createdAt,
          updatedAt: msg.updatedAt,
        })),
      },
    };
  }

  // ! Markdown Export
  if (format === "markdown") {
    const markdownContent = `
# ${conversation.title || "Untitled Conversation"}

**Conversation ID:** ${conversation._id}  
**Created At:** ${conversation.createdAt}  
**Updated At:** ${conversation.updatedAt}  

---

${messages
  .map((msg) => {
    const role =
      msg.role === "user"
        ? "User"
        : msg.role === "assistant"
          ? "Assistant"
          : msg.role || "Unknown";

    return `## ${role}

${msg.content || ""}

**Created At:** ${msg.createdAt}

---`;
  })
  .join("\n\n")}
`;

    const safeTitle =
      (conversation.title || "conversation")
        .replace(/[^a-z0-9]/gi, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase()
        .slice(0, 50) || "conversation";

    return {
      format: "markdown",
      fileName: `${safeTitle}-${cid}.md`,
      contentType: "text/markdown",
      data: markdownContent.trim(),
    };
  }
};

// ! Share Conversation Service ------------------->>>>>>>>>>>>>>>>>>>>>>>>>
export const shareConversationService = async ({ uid, cid }) => {
  if (!uid) {
    throw new ErrorHandler("User id is required.", 400);
  }

  if (!cid) {
    throw new ErrorHandler("Conversation id is required.", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(cid)) {
    throw new ErrorHandler("Invalid conversation id.", 400);
  }

  const conversation = await Conversation.findOne({
    _id: cid,
    user: uid,
  });

  if (!conversation) {
    throw new ErrorHandler("Conversation not found or unauthorized.", 404);
  }

  if (conversation.isShared && conversation.shareId) {
    return {
      shareId: conversation.shareId,
      isShared: true,
      sharedAt: conversation.sharedAt,
    };
  }

  const shareId = crypto.randomBytes(24).toString("hex");
  conversation.shareExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  conversation.isShared = true;
  conversation.shareId = shareId;
  conversation.sharedAt = new Date();

  await conversation.save();

  return {
    shareId: conversation.shareId,
    isShared: conversation.isShared,
    sharedAt: conversation.sharedAt,
  };
};

// ! Get All Shared Conversation Service -------------------->>>>>>>>>>>>>>>>>>>>>>>
export const getAllSharedConversationService = async ({ sharedId }) => {
  if (!sharedId) {
    throw new ErrorHandler(
      "Shared Id is required for fetching the conversation.",
      400,
    );
  }

  const sharedConversation = await Conversation.findOne({
    shareId: sharedId,
    isShared: true,
  }).select("title shareId sharedAt shareExpiresAt shareViewCount createdAt");

  console.log("Shared Conversation", sharedConversation);

  if (!sharedConversation) {
    throw new ErrorHandler("Shared conversation not found.", 404);
  }

  if (
    sharedConversation.shareExpiresAt &&
    sharedConversation.shareExpiresAt < new Date()
  ) {
    throw new ErrorHandler("Shared Conversation Link has been expired.", 410);
  }

  const messages = await messageModel
    .find({
      conversation: sharedConversation._id,
    })
    .sort({ createdAt: 1 })
    .select("role content createdAt");

  await Conversation.updateOne(
    { _id: sharedConversation._id },
    { $inc: { shareViewCount: 1 } },
  );

  return {
    conversation: {
      id: sharedConversation._id,
      title: sharedConversation.title || "Untitled Conversation",
      sharedAt: sharedConversation.sharedAt,
      createdAt: sharedConversation.createdAt,
    },

    messages: messages.map((msg) => ({
      id: msg._id,
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt,
    })),
  };
};

// ! Unshare Conversation Service ----------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>
export const unshareConversationService = async ({ uid, cid }) => {
  if (!uid) {
    throw new ErrorHandler("User ID is required.", 400);
  }

  if (!cid) {
    throw new ErrorHandler("Conversation ID is required.", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(cid)) {
    throw new ErrorHandler("Invalid Conversation ID.", 400);
  }

  const conversation = await Conversation.findOne({
    _id: cid,
    user: uid,
  });

  if (!conversation) {
    throw new ErrorHandler("Conversation not found.", 404);
  }

  if (!conversation.isShared) {
    return {
      id: conversation._id,
      title: conversation.title,
      isShared: conversation.isShared,
      message: "Conversation is already unshared.",
    };
  }

  conversation.isShared = false;
  conversation.sharedAt = undefined;
  conversation.shareId = undefined;
  conversation.shareExpiresAt = undefined;

  await conversation.save({ validateBeforeSave: false });

  return {
    id: conversation._id,
    title: conversation.title,
    isShared: conversation.isShared,
    message: "Conversation has been unshared successfully.",
  };
};
