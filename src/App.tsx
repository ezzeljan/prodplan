import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import ProductionPlanMaker from "./components/ProductionPlanMaker";
import ProductionPlanStorage from "./components/ProductionPlanStorage";
import AdminDashboard from "./components/AdminDashboard";
import ProjectsPage from "./components/ProjectsPage";
import SpreadsheetPage from "./components/SpreadsheetPage";
import PortalLayout from "./components/portal/PortalLayout";
import OperatorProjectsList from "./components/portal/OperatorProjectsList";
import OperatorProjectView from "./components/portal/OperatorProjectView";
import AdminLogin from "./components/auth/AdminLogin";
import TeamLeadLogin from "./components/auth/TeamLeadLogin";
import TeamLeadLayout from "./components/TeamLeadLayout";
import KeyboardShortcuts from "./components/KeyboardShortcuts";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ProjectProvider } from "./contexts/ProjectContext";
import { UserProvider } from "./contexts/UserContext";
import { AISpreadsheetProvider } from "./contexts/AISpreadsheetContext";
import DebugPage from "./components/DebugPage";
import { Role } from "./types/auth";

function getOperatorSession() {
  if (typeof window === "undefined") return null;

  const stored = sessionStorage.getItem("operator-session");
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function getHomeRoute(role?: Role | null) {
  switch (role) {
    case Role.ADMIN:
      return "/dashboard";
    case Role.TEAM_LEAD:
      return "/teamlead-dashboard";
    case Role.OPERATOR:
      return "/portal";
    default:
      return "/portal";
  }
}

function RoleLoginRedirect({ children }: { children: JSX.Element }) {
  const { authSession } = useAuth();
  const operatorSession = getOperatorSession();

  if (operatorSession) {
    return <Navigate to="/portal" replace />;
  }

  if (authSession) {
    return <Navigate to={getHomeRoute(authSession.role)} replace />;
  }

  return children;
}

function RequireAppRole({
  role,
  children,
}: {
  role: Role;
  children: JSX.Element;
}) {
  const { authSession } = useAuth();
  const operatorSession = getOperatorSession();

  if (operatorSession) {
    return <Navigate to="/portal" replace />;
  }

  if (!authSession) {
    return <Navigate to={role === Role.TEAM_LEAD ? "/teamlead" : "/admin"} replace />;
  }

  if (authSession.role !== role) {
    return <Navigate to={getHomeRoute(authSession.role)} replace />;
  }

  return children;
}

function MainLayout() {
  const { authSession, isSignedIn } = useAuth();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true,
  );

  useEffect(() => {
    const onChange = (event: Event) => {
      const custom = event as CustomEvent<boolean>;
      setSidebarExpanded(!!custom?.detail);
    };
    window.addEventListener("sidebar-expanded-change", onChange);
    return () => window.removeEventListener("sidebar-expanded-change", onChange);
  }, []);

  useEffect(() => {
    const onResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const sidebarOffset = useMemo(() => (sidebarExpanded ? 256 : 64), [
    sidebarExpanded,
  ]);

  if (!isSignedIn) {
    return <Navigate to="/portal" replace />;
  }

  if (authSession?.role !== Role.ADMIN) {
    return <Navigate to={getHomeRoute(authSession?.role)} replace />;
  }

  return (
    <div className="bg-[var(--surface-primary)] font-['Manrope',sans-serif] h-screen flex">
      <Navbar />
      <main
        className="flex-1 transition-all duration-300 pt-16 md:pt-0"
        style={{
          marginLeft: isDesktop ? sidebarOffset : 0,
          width: isDesktop ? `calc(100% - ${sidebarOffset}px)` : "100%",
        }}
      >
        <Routes>
          <Route path="/" element={<ProductionPlanMaker />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<SpreadsheetPage />} />
          <Route path="/dashboard" element={<AdminDashboard />} />
          <Route path="/production-plan" element={<ProductionPlanStorage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UserProvider>
          <ProjectProvider>
            <AISpreadsheetProvider>
              <KeyboardShortcuts />
              <Routes>
                {/* Operator portal */}
                <Route path="/portal" element={<PortalLayout />}>
                  <Route index element={<OperatorProjectsList />} />
                  <Route path="project/:id" element={<OperatorProjectView />} />
                </Route>

                <Route path="/debug" element={<DebugPage />} />

                <Route
                  path="/admin"
                  element={
                    <RoleLoginRedirect>
                      <AdminLogin />
                    </RoleLoginRedirect>
                  }
                />
                <Route
                  path="/teamlead"
                  element={
                    <RoleLoginRedirect>
                      <TeamLeadLogin />
                    </RoleLoginRedirect>
                  }
                />
                <Route
                  path="/teamlead-dashboard/*"
                  element={
                    <RequireAppRole role={Role.TEAM_LEAD}>
                      <TeamLeadLayout />
                    </RequireAppRole>
                  }
                />

                {/* Main app */}
                <Route
                  path="/*"
                  element={
                    <RequireAppRole role={Role.ADMIN}>
                      <MainLayout />
                    </RequireAppRole>
                  }
                />
              </Routes>
            </AISpreadsheetProvider>
          </ProjectProvider>
        </UserProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
