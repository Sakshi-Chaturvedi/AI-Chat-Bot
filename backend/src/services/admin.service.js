import {
  PLAN_LIMITS,
  SUBSCRIPTION_STATUS,
  USER_PLANS,
} from "../constants/limits.js";
import { ErrorHandler } from "../middlewares/error.middleware.js";
import Usage from "../models/usage.model.js";
import userModel from "../models/user.model.js";
import { getCurrentUsageMonth } from "../utils/usageMonth.js";
import Conversation from "../models/conversation.model.js";
import messageModel from "../models/message.model.js";
import mongoose from "mongoose";
// import Usage from "../models/usage.model.js";

// ! Reset User Usage Service --------------------->>>>>>>>>>>>>>>>>>>>>>>>>
export const resetUserUsageService = async ({ userId, month }) => {
  if (!userId) {
    throw new ErrorHandler("User ID is required.", 400);
  }

  const usageMonth = month || getCurrentUsageMonth();

  const usage = await Usage.findOneAndUpdate(
    {
      user: userId,
      month: usageMonth,
    },
    {
      $set: {
        messagesUsed: 0,
        tokensUsed: 0,
        conversationsCreated: 0,
        exportsUsed: 0,
        lastUsedAt: null,
      },
    },
    {
      new: true,
      upsert: true,
    },
  );

  return usage;
};

// ! Update User Service ---------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>>
export const updateUserPlanService = async ({
  userId,
  plan,
  subscriptionStatus = "active",
  subscriptionExpiresAt,
}) => {
  if (!userId) {
    throw new ErrorHandler("User ID is required.", 400);
  }

  if (!plan || !PLAN_LIMITS[plan]) {
    throw new ErrorHandler("Invalid plan selected.", 400);
  }

  const user = await userModel.findById(userId);

  if (!user) {
    throw new ErrorHandler("User not found.", 404);
  }

  user.plan = plan;
  user.subscriptionStatus = subscriptionStatus;
  user.subscriptionStartedAt = new Date();

  if (subscriptionExpiresAt) {
    user.subscriptionExpiresAt = new Date(subscriptionExpiresAt);
  }

  await user.save({ validateBeforeSave: false });

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    plan: user.plan,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionStartedAt: user.subscriptionStartedAt,
    subscriptionExpiresAt: user.subscriptionExpiresAt,
  };
};

