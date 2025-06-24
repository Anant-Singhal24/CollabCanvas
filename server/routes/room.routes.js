const express = require("express");
const router = express.Router();
const Room = require("../models/Room");

// Create a new room
router.post("/create-room", async (req, res) => {
  try {
    const { name, accessLevel = "public" } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Room name is required",
      });
    }

    const newRoom = new Room({
      name,
      accessLevel,
      users: [],
    });

    await newRoom.save();

    res.status(201).json({
      success: true,
      roomId: newRoom._id,
      message: "Room created successfully",
    });
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create room",
      error: process.env.NODE_ENV === "production" ? null : error.message,
    });
  }
});

// Get all public rooms
router.get("/public-rooms", async (req, res) => {
  try {
    // Find public rooms, sort by creation date (newest first)
    const publicRooms = await Room.find({ accessLevel: "public" })
      .sort({ createdAt: -1 })
      .limit(10);

    // Format the rooms
    const formattedRooms = publicRooms.map((room) => ({
      id: room._id,
      name: room.name,
      userCount: room.users.length,
      createdAt: room.createdAt,
    }));

    res.status(200).json({
      success: true,
      rooms: formattedRooms,
    });
  } catch (error) {
    console.error("Error fetching public rooms:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch public rooms",
      error: process.env.NODE_ENV === "production" ? null : error.message,
    });
  }
});

// Get room by ID
router.get("/room/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    res.status(200).json({
      success: true,
      room: {
        id: room._id,
        name: room.name,
        accessLevel: room.accessLevel,
        users: room.users,
        createdAt: room.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching room:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch room",
      error: process.env.NODE_ENV === "production" ? null : error.message,
    });
  }
});

// Update room access level
router.patch("/room/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { accessLevel } = req.body;

    if (!["public", "private"].includes(accessLevel)) {
      return res.status(400).json({
        success: false,
        message: "Invalid access level",
      });
    }

    const room = await Room.findByIdAndUpdate(
      roomId,
      { accessLevel },
      { new: true }
    );

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    res.status(200).json({
      success: true,
      room: {
        id: room._id,
        name: room.name,
        accessLevel: room.accessLevel,
      },
      message: "Room updated successfully",
    });
  } catch (error) {
    console.error("Error updating room:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update room",
      error: process.env.NODE_ENV === "production" ? null : error.message,
    });
  }
});

// Delete a room
router.delete("/room/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    await Room.findByIdAndDelete(roomId);

    res.status(200).json({
      success: true,
      message: "Room deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting room:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete room",
      error: process.env.NODE_ENV === "production" ? null : error.message,
    });
  }
});

module.exports = router;
