import {
  Pencil,
  Square,
  Circle,
  Type,
  MousePointer,
  Eraser,
  Trash2,
  MessageSquare,
} from "lucide-react";

function Toolbar({
  activeTool,
  onToolChange,
  strokeColor,
  onColorChange,
  strokeWidth,
  onWidthChange,
  onClearCanvas,
  onExportCanvas,
  onToggleSidebar,
  unreadMessages = 0,
}) {
  const tools = [
    { id: "pen", icon: <Pencil size={18} />, label: "Pen Tool" },
    { id: "rect", icon: <Square size={18} />, label: "Rectangle Tool" },
    { id: "circle", icon: <Circle size={18} />, label: "Circle Tool" },
    { id: "text", icon: <Type size={18} />, label: "Text Tool" },
    { id: "select", icon: <MousePointer size={18} />, label: "Select Tool" },
    { id: "eraser", icon: <Eraser size={18} />, label: "Eraser Tool" },
  ];

  const colors = [
    "#000000", // Black
    "#ffffff", // White
    "#ff0000", // Red
    "#00ff00", // Green
    "#0000ff", // Blue
    "#ffff00", // Yellow
    "#ff00ff", // Magenta
    "#00ffff", // Cyan
  ];

  return (
    <div className="w-16 p-2 flex flex-col items-center gap-4 border-r border-gray-200 bg-white">
      {/* Drawing Tools */}
      <div className="flex flex-col items-center gap-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={`tool-btn ${activeTool === tool.id ? "active" : ""}`}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      {/* Color Picker */}
      <div className="w-full border-t border-gray-200 pt-2">
        <div className="grid grid-cols-2 gap-1">
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => onColorChange(color)}
              className={`w-6 h-6 rounded-full border ${
                strokeColor === color
                  ? "border-primary-500 scale-110"
                  : "border-gray-300"
              }`}
              style={{ backgroundColor: color }}
              title={`Color: ${color}`}
              aria-label={`Color: ${color}`}
            />
          ))}
        </div>
      </div>

      {/* Stroke Width */}
      <div className="w-full border-t border-gray-200 pt-2">
        <input
          type="range"
          min="1"
          max="20"
          value={strokeWidth}
          onChange={(e) => onWidthChange(parseInt(e.target.value))}
          className="slider"
          title={`Stroke Width: ${strokeWidth}px`}
        />
        <div className="text-center text-xs mt-1">{strokeWidth}px</div>
      </div>

      {/* Other Tools */}
      <div className="flex-1 flex flex-col items-center justify-end gap-2 w-full border-t border-gray-200 pt-2">
        <button
          onClick={onClearCanvas}
          className="tool-btn"
          title="Clear Canvas"
        >
          <Trash2 size={18} />
        </button>

        <button
          onClick={onToggleSidebar}
          className="tool-btn relative"
          title="Toggle Chat"
        >
          <MessageSquare size={18} />
          {unreadMessages > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadMessages > 9 ? "9+" : unreadMessages}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

export default Toolbar;
