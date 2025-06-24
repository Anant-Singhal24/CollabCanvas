import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { X } from "lucide-react";
import CreateRoomModal from "../components/CreateRoomModal";
import PublicRoomsList from "../components/PublicRoomsList";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Check for success message in location state (e.g., after deleting a room)
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);

      // Clear the message from location state to prevent it from showing again on refresh
      window.history.replaceState({}, document.title);

      // Auto-dismiss the success message after 5 seconds
      const timer = setTimeout(() => {
        setSuccessMessage("");
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [location.state]);

  const handleCreateRoom = async (roomData) => {
    try {
      setError("");
      const response = await axios.post(
        `${API_BASE_URL}/create-room`,
        roomData
      );
      navigate(`/room/${response.data.roomId}`);
    } catch (error) {
      console.error("Error creating room:", error);
      setError("Failed to create room. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="py-6 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="/CollabCanvas-logo.svg"
            alt="CollabCanvas Logo"
            className="w-8 h-8"
          />
          <h1 className="text-xl md:text-2xl font-bold">CollabCanvas</h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-6">
        {/* Success Message */}
        {successMessage && (
          <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg shadow-md flex items-center justify-between max-w-md">
            <span>{successMessage}</span>
            <button
              onClick={() => setSuccessMessage("")}
              className="ml-4 text-green-600 hover:text-green-800"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="text-center mb-12 max-w-4xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Collaborate in real-time on a virtual whiteboard
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Draw, design, and brainstorm together with your team from anywhere
            in the world.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Create a Board
          </button>
        </div>

        {error && <p className="mt-4 text-red-500">{error}</p>}

        {/* Public Rooms List */}
        <div className="w-full max-w-4xl">
          <PublicRoomsList />
        </div>
      </main>

      <footer className="py-6 text-center text-gray-600">
        <p>
          &copy; {new Date().getFullYear()} CollabCanvas. All rights reserved.
        </p>
      </footer>

      {isCreateModalOpen && (
        <CreateRoomModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateRoom}
        />
      )}
    </div>
  );
}

export default Home;
