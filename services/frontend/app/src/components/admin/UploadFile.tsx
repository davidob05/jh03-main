import React, { useState } from "react";
import {
  Box,
  CircularProgress,
  Paper,
  Typography,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Snackbar,
  Alert,
  Stack,
  Chip,
} from "@mui/material";
import { Upload as UploadIcon, InsertDriveFile, Eject } from "@mui/icons-material";
import { apiBaseUrl, apiFetch } from "../../utils/api";
import { PillButton } from "../PillButton";

export const UploadFile: React.FC = () => {
  const [uploadType, setUploadType] = useState(""); // exam, provisions, venues
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const apiMap: Record<string, string> = {
    exam: "/exams-upload",
    provisions: "/exams-upload",
    venues: "/exams-upload",
  };

  const acceptMap: Record<string, string> = {
    exam: ".csv,.xlsx,.xls",
    provisions: ".csv,.xlsx,.xls",
    venues: ".csv,.xlsx,.xls",
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSnackbar({ type: null, message: "" });
    }
  };

  const handleUpload = async () => {
    if (!uploadType) {
      setSnackbar({ type: "error", message: "Please select a file type." });
      return;
    }
    if (!selectedFile) {
      setSnackbar({ type: "error", message: "Please select a file first." });
      return;
    }

    setUploading(true);
    setSnackbar({ type: null, message: "" });

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await apiFetch(apiBaseUrl + apiMap[uploadType], {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const result = await response.json();
      const created = result.records_created ?? result.created ?? result.count ?? 0;
      const updated = result.records_updated ?? result.updated ?? 0;
      const deleted = result.records_deleted ?? result.deleted ?? 0;
      const parts = [
        `Added ${created}`,
        `Updated ${updated}`,
        deleted ? `Deleted ${deleted}` : null,
      ].filter(Boolean);

      const typeLabel =
        uploadType === "exam"
          ? "Exam timetable"
          : uploadType === "provisions"
          ? "Student provisions"
          : "Venue data";

      setSnackbar({
        type: "success",
        message: `Upload complete: ${typeLabel} (${selectedFile.name}). ${parts.join(", ")}.`,
      });

      setSelectedFile(null);
      const fileInput = document.getElementById("file-upload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (err) {
      setSnackbar({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to upload file",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mt: 3,
        mb: 3,
        width: "auto",
        maxWidth: "100%",
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "#fff",
      }}
    >
      <Stack spacing={1.5}>
        <Typography variant="h6" fontWeight={700}>
          Upload Data
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Select a file type and upload a CSV or Excel file to populate the database.
        </Typography>

        <FormControl fullWidth size="small">
          <InputLabel>Select file type...</InputLabel>
          <Select value={uploadType} onChange={(e) => setUploadType(e.target.value)} label="Select file type...">
            <MenuItem value="">
              <em>Choose...</em>
            </MenuItem>
            <MenuItem value="exam">Exam Timetable</MenuItem>
            <MenuItem value="provisions">Student Provisions</MenuItem>
            <MenuItem value="venues">Venue Data</MenuItem>
          </Select>
        </FormControl>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center" sx={{ width: "100%" }}>
          <PillButton
            variant="outlined"
            component="label"
            disabled={!uploadType || uploading}
            startIcon={<Eject />}
            sx={{ width: "100%", minHeight: 44 }}
          >
            Choose File
            <input
              id="file-upload"
              type="file"
              hidden
              accept={acceptMap[uploadType] || ".csv,.xlsx,.xls"}
              onChange={handleFileChange}
            />
          </PillButton>
          {selectedFile && (
            <Chip
              icon={<InsertDriveFile fontSize="small" />}
              label={selectedFile.name}
              sx={{ maxWidth: "100%", "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" } }}
            />
          )}
        </Stack>

        <PillButton
          variant="contained"
          color="primary"
          onClick={handleUpload}
          disabled={!uploadType || !selectedFile || uploading}
          startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
          sx={{ width: "100%", minHeight: 46 }}
        >
          {uploading ? "Uploading..." : "Upload"}
        </PillButton>
      </Stack>

      <Snackbar
        open={Boolean(snackbar.type)}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ type: null, message: "" })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ type: null, message: "" })}
          severity={snackbar.type || undefined}
          variant="filled"
          sx={
            snackbar.type === "success"
              ? {
                  backgroundColor: "#d4edda",
                  color: "#155724",
                  border: "1px solid #155724",
                  borderRadius: "50px",
                  fontWeight: 500,
                }
              : undefined
          }
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};
