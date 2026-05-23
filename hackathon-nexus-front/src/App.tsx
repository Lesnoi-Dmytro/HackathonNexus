import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NotificationsProvider } from "./contexts/NotificationsContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ChatPage } from "./pages/ChatPage";
import { CreateHackathonPage } from "./pages/CreateHackathonPage";
import { HackathonDetailPage } from "./pages/HackathonDetailPage";
import { HackathonsPage } from "./pages/HackathonsPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { TeamManagementPage } from "./pages/TeamManagementPage";
import { TeamSearchPage } from "./pages/TeamSearchPage";
import { UserProfilePage } from "./pages/UserProfilePage";

function AppRoutes() {
  const { token } = useAuth();
  return (
    <NotificationsProvider token={token}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<AppLayout />}>
            <Route path="/hackathons" element={<HackathonsPage />} />
            <Route path="/hackathons/:id" element={<HackathonDetailPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/hackathons/new" element={<CreateHackathonPage />} />
              <Route path="/hackathons/:id/team" element={<TeamManagementPage />} />
              <Route path="/hackathons/:id/team/search" element={<TeamSearchPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/users/:id" element={<UserProfilePage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/hackathons" replace />} />
        </Routes>
      </BrowserRouter>
    </NotificationsProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
