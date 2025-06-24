import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Share2,
  Download,
  Users,
  ChevronDown,
  MessageSquare,
  Trash2,
  MoreVertical,
} from "lucide-react";

function RoomHeader({
  roomName,
  onShareClick,
  onExportClick,
  onDeleteClick,
  userCount,
  onToggleSidebar,
  unreadMessages = 0,
  isAdmin = false,
}) {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  return (
    <header className="px-4 py-2 border-b border-gray-200 flex justify-between items-center bg-white shadow-sm">
      <div className="flex items-center">
        <Link to="/" className="flex items-center mr-6">
          <img
            src="/CollabCanvas-logo.svg"
            alt="CollabCanvas Logo"
            className="w-6 h-6 mr-2"
          />
          <span className="font-bold text-gray-900 hidden sm:inline">
            CollabCanvas
          </span>
        </Link>

        <div className="flex flex-col">
          <h1 className="text-lg font-semibold truncate max-w-[200px] md:max-w-xs">
            {roomName || "Untitled Board"}
          </h1>
          <div className="flex items-center text-xs text-gray-500">
            <Users className="w-3 h-3 mr-1" />
            <span>
              {userCount} {userCount === 1 ? "user" : "users"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm bg-white border border-gray-200 hover:bg-gray-100 relative"
          title="Toggle chat"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="hidden sm:inline">Chat</span>
          {unreadMessages > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadMessages > 9 ? "9+" : unreadMessages}
            </span>
          )}
        </button>

        <button
          onClick={onShareClick}
          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm bg-white border border-gray-200 hover:bg-gray-100"
          title="Share board"
        >
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Share</span>
        </button>

        <div className="relative">
          <button
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm bg-white border border-gray-200 hover:bg-gray-100"
            title="Export board"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {isExportMenuOpen && (
            <div
              className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-50"
              onMouseLeave={() => setIsExportMenuOpen(false)}
            >
              <button
                onClick={() => {
                  onExportClick("png");
                  setIsExportMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                Export as PNG
              </button>
            </div>
          )}
        </div>

        {/* More Options Menu with Delete - Only show for admins */}
        {isAdmin && (
          <div className="relative">
            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-md text-sm bg-white border border-gray-200 hover:bg-gray-100"
              title="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMoreMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-50"
                onMouseLeave={() => setIsMoreMenuOpen(false)}
              >
                <button
                  onClick={() => {
                    onDeleteClick();
                    setIsMoreMenuOpen(false);
                  }}
                  className=" w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Board
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export default RoomHeader;
