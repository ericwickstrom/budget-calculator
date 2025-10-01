import { useState } from 'react';

const Navbar = ({ onDashboardClick, onAuthClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-green-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Brand and Dashboard link */}
          <div className="flex items-center space-x-8">
            <div className="flex-shrink-0">
              <span className="text-2xl font-bold">🌵 CactusCash</span>
            </div>
            <div className="hidden md:flex space-x-4">
              <button
                onClick={onDashboardClick}
                className="hover:bg-green-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Dashboard
              </button>
            </div>
          </div>

          {/* Right side - Login and Signup */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={onAuthClick}
              className="hover:bg-green-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Login
            </button>
            <button
              onClick={onAuthClick}
              className="bg-white text-green-600 hover:bg-gray-100 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Sign Up
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md hover:bg-green-700 focus:outline-none"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <button
              onClick={() => {
                onDashboardClick();
                setIsMenuOpen(false);
              }}
              className="block w-full text-left hover:bg-green-700 px-3 py-2 rounded-md text-base font-medium"
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                onAuthClick();
                setIsMenuOpen(false);
              }}
              className="block w-full text-left hover:bg-green-700 px-3 py-2 rounded-md text-base font-medium"
            >
              Login
            </button>
            <button
              onClick={() => {
                onAuthClick();
                setIsMenuOpen(false);
              }}
              className="block w-full text-left bg-white text-green-600 hover:bg-gray-100 px-3 py-2 rounded-md text-base font-medium"
            >
              Sign Up
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
