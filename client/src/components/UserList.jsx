import { User, Crown } from "lucide-react";

function UserList({ users, currentUserId }) {
  return (
    <div className="mb-4">
      <h3 className="font-medium mb-2 flex items-center gap-1">
        <User className="w-4 h-4" />
        <span>Users ({users.length})</span>
      </h3>

      <ul className="space-y-1 max-h-40 overflow-y-auto pr-2">
        {users.map((user) => (
          <li
            key={user.socketId}
            className={`flex items-center gap-2 px-2 py-1 rounded-md text-sm ${
              user.socketId === currentUserId ? "bg-gray-100" : ""
            }`}
          >
            <div className="flex-shrink-0 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-xs text-primary-800">
              {user.username[0].toUpperCase()}
            </div>
            <span className="flex-1 truncate">
              {user.socketId === currentUserId
                ? `${user.username} (You)`
                : user.username}
            </span>
            {user.isAdmin && <Crown className="w-3 h-3 text-yellow-500" />}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default UserList;
