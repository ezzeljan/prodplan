import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Home, FileSpreadsheet, ChevronLeft, ChevronRight, History, BarChart3, FolderOpen, LogOut, Sun, Moon } from "lucide-react";
import { useAISpreadsheet } from "../../contexts/AISpreadsheetContext";
import { useAuth } from "../../contexts/AuthContext";
import logo from "../../assets/lifewood-logo.png";
import icon from "../../assets/icon.png";

const navWithIcons = [
  { label: "Projects", href: "/projects", icon: <FolderOpen className="w-5 h-5" /> },
  { label: "Dashboard", href: "/dashboard", icon: <BarChart3 className="w-5 h-5" /> },
  { label: "Production Plan", href: "/production-plan", icon: <FileSpreadsheet className="w-5 h-5" /> },
];

const Navbar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem("theme") === "dark");
  const { hasNewData } = useAISpreadsheet();
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const event = new CustomEvent("sidebar-expanded-change", {
      detail: isExpanded,
    });
    window.dispatchEvent(event);
  }, [isExpanded]);

  useEffect(() => {
    if (localStorage.getItem("theme") === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    if (newIsDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <nav
        className={`hidden md:flex flex-col fixed left-0 top-0 h-full bg-[#133020]/90 backdrop-blur-xl shadow-sm z-50 overflow-x-hidden transition-all duration-300 ease-in-out ${isExpanded ? "w-64" : "w-16"}`}
      >
        <div className={`flex items-center h-20 border-b border-white/10 ${isExpanded ? "justify-start px-6 gap-3 bg-white/5" : "justify-center w-full"}`}>
          {!isExpanded && (
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="relative inline-flex items-center justify-center w-10 h-10 shrink-0 group transition-transform hover:scale-105"
              aria-label="Expand sidebar"
            >
              <img
                src={icon}
                alt="Toggle Sidebar"
                className="w-10 h-10 object-contain transition-opacity duration-150 group-hover:opacity-0"
              />
              <ChevronRight
                className="absolute w-5 h-5 text-white opacity-0 translate-x-0.5 group-hover:opacity-100 transition-opacity duration-150"
              />
            </button>
          )}
          <Link
            to="/dashboard"
            className={`overflow-hidden transition-all duration-300 flex items-center h-12 cursor-pointer ${isExpanded ? "w-auto opacity-100" : "w-0 opacity-0 hidden"}`}
            onClick={(e) => {
              if (location.pathname === "/") {
                e.preventDefault();
              }
            }}
          >
            <div className="px-3 py-2 rounded-2xl bg-[#F9F7F7] shadow-lg shadow-black/20">
              <img
                src={logo}
                alt="Lifewood Navigation"
                className="h-8 w-auto object-contain min-w-[100px] hover:opacity-80 transition-opacity"
              />
            </div>
          </Link>
          {isExpanded && (
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="ml-auto p-2 rounded-full hover:bg-white/10 text-white transition-colors"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        <div
          className={`flex-1 py-6 flex flex-col gap-2 overflow-y-auto ${isExpanded ? "px-3" : "px-0"
            }`}
        >
          {navWithIcons.map((item) => {
            const isActive = item.href === '/projects'
              ? location.pathname === '/projects' || location.pathname.startsWith('/projects/')
              : location.pathname === item.href;
            return (
              <Link
                key={item.label}
                to={item.href}
                className={`flex items-center rounded-full transition-colors ${isExpanded
                  ? "justify-start gap-4 px-3 py-3"
                  : "justify-center w-12 h-12 mx-auto"
                  } ${isActive
                    ? "bg-[#046241] text-white font-semibold"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                title={!isExpanded ? item.label : undefined}
              >
                <div className="flex-shrink-0 relative">
                  {item.icon}
                  {item.label === 'Projects' && hasNewData && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[var(--accent-secondary)] rounded-full animate-pulse" />
                  )}
                </div>
                <span className={`whitespace-nowrap transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0 hidden"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div
          className={`border-t border-white/10 mt-auto flex flex-col gap-2 ${isExpanded ? "p-3" : "px-0 py-3"
            }`}
        >
          <button
            onClick={() => {
              if (location.pathname !== "/") {
                navigate("/");
                setTimeout(
                  () =>
                    window.dispatchEvent(
                      new CustomEvent("toggle-chat-history"),
                    ),
                  150,
                );
              } else {
                window.dispatchEvent(
                  new CustomEvent("toggle-chat-history"),
                );
              }
            }}
            className={`flex items-center rounded-full transition-colors text-white/70 hover:bg-white/10 hover:text-white ${isExpanded
              ? "justify-start gap-4 px-3 py-3 w-full"
              : "justify-center w-12 h-12 mx-auto"
              }`}
            title={!isExpanded ? "Chat History" : undefined}
          >
            <div className="flex-shrink-0"><History className="w-5 h-5" /></div>
            <span className={`whitespace-nowrap transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0 hidden"}`}>
              Chat History
            </span>
          </button>

          <button
            onClick={toggleTheme}
            className={`flex items-center rounded-full transition-colors text-white/70 hover:bg-white/10 hover:text-white ${isExpanded
              ? "justify-start gap-4 px-3 py-3 w-full"
              : "justify-center w-12 h-12 mx-auto"
              }`}
            title={!isExpanded ? (isDark ? "Light Mode" : "Dark Mode") : undefined}
          >
            <div className="flex-shrink-0">
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </div>
            <span className={`whitespace-nowrap transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0 hidden"}`}>
              {isDark ? "Light Mode" : "Dark Mode"}
            </span>
          </button>

          <button
            onClick={() => setShowLogoutConfirm(true)}
            className={`flex items-center rounded-full transition-colors text-[var(--metric-red)]/80 hover:bg-[var(--metric-red)]/10 hover:text-[var(--metric-red)] ${isExpanded
              ? "justify-start gap-4 px-3 py-3 w-full"
              : "justify-center w-12 h-12 mx-auto"
              }`}
            title={!isExpanded ? "Sign Out" : undefined}
          >
            <div className="flex-shrink-0"><LogOut className="w-5 h-5" /></div>
            <span className={`whitespace-nowrap transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0 hidden"}`}>
              Sign Out
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile Topbar & Hamburger */}
      <nav className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#133020]/90 backdrop-blur-xl border-b border-white/10 z-50 flex items-center justify-between px-4">
        <Link to="/dashboard" className="flex items-center shrink-0">
          <img
            src={logo}
            alt="Lifewood"
            className="h-8 w-auto object-contain brightness-0 invert"
          />
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors text-white"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div
            className="absolute inset-0 bg-[#133020]/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-[280px] bg-[#133020] shadow-2xl flex flex-col border-l border-white/10 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <img
                src={logo}
                alt="Lifewood"
                className="h-8 w-auto object-contain brightness-0 invert"
              />
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors text-white"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-2 p-4">
              {navWithIcons.map((item) => {
                const isActive = item.href === '/projects'
                  ? location.pathname === '/projects' || location.pathname.startsWith('/projects/')
                  : location.pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium transition-colors ${isActive
                      ? "bg-[#046241] text-white font-semibold"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </div>
            
            <div className="mt-auto border-t border-white/10 p-4">
              <button
                onClick={() => {
                  setMobileOpen(false);
                  setShowLogoutConfirm(true);
                }}
                className="flex items-center gap-3 px-4 py-3 w-full rounded-full text-sm font-medium transition-colors text-[var(--metric-red)]/80 hover:bg-[var(--metric-red)]/10 hover:text-[var(--metric-red)]"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-[#0d1f17]/60 backdrop-blur-sm transition-opacity"
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl transition-all duration-300 scale-100 opacity-100 border border-zinc-100">
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Sign Out</h3>
            <p className="text-sm text-zinc-500 mb-7">Are you sure you want to sign out of the Admin portal?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
