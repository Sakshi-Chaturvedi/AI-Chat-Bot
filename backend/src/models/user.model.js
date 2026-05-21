import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { type } from "os";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
        "Please fill a valid email address",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minLength: [8, "Password must be at least 8 characters"],
      select: false,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    avatar: {
      public_id: {
        type: String,
        default: null,
      },
      url: {
        type: String,
        default: null,
      },
    },

    usage: {
      dailyMessages: {
        type: Number,
        default: 0,
      },
      lastResetDate: {
        type: Date,
        default: Date.now,
      },
    },

    plan: {
      type: String,
      enum: ["free", "pro", "premium"],
      default: "free",
    },

    subscriptionStatus: {
      type: String,
      enum: ["active", "inactive", "cancelled", "expired"],
      default: "active",
    },

    subscriptionStartedAt: {
      type: Date,
    },

    subscriptionExpiresAt: {
      type: Date,
    },

    accountStatus: {
      type: String,
      enum: ["active", "suspended", "blocked"],
      default: "active",
      index: true,
    },

    statusReason: {
      type: String,
      trim: true,
    },

    statusUpdatedAt: {
      type: Date,
    },

    // ? Auth
    refreshToken: String,

    // ? Email Verification
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationExpire: Date,

    // ? Password Reset
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    // ? AI Usage
    messagesUsed: {
      type: Number,
      default: 0,
    },
    dailyLimit: {
      type: Number,
      default: 20,
    },

    // ? Security
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,

    // ? Activity
    lastLogin: Date,
  },
  { timestamps: true },
);

// ! Hash password
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 12);
});

// ! Compare password
userSchema.methods.comparePassword = async function (enteredPass) {
  return await bcrypt.compare(enteredPass, this.password);
};

// ! Reset password token
userSchema.methods.getResetPasswordToken = function () {
  // raw token generate
  const resetToken = crypto.randomBytes(32).toString("hex");

  // hashed token DB me save karo
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // 10 minutes expiry
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  // raw token return karo, ye URL/Postman me use hoga
  return resetToken;
};

// ! Generate Access Token
userSchema.methods.generateAccessToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: "15m",
  });
};

// ! Generate Refresh Token
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
};

export default mongoose.model("aiuser", userSchema);
