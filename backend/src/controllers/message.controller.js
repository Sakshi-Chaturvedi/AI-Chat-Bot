import catchAsyncError from "../middlewares/catchAsyncError.js";
import messageModel from "../models/message.model.js";
import { createMessageService } from "../services/Message.service.js";


export const createMessageController = catchAsyncError(
  async (req, res, next) => {
    const user = req.user.id;
    const conversationId = req.params.id;
    const { content } = req.body;

    const message = await createMessageService({
      user,
      conversationId,
      content,
    });

    res.status(201).json({
      success: true,
      message: "Message created successfully.",
      data: message,
    });
  }
);

