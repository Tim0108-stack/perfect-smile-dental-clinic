import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/layouts/Sidebar";
import { MobileTopBar } from "@/layouts/MobileTopBar";
import { FloatingAiButton } from "@/components/FloatingAiButton";

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#fafafa]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <MobileTopBar onOpenMenu={() => setSidebarOpen(true)} />

      <div className="relative w-full min-w-0 max-w-full lg:ml-[17rem] lg:w-[calc(100%-17rem)]">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </div>
      </div>

      <FloatingAiButton />
    </div>
  );
}
