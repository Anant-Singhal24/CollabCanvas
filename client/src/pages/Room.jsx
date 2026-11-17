import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Canvas,
  Rect,
  Circle,
  IText,
  Path,
  util,
  PencilBrush,
  FabricObject,
} from "fabric";
import { io } from "socket.io-client";
import RoomHeader from "../components/RoomHeader";
import Toolbar from "../components/Toolbar";
import UserList from "../components/UserList";
import ChatSidebar from "../components/ChatSidebar";
import ShareModal from "../components/ShareModal";
import DeleteRoomModal from "../components/DeleteRoomModal";

// Enable automatic serialization/deserialization of custom "id" property on all Fabric objects
FabricObject.customProperties = ["id"];

// Helper function to convert an array of points to SVG path notation
const pointsToSVGPath = (points) => {
  if (!points || points.length < 2) return "";
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  return path;
};

// Generate unique ID for canvas objects to ensure seamless synchronization
const generateId = (prefix = "obj") =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

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

  // Refs for stable access in event handlers
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const isDrawing = useRef(false);
  const startPointRef = useRef(null);
  const currentShapeRef = useRef(null);
  const liveDrawingPathsRef = useRef(new Map());
  const saveTimeoutRef = useRef(null);
  const initialCanvasDataRef = useRef("");
  const activeToolRef = useRef(activeTool);
  const strokeColorRef = useRef(strokeColor);
  const strokeWidthRef = useRef(strokeWidth);

  // Sync ref values
  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  useEffect(() => {
    strokeColorRef.current = strokeColor;
  }, [strokeColor]);

  useEffect(() => {
    strokeWidthRef.current = strokeWidth;
  }, [strokeWidth]);

  // Debounced save canvas to MongoDB
  const debouncedSaveCanvas = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (fabricCanvasRef.current && socketRef.current && roomId) {
        try {
          const canvasData = JSON.stringify(fabricCanvasRef.current.toJSON());
          socketRef.current.emit("save-canvas", { roomId, canvasData });
        } catch (e) {
          console.error("Error saving canvas:", e);
        }
      }
    }, 1000);
  }, [roomId]);

  // Initialize username and socket connection
  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    let currentUsername = storedUsername;
    if (!currentUsername) {
      currentUsername = prompt("Please enter your name:") || "Anonymous";
      localStorage.setItem("username", currentUsername);
    }
    setUsername(currentUsername);

    // Initialize Socket.IO
    socketRef.current = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ["websocket", "polling"],
    });

    const socket = socketRef.current;

    socket.on("room-users", ({ users }) => {
      setUsers(users || []);
    });

    socket.on("room-error", ({ message }) => {
      console.error("Room error:", message);
      setError(message || "An error occurred");
    });

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (socket) {
        socket.disconnect();
      }
    };
  }, [roomId]);

  // Fetch room details and join room via socket
  useEffect(() => {
    if (!username || !socketRef.current || !roomId) return;

    const socket = socketRef.current;

    const fetchRoomDetails = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`${API_BASE_URL}/room/${roomId}`);
        const roomData = response.data.room;
        setRoomDetails(roomData);

        if (roomData.canvasData) {
          initialCanvasDataRef.current = roomData.canvasData;
        }

        // Join room via socket
        socket.emit("join-room", { roomId, username });
      } catch (err) {
        console.error("Error fetching room details:", err);
        setError("Room not found or you do not have access.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomDetails();

    const handleUserJoined = (data) => {
      if (data.users && Array.isArray(data.users)) {
        setUsers(data.users);
      }
      if (data.username && data.username !== username) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            message: `${data.username} joined the room`,
            isSystem: true,
            timestamp: Date.now(),
          },
        ]);
      }
    };

    const handleUserLeft = (data) => {
      if (data.users && Array.isArray(data.users)) {
        setUsers(data.users);
      }
      if (data.username) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            message: `${data.username} left the room`,
            isSystem: true,
            timestamp: Date.now(),
          },
        ]);
      }
    };

    const handleReceiveMessage = (data) => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          ...data,
          timestamp: data.timestamp || Date.now(),
        },
      ]);
      setUnreadMessages((prev) => prev + 1);
    };

    const handleRoomDeleted = (data) => {
      navigate("/", {
        state: {
          message: data.message || "This room has been deleted by the owner",
        },
      });
    };

    socket.on("user-joined", handleUserJoined);
    socket.on("user-left", handleUserLeft);
    socket.on("receive-message", handleReceiveMessage);
    socket.on("room-deleted", handleRoomDeleted);

    return () => {
      socket.off("user-joined", handleUserJoined);
      socket.off("user-left", handleUserLeft);
      socket.off("receive-message", handleReceiveMessage);
      socket.off("room-deleted", handleRoomDeleted);
    };
  }, [username, roomId, navigate]);

  // Initialize Fabric canvas once loading is complete
  useEffect(() => {
    if (isLoading || !canvasRef.current) return;

    const parent = canvasRef.current.parentElement;
    const initialWidth = parent ? parent.offsetWidth : window.innerWidth;
    const initialHeight = parent ? parent.offsetHeight : window.innerHeight - 80;

    const canvas = new Canvas(canvasRef.current, {
      width: initialWidth,
      height: initialHeight,
      backgroundColor: "#ffffff",
      isDrawingMode: true,
      selection: false,
    });

    // Ensure pencil brush is initialized in Fabric 7
    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = strokeColorRef.current;
    canvas.freeDrawingBrush.width = strokeWidthRef.current;

    fabricCanvasRef.current = canvas;

    // Load initial canvas state if available
    if (initialCanvasDataRef.current) {
      canvas
        .loadFromJSON(initialCanvasDataRef.current)
        .then(() => {
          canvas.backgroundColor = "#ffffff";
          canvas.renderAll();
        })
        .catch((e) => console.error("Error loading initial canvas:", e));
    }

    // Ask server for latest canvas state in case it updated
    if (socketRef.current) {
      socketRef.current.emit("get-canvas-state", { roomId });
    }

    // Real-time mouse event handlers
    let lastUpdateTime = 0;
    const updateInterval = 30; // 30ms throttling

    const handleMouseDown = (opt) => {
      const tool = activeToolRef.current;
      const pointer = canvas.getScenePoint(opt.e);

      if (tool === "rect") {
        isDrawing.current = true;
        startPointRef.current = pointer;

        const rect = new Rect({
          id: generateId("rect"),
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: "transparent",
          stroke: strokeColorRef.current,
          strokeWidth: strokeWidthRef.current,
          selectable: false,
          evented: false,
        });

        currentShapeRef.current = rect;
        canvas.add(rect);
        canvas.renderAll();
      } else if (tool === "circle") {
        isDrawing.current = true;
        startPointRef.current = pointer;

        const circle = new Circle({
          id: generateId("circle"),
          left: pointer.x,
          top: pointer.y,
          originX: "center",
          originY: "center",
          radius: 0,
          fill: "transparent",
          stroke: strokeColorRef.current,
          strokeWidth: strokeWidthRef.current,
          selectable: false,
          evented: false,
        });

        currentShapeRef.current = circle;
        canvas.add(circle);
        canvas.renderAll();
      } else if (tool === "text") {
        // Place text at clicked point
        const text = new IText("Type here", {
          id: generateId("text"),
          left: pointer.x,
          top: pointer.y,
          fontFamily: "Arial",
          fill: strokeColorRef.current,
          fontSize: Math.max(16, strokeWidthRef.current * 6),
          selectable: true,
        });

        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        canvas.renderAll();

        text.on("editing:exited", () => {
          if (!text.text.trim()) {
            canvas.remove(text);
            canvas.renderAll();
            return;
          }
          if (socketRef.current) {
            socketRef.current.emit("draw", {
              roomId,
              drawingData: JSON.stringify(text.toObject()),
              completed: true,
            });
          }
          debouncedSaveCanvas();
        });
      } else if (canvas.isDrawingMode) {
        lastUpdateTime = Date.now();
      }
    };

    const handleMouseMove = (opt) => {
      const tool = activeToolRef.current;
      const pointer = canvas.getScenePoint(opt.e);

      if (isDrawing.current && currentShapeRef.current) {
        const startPoint = startPointRef.current;
        const shape = currentShapeRef.current;

        if (tool === "rect") {
          const width = Math.abs(pointer.x - startPoint.x);
          const height = Math.abs(pointer.y - startPoint.y);
          const left = Math.min(startPoint.x, pointer.x);
          const top = Math.min(startPoint.y, pointer.y);

          shape.set({ left, top, width, height });
          canvas.renderAll();
        } else if (tool === "circle") {
          const dx = pointer.x - startPoint.x;
          const dy = pointer.y - startPoint.y;
          const radius = Math.sqrt(dx * dx + dy * dy);

          shape.set({ radius });
          canvas.renderAll();
        }
      } else if (canvas.isDrawingMode && canvas._isCurrentlyDrawing) {
        const now = Date.now();
        if (now - lastUpdateTime > updateInterval) {
          lastUpdateTime = now;
          const brush = canvas.freeDrawingBrush;
          const points = brush?._points;

          if (points && points.length > 1 && socketRef.current) {
            const isEraser = tool === "eraser";
            const pathData = {
              type: "path",
              path: points,
              stroke: isEraser ? "#ffffff" : brush.color,
              strokeWidth: isEraser ? brush.width : brush.width,
              isEraser,
            };

            socketRef.current.emit("draw-update", {
              roomId,
              drawingData: JSON.stringify(pathData),
              userId: socketRef.current.id,
            });
          }
        }
      }
    };

    const handleMouseUp = () => {
      const shape = currentShapeRef.current;

      if (isDrawing.current && shape) {
        isDrawing.current = false;
        currentShapeRef.current = null;
        startPointRef.current = null;

        const isValid =
          (shape.type === "rect" && shape.width > 2 && shape.height > 2) ||
          (shape.type === "circle" && shape.radius > 2);

        if (isValid) {
          shape.set({ selectable: true, evented: true });
          shape.setCoords();
          canvas.renderAll();

          if (socketRef.current) {
            socketRef.current.emit("draw", {
              roomId,
              drawingData: JSON.stringify(shape.toObject()),
              completed: true,
            });
          }
          debouncedSaveCanvas();
        } else {
          canvas.remove(shape);
          canvas.renderAll();
        }
      } else if (canvas.isDrawingMode && socketRef.current) {
        socketRef.current.emit("draw-end", {
          roomId,
          userId: socketRef.current.id,
        });
      }
    };

    // Freehand path creation complete
    const handlePathCreated = ({ path }) => {
      if (!path.id) path.id = generateId("path");
      const isEraser = activeToolRef.current === "eraser";

      if (isEraser) {
        path.set({ stroke: "#ffffff" });
      }

      if (socketRef.current) {
        socketRef.current.emit("draw", {
          roomId,
          drawingData: JSON.stringify(path.toObject()),
          completed: true,
          isEraser,
        });
      }
      debouncedSaveCanvas();
    };

    // Object modified (moved, resized, rotated)
    const handleObjectModified = ({ target }) => {
      if (!target) return;
      if (!target.id) {
        target.id = generateId(target.type?.toLowerCase() || "obj");
      }

      if (socketRef.current) {
        socketRef.current.emit("draw", {
          roomId,
          drawingData: JSON.stringify(target.toObject()),
          completed: true,
        });
      }
      debouncedSaveCanvas();
    };

    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:move", handleMouseMove);
    canvas.on("mouse:up", handleMouseUp);
    canvas.on("path:created", handlePathCreated);
    canvas.on("object:modified", handleObjectModified);

    // Socket drawing events from other clients
    const socket = socketRef.current;
    if (socket) {
      socket.on("draw", async ({ socketId, drawingData, isEraser }) => {
        if (socketId === socket.id) return;
        try {
          const data =
            typeof drawingData === "string"
              ? JSON.parse(drawingData)
              : drawingData;
          if (!data) return;

          // Remove live drawing preview for this user if exists
          const liveMap = liveDrawingPathsRef.current;
          if (liveMap.has(socketId)) {
            canvas.remove(liveMap.get(socketId));
            liveMap.delete(socketId);
          }

          // Check if object already exists (modified move/scale/edit)
          const existing = data.id
            ? canvas.getObjects().find((o) => o.id === data.id)
            : null;

          if (existing) {
            existing.set(data);
            existing.setCoords();
            canvas.renderAll();
            return;
          }

          // Otherwise enliven and add new object
          const enlivened = await util.enlivenObjects([data]);
          enlivened.forEach((obj) => {
            if (data.id) obj.id = data.id;
            if (isEraser) {
              obj.set({ stroke: "#ffffff" });
            }
            canvas.add(obj);
          });
          canvas.renderAll();
        } catch (err) {
          console.error("Error applying remote draw:", err);
        }
      });

      socket.on("draw-update", ({ socketId, drawingData, userId }) => {
        if (socketId === socket.id) return;
        try {
          const pathData =
            typeof drawingData === "string"
              ? JSON.parse(drawingData)
              : drawingData;
          const uid = userId || socketId;
          const liveMap = liveDrawingPathsRef.current;

          if (liveMap.has(uid)) {
            canvas.remove(liveMap.get(uid));
            liveMap.delete(uid);
          }

          if (!pathData || !pathData.path || pathData.path.length < 2) return;
          const svgPath = pointsToSVGPath(pathData.path);
          if (!svgPath) return;

          const previewPath = new Path(svgPath, {
            stroke: pathData.isEraser ? "#ffffff" : pathData.stroke,
            strokeWidth: pathData.strokeWidth || 3,
            fill: null,
            strokeLineCap: "round",
            strokeLineJoin: "round",
            opacity: pathData.isEraser ? 1.0 : 0.8,
            selectable: false,
            evented: false,
          });

          canvas.add(previewPath);
          liveMap.set(uid, previewPath);
          canvas.renderAll();
        } catch (err) {
          console.error("Error applying draw-update:", err);
        }
      });

      socket.on("draw-end", ({ socketId, userId }) => {
        const uid = userId || socketId;
        const liveMap = liveDrawingPathsRef.current;
        if (liveMap.has(uid)) {
          canvas.remove(liveMap.get(uid));
          liveMap.delete(uid);
          canvas.renderAll();
        }
      });

      socket.on("delete-object", ({ objectId }) => {
        if (!objectId) return;
        const target = canvas.getObjects().find((o) => o.id === objectId);
        if (target) {
          canvas.remove(target);
          canvas.renderAll();
        }
      });

      socket.on("canvas-state", async ({ canvasData }) => {
        if (canvasData) {
          try {
            await canvas.loadFromJSON(canvasData);
            canvas.backgroundColor = "#ffffff";
            canvas.renderAll();
          } catch (err) {
            console.error("Error loading canvas state:", err);
          }
        }
      });

      socket.on("clear-canvas", () => {
        canvas.clear();
        canvas.backgroundColor = "#ffffff";
        canvas.renderAll();
      });
    }

    // Handle delete/backspace key to remove selected objects
    const handleKeyDown = (e) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const activeObj = canvas.getActiveObject();
        // Don't delete if actively typing in text object or an input field
        if (
          activeObj &&
          !activeObj.isEditing &&
          e.target.tagName !== "INPUT" &&
          e.target.tagName !== "TEXTAREA"
        ) {
          e.preventDefault();
          const objectId = activeObj.id;
          canvas.remove(activeObj);
          canvas.discardActiveObject();
          canvas.renderAll();

          if (objectId && socketRef.current) {
            socketRef.current.emit("delete-object", { roomId, objectId });
          }
          debouncedSaveCanvas();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Handle window resize
    const handleResize = () => {
      if (!canvasRef.current || !canvasRef.current.parentElement) return;
      const width = canvasRef.current.parentElement.offsetWidth;
      const height = canvasRef.current.parentElement.offsetHeight;
      canvas.setDimensions({ width, height });
      canvas.renderAll();
    };

    window.addEventListener("resize", handleResize);

    // Periodic auto-save every 30 seconds
    const saveInterval = setInterval(() => {
      if (fabricCanvasRef.current && socketRef.current && roomId) {
        try {
          const canvasData = JSON.stringify(fabricCanvasRef.current.toJSON());
          socketRef.current.emit("save-canvas", { roomId, canvasData });
        } catch (e) {
          console.error("Auto-save failed:", e);
        }
      }
    }, 30000);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
      clearInterval(saveInterval);

      if (socket) {
        socket.off("draw");
        socket.off("draw-update");
        socket.off("draw-end");
        socket.off("delete-object");
        socket.off("canvas-state");
        socket.off("clear-canvas");
      }

      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [isLoading, roomId, debouncedSaveCanvas]);

  // Update canvas brush and selection settings when activeTool / strokeColor / strokeWidth changes
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (activeTool === "pen") {
      canvas.isDrawingMode = true;
      if (!canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush = new PencilBrush(canvas);
      }
      canvas.freeDrawingBrush.color = strokeColor;
      canvas.freeDrawingBrush.width = strokeWidth;
      canvas.selection = false;
      canvas.defaultCursor = "default";
      canvas.forEachObject((obj) => {
        obj.selectable = false;
        obj.evented = false;
      });
    } else if (activeTool === "eraser") {
      canvas.isDrawingMode = true;
      if (!canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush = new PencilBrush(canvas);
      }
      canvas.freeDrawingBrush.color = "#ffffff";
      canvas.freeDrawingBrush.width = strokeWidth * 2.5;
      canvas.selection = false;
      canvas.defaultCursor = "default";
      canvas.forEachObject((obj) => {
        obj.selectable = false;
        obj.evented = false;
      });
    } else if (activeTool === "rect" || activeTool === "circle") {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      canvas.defaultCursor = "crosshair";
      canvas.forEachObject((obj) => {
        obj.selectable = false;
        obj.evented = false;
      });
    } else if (activeTool === "text") {
      canvas.isDrawingMode = false;
      canvas.selection = true;
      canvas.defaultCursor = "text";
      canvas.forEachObject((obj) => {
        obj.selectable = true;
        obj.evented = true;
      });
    } else if (activeTool === "select") {
      canvas.isDrawingMode = false;
      canvas.selection = true;
      canvas.defaultCursor = "default";
      canvas.forEachObject((obj) => {
        obj.selectable = true;
        obj.evented = true;
      });
    }

    canvas.renderAll();
  }, [activeTool, strokeColor, strokeWidth]);

  // Clear canvas action
  const clearCanvas = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      canvas.clear();
      canvas.backgroundColor = "#ffffff";
      canvas.renderAll();
      if (socketRef.current) {
        socketRef.current.emit("clear-canvas", { roomId });
      }
    }
  };

  // Export canvas
  const exportCanvas = (format) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (format === "png") {
      const dataURL = canvas.toDataURL({
        format: "png",
        quality: 1.0,
      });

      const link = document.createElement("a");
      link.href = dataURL;
      link.download = `CollabCanvas-${roomDetails?.name || roomId}.png`;
      link.click();
    }
  };

  // Chat message sending
  const handleSendMessage = (messageText) => {
    if (socketRef.current && messageText.trim()) {
      const timestamp = Date.now();
      const messageData = {
        roomId,
        message: messageText.trim(),
        username,
        timestamp,
        socketId: socketRef.current.id,
      };

      socketRef.current.emit("send-message", messageData);

      setChatMessages((prev) => [
        ...prev,
        {
          id: timestamp + Math.random(),
          message: messageText.trim(),
          username,
          timestamp,
          socketId: socketRef.current.id,
        },
      ]);
    }
  };

  // Toggle chat sidebar
  const toggleChatSidebar = () => {
    const nextState = !isSidebarOpen;
    setIsSidebarOpen(nextState);
    if (nextState) {
      setUnreadMessages(0);
    }
  };

  // Check if current user is admin
  const isCurrentUserAdmin = () => {
    if (roomDetails?.createdBy && roomDetails.createdBy === username) {
      return true;
    }
    const current = users.find((u) => u.socketId === socketRef.current?.id);
    return current?.isAdmin || false;
  };

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

  return (
    <div className="flex flex-col h-screen bg-white select-none">
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
          onToolChange={setActiveTool}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          onColorChange={setStrokeColor}
          onWidthChange={setStrokeWidth}
          onClearCanvas={clearCanvas}
          onExportCanvas={exportCanvas}
          onToggleSidebar={toggleChatSidebar}
          unreadMessages={unreadMessages}
        />

        <div className="flex-1 relative w-full h-full overflow-hidden bg-gray-50">
          <canvas ref={canvasRef} className="absolute inset-0" />
        </div>

        {isSidebarOpen && (
          <div className="w-72 border-l border-gray-200 p-4 flex flex-col bg-white">
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
