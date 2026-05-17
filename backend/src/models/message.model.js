import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "aiusers",
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
      index: true,
    },

    content: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "pending",
      index: true,
    },

    errorMessage: {
      type: String,
      default: null,
    },
    
    selectedModel: {
      type: String,
      enum: ["basic", "standard", "advanced", null],
      default: null,
    },

    provider: {
      type: String,
      enum: ["openrouter", "gemini", "openai", null],
      default: null,
    },

    
    model: {
      type: String,
      default: null,
    },

    tokensUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

// Fetch messages of a conversation in order
messageSchema.index({ conversation: 1, createdAt: 1 });

// Search/filter user messages inside conversations
messageSchema.index({ user: 1, conversation: 1, createdAt: -1 });

// Useful for retry/cancel/failure/admin analytics
messageSchema.index({ user: 1, status: 1, createdAt: -1 });

// Useful for assistant/provider analytics
messageSchema.index({ role: 1, provider: 1, model: 1 });

const messageModel = mongoose.model("Message", messageSchema);

export default messageModel;
