import React, { useState } from "react";
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
import { AdminVenues } from "./pages/admin/Venues";
import { AdminInvigilators } from "./pages/admin/Invigilators";
import { AdminInvigilatorProfile } from "./pages/admin/Invigilator";

// Import invigilator pages and layout
import { InvigilatorLayout } from "./components/invigilator/Layout";
import { InvigilatorDashboard } from "./pages/invigilator/Dashboard";
// import { InvigilatorTimetable } from "./pages/invigilator/Timetable";
// import { InvigilatorProfile } from "./pages/invigilator/Profile";

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
          <RouterRoute path="/admin" element={<AdminLayout />}>
            <RouterRoute index element={<AdminDashboard />} />
          </RouterRoute>
          <RouterRoute path="/admin/exams" element={<AdminLayout />}>
          <RouterRoute path="/admin/exams" element={<AdminLayout />}>
            <RouterRoute index element={<Exams />} />
          </RouterRoute>
          <RouterRoute path="/admin/venues" element={<AdminLayout />}>
          <RouterRoute path="/admin/venues" element={<AdminLayout />}>
            <RouterRoute index element={<Venues />} />
          </RouterRoute>
          <RouterRoute path="/admin/calendar" element={<AdminLayout />}>
          <RouterRoute path="/admin/calendar" element={<AdminLayout />}>
            <RouterRoute index element={<Calendar />} />
          </RouterRoute>
          <RouterRoute path="/admin/profile" element={<AdminLayout />}>
          <RouterRoute path="/admin/profile" element={<AdminLayout />}>
            <RouterRoute index element={<Profile />} />
          </RouterRoute>
          <RouterRoute path="/admin/invigilators" element={<AdminLayout />}>
          <RouterRoute path="/admin/invigilators" element={<AdminLayout />}>
            <RouterRoute index element={<AdminInvigilators />} />
          </RouterRoute>
          <RouterRoute path="/exams/:examId" element={<AdminLayout />}>
            <RouterRoute index element={<AdminExams />} />
          </RouterRoute>

          {/* Invigilator Pages */}
          <RouterRoute path="/invigilator" element={<InvigilatorAdminLayout />}>
            <RouterRoute index element={<InvigilatorDashboard />} /> 
            {/* <RouterRoute path="timetable" element={<InvigilatorTimetable />} />
            <RouterRoute path="profile" element={<InvigilatorProfile />} /> */}
          </RouterRoute>
          <RouterRoute path="/exams/:examId" element={<AdminLayout />}>
            <RouterRoute index element={<AdminExams />} />
          </RouterRoute>
        </RouterRoutes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
