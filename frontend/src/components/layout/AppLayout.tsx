import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { VerifyEmailBanner } from "./VerifyEmailBanner";

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <VerifyEmailBanner />
      <div className="flex-1 flex flex-col sm:flex-row">
        <Sidebar />
        <main className="flex-1 min-w-0 p-4 pb-24 sm:p-6 sm:pb-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
