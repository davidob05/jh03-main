import React from "react";
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Grid,
  Card,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from "@mui/material";
import {
  Upload as UploadIcon,
  CalendarToday as CalendarIcon,
  People as PeopleIcon,
  EventNote as ExamsIcon,
  LocationOn as VenuesIcon,
  AccountCircle as ProfileIcon,
} from "@mui/icons-material";

interface Notification {
  id: number;
  type: 
    | "availability"
    | "cancellation"
    | "shiftPickup"
    | "examChange"
    | "invigilatorUpdate";
  message: string;
  timestamp: string;
}

const mockNotifications: Notification[] = [
  {
    id: 1,
    type: "availability",
    message: "Invigilator Alex Chen submitted availability for 2025-11-20",
    timestamp: "2025-11-19T09:15:00Z",
  },
  {
    id: 2,
    type: "cancellation",
    message: "Invigilator Rajesh Kumar cancelled availability for 2025-11-18",
    timestamp: "2025-11-18T14:30:00Z",
  },
  {
    id: 3,
    type: "examChange",
    message: "Exam 'Calculus 101' on 2025-11-20 had the time changed",
    timestamp: "2025-11-17T10:00:00Z",
  },
  {
    id: 4,
    type: "invigilatorUpdate",
    message: "Invigilator Maria Garcia updated qualifications",
    timestamp: "2025-11-16T08:45:00Z",
  },
  {
    id: 5,
    type: "shiftPickup",
    message: "Invigilator Ben Okoro picked up a shift on 2025-11-19",
    timestamp: "2025-11-15T16:20:00Z",
  },
  {
    id: 6,
    type: "availability",
    message: "Invigilator Li Wei submitted availability for 2025-11-22",
    timestamp: "2025-11-14T11:10:00Z",
  },
  {
    id: 7,
    type: "cancellation",
    message: "Invigilator Sarah Johnson cancelled availability for 2025-11-21",
    timestamp: "2025-11-13T13:55:00Z",
  },
  {
    id: 8,
    type: "examChange",
    message: "Exam 'Physics 201' on 2025-11-23 had the venue changed",
    timestamp: "2025-11-12T09:05:00Z",
  },
  {
    id: 9,
    type: "invigilatorUpdate",
    message: "Invigilator Ahmed Hassan updated contact information",
    timestamp: "2025-11-11T15:40:00Z",
  },
  {
    id: 10,
    type: "shiftPickup",
    message: "Invigilator Emma Wilson picked up a shift on 2025-11-24",
    timestamp: "2025-11-10T12:25:00Z",
  },
  {
    id: 11,
    type: "availability",
    message: "Invigilator Carlos Martinez submitted availability for 2025-11-25",
    timestamp: "2025-11-09T10:50:00Z",
  }
];

export const AdminDashboard: React.FC = () => {
  const [visibleCount, setVisibleCount] = useState(4); // show 4 by default
  const [uploadType, setUploadType] = useState("");
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

  const apiMap: Record<string, string> = {
    exam: "/api/exams/upload",
    provisions: "/api/provisions/upload",
    invigilators: "/api/invigilators/upload",
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadStatus({ type: null, message: "" });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus({ type: "error", message: "Please select a file first" });
      return;
    }

    setUploading(true);
    setUploadStatus({ type: null, message: "" });

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(apiMap[uploadType], {
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
    <Box sx={{ p: 3, height: "100%", overflowY: "auto" }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {/* Upload files */}
      <Paper
        elevation={2}
        sx={{
          p: 3,
          mb: 3,
        }}
      >
        <Typography variant="h6" gutterBottom>
          Upload data
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select the type of file to upload, choose it then submit.
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Select upload type...</InputLabel>
            <Select
              label="Select upload type..."
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value)}
            >
              <MenuItem value=""><em>Choose...</em></MenuItem>
              <MenuItem value="exam">Exam Timetable</MenuItem>
              <MenuItem value="provisions">Student Provisions</MenuItem>
              <MenuItem value="invigilators">Invigilator Data</MenuItem>
            </Select>
          </FormControl>

          <Button variant="outlined" component="label" disabled={!uploadType}>
            Choose File
            <input
              id="file-upload"
              type="file"
              hidden
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
            />
          </Button>

          {selectedFile && <Typography variant="body2">{selectedFile.name}</Typography>}

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

          {uploadStatus.type && <Alert severity={uploadStatus.type}>{uploadStatus.message}</Alert>}
        </Box>
      </Paper>

      {/* Statistics */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Statistics
      </Typography>
      <Grid container spacing={7} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: "center", width: "100%" }}>
            <Typography variant="subtitle2" color="text.secondary">
              Total Exams
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              371
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: "center", width: "100%"  }}>
            <Typography variant="subtitle2" color="text.secondary">
              Total Invigilators
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              112
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: "center", width: "100%"  }}>
            <Typography variant="subtitle2" color="text.secondary">
              Active Venues
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              201
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: "center", width: "100%"  }}>
            <Typography variant="subtitle2" color="text.secondary">
              Upcoming Exams
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              146
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: "center", width: "100%"  }}>
            <Typography variant="subtitle2" color="text.secondary">
              Exams for Allocation
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              124
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: "center", width: "100%"  }}>
            <Typography variant="subtitle2" color="text.secondary">
              Slots to Allocate
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              773
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: "center", width: "100%"  }}>
            <Typography variant="subtitle2" color="text.secondary">
              Contracts Fulfilled
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              28
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Notifications */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Recent Activity
      </Typography>
      <Paper sx={{ p: 3, mb: 6, height: "100%", overflowY: "auto" }}>
        {mockNotifications.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No recent activity yet.
          </Typography>
        ) : (
          <>
            {mockNotifications.slice(0, visibleCount).map((n) => (
              <Box
                key={n.id}
                sx={{
                  mb: 2,
                  p: 1,
                  borderRadius: 1,
                  backgroundColor:
                    n.type === "cancellation"
                      ? "error.light"
                      : n.type === "availability"
                      ? "success.light"
                      : n.type === "shiftPickup"
                      ? "info.light"
                      : "warning.light",
                }}
              >
                <Typography variant="body2">{n.message}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(n.timestamp).toLocaleString()}
                </Typography>
              </Box>
            ))}

            {/* Show More / Show Less Button */}
            {mockNotifications.length > 4 && (
              <Box sx={{ textAlign: "center", mt: 1 }}>
                <Button
                  variant="text"
                  onClick={() =>
                    setVisibleCount((prev) =>
                      prev >= mockNotifications.length ? 4 : prev + 4
                    )
                  }
                >
                  {visibleCount >= mockNotifications.length
                    ? "Show less"
                    : `Show ${Math.min(
                        4,
                        mockNotifications.length - visibleCount
                      )} more notifications`}
                </Button>
              </Box>
            )}
          </>
        )}
      </Paper>
          {uploadStatus.type && (
            <Alert severity={uploadStatus.type}>{uploadStatus.message}</Alert>
          )}
        </Box>
      </Paper>
    </Box>
  );
};