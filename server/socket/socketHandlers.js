const Room = require("../models/Room");

module.exports = (io) => {
  io.on("connection", (socket) => {
    // console.log(`User connected: ${socket.id}`);

    // Join room
    socket.on("join-room", async ({ roomId, username }) => {
      try {
        // console.log(
        //   `Join room request from ${username} (${socket.id}) to room ${roomId}`
        // );

        // Join the socket.io room
        socket.join(roomId);
        // console.log(`Socket ${socket.id} joined room ${roomId}`);

        // Add user to room in database
        const room = await Room.findById(roomId);
        if (!room) {
          console.error(`Room not found: ${roomId}`);
          socket.emit("room-error", { message: "Room not found" });
          return;
        }

        // Check if user already exists in the room (reconnection case)
        const existingUserIndex = room.users.findIndex(
          (u) => u.username === username
        );
        if (existingUserIndex >= 0) {
          // console.log(
          //   `Updating existing user ${username} socket ID to ${socket.id}`
          // );
          room.users[existingUserIndex].socketId = socket.id;
        } else {
          // Add user to the room's users array
          const isFirstUser = room.users.length === 0;
          // console.log(
          //   `Adding new user ${username} to room ${roomId}, isFirstUser: ${isFirstUser}`
          // );
          room.users.push({
            socketId: socket.id,
            username,
            isAdmin: isFirstUser, // First user becomes admin
          });
        }

        await room.save();
        // console.log(`Room ${roomId} now has ${room.users.length} users`);

        // Notify room about new user
        io.to(roomId).emit("user-joined", {
          socketId: socket.id,
          username,
          users: room.users,
        });

        // Send current canvas state to the new user
        socket.emit("canvas-state", {
          canvasData: room.canvasData,
        });

        // Send list of users in the room to everyone
        io.to(roomId).emit("room-users", {
          users: room.users,
        });

        // console.log(`${username} joined room ${roomId} successfully`);
      } catch (error) {
        console.error("Error joining room:", error);
        console.error(error.stack);
        socket.emit("room-error", {
          message: "Failed to join room: " + error.message,
        });
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
      // console.log(
      //   `Real-time draw update from ${userId || socket.id} in room ${roomId}`
      // );
      // Forward the drawing update to all other clients in the room
      socket.to(roomId).emit("draw-update", {
        socketId: socket.id,
        drawingData,
        userId: userId || socket.id,
      });
    });

    // Handle drawing end events
    socket.on("draw-end", ({ roomId, userId }) => {
      // console.log(
      //   `Drawing ended from ${userId || socket.id} in room ${roomId}`
      // );
      // Forward the drawing end event to all other clients in the room
      socket.to(roomId).emit("draw-end", {
        socketId: socket.id,
        userId: userId || socket.id,
      });
    });

    // Handle canvas clear
    socket.on("clear-canvas", async ({ roomId }) => {
      try {
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
      // console.log(
      //   `Message from ${username} in room ${roomId}: ${message.substring(
      //     0,
      //     20
      //   )}${message.length > 20 ? "..." : ""}`
      // );

      // Broadcast the message to all users in the room except sender
      socket.to(roomId).emit("receive-message", {
        socketId: socket.id,
        username,
        message,
        timestamp: Date.now(),
      });

      // console.log(`Broadcast message to room ${roomId} complete`);
    });

    // Handle room deletion notification
    socket.on("room-deleted", ({ roomId }) => {
      // console.log(`Room ${roomId} has been deleted, notifying all users`);
      io.to(roomId).emit("room-deleted", {
        message: "This room has been deleted by the owner",
      });
    });

    // Handle disconnection
    socket.on("disconnect", async () => {
      try {
        // console.log(`User disconnected: ${socket.id}`);

        // Find all rooms where this socket is a user
        const rooms = await Room.find({
          "users.socketId": socket.id,
        });

        // console.log(
        //   `Found ${rooms.length} rooms for disconnected user ${socket.id}`
        // );

        // Remove user from each room
        for (const room of rooms) {
          const userIndex = room.users.findIndex(
            (user) => user.socketId === socket.id
          );
          if (userIndex === -1) continue;

          const username = room.users[userIndex].username;
          room.users = room.users.filter((user) => user.socketId !== socket.id);
          // console.log(
          //   `Removed user ${username} (${socket.id}) from room ${room._id}, ${room.users.length} users remaining`
          // );

          // Delete room if empty
          if (room.users.length === 0) {
            // console.log(`Room ${room._id} is now empty, deleting it`);
            await Room.findByIdAndDelete(room._id);
            continue;
          }

          // Assign new admin if previous admin left
          if (!room.users.some((user) => user.isAdmin)) {
            room.users[0].isAdmin = true;
            // console.log(
            //   `Assigned new admin in room ${room._id}: ${room.users[0].username}`
            // );
          }

          await room.save();

          // Notify room about user leaving
          // console.log(
          //   `Broadcasting user-left event for ${socket.id} in room ${room._id}`
          // );
          io.to(room._id.toString()).emit("user-left", {
            socketId: socket.id,
            username: username,
            users: room.users,
          });
        }
      } catch (error) {
        console.error("Error handling disconnection:", error);
        console.error(error.stack);
      }
    });
  });
};
