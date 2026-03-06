import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import ProductionPlanMaker from "./components/ProductionPlanMaker";
import ProductionPlanStorage from "./components/ProductionPlanStorage";
import { AuthProvider } from "./contexts/AuthContext";

export default function App() {
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

  const sidebarOffset = useMemo(() => (sidebarExpanded ? 256 : 80), [
    sidebarExpanded,
  ]);

  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="bg-white font-manrope h-screen flex">
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
              <Route path="/production-plan" element={<ProductionPlanStorage />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
