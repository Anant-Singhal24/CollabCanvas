require("dotenv").config();
const express = require("express");
const http = require("http"); // FOR USING SOCKET.IO(RECOMMENDED IN DOCUMENTATION)
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

// Import routes
const roomRoutes = require("./routes/room.routes");
const Room = require("./models/Room");

// Import socket handlers
const socketHandlers = require("./socket/socketHandlers");

// Middleware & CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (
      process.env.NODE_ENV !== "production" ||
      allowedOrigins.includes(origin) ||
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      origin.includes("onrender.com")
    ) {
      return callback(null, true);
    }
    // Permissive fallback so real-time whiteboard is never blocked
    callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
};

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/collabboard";
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// API Routes
app.use("/api", roomRoutes);

// Socket.IO handling
socketHandlers(io);

// Auto-cleanup: delete rooms inactive for 30 minutes and all their data
const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutes

const cleanupInactiveRooms = async () => {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - INACTIVITY_LIMIT_MS);
    const inactiveRooms = await Room.find({
      $or: [
        { lastActivity: { $lt: thirtyMinutesAgo } },
        {
          lastActivity: { $exists: false },
          updatedAt: { $lt: thirtyMinutesAgo },
        },
      ],
    });

    for (const room of inactiveRooms) {
      console.log(
        `[Auto-Cleanup] Deleting room ${room._id} ("${room.name}") due to 30 min of inactivity`
      );
      // Notify any connected users
      io.to(room._id.toString()).emit("room-deleted", {
        message: "This board has been automatically closed after 30 minutes of inactivity.",
      });
      await Room.findByIdAndDelete(room._id);
    }
  } catch (err) {
    console.error("Error during inactive room cleanup:", err);
  }
};

// Check every 60 seconds
setInterval(cleanupInactiveRooms, 60 * 1000);

// Serve static assets in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Server error",
    error: process.env.NODE_ENV === "production" ? {} : err,
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
