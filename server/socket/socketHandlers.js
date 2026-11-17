const mongoose = require("mongoose");
const Room = require("../models/Room");

module.exports = (io) => {
  io.on("connection", (socket) => {
    // Join room
    socket.on("join-room", async ({ roomId, username }) => {
      try {
        if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
          socket.emit("room-error", { message: "Invalid room ID" });
          return;
        }

        // Join the socket.io room
        socket.join(roomId);

        // Add user to room in database
        const room = await Room.findById(roomId);
        if (!room) {
          console.error(`Room not found: ${roomId}`);
          socket.emit("room-error", { message: "Room not found" });
          return;
        }

        const safeUsername = (username && username.trim()) || "Anonymous";

        // Check if user already exists in the room (reconnection case)
        const existingUserIndex = room.users.findIndex(
          (u) => u.username === safeUsername
        );

        const isOwner = room.createdBy && room.createdBy === safeUsername;
        const isFirstUser = room.users.length === 0;

        if (existingUserIndex >= 0) {
          room.users[existingUserIndex].socketId = socket.id;
          if (isOwner) {
            room.users[existingUserIndex].isAdmin = true;
          }
        } else {
          // Add user to the room's users array
          room.users.push({
            socketId: socket.id,
            username: safeUsername,
            isAdmin: isOwner || isFirstUser, // Owner or first user becomes admin
          });
        }

        await room.save();

        // Notify room about new user
        io.to(roomId).emit("user-joined", {
          socketId: socket.id,
          username: safeUsername,
          users: room.users,
        });

        // Send current canvas state to the new user
        socket.emit("canvas-state", {
          canvasData: room.canvasData || "",
        });

        // Send list of users in the room to everyone
        io.to(roomId).emit("room-users", {
          users: room.users,
        });
      } catch (error) {
        console.error("Error joining room:", error);
        socket.emit("room-error", {
          message: "Failed to join room: " + error.message,
        });
      }
    });

    // Handle get-canvas-state request from client
    socket.on("get-canvas-state", async ({ roomId }) => {
      try {
        if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) return;
        const room = await Room.findById(roomId);
        if (room && room.canvasData) {
          socket.emit("canvas-state", {
            canvasData: room.canvasData,
          });
        }
      } catch (error) {
        console.error("Error getting canvas state:", error);
      }
    });

    // Handle drawing events
    socket.on("draw", ({ roomId, drawingData, completed, isEraser }) => {
      socket.to(roomId).emit("draw", {
        socketId: socket.id,
        drawingData,
        completed: completed || false,
        isEraser,
      });
    });

    // Handle real-time drawing updates
    socket.on("draw-update", ({ roomId, drawingData, userId }) => {
      socket.to(roomId).emit("draw-update", {
        socketId: socket.id,
        drawingData,
        userId: userId || socket.id,
      });
    });

    // Handle drawing end events
    socket.on("draw-end", ({ roomId, userId }) => {
      socket.to(roomId).emit("draw-end", {
        socketId: socket.id,
        userId: userId || socket.id,
      });
    });

    // Handle object deletion
    socket.on("delete-object", ({ roomId, objectId }) => {
      socket.to(roomId).emit("delete-object", {
        socketId: socket.id,
        objectId,
      });
    });

    // Handle canvas clear
    socket.on("clear-canvas", async ({ roomId }) => {
      try {
        if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) return;
        await Room.findByIdAndUpdate(roomId, {
          canvasData: "",
          $push: {
            history: {
              action: "clear",
              data: {},
              timestamp: Date.now(),
            },
          },
        });
        socket.to(roomId).emit("clear-canvas");
      } catch (error) {
        console.error("Error clearing canvas:", error);
      }
    });

    // Save canvas state
    socket.on("save-canvas", async ({ roomId, canvasData }) => {
      try {
        if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) return;
        await Room.findByIdAndUpdate(roomId, {
          canvasData,
          updatedAt: Date.now(),
        });
      } catch (error) {
        console.error("Error saving canvas state:", error);
      }
    });

    // Handle chat messages
    socket.on("send-message", ({ roomId, message, username }) => {
      // Broadcast the message to all users in the room except sender
      socket.to(roomId).emit("receive-message", {
        socketId: socket.id,
        username,
        message,
        timestamp: Date.now(),
      });
    });

    // Handle room deletion notification
    socket.on("room-deleted", ({ roomId }) => {
      socket.to(roomId).emit("room-deleted", {
        message: "This room has been deleted by the owner",
      });
    });

    // Handle disconnection
    socket.on("disconnect", async () => {
      try {
        // Find all rooms where this socket is a user
        const rooms = await Room.find({
          "users.socketId": socket.id,
        });

        // Remove user from each room
        for (const room of rooms) {
          const userIndex = room.users.findIndex(
            (user) => user.socketId === socket.id
          );
          if (userIndex === -1) continue;

          const username = room.users[userIndex].username;
          room.users = room.users.filter((user) => user.socketId !== socket.id);

          // Assign new admin if previous admin left and there are remaining users
          if (room.users.length > 0 && !room.users.some((user) => user.isAdmin)) {
            room.users[0].isAdmin = true;
          }

          // Do NOT delete room when empty - boards must persist!
          await room.save();

          // Notify room about user leaving
          io.to(room._id.toString()).emit("user-left", {
            socketId: socket.id,
            username: username,
            users: room.users,
          });
        }
      } catch (error) {
        console.error("Error handling disconnection:", error);
      }
    });
  });
};
