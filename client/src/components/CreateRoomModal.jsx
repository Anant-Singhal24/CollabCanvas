import { useState } from "react";
import { X } from "lucide-react";

function CreateRoomModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [accessLevel, setAccessLevel] = useState("public");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Room name is required");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await onCreate({ name, accessLevel });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create room");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Create New Board</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="roomName"
              className="block mb-2 text-sm font-medium"
            >
              Board Name
            </label>
            <input
              id="roomName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a name for your board"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="block mb-2 text-sm font-medium">
              Access Level
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="accessLevel"
                  value="public"
                  checked={accessLevel === "public"}
                  onChange={() => setAccessLevel("public")}
                  className="mr-2"
                />
                Public
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="accessLevel"
                  value="private"
                  checked={accessLevel === "private"}
                  onChange={() => setAccessLevel("private")}
                  className="mr-2"
                />
                Private
              </label>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {accessLevel === "public"
                ? "Anyone with the link can view and edit"
                : "Only invited users can join"}
            </p>
          </div>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isLoading}
            >
              {isLoading ? "Creating..." : "Create Board"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateRoomModal;
