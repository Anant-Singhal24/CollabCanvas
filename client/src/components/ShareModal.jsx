import { useState } from "react";
import { X, Copy, Check, Lock, Globe } from "lucide-react";
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function ShareModal({ roomId, onClose, accessLevel }) {
  const [copied, setCopied] = useState(false);
  // const [isViewOnlyLink, setIsViewOnlyLink] = useState(false);
  const [currentAccessLevel, setCurrentAccessLevel] = useState(accessLevel);
  const [isUpdating, setIsUpdating] = useState(false);

  const roomUrl = `${window.location.origin}/room/${roomId}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(roomUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const toggleAccessLevel = async () => {
    const newAccessLevel =
      currentAccessLevel === "public" ? "private" : "public";
    setIsUpdating(true);

    try {
      const response = await axios.patch(`${API_BASE_URL}/room/${roomId}`, {
        accessLevel: newAccessLevel,
      });

      if (response.data.success) {
        setCurrentAccessLevel(newAccessLevel);
      }
    } catch (error) {
      console.error("Error updating access level:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Share Board</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Access Level Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentAccessLevel === "private" ? (
                <Lock className="w-5 h-5 text-orange-500" />
              ) : (
                <Globe className="w-5 h-5 text-green-500" />
              )}
              <span className="font-medium">
                {currentAccessLevel === "private"
                  ? "Private Board"
                  : "Public Board"}
              </span>
            </div>
            <button
              onClick={toggleAccessLevel}
              disabled={isUpdating}
              className="text-sm px-3 py-1 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {isUpdating
                ? "Updating..."
                : `Make ${
                    currentAccessLevel === "public" ? "Private" : "Public"
                  }`}
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {currentAccessLevel === "private"
              ? "Only people with the link can access this board. It won't be listed publicly."
              : "This board is visible to anyone and will be listed on the public boards list."}
          </p>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Share this link to invite others to your whiteboard:
          </p>

          <div className="flex items-center">
            <input
              type="text"
              value={roomUrl}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-gray-900 focus:outline-none"
            />
            <button
              onClick={copyToClipboard}
              className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-200 focus:outline-none"
              title={copied ? "Copied!" : "Copy to clipboard"}
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default ShareModal;
