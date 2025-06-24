import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { fabric } from "fabric";
import { io } from "socket.io-client";
import RoomHeader from "../components/RoomHeader";
import Toolbar from "../components/Toolbar";
import UserList from "../components/UserList";
import ChatSidebar from "../components/ChatSidebar";
import ShareModal from "../components/ShareModal";
import DeleteRoomModal from "../components/DeleteRoomModal";

// Helper function to convert an array of points to SVG path notation
const pointsToSVGPath = (points) => {
  if (!points || points.length < 2) return "";

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  return path;
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [roomDetails, setRoomDetails] = useState(null);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [activeTool, setActiveTool] = useState("pen");
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [shapeLock, setShapeLock] = useState(false);

  // Refs
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    // Get username from localStorage or prompt
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    } else {
      const newUsername = prompt("Please enter your name:") || "Anonymous";
      setUsername(newUsername);
      localStorage.setItem("username", newUsername);
    }

    // Initialize Socket.IO with explicit config
    socketRef.current = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ["websocket", "polling"],
    });

    // console.log("Socket initialized with URL:", SOCKET_URL);

    // Socket event listeners
    socketRef.current.on("connect", () => {
      // console.log("Socket connected with ID:", socketRef.current.id);
    });

    socketRef.current.on("room-users", ({ users }) => {
      // console.log("Room users updated:", users);
      setUsers(users);
    });

    socketRef.current.on("room-error", ({ message }) => {
      console.error("Room error:", message);
      setError(message);
    });

    // Cleanup on component unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }
    };
  }, [roomId]);

  // Effect to fetch room details and join room once we have username
  useEffect(() => {
    // Only proceed if we have both username and socket connection
    if (!username || !socketRef.current || !roomId) return;

    // console.log("Attempting to join room with username:", username);

    const fetchRoomDetails = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`${API_BASE_URL}/room/${roomId}`);
        const roomData = response.data.room;
        setRoomDetails(roomData);

        // Check if room is private and handle access
        if (roomData.accessLevel === "private") {
          // console.log("This is a private room");
        }

        // Join the room once we have room details
        // console.log("Joining room:", roomId, "as", username);
        socketRef.current.emit("join-room", { roomId, username });
      } catch (error) {
        console.error("Error fetching room details:", error);
        setError("Room not found or you do not have access.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomDetails();

    // Additional socket listeners for user events
    socketRef.current.on("user-joined", (data) => {
      // console.log("User joined:", data);
      // Update the users list when a new user joins
      if (data.users && Array.isArray(data.users)) {
        setUsers(data.users);

        // Add system message about user joining
        if (data.username && data.username !== username) {
          const joinMessage = {
            id: Date.now() + Math.random(),
            message: `${data.username} joined the room`,
            isSystem: true,
            timestamp: Date.now(),
          };
          setChatMessages((prev) => [...prev, joinMessage]);
        }
      }
    });

    socketRef.current.on("user-left", (data) => {
      // console.log("User left:", data);
      // Update the users list when a user leaves
      if (data.users && Array.isArray(data.users)) {
        setUsers(data.users);

        // Add system message about user leaving
        if (data.username) {
          const leaveMessage = {
            id: Date.now() + Math.random(),
            message: `${data.username} left the room`,
            isSystem: true,
            timestamp: Date.now(),
          };
          setChatMessages((prev) => [...prev, leaveMessage]);
        }
      }
    });

    // Set up chat message handling
    socketRef.current.on("receive-message", (data) => {
      // console.log("Room component received message:", data);

      // Add the new message with a unique ID
      const newMessage = {
        id: Date.now() + Math.random(),
        ...data,
        timestamp: data.timestamp || Date.now(),
      };

      // Add message to our global message state
      setChatMessages((prev) => [...prev, newMessage]);

      // If sidebar is closed, increment unread counter
      if (!isSidebarOpen) {
        setUnreadMessages((prev) => prev + 1);
      }
    });

    // Handle room deletion
    socketRef.current.on("room-deleted", (data) => {
      // console.log("Room has been deleted:", data);
      // Navigate back to home page
      navigate("/", {
        state: {
          message: data.message || "This room has been deleted by the owner",
        },
      });
    });

    // Clean up event listeners on effect cleanup
    return () => {
      socketRef.current.off("user-joined");
      socketRef.current.off("user-left");
      socketRef.current.off("receive-message");
      socketRef.current.off("room-deleted");
    };
  }, [username, roomId, navigate]);

  useEffect(() => {
    if (!isLoading && username) {
      // Initialize Fabric.js canvas
      fabricCanvasRef.current = new fabric.Canvas(canvasRef.current, {
        isDrawingMode: true,
        width: canvasRef.current.parentElement.offsetWidth,
        height: window.innerHeight - 150,
        backgroundColor: "#ffffff",
      });

      // Set up drawing mode
      const canvas = fabricCanvasRef.current;
      updateCanvasToolSettings(canvas);

      // Listen for canvas events
      canvas.on("path:created", ({ path }) => {
        // Check if this is an eraser stroke and set the composite operation
        if (activeTool === "eraser") {
          path.set({
            globalCompositeOperation: "destination-out",
          });
        }

        // Emit drawing data to other users
        socketRef.current.emit("draw", {
          roomId,
          drawingData: JSON.stringify(path.toJSON()),
          completed: true,
          isEraser: activeTool === "eraser",
        });
      });

      // Listen for object modifications
      canvas.on("object:modified", ({ target }) => {
        socketRef.current.emit("draw", {
          roomId,
          drawingData: JSON.stringify(target.toJSON()),
          completed: true,
        });
      });

      // Add real-time drawing updates with throttling
      let lastUpdateTime = 0;
      const updateInterval = 30; // Update every 30ms (about 33fps)

      canvas.on("mouse:move", (options) => {
        if (canvas.isDrawingMode && canvas._isCurrentlyDrawing) {
          const now = Date.now();

          // Throttle updates to avoid flooding the network
          if (now - lastUpdateTime > updateInterval) {
            lastUpdateTime = now;

            // Get the current path being drawn
            const path = canvas.freeDrawingBrush._points;
            if (path && path.length > 2) {
              // Convert points to path data
              const pathData = {
                type: "path",
                path: path,
                stroke: canvas.freeDrawingBrush.color,
                strokeWidth: canvas.freeDrawingBrush.width,
                fill: null,
                isEraser: activeTool === "eraser",
                compositeOperation:
                  canvas.freeDrawingBrush.globalCompositeOperation,
              };

              // Send real-time update to other clients
              socketRef.current.emit("draw-update", {
                roomId,
                drawingData: JSON.stringify(pathData),
                userId: socketRef.current.id,
              });
            }
          }
        }
      });

      // Also send update when starting to draw
      canvas.on("mouse:down", (options) => {
        if (canvas.isDrawingMode) {
          lastUpdateTime = Date.now();
        }
      });

      // Clear temporary paths when drawing ends
      canvas.on("mouse:up", () => {
        if (canvas.isDrawingMode) {
          // Broadcast to other users that drawing has ended
          socketRef.current.emit("draw-end", {
            roomId,
            userId: socketRef.current.id,
          });
        }
      });

      // Handle window resize
      const handleResize = () => {
        canvas.setWidth(canvasRef.current.parentElement.offsetWidth);
        canvas.setHeight(window.innerHeight - 150);
        canvas.renderAll();
      };

      window.addEventListener("resize", handleResize);

      // Socket events for drawing
      socketRef.current.on(
        "draw",
        ({ socketId, drawingData, completed, isEraser }) => {
          if (socketId !== socketRef.current.id) {
            fabric.util.enlivenObjects([JSON.parse(drawingData)], (objects) => {
              objects.forEach((obj) => {
                // If this is an eraser stroke, set the composite operation
                if (isEraser) {
                  obj.set({
                    globalCompositeOperation: "destination-out",
                  });
                }
                canvas.add(obj);
                canvas.renderAll();
              });
            });
          }
        }
      );

      // Handle real-time drawing updates from other users
      const liveDrawingPaths = new Map(); // Store temporary paths by user

      socketRef.current.on(
        "draw-update",
        ({ socketId, drawingData, userId }) => {
          if (socketId !== socketRef.current.id) {
            const pathData = JSON.parse(drawingData);

            // Remove previous preview path from this user if it exists
            if (liveDrawingPaths.has(userId)) {
              canvas.remove(liveDrawingPaths.get(userId));
            }

            // Create a new path from the points
            const points = pathData.path;

            // Set the composite operation based on the received data
            const compositeOperation = pathData.isEraser
              ? "destination-out"
              : pathData.compositeOperation || "source-over";

            const path = new fabric.Path(pointsToSVGPath(points), {
              stroke: pathData.stroke,
              strokeWidth: pathData.strokeWidth || strokeWidth,
              fill: null,
              strokeLineCap: "round",
              strokeLineJoin: "round",
              opacity: pathData.isEraser ? 1.0 : 0.8,
              selectable: false,
              evented: false,
              globalCompositeOperation: compositeOperation,
            });

            // Add the path to canvas and store reference
            canvas.add(path);
            liveDrawingPaths.set(userId, path);
            canvas.renderAll();
          }
        }
      );

      // Handle drawing end events
      socketRef.current.on("draw-end", ({ socketId, userId }) => {
        if (socketId !== socketRef.current.id && liveDrawingPaths.has(userId)) {
          // Remove the temporary path when user stops drawing
          canvas.remove(liveDrawingPaths.get(userId));
          liveDrawingPaths.delete(userId);
          canvas.renderAll();
        }
      });

      // Handle canvas state loading
      socketRef.current.on("canvas-state", ({ canvasData }) => {
        if (canvasData) {
          canvas.loadFromJSON(canvasData, () => {
            canvas.renderAll();
          });
        }
      });

      // Handle canvas clearing
      socketRef.current.on("clear-canvas", () => {
        canvas.clear();
        canvas.setBackgroundColor("#ffffff", canvas.renderAll.bind(canvas));
      });

      // Auto-save canvas state every 30s
      const saveInterval = setInterval(() => {
        const canvasData = JSON.stringify(canvas.toJSON());
        socketRef.current.emit("save-canvas", { roomId, canvasData });
      }, 30000);

      return () => {
        window.removeEventListener("resize", handleResize);
        clearInterval(saveInterval);
      };
    }
  }, [isLoading, username, roomId]);

  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.backgroundColor = "#ffffff";
      fabricCanvasRef.current.renderAll();
    }
  }, []);

  // Update canvas tools when active tool changes
  useEffect(() => {
    if (fabricCanvasRef.current) {
      // Reset drawing state when changing tools
      isDrawing.current = false;
      setShapeLock(false);

      // If there's a shape in progress, remove it
      const canvas = fabricCanvasRef.current;
      if (canvas._currentShape) {
        canvas.remove(canvas._currentShape);
        canvas._currentShape = null;
        canvas._currentStartPoint = null;
      }

      updateCanvasToolSettings(fabricCanvasRef.current);
    }
  }, [activeTool, strokeColor, strokeWidth]);

  const updateCanvasToolSettings = (canvas) => {
    // Reset all modes first
    canvas.isDrawingMode = false;
    canvas.selection = false;

    // Clear any in-progress shape
    if (canvas._currentShape) {
      canvas.remove(canvas._currentShape);
      canvas._currentShape = null;
      canvas._currentStartPoint = null;
    }

    // Remove all event listeners first
    canvas.off("mouse:down");
    canvas.off("mouse:move");
    canvas.off("mouse:up");

    // Apply settings based on the active tool
    switch (activeTool) {
      case "pen":
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.color = strokeColor;
        canvas.freeDrawingBrush.width = strokeWidth;
        canvas.selection = false;
        // Ensure normal drawing mode
        canvas.freeDrawingBrush.globalCompositeOperation = "source-over";
        canvas.defaultCursor = "default";
        break;
      case "rect":
        canvas.isDrawingMode = false;
        canvas.selection = false;
        canvas.defaultCursor = "crosshair";
        // Add event listeners for rectangle drawing
        canvas.on("mouse:down", startAddRect);
        canvas.on("mouse:move", resizeRect);
        canvas.on("mouse:up", endAddRect);
        break;
      case "circle":
        canvas.isDrawingMode = false;
        canvas.selection = false;
        canvas.defaultCursor = "crosshair";
        // Add event listeners for circle drawing
        canvas.on("mouse:down", startAddCircle);
        canvas.on("mouse:move", resizeCircle);
        canvas.on("mouse:up", endAddCircle);
        break;
      case "text":
        canvas.isDrawingMode = false;
        canvas.selection = true;
        canvas.defaultCursor = "text";
        break;
      case "eraser":
        canvas.isDrawingMode = true;
        // Use white color for visual feedback
        canvas.freeDrawingBrush.color = "#ffffff";
        // Make eraser slightly bigger than pen
        canvas.freeDrawingBrush.width = strokeWidth * 2;
        // This is the key - use destination-out composite operation for erasing
        canvas.freeDrawingBrush.globalCompositeOperation = "destination-out";
        canvas.selection = false;
        canvas.defaultCursor = "default";
        break;
      case "select":
        canvas.isDrawingMode = false;
        canvas.selection = true;
        canvas.defaultCursor = "default";
        canvas.forEachObject((obj) => {
          obj.selectable = true;
          obj.evented = true;
        });
        break;
      default:
        canvas.isDrawingMode = true;
        canvas.defaultCursor = "default";
    }

    canvas.renderAll();
  };

  // Improved rectangle drawing functions
  const startAddRect = (options) => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;

    // Don't start if already drawing or shape lock is active
    if (isDrawing.current || shapeLock) return;

    const pointer = canvas.getPointer(options.e);

    // Set shape lock to prevent multiple shapes
    setShapeLock(true);
    isDrawing.current = true;
    canvas._currentStartPoint = pointer;

    const rect = new fabric.Rect({
      left: pointer.x,
      top: pointer.y,
      width: 0,
      height: 0,
      fill: "transparent",
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      selectable: true,
    });

    // Remove any existing shape
    if (canvas._currentShape) {
      canvas.remove(canvas._currentShape);
    }

    canvas._currentShape = rect;
    canvas.add(rect);
    canvas.renderAll();
  };

  const resizeRect = (options) => {
    if (!isDrawing.current || !fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    if (!canvas._currentShape || !canvas._currentStartPoint) return;

    const pointer = canvas.getPointer(options.e);
    const startPoint = canvas._currentStartPoint;
    const rect = canvas._currentShape;

    let width = Math.abs(startPoint.x - pointer.x);
    let height = Math.abs(startPoint.y - pointer.y);
    let left = Math.min(startPoint.x, pointer.x);
    let top = Math.min(startPoint.y, pointer.y);

    rect.set({
      left: left,
      top: top,
      width: width,
      height: height,
    });

    canvas.renderAll();
  };

  const endAddRect = () => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;

    // Only proceed if we were actually drawing
    if (!isDrawing.current) return;

    isDrawing.current = false;
    // Release shape lock
    setShapeLock(false);

    try {
      if (canvas._currentShape) {
        // Only emit if the shape has actual dimensions
        if (canvas._currentShape.width > 0 && canvas._currentShape.height > 0) {
          socketRef.current.emit("draw", {
            roomId,
            drawingData: JSON.stringify(canvas._currentShape.toJSON()),
          });
        } else {
          // Remove zero-sized shapes
          canvas.remove(canvas._currentShape);
        }
      }
    } catch (error) {
      console.error("Error completing rectangle:", error);
    } finally {
      // Always clean up references
      canvas._currentShape = null;
      canvas._currentStartPoint = null;
      canvas.renderAll();
    }
  };

  // Improved circle drawing functions
  const startAddCircle = (options) => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;

    // Don't start if already drawing or shape lock is active
    if (isDrawing.current || shapeLock) return;

    const pointer = canvas.getPointer(options.e);

    // Set shape lock to prevent multiple shapes
    setShapeLock(true);
    isDrawing.current = true;
    canvas._currentStartPoint = pointer;

    const circle = new fabric.Circle({
      left: pointer.x,
      top: pointer.y,
      originX: "center",
      originY: "center",
      radius: 0,
      fill: "transparent",
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      selectable: true,
    });

    // Remove any existing shape
    if (canvas._currentShape) {
      canvas.remove(canvas._currentShape);
    }

    canvas._currentShape = circle;
    canvas.add(circle);
    canvas.renderAll();
  };

  const resizeCircle = (options) => {
    if (!isDrawing.current || !fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    if (!canvas._currentShape || !canvas._currentStartPoint) return;

    const pointer = canvas.getPointer(options.e);
    const startPoint = canvas._currentStartPoint;
    const circle = canvas._currentShape;

    // Calculate radius based on distance from start point
    const dx = pointer.x - startPoint.x;
    const dy = pointer.y - startPoint.y;
    const radius = Math.sqrt(dx * dx + dy * dy);

    circle.set({ radius: radius });
    canvas.renderAll();
  };

  const endAddCircle = () => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;

    // Only proceed if we were actually drawing
    if (!isDrawing.current) return;

    isDrawing.current = false;
    // Release shape lock
    setShapeLock(false);

    try {
      if (canvas._currentShape) {
        // Only emit if the shape has actual dimensions
        if (canvas._currentShape.radius > 0) {
          socketRef.current.emit("draw", {
            roomId,
            drawingData: JSON.stringify(canvas._currentShape.toJSON()),
          });
        } else {
          // Remove zero-sized shapes
          canvas.remove(canvas._currentShape);
        }
      }
    } catch (error) {
      console.error("Error completing circle:", error);
    } finally {
      // Always clean up references
      canvas._currentShape = null;
      canvas._currentStartPoint = null;
      canvas.renderAll();
    }
  };

  const addText = () => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;

    const text = new fabric.IText("Type here", {
      left: canvas.width / 2,
      top: canvas.height / 2,
      fontFamily: "Arial",
      fill: strokeColor,
      fontSize: strokeWidth * 5,
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();

    text.enterEditing();

    // Emit new text when editing is complete
    text.on("editing:exited", () => {
      socketRef.current.emit("draw", {
        roomId,
        drawingData: JSON.stringify(text.toJSON()),
      });
    });
  };

  const clearCanvas = () => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.clear();
      fabricCanvasRef.current.backgroundColor = "#ffffff";
      fabricCanvasRef.current.renderAll();
      socketRef.current.emit("clear-canvas", { roomId });
    }
  };

  const exportCanvas = (format) => {
    if (!fabricCanvasRef.current) return;

    if (format === "png") {
      const dataURL = fabricCanvasRef.current.toDataURL({
        format: "png",
        quality: 1.0,
      });

      const link = document.createElement("a");
      link.href = dataURL;
      link.download = `CollabCanvas-${roomId}.png`;
      link.click();
    } else if (format === "pdf") {
      // This is a simple implementation using window.print()
      // For a more advanced PDF export, consider using libraries like jsPDF
      const printWindow = window.open("", "_blank");
      const dataURL = fabricCanvasRef.current.toDataURL({
        format: "png",
        quality: 1.0,
      });

      printWindow.document.write(`
        <html>
          <head><title>CollabCanvas - ${
            roomDetails?.name || roomId
          }</title></head>
          <body>
            <img src="${dataURL}" style="max-width: 100%;" />
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  const handleSendMessage = (message) => {
    if (socketRef.current) {
      const timestamp = Date.now();
      const messageData = {
        roomId,
        message,
        username,
        timestamp: timestamp,
        socketId: socketRef.current.id,
      };

      // Send the message to server
      socketRef.current.emit("send-message", messageData);

      // Also add the message to our local state for immediate display
      const newMessage = {
        id: timestamp + Math.random(),
        message: message,
        username: username,
        timestamp: timestamp,
        socketId: socketRef.current.id,
      };

      setChatMessages((prev) => [...prev, newMessage]);
    }
  };

  // Add a function to handle tool changes
  const handleToolChange = (tool) => {
    // Reset shape lock when changing tools
    setShapeLock(false);
    isDrawing.current = false;

    // Special handling for text tool
    if (tool === "text" && fabricCanvasRef.current) {
      setActiveTool(tool);
      // Add text immediately when the text tool is selected
      addText();
    } else {
      setActiveTool(tool);
    }
  };

  // Add global mouse up handler to ensure drawing operations complete properly
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDrawing.current) {
        if (activeTool === "rect" && fabricCanvasRef.current) {
          endAddRect();
        } else if (activeTool === "circle" && fabricCanvasRef.current) {
          endAddCircle();
        }
      }
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [activeTool]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          className="px-4 py-2 bg-primary-500 text-white rounded-md"
          onClick={() => navigate("/")}
        >
          Go Home
        </button>
      </div>
    );
  }

  // Function to toggle chat sidebar and reset unread count
  const toggleChatSidebar = () => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);

    // Reset unread count when opening the sidebar
    if (newState) {
      setUnreadMessages(0);
    }
  };

  // Check if current user is an admin
  const isCurrentUserAdmin = () => {
    if (!socketRef.current || !users.length) return false;
    const currentUser = users.find(
      (user) => user.socketId === socketRef.current.id
    );
    return currentUser?.isAdmin || false;
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <RoomHeader
        roomName={roomDetails?.name}
        onShareClick={() => setIsShareModalOpen(true)}
        onDeleteClick={() => setIsDeleteModalOpen(true)}
        userCount={users.length}
        onToggleSidebar={toggleChatSidebar}
        unreadMessages={unreadMessages}
        onExportClick={exportCanvas}
        isAdmin={isCurrentUserAdmin()}
      />

      <div className="flex flex-1 overflow-hidden">
        <Toolbar
          activeTool={activeTool}
          onToolChange={handleToolChange}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          onColorChange={setStrokeColor}
          onWidthChange={setStrokeWidth}
          onClearCanvas={clearCanvas}
          onExportCanvas={exportCanvas}
          onToggleSidebar={toggleChatSidebar}
          unreadMessages={unreadMessages}
        />

        <div className="flex-1 relative overflow-hidden">
          <canvas ref={canvasRef} className="absolute inset-0" />
        </div>

        {isSidebarOpen && (
          <div className="w-72 border-l border-gray-200 p-4 flex flex-col">
            <UserList users={users} currentUserId={socketRef.current?.id} />
            <ChatSidebar
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              socketRef={socketRef}
            />
          </div>
        )}
      </div>

      {isShareModalOpen && (
        <ShareModal
          roomId={roomId}
          accessLevel={roomDetails?.accessLevel || "public"}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}

      {isDeleteModalOpen && (
        <DeleteRoomModal
          roomId={roomId}
          roomName={roomDetails?.name || "Untitled Board"}
          onClose={() => setIsDeleteModalOpen(false)}
          socketRef={socketRef}
        />
      )}
    </div>
  );
}

export default Room;
