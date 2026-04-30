import catchAsyncError from "../middlewares/catchAsyncError.js";
import messageModel from "../models/message.model.js";
import { createMessageService, getAllMessagesService } from "../services/Message.service.js";


// ! Create Message API ------------------------->>>>>>>>>>>>>>>>>>>>>>>>>>.......................
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


// ! Get All Messages Controller ------------------------->>>>>>>>>>>>>>>>>>>>>>>>..........................
export const getMessageController = catchAsyncError(async (req, res, next) => {
  const conversationId = req.params.id;
  const userId = req.user.id;

  const messages = await getAllMessagesService({ conversationId, userId });

  res.status(200).json({
    success: true,
    message: "Messages fetched successfully.",
    messages,
  });
});

