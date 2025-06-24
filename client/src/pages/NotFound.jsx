import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">
      <header className="py-6 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/CollabCanvas-logo.svg"
              alt="CollabCanvas Logo"
              className="w-8 h-8"
            />
            <h1 className="text-xl md:text-2xl font-bold">CollabCanvas</h1>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-6xl font-bold mb-4">404</h2>
        <h3 className="text-2xl font-semibold mb-6">Page Not Found</h3>
        <p className="text-lg text-gray-600 mb-8 max-w-md">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Go Home
        </Link>
      </main>

      <footer className="py-6 text-center text-gray-600">
        <p>
          &copy; {new Date().getFullYear()} CollabCanvas. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

export default NotFound;
