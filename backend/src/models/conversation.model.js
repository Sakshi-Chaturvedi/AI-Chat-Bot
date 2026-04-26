import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "aiuser", 
      required: true,
      index: true,
    },

    title: {
      type: String,
      default: "New Chat",
      trim: true,
      maxlength: 100,
    },

    isArchived: {
      type: Boolean,
      default: false,
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // createdAt + updatedAt automatically
  }
);

conversationSchema.index({ user: 1, updatedAt: -1 });

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;