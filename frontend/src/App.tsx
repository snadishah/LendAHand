import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { Spinner } from "./components/ui/EmptyState";

import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PostTaskPage } from "./pages/PostTaskPage";
import { TaskFeedPage } from "./pages/TaskFeedPage";
import { TaskDetailsPage } from "./pages/TaskDetailsPage";
import { MyBidsPage } from "./pages/MyBidsPage";
import { WalletPage } from "./pages/WalletPage";
import { ChatPage } from "./pages/ChatPage";
import { MapPage } from "./pages/MapPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/tasks/new" element={<PostTaskPage />} />
        <Route path="/tasks" element={<TaskFeedPage />} />
        <Route path="/tasks/:id" element={<TaskDetailsPage />} />
        <Route path="/bids" element={<MyBidsPage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
