import { createTheme, ThemeProvider } from "@mui/material";
import React, { useMemo } from "react";
import { BrowserRouter, Routes as RouterRoutes, Route as RouterRoute } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./pages/home";

export const Routes: React.FC = () => {

  const theme = useMemo(
    () => createTheme({
      palette: {
        secondary: {
          main: "#7bc653"
        }
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
            <RouterRoute index element={<div>Exams Page</div>} />
          </RouterRoute>
          <RouterRoute path="/venues" element={<Layout />}>
            <RouterRoute index element={<div>Venues Page</div>} />
          </RouterRoute>
          <RouterRoute path="/calendar" element={<Layout />}>
            <RouterRoute index element={<div>Calendar Page</div>} />
          </RouterRoute>
        </RouterRoutes>
      </BrowserRouter>
    </ThemeProvider>
  );
}