import { useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, LogOut, Car, Search, BarChart3, Shield } from "lucide-react";

const Header: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, user, logout } = useAuth();
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isActive = (path: string) => location.pathname === path;

    /**
     * Close dropdown when clicking outside
     */
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }

        if (showDropdown) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showDropdown]);

    /**
     * Handle logout
     */
    const handleLogout = () => {
        logout();
        setShowDropdown(false);
        navigate("/");
    };

    /**
     * Get user initials for avatar
     */
    const getUserInitials = () => {
        if (!user?.full_name) return "U";
        const names = user.full_name.split(" ");
        if (names.length >= 2) {
            return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        return user.full_name.substring(0, 2).toUpperCase();
    };

    return (
        <header className="w-full border-b" style={{ backgroundColor: 'var(--color-background-warm)', borderBottomColor: 'var(--color-secondary)' }}>
            <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
                {/* Logo - clickable to go to landing page */}
                <div
                    onClick={() => navigate("/")}
                    className="cursor-pointer flex items-center h-12 overflow-hidden transition-opacity hover:opacity-80"
                >
                    <img
                        src="/FareShare_Logo.png"
                        alt="FareShare Logo"
                        className="h-18"
                    />
                </div>

                {/* Navigation buttons */}
                <div className="flex gap-3 items-center">
                    <motion.button
                        className="px-5 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
                        style={{ 
                            color: isActive('/rides') ? 'var(--color-primary)' : '#4a5568',
                            backgroundColor: isActive('/rides') ? 'rgba(var(--color-primary-rgb), 0.15)' : 'transparent',
                            borderBottom: isActive('/rides') ? '2px solid var(--color-primary)' : '2px solid transparent'
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate("/rides")}
                    >
                        <Car size={18} />
                        Ride Post & Request
                    </motion.button>
                    <motion.button
                        className="px-5 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
                        style={{ 
                            color: isActive('/ridesearch') ? 'var(--color-primary)' : '#4a5568',
                            backgroundColor: isActive('/ridesearch') ? 'rgba(var(--color-primary-rgb), 0.15)' : 'transparent',
                            borderBottom: isActive('/ridesearch') ? '2px solid var(--color-primary)' : '2px solid transparent'
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate("/ridesearch")}
                    >
                        <Search size={18} />
                        Ride Search
                    </motion.button>

                    {/* Conditional rendering: Show avatar if logged in, otherwise show login button */}
                    {isAuthenticated ? (
                        <div className="relative" ref={dropdownRef}>
                            {/* Avatar button */}
                            <motion.button
                                onClick={() => setShowDropdown(!showDropdown)}
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold transition-all duration-200 hover:shadow-lg"
                                style={{ backgroundColor: 'var(--color-primary)' }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                aria-label="User menu"
                            >
                                {getUserInitials()}
                            </motion.button>

                            {/* Dropdown menu */}
                            <AnimatePresence>
                                {showDropdown && (
                                    <motion.div 
                                        className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50"
                                        style={{ border: '1px solid var(--color-secondary)' }}
                                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {/* User info */}
                                        <div className="px-4 py-2 border-b" style={{ borderBottomColor: 'var(--color-secondary)' }}>
                                            <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-primary)' }}>
                                                {user?.full_name || 'User'}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {user?.email}
                                            </p>
                                        </div>

                                        {/* Menu items */}
                                        <motion.button
                                            onClick={() => {
                                                setShowDropdown(false);
                                                navigate("/dashboard");
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2"
                                            style={{ color: '#4a5568' }}
                                            whileHover={{ 
                                                backgroundColor: 'rgba(var(--color-primary-rgb), 0.1)',
                                                color: 'var(--color-primary)'
                                            }}
                                        >
                                            <BarChart3 size={16} />
                                            Dashboard
                                        </motion.button>

                                        <motion.button
                                            onClick={() => user?.role === "admin" && (() => {
                                                setShowDropdown(false);
                                                navigate("/admin");
                                            })()}
                                            className="w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2"
                                            style={{ color: '#4a5568' }}
                                            whileHover={{ 
                                                backgroundColor: 'rgba(var(--color-primary-rgb), 0.1)',
                                                color: 'var(--color-primary)'
                                            }}
                                        >
                                            <Shield size={16} />
                                            Admin Dashboard
                                        </motion.button>

                                        <motion.button
                                            onClick={() => {
                                                setShowDropdown(false);
                                                navigate("/settings");
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2"
                                            style={{ color: '#4a5568' }}
                                            whileHover={{ 
                                                backgroundColor: 'rgba(var(--color-primary-rgb), 0.1)',
                                                color: 'var(--color-primary)'
                                            }}
                                        >
                                            <Settings size={16} />
                                            Settings
                                        </motion.button>

                                        <motion.button
                                            onClick={handleLogout}
                                            className="w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2"
                                            style={{ color: '#4a5568' }}
                                            whileHover={{ 
                                                backgroundColor: 'rgba(var(--color-primary-rgb), 0.1)',
                                                color: 'var(--color-primary)'
                                            }}
                                        >
                                            <LogOut size={16} />
                                            Logout
                                        </motion.button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <motion.button
                            className="px-6 py-2.5 rounded-lg text-white font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                            style={{ backgroundColor: 'var(--color-primary)' }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate("/signin")}
                        >
                            Login / Sign Up
                        </motion.button>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
