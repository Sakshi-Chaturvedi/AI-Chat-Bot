import { required } from "joi";
import mongoose, { trusted } from "mongoose";
import userModel from "./user.model";

const messageSchema = new mongoose.Schema(
  {
    consversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);

const messageModel = mongoose.model("Message", messageSchema);

export default messageModel;
