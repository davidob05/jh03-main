import React from "react";
import {
  Box,
  Typography,
} from "@mui/material";
import { UploadTimetable } from "../components/UploadTimetable";

export const Home: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Homepage
      </Typography>

      <UploadTimetable />
    </Box>
  );
};