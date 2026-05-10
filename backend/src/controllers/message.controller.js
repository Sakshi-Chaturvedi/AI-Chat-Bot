import catchAsyncError from "../middlewares/catchAsyncError.js";

import messageModel from "../models/message.model.js";
import {
  createMessageService,
  editMessageService,
  getAllMessagesService,
  regenerateReplyService,
  retryFailedMessageService,
  searchMessageService,
} from "../services/Message.service.js";

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
  },
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

// ! Edit Message Controller ------------------------>>>>>>>>>>>>>>>>>>>>>...............................
export const editMessageController = catchAsyncError(async (req, res, next) => {
  const messageId = req.params.id;
  const userId = req.user.id;

  const { content } = req.body;

  const updatedMessage = await editMessageService({
    messageId,
    userId,
    content,
  });

  res.status(200).json({
    success: true,
    message: "Message updated successfully.",
    updatedMessage,
  });
});

// ! Regenerate Assistant message of the particular questions ------------>>>>>>>>>>>>>>>>......................
export const regenerateMessageController = catchAsyncError(
  async (req, res, next) => {
    const mid = req.params.id;
    const uid = req.user.id;

    const newAnswer = await regenerateReplyService({ mid, uid });

    res.status(200).json({
      success: true,
      message: "Regenerated Reply Successfully.",
      newAnswer,
    });
  },
);

// ! Search Message Controller ---------------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>>.........................
export const searchMessagecontroller = catchAsyncError(
  async (req, res, next) => {
    const uid = req.user.id || req.user._id;
    const cid = req.params.id;

    const query = req.query.q;

    const resultant = await searchMessageService({ uid, cid, query });

    res.status(200).json({
      success: true,
      message: "Message Fetched Successfully.",
      count: resultant.length,
      resultant,
    });
  },
);

// ! Retry Failed Message Controller -------------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>........................
export const retryFailedMessageController = catchAsyncError(
  async (req, res, next) => {
    const mid = req.params.id;
    const uid = req.user?.id || req.user?._id;

    const retryMessage = await retryFailedMessageService({ mid, uid });

    res.status(200).json({
      success: true,
      message: "Message has been regenerated successfully.",
      data: retryMessage,
    });
  },
);
