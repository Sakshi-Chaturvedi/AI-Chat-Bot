import catchAsyncError from "../middlewares/catchAsyncError.js";
import { getMyUsageService } from "../services/getMyUsage.service.js";


export const getMyUsageController = catchAsyncError(async (req, res, next) => {
  const uid = req.user?.id || req.user?._id;

  const usage = await getMyUsageService({ uid });

  res.status(200).json({
    success: true,
    message: "Usage fetched successfully.",
    usage,
  });
});