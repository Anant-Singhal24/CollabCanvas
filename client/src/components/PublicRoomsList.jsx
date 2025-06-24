import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Users, Calendar, ArrowRight } from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function PublicRoomsList() {
  const [publicRooms, setPublicRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPublicRooms = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`${API_BASE_URL}/public-rooms`);
        setPublicRooms(response.data.rooms || []);
      } catch (error) {
        console.error("Error fetching public rooms:", error);
        setError("Failed to load public rooms");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPublicRooms();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleJoinRoom = (roomId) => {
    navigate(`/room/${roomId}`);
  };

  if (isLoading) {
    return (
      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">Public Boards</h3>
        <div className="flex justify-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">Public Boards</h3>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (publicRooms.length === 0) {
    return (
      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">Public Boards</h3>
        <p className="text-gray-500">No public boards available. Create one!</p>
      </div>
    );
  }

  return (
    <div className="mt-8 p-6 bg-gray-50 rounded-lg">
      <h3 className="text-xl font-semibold mb-4">Public Boards</h3>
      <div className="grid gap-4">
        {publicRooms.map((room) => (
          <div
            key={room.id}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-lg font-medium">{room.name}</h4>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Users size={14} />
                    <span>{room.userCount} users</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    <span>Created {formatDate(room.createdAt)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleJoinRoom(room.id)}
                className="bg-primary-100 text-primary-800 px-3 py-1.5 rounded-md flex items-center gap-1 hover:bg-primary-200 transition-colors"
              >
                Join <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PublicRoomsList;
