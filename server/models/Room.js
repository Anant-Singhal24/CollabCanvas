const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  accessLevel: {
    type: String,
    enum: ["public", "private"],
    default: "public",
  },
  createdBy: {
    type: String,
    default: "Anonymous",
  },
  users: [
    {
      socketId: String,
      username: String,
      isAdmin: {
        type: Boolean,
        default: false,
      },
      joinedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  canvasData: {
    type: String,
    default: "", // Stores the serialized canvas data
  },
  history: [
    {
      action: String,
      data: Object,
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt and lastActivity timestamps before saving
RoomSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  if (!this.lastActivity) {
    this.lastActivity = Date.now();
  }
  next();
});

// Automatically expire/delete rooms from MongoDB 30 minutes (1800 seconds) after lastActivity
RoomSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 1800 });

module.exports = mongoose.model("Room", RoomSchema);
