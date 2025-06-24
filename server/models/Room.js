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
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt timestamp before saving
RoomSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Room", RoomSchema);
