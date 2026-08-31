import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/layouts/AppShell";
import { DashboardPage } from "@/pages/DashboardPage";
import { AppointmentsPage } from "@/pages/AppointmentsPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { FollowUpsPage } from "@/pages/FollowUpsPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { NewAppointmentPage } from "@/pages/NewAppointmentPage";
import { ToastProvider } from "@/hooks/useToast";
import { RequireAuth } from "@/auth/RequireAuth";
import { LoginPage } from "@/pages/LoginPage";

export function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/follow-ups" element={<FollowUpsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/appointments/new" element={<NewAppointmentPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>
      </Routes>
    </ToastProvider>
  );
}
