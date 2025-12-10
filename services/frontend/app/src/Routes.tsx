import { createTheme, ThemeProvider } from "@mui/material";
import React, { useMemo } from "react";
import { BrowserRouter, Routes as RouterRoutes, Route as RouterRoute } from "react-router-dom";
import { NotFound } from "./pages/NotFound";

// Import admin pages and layout
import { AdminLayout } from "./components/admin/Layout";
import { AdminDashboard } from "./pages/admin/Dashboard";
import { AdminCalendar } from "./pages/admin/Calendar";
import { AdminProfile } from "./pages/admin/Profile";
import { AdminExams } from "./pages/admin/Exams";
import { AdminExamDetail } from "./pages/admin/Exam";
import { AdminVenues } from "./pages/admin/Venues";
import { AdminInvigilators } from "./pages/admin/Invigilators";
import { AdminInvigilatorProfile } from "./pages/admin/Invigilator";

// Import invigilator pages and layout
import { InvigilatorLayout } from "./components/invigilator/Layout";
import { InvigilatorDashboard } from "./pages/invigilator/Dashboard";
import { InvigilatorTimetable } from "./pages/invigilator/Timetable";
import { InvigilatorProfile } from "./pages/invigilator/Profile";

export const Routes: React.FC = () => {

  const theme = useMemo(
    () => createTheme({
      palette: {
        primary: { main: "#005399" },
        secondary: { main: "#7bc653" }
      },
    }), []
  );

  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <RouterRoutes>
          {/* Administrator Pages */}
          <RouterRoute path="/admin" element={<AdminLayout />}>
            <RouterRoute index element={<AdminDashboard />} />
            <RouterRoute path="exams" element={<AdminExams />} />
            <RouterRoute path="exams/:examId" element={<AdminExamDetail />} />
            <RouterRoute path="venues" element={<AdminVenues />} />
            <RouterRoute path="calendar" element={<AdminCalendar />} />
            <RouterRoute path="profile" element={<AdminProfile />} />
            <RouterRoute path="invigilators" element={<AdminInvigilators />} />
            <RouterRoute path="invigilators/:id" element={<AdminInvigilatorProfile />} />
          </RouterRoute>

          {/* Invigilator Pages */}
          <RouterRoute path="/invigilator" element={<InvigilatorLayout />}>
            <RouterRoute index element={<InvigilatorDashboard />} /> 
            <RouterRoute path="timetable" element={<InvigilatorTimetable />} />
            <RouterRoute path="profile" element={<InvigilatorProfile />} />
          </RouterRoute>

          {/* Fallback Route */}
          <RouterRoute path="*" element={<NotFound />} />
        </RouterRoutes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
