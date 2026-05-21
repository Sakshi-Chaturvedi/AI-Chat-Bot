import mongoose from "mongoose";

const usageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "aiuser",
      required: true,
      index: true,
    },

    month: {
      type: String,
      required: true,
      index: true,
    },

    messagesUsed: {
      type: Number,
      default: 0,
      min: 0,
    },

    tokensUsed: {
      type: Number,
      default: 0,
      min: 0,
    },

    conversationsCreated: {
      type: Number,
      default: 0,
      min: 0,
    },

    exportsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastUsedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

usageSchema.index({ user: 1, month: 1 }, { unique: true });

const Usage = mongoose.model("Usage", usageSchema);

export default Usage;