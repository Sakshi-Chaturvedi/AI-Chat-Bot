import catchAsyncError from "../middlewares/catchAsyncError.js";
import {
  getAdminDashboardStatsService,
  getAllUsersService,
  getFailedMessageStatsService,
  getSingleUserDetailsService,
  resetUserUsageService,
  topUsersService,
  updateUserPlanService,
  updateUserStatusService,
} from "../services/admin.service.js";

// ! Reset User Usage Controller --------------------------->>>>>>>>>>>>>>>>>>>>>>........................
export const resetUserUsageController = catchAsyncError(
  async (req, res, next) => {
    const userId = req.user?.id || req.user?._id;

    const { month } = req.body;

    const usage = await resetUserUsageService({ userId, month });

    res.status(200).json({
      success: true,
      message: "User usage has been reset successfully.",
      usage,
    });
  },
);

// ! Uodate User Plan Controller ------------------------>>>>>>>>>>>>>>>>>>>>>>>>>>>>>..............................
export const updateUserPlanController = catchAsyncError(
  async (req, res, next) => {
    const userId = req.params?.userId;
    const { plan, subscriptionStatus, subscriptionExpiresAt } = req.body;

    const user = await updateUserPlanService({
      userId,
      plan,
      subscriptionStatus,
      subscriptionExpiresAt,
    });

    res.status(200).json({
      success: true,
      message: "User plan updated successfully.",
      user,
    });
  },
);

// ! Admin Dashboard Stats Controller ------------------------->>>>>>>>>>>>>>>>>>>>>........................
export const getAdminDashboardController = catchAsyncError(
  async (req, res, next) => {
    const stats = await getAdminDashboardStatsService();

    res.status(200).json({
      success: true,
      message: "Admin dashboard stats fetched successfully.",
      stats,
    });
  },
);

// ! Get All Users Controller ----------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>.....................
export const getAllUsersController = catchAsyncError(async (req, res, next) => {
  const { page, limit, search, plan, subscriptionStatus, role } = req.query;

  const result = await getAllUsersService({
    page,
    limit,
    search,
    plan,
    subscriptionStatus,
    role,
  });

  res.status(200).json({
    success: true,
    message: "Users fetched successfully.",
    ...result,
  });
});

// ! Get Single User Details Controller -------------------------->>>>>>>>>>>>>>>>>>>........................
export const getSingleUserDetailsController = catchAsyncError(
  async (req, res, next) => {
    const uid = req.params?.userId;

    const userDetails = await getSingleUserDetailsService({ uid });

    res.status(200).json({
      success: true,
      message: "User details fetched successfully.",
      ...userDetails,
    });
  },
);

// ! Get Failed Message Stats Controller ------------------------->>>>>>>>>>>>>>>>>>>>>......................
export const getFailedMessageStatsController = catchAsyncError(
  async (req, res, next) => {
    const { page, limit, userId, conversationId, fromDate, toDate } = req.query;

    const result = await getFailedMessageStatsService({
      page,
      limit,
      userId,
      conversationId,
      fromDate,
      toDate,
    });

    res.status(200).json({
      success: true,
      message: "Failed messages fetched successfully.",
      ...result,
    });
  },
);

// ! Top Users Controller ------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>>>............................
export const topUsersController = catchAsyncError(async (req, res, next) => {
  const { month, limit, sortBy } = req.query;

  const result = await topUsersService({
    month,
    limit,
    sortBy,
  });

  res.status(200).json({
    success: true,
    message: "Top users by usage fetched successfully.",
    ...result,
  });
});

// ! Admin User Status Management Controller ---------------------->>>>>>>>>>>>>>>>>>>>>>>>........................
export const updateUserStatusController = catchAsyncError(
  async (req, res, next) => {
    const userId = req.params?.userId;
    const { accountStatus, reason } = req.body;
    const adminId = req.user?.id || req.user?._id;

    const updatedStatus = await updateUserStatusService({
      userId,
      accountStatus,
      reason,
      adminId,
    });

    res.status(200).json({
      success: true,
      message: "User status has been updated successfully.",
      updatedStatus,
    });
  },
);
