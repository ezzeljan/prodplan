import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import { Menu, X, Home, FolderOpen, ChevronLeft, ChevronRight, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AISpreadsheetProvider } from '../contexts/AISpreadsheetContext';
import TeamLeadDashboard from './TeamLeadDashboard';
import TeamLeadProjectsPage from './TeamLeadProjectsPage';
import ProjectDetailsPage from './ProjectDetailsPage';
import SpreadsheetPage from './SpreadsheetPage';
import ProductionPlanMaker from './ProductionPlanMaker';
import logo from '../assets/lifewood-logo.png';
import icon from '../assets/icon.png';

const navWithIcons = [
  { label: "Dashboard", href: "/teamlead-dashboard", icon: <Home className="w-5 h-5" /> },
  { label: "Projects", href: "/teamlead-dashboard/projects", icon: <FolderOpen className="w-5 h-5" /> },
];

export default function TeamLeadLayout() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem("theme") === "dark");
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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

  const handleLogout = () => {
    logout();
    navigate('/teamlead');
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
            to="/teamlead-dashboard"
            className={`overflow-hidden transition-all duration-300 flex items-center h-12 cursor-pointer ${isExpanded ? "w-auto opacity-100" : "w-0 opacity-0 hidden"}`}
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
          className={`flex-1 py-6 flex flex-col gap-2 overflow-y-auto ${isExpanded ? "px-3" : "px-0"}`}
        >
          {navWithIcons.map((item) => {
            const isActive = item.href === "/teamlead-dashboard/projects"
              ? location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
              : location.pathname === item.href;
            return (
              <Link
                key={item.label}
                to={item.href}
                className={`flex items-center rounded-full transition-colors ${
                  isExpanded
                    ? "justify-start gap-4 px-3 py-3"
                    : "justify-center w-12 h-12 mx-auto"
                } ${
                  isActive
                    ? "bg-[#046241] text-white font-semibold"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
                title={!isExpanded ? item.label : undefined}
              >
                <div className="flex-shrink-0">{item.icon}</div>
                <span className={`whitespace-nowrap transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0 hidden"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div
          className={`border-t border-white/10 mt-auto flex flex-col gap-2 ${isExpanded ? "p-3" : "px-0 py-3"}`}
        >
          <button
            onClick={toggleTheme}
            className={`flex items-center rounded-full transition-colors text-white/70 hover:bg-white/10 hover:text-white ${
              isExpanded
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
            onClick={handleLogout}
            className={`flex items-center rounded-full transition-colors text-[var(--metric-red)]/80 hover:bg-[var(--metric-red)]/10 hover:text-[var(--metric-red)] ${
              isExpanded
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
        <Link to="/teamlead-dashboard" className="flex items-center shrink-0">
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
                const isActive = item.href === "/teamlead-dashboard/projects"
                  ? location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
                  : location.pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                      isActive
                        ? "bg-[#046241] text-white font-semibold"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <hr className="border-white/10 my-2" />
              <button
                onClick={() => { setMobileOpen(false); toggleTheme(); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
              </button>
              <button
                onClick={() => { setMobileOpen(false); handleLogout(); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--metric-red)]/80 hover:bg-[var(--metric-red)]/10 hover:text-[var(--metric-red)] transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main
        className="h-screen flex-1 pt-16 md:pt-0 transition-all duration-300 overflow-hidden"
        style={{
          marginLeft: isExpanded ? 256 : 64,
          width: isExpanded ? `calc(100% - 256px)` : `calc(100% - 64px)`,
        }}
      >
        <Routes>
          <Route index element={
            <AISpreadsheetProvider>
              <TeamLeadDashboard />
            </AISpreadsheetProvider>
          } />
          <Route path="projects" element={
            <AISpreadsheetProvider>
              <TeamLeadProjectsPage />
            </AISpreadsheetProvider>
          } />
          <Route path="projects/:id" element={
            <AISpreadsheetProvider>
              <ProjectDetailsPage />
            </AISpreadsheetProvider>
          } />
          <Route path="projects/:id/spreadsheet" element={
            <AISpreadsheetProvider>
              <SpreadsheetPage />
            </AISpreadsheetProvider>
          } />
          {/* Production Plan Maker — accessed via Talk to AI Agent button */}
          <Route path="plan" element={
            <AISpreadsheetProvider>
              <ProductionPlanMaker />
            </AISpreadsheetProvider>
          } />
        </Routes>
      </main>
    </>
  );
}