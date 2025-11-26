import { createTheme, ThemeProvider } from "@mui/material";
import React, { useMemo } from "react";
import { BrowserRouter, Routes as RouterRoutes, Route as RouterRoute } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./pages/home";
import { Calendar } from "./pages/calendar";
import { Profile } from "./pages/profile";
import { Exams } from "./pages/exams";
import { Venues } from "./pages/venues";
import { Invigilators } from "./pages/invigilators";
import { Exam } from "./pages/exam";

export const Routes: React.FC = () => {

  const theme = useMemo(
    () => createTheme({
      palette: {
        primary: { main: "#005399" },
        secondary: { main: "#7bc653" }
      }
    }), []
  );

  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <RouterRoutes>
          <RouterRoute path="/" element={<Layout />}>
            <RouterRoute index element={<Home />} />
          </RouterRoute>
          <RouterRoute path="/exams" element={<Layout />}>
            <RouterRoute index element={<Exams />} />
          </RouterRoute>
          <RouterRoute path="/venues" element={<Layout />}>
            <RouterRoute index element={<Venues />} />
          </RouterRoute>
          <RouterRoute path="/calendar" element={<Layout />}>
            <RouterRoute index element={<Calendar />} />
          </RouterRoute>
          <RouterRoute path="/profile" element={<Layout />}>
            <RouterRoute index element={<Profile />} />
          </RouterRoute>
          <RouterRoute path="/invigilators" element={<Layout />}>
            <RouterRoute index element={<Invigilators />} />
          </RouterRoute>
          <RouterRoute path="/exams/:examId" element={<Layout />}>
            <RouterRoute index element={<Exam />} />
          </RouterRoute>
        </RouterRoutes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
