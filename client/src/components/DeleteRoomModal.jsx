import { useState } from "react";
import { X, AlertTriangle, Trash } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function DeleteRoomModal({ roomId, roomName, onClose, socketRef }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleDelete = async () => {
    setIsDeleting(true);
    setError("");

    try {
      // Notify all users in the room that it's being deleted
      if (socketRef && socketRef.current) {
        socketRef.current.emit("room-deleted", { roomId });
      }

      const response = await axios.delete(`${API_BASE_URL}/room/${roomId}`);

      if (response.data.success) {
        // Navigate back to home page after successful deletion
        navigate("/", { state: { message: "Room deleted successfully" } });
      } else {
        setError("Failed to delete room. Please try again.");
        setIsDeleting(false);
      }
    } catch (error) {
      console.error("Error deleting room:", error);
      setError(
        error.response?.data?.message ||
          "Failed to delete room. Please try again."
      );
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div
        className="modal-content max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Delete Board
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-800 mb-3">
            Are you sure you want to delete <strong>"{roomName}"</strong>?
          </p>
          <p className="text-gray-600 mb-4 text-sm">
            This action cannot be undone. All drawings, chat history, and board
            data will be permanently deleted.
          </p>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md mb-4">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center gap-1"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash className="w-4 h-4" />
                Delete Board
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteRoomModal;
