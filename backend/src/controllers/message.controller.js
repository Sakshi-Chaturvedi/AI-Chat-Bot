import catchAsyncError from "../middlewares/catchAsyncError.js";

import messageModel from "../models/message.model.js";
import {
  cancelMessageGenerationService,
  createMessageService,
  editMessageService,
  getAllMessagesService,
  regenerateReplyService,
  retryFailedMessageService,
  searchMessageService,
  streamMessageService,
} from "../services/Message.service.js";

// ! Create Message API ------------------------->>>>>>>>>>>>>>>>>>>>>>>>>>.......................
export const createMessageController = catchAsyncError(
  async (req, res, next) => {
    const user = req.user?.id || req.user?._id;
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

// ! Cancel Message Generation Controller ---------------->>>>>>>>>>>>>>>>>>>>>>>>>................................
export const cancelReplyGenerationController = catchAsyncError(
  async (req, res, next) => {
    const uid = req.user?.id || req.user?._id;
    const amid = req.params?.id;

    const cancelledReply = await cancelMessageGenerationService({ uid, amid });

    res.status(200).json({
      success: true,
      message: "Assistant message generation cancelled successfully.",
      data: cancelledReply,
    });
  },
);

// ! Stream Message Controller ---------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>..........................
export const streamMessageController = async (req, res) => {
  const userId = req.user?.id || req.user?._id;
  const conversationId = req.params.id;
  
  const { content } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  res.flushHeaders?.();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await streamMessageService({
      userId,
      conversationId,
      content,
      sendEvent,
    });

    return res.end();
  } catch (error) {
    sendEvent("error", {
      message: error.message || "Something went wrong while streaming.",
    });

    return res.end();
  }
};