// ! Get Admin dashboard Stats Service --------------------------->>>>>>>>>>>>>>>>>>>>>>>
export const getAdminDashboardStatsService = async () => {
  const currentMonth = getCurrentUsageMonth();

  // ? ****************************** Users Stats ********************************
  const [
    totalUsers,
    freeUsers,
    proUsers,
    premiumUsers,
    activeSubscriptions,
    inactiveSubscriptions,
    cancelledSubscriptions,
    expiredSubscriptions,
    adminUsers,
    normalUsers,
  ] = await Promise.all([
    userModel.countDocuments(),
    userModel.countDocuments({ plan: "free" }),
    userModel.countDocuments({ plan: "pro" }),
    userModel.countDocuments({ plan: "premium" }),
    userModel.countDocuments({ subscriptionStatus: "active" }),
    userModel.countDocuments({ subscriptionStatus: "inactive" }),
    userModel.countDocuments({ subscriptionStatus: "cancelled" }),
    userModel.countDocuments({ subscriptionStatus: "expired" }),
    userModel.countDocuments({ role: "admin" }),
    userModel.countDocuments({ role: "user" }),
  ]);

  // ? ****************************** Conversation Stats ********************************

  const [
    totalConversations,
    sharedConversations,
    archivedConversations,
    pinnedConversations,
  ] = await Promise.all([
    Conversation.countDocuments(),
    Conversation.countDocuments({
      isShared: true,
    }),
    Conversation.countDocuments({
      isArchived: true,
    }),
    Conversation.countDocuments({
      isPinned: true,
    }),
  ]);

  // ? ****************************** Messages Stats ********************************

  const [
    totalMessages,
    userMessages,
    assistantMessages,
    completedMessages,
    pendingMessages,
    failedMessages,
    cancelledMessages,
  ] = await Promise.all([
    messageModel.countDocuments(),
    messageModel.countDocuments({ role: "user" }),
    messageModel.countDocuments({ role: "assistant" }),
    messageModel.countDocuments({ status: "completed" }),
    messageModel.countDocuments({ status: "pending" }),
    messageModel.countDocuments({ status: "failed" }),
    messageModel.countDocuments({ status: "cancelled" }),
  ]);

  // ? ****************************** Users Usage Stats ********************************
  const usageStats = await Usage.aggregate([
    {
      $match: {
        month: currentMonth,
      },
    },
    {
      $group: {
        _id: null,
        totalMessagesUsed: { $sum: "$messagesUsed" },
        totalTokensUsed: { $sum: "$tokensUsed" },
        totalConversationsCreated: { $sum: "$conversationsCreated" },
        totalExportsUsed: { $sum: "$exportsUsed" },
        totalUsageRecords: { $sum: 1 },
      },
    },
  ]);

  const currentMonthUsage = usageStats[0] || {
    totalMessagesUsed: 0,
    totalTokensUsed: 0,
    totalConversationsCreated: 0,
    totalExportsUsed: 0,
    totalUsageRecords: 0,
  };

  // ? ********************************* Recent User Fetch **********************************
  const recentUsers = await userModel
    .find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select("name email plan role subscriptionStatus createdAt")
    .lean();

  // ? ************************** Top Users by Usage *****************************************
  const topUsersByUsage = await Usage.aggregate([
    {
      $match: {
        month: currentMonth,
      },
    },
    {
      $addFields: {
        totalUsage: {
          $add: [
            "$messagesUsed",
            "$tokensUsed",
            "$conversationsCreated",
            "$exportsUsed",
          ],
        },
      },
    },
    {
      $sort: {
        totalUsage: -1,
      },
    },
    {
      $limit: 5,
    },
    {
      $lookup: {
        from: "aiusers", // check this in MongoDB Compass
        localField: "user",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    {
      $unwind: {
        path: "$userDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        month: 1,
        messagesUsed: 1,
        tokensUsed: 1,
        conversationsCreated: 1,
        exportsUsed: 1,
        totalUsage: 1,
        user: {
          _id: "$userDetails._id",
          name: "$userDetails.name",
          email: "$userDetails.email",
          role: "$userDetails.role",
          plan: "$userDetails.plan",
          subscriptionStatus: "$userDetails.subscriptionStatus",
        },
      },
    },
  ]);

  return {
    users: {
      totalUsers,
      freeUsers,
      proUsers,
      premiumUsers,
      adminUsers,
      normalUsers,
    },

    subscriptions: {
      activeSubscriptions,
      inactiveSubscriptions,
      cancelledSubscriptions,
      expiredSubscriptions,
    },

    conversations: {
      totalConversations,
      sharedConversations,
      archivedConversations,
      pinnedConversations,
    },

    messages: {
      totalMessages,
      userMessages,
      assistantMessages,
      completedMessages,
      pendingMessages,
      failedMessages,
      cancelledMessages,
    },

    usage: {
      month: currentMonth,
      totalMessagesUsed: currentMonthUsage.totalMessagesUsed,
      totalTokensUsed: currentMonthUsage.totalTokensUsed,
      totalConversationsCreated: currentMonthUsage.totalConversationsCreated,
      totalExportsUsed: currentMonthUsage.totalExportsUsed,
      totalUsageRecords: currentMonthUsage.totalUsageRecords,
    },

    recentUsers,
    topUsersByUsage,
  };
};

// ! Get All Users Service ----------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>
export const getAllUsersService = async ({
  page = 1,
  limit = 10,
  search = "",
  plan,
  subscriptionStatus,
  role,
}) => {
  const currentPage = Number(page) || 1;
  const perPage = Number(limit) || 10;

  if (currentPage < 1) {
    throw new ErrorHandler("Page must be greater than 0.", 400);
  }

  if (perPage < 1) {
    throw new ErrorHandler("Limit must be greater than 0.", 400);
  }

  if (perPage > 100) {
    throw new ErrorHandler("Limit cannot be greater than 100.", 400);
  }

  const filter = {};

  // plan filter
  if (plan) {
    const validPlans = Object.values(USER_PLANS);

    if (!validPlans.includes(plan)) {
      throw new ErrorHandler("Invalid plan filter.", 400);
    }

    filter.plan = plan;
  }

  // subscriptionStatus filter
  if (subscriptionStatus) {
    const validSubscriptionStatuses = Object.values(SUBSCRIPTION_STATUS);

    if (!validSubscriptionStatuses.includes(subscriptionStatus)) {
      throw new ErrorHandler("Invalid subscription status filter.", 400);
    }

    filter.subscriptionStatus = subscriptionStatus;
  }

  // role filter
  if (role) {
    const validRoles = ["user", "admin"];

    if (!validRoles.includes(role)) {
      throw new ErrorHandler("Invalid role filter.", 400);
    }

    filter.role = role;
  }

  // search filter by name/email
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), "i");

    filter.$or = [{ name: searchRegex }, { email: searchRegex }];
  }

  const skip = (currentPage - 1) * perPage;

  const users = await userModel
    .find(filter)
    .select(
      "_id name email role plan subscriptionStatus subscriptionStartedAt subscriptionExpiresAt createdAt updatedAt",
    )
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(perPage)
    .lean();

  const totalUsers = await userModel.countDocuments(filter);

  const totalPages = Math.ceil(totalUsers / perPage) || 1;

  return {
    users,
    pagination: {
      currentPage,
      limit: perPage,
      totalUsers,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    },
    filters: {
      search: search || null,
      plan: plan || null,
      subscriptionStatus: subscriptionStatus || null,
      role: role || null,
    },
  };
};

