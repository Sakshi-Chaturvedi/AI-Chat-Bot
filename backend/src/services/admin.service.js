import { PLAN_LIMITS, SUBSCRIPTION_STATUS, USER_PLANS } from "../constants/limits.js";
import { ErrorHandler } from "../middlewares/error.middleware.js";
import Usage from "../models/usage.model.js";
import userModel from "../models/user.model.js";
import { getCurrentUsageMonth } from "../utils/usageMonth.js";
import Conversation from "../models/conversation.model.js";
import messageModel from "../models/message.model.js";
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
