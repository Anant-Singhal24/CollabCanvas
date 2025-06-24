import { useState, useEffect, useRef } from "react";
import { Send, Info } from "lucide-react";

function ChatSidebar({ onSendMessage, socketRef, messages = [] }) {
  const [message, setMessage] = useState("");
  const messageEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Auto-scroll to bottom when new messages come in
  useEffect(() => {
    if (chatContainerRef.current) {
      const { scrollHeight, clientHeight, scrollTop } =
        chatContainerRef.current;
      const isScrolledToBottom = scrollHeight - clientHeight <= scrollTop + 30;

      if (isScrolledToBottom) {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!message.trim()) return;

    if (!socketRef.current) {
      console.error("Socket connection not available");
      return;
    }

    // Send message to other users
    onSendMessage(message.trim());

    // Clear input
    setMessage("");

    // Force scroll to bottom after sending a message
    setTimeout(() => {
      messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";

    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return "";
    }
  };

  return (
    <div className="flex-1 flex flex-col border-t border-gray-200 mt-4 pt-4">
      <h3 className="font-medium mb-2">Chat</h3>

      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto mb-4 space-y-3 max-h-[350px] p-2"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No messages yet. Start the conversation!
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.isSystem
                  ? "items-center"
                  : msg.socketId === socketRef.current?.id
                  ? "items-end"
                  : "items-start"
              }`}
            >
              {msg.isSystem ? (
                <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                  <Info size={12} />
                  <span>{msg.message}</span>
                </div>
              ) : (
                <div
                  className={`rounded-lg px-3 py-2 max-w-[85%] break-words ${
                    msg.socketId === socketRef.current?.id
                      ? "bg-primary-100 text-primary-900"
                      : "bg-gray-100"
                  }`}
                >
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-medium text-xs">
                      {msg.socketId === socketRef.current?.id
                        ? "You"
                        : msg.username}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm">{msg.message}</p>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messageEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          type="submit"
          className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          disabled={!message.trim()}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

export default ChatSidebar;