// ! Get Single User Service ------------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
export const getSingleUserDetailsService = async ({ uid }) => {
  if (!uid) {
    throw new ErrorHandler("User id is required for fetching details.", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(uid)) {
    throw new ErrorHandler("Invalid User ID.", 400);
  }

  const user = await userModel
    .findById(uid)
    .select(
      "_id name email role plan subscriptionStatus subscriptionStartedAt subscriptionExpiresAt createdAt updatedAt",
    )
    .lean();

  if (!user) {
    throw new ErrorHandler("User not found.", 404);
  }

  const [
    totalConversations,
    sharedConversations,
    archivedConversations,
    pinnedConversations,
    totalMessages,
    userMessages,
    assistantMessages,
    completedMessages,
    failedMessages,
    pendingMessages,
    usage,
  ] = await Promise.all([
    Conversation.countDocuments({ user: uid }),
    Conversation.countDocuments({ user: uid, isShared: true }),
    Conversation.countDocuments({ user: uid, isArchived: true }),
    Conversation.countDocuments({ user: uid, isPinned: true }),

    messageModel.countDocuments({ user: uid }),
    messageModel.countDocuments({ user: uid, role: "user" }),
    messageModel.countDocuments({ user: uid, role: "assistant" }),
    messageModel.countDocuments({ user: uid, status: "completed" }),
    messageModel.countDocuments({ user: uid, status: "failed" }),
    messageModel.countDocuments({ user: uid, status: "pending" }),

    Usage.findOne({
      user: uid,
      month: getCurrentUsageMonth(),
    }).lean(),
  ]);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionStartedAt: user.subscriptionStartedAt,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },

    stats: {
      conversations: {
        total: totalConversations,
        shared: sharedConversations,
        archived: archivedConversations,
        pinned: pinnedConversations,
      },

      messages: {
        total: totalMessages,
        user: userMessages,
        assistant: assistantMessages,
        completed: completedMessages,
        failed: failedMessages,
        pending: pendingMessages,
      },
    },

    usage: usage
      ? {
          month: usage.month,
          messagesUsed: usage.messagesUsed,
          tokensUsed: usage.tokensUsed,
          conversationsCreated: usage.conversationsCreated,
          exportsUsed: usage.exportsUsed,
          lastUsedAt: usage.lastUsedAt,
        }
      : {
          month: getCurrentUsageMonth(),
          messagesUsed: 0,
          tokensUsed: 0,
          conversationsCreated: 0,
          exportsUsed: 0,
          lastUsedAt: null,
        },
  };
};

// ! Get Failed Message Stats Service ------------------------->>>>>>>>>>>>>>>>>>>>>
export const getFailedMessageStatsService = async ({
  page = 1,
  limit = 10,
  userId,
  conversationId,
  fromDate,
  toDate,
}) => {
  const currentPage = Number(page) || 1;
  const perPage = Number(limit) || 10;

  if (currentPage < 1) {
    throw new ErrorHandler("Page must be greater than 0.", 400);
  }

  if (perPage < 1) {
    throw new ErrorHandler("Limit must be greater than 0.", 400);
  }

  if (perPage > 100) {
    throw new ErrorHandler("Limit cannot be greater than 100.", 400);
  }

  const filter = {
    status: "failed",
    role: "assistant",
  };

  if (userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErrorHandler("Invalid User ID.", 400);
    }

    filter.user = userId;
  }

  if (conversationId) {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      throw new ErrorHandler("Invalid Conversation ID.", 400);
    }

    filter.conversation = conversationId;
  }

  if (fromDate || toDate) {
    filter.createdAt = {};

    if (fromDate) {
      const startDate = new Date(fromDate);

      if (Number.isNaN(startDate.getTime())) {
        throw new ErrorHandler("Invalid fromDate.", 400);
      }

      filter.createdAt.$gte = startDate;
    }

    if (toDate) {
      const endDate = new Date(toDate);

      if (Number.isNaN(endDate.getTime())) {
        throw new ErrorHandler("Invalid toDate.", 400);
      }

      endDate.setHours(23, 59, 59, 999);

      filter.createdAt.$lte = endDate;
    }
  }

  const skip = (currentPage - 1) * perPage;

  const [failedMessages, totalFailedMessages] = await Promise.all([
    messageModel
      .find(filter)
      .select(
        "_id user conversation role content status errorMessage model tokensUsed createdAt updatedAt",
      )
      .populate("user", "name email plan")
      .populate("conversation", "title isShared createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .lean(),

    messageModel.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalFailedMessages / perPage) || 1;

  return {
    failedMessages: failedMessages.map((message) => ({
      id: message._id,
      user: message.user
        ? {
            id: message.user._id,
            name: message.user.name,
            email: message.user.email,
            plan: message.user.plan,
          }
        : null,

      conversation: message.conversation
        ? {
            id: message.conversation._id,
            title: message.conversation.title,
            isShared: message.conversation.isShared,
            createdAt: message.conversation.createdAt,
          }
        : null,

      role: message.role,
      content: message.content,
      status: message.status,
      errorMessage: message.errorMessage,
      model: message.model,
      tokensUsed: message.tokensUsed,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    })),

    pagination: {
      currentPage,
      limit: perPage,
      totalFailedMessages,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    },

    filters: {
      userId: userId || null,
      conversationId: conversationId || null,
      fromDate: fromDate || null,
      toDate: toDate || null,
    },
  };
};
