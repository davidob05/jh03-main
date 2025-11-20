import React, { useState } from "react";
import {
  Box,
  Button,
  Paper,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Upload as UploadIcon } from "@mui/icons-material";

export const AdminDashboard: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadStatus({ type: null, message: "" });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus({
        type: "error",
        message: "Please select a file first",
      });
      return;
    }

    setUploading(true);
    setUploadStatus({ type: null, message: "" });

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      // TODO: Replace with actual backend endpoint
      const response = await fetch("/api/exams/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();
      setUploadStatus({
        type: "success",
        message: `Successfully uploaded ${selectedFile.name}. ${result.count || 0} exams added to database.`,
      });
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById(
        "file-upload"
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      setUploadStatus({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to upload file",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Homepage
      </Typography>

      <Paper
        elevation={2}
        sx={{
          p: 3,
          mt: 3,
          maxWidth: 600,
        }}
      >
        <Typography variant="h6" gutterBottom>
          Upload Exam Timetable
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Upload a CSV or Excel file containing exam timetable data to populate
          the database.
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Button variant="outlined" component="label" disabled={uploading}>
              Choose File
              <input
                id="file-upload"
                type="file"
                hidden
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
              />
            </Button>
            {selectedFile && (
              <Typography variant="body2" sx={{ flex: 1 }}>
                {selectedFile.name}
              </Typography>
            )}
          </Box>

          <Button
            variant="contained"
            color="primary"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            startIcon={
              uploading ? <CircularProgress size={20} /> : <UploadIcon />
            }
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>

          {uploadStatus.type && (
            <Alert severity={uploadStatus.type}>{uploadStatus.message}</Alert>
          )}
        </Box>
      </Paper>
    </Box>
  );
};