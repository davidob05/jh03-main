import React, { useState } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  Avatar,
  ListItemIcon,
  Stack,
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AccountBoxOutlined from "@mui/icons-material/AccountBoxOutlined";

interface Notification {
  id: number;
  type: 
    | "availability"
    | "cancellation"
    | "verification"
    | "timetableUpdate";
  message: string;
  timestamp: string;
}

const fakeNotifications: Notification[] = [
  { id: 1,
    type: "availability",
    message: "Your availability for Week 12 has been approved.",
    timestamp: "2025-11-19T09:15:00Z",
  },
  { id: 2,
    type: "timetableUpdate",
    message: "Admin updated your assigned venue for MATH101.",
    timestamp: "2025-10-19T09:15:00Z",
  },
  { id: 3,
    type: "timetableUpdate",
    message: "You have a new exam assignment for COMP204.",
    timestamp: "2025-09-19T09:15:00Z",
  },
  { id: 4,
    type: "verification",
    message: "Your qualification level has been verified.",
    timestamp: "2025-08-19T09:15:00Z",
  },
];

export const InvigilatorDashboard: React.FC = () => {
  // Placeholder data (replace with future API calls)
  const nextShift = {
    date: "2025-02-14",
    time: "09:00 - 11:00",
    exam: "MATH101 Final Examination",
    venue: "Exam Hall A",
  };

  const announcements = [
    "Reminder: Training seminar on Wednesday at 3 PM.",
    "Exam season peak begins next week — please update availability.",
  ];

  const [visibleCount, setVisibleCount] = useState(3);

  return (
    <Box sx={{ p: 3 }}>

      {/* Title */}
      <Typography variant="h4" sx={{ mb: 3 }}>
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        
        <Stack direction={{ xs: "column", md: "row"}} justifyContent="space-between" mb={4} spacing={2}>
          {/* Next Shift */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Your Next Exam
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar sx={{ bgcolor: "primary.main" }}>
                  <EventAvailableIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1">{nextShift.exam}</Typography>
                  <Typography variant="body2">
                    {nextShift.date} • {nextShift.time}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Venue: {nextShift.venue}
                  </Typography>
                </Box>
              </Box>

              <Button
                variant="contained"
                color="primary"
                sx={{ mt: 2 }}
                startIcon={<CalendarMonthIcon />}
                href="/invigilator/timetable"
              >
                View Full Timetable
              </Button>
            </Paper>
          </Grid>

          {/* Quick Links */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<EditCalendarIcon />}
                  href="/invigilator/timetable"
                >
                  View Timetable
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<AccessTimeIcon />}
                  href="/invigilator/availability"
                >
                  Submit Availability
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<AccountBoxOutlined />}
                  href="/invigilator/profile"
                >
                  Edit Profile
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Stack>

      <Stack direction={{ xs: "row", md: "column"}} justifyContent="space-between" alignItems="center" mb={4} spacing={2}>
        {/* Announcements */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Announcements
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <List>
              {announcements.map((msg, i) => (
                <ListItem key={i}>
                  <ListItemIcon sx={{ minWidth: 20 }}>
                    •
                  </ListItemIcon>
                  <ListItemText primary={msg} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Stats */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Your Activity
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box textAlign="center">
                  <Typography variant="h4">12</Typography>
                  <Typography>Total Shifts This Month</Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box textAlign="center">
                  <Typography variant="h4">4</Typography>
                  <Typography>Cancellations</Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box textAlign="center">
                  <Typography variant="h4">28 hrs</Typography>
                  <Typography>Total Hours Assigned</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Stack>

        {/* Notifications */}
        <Grid item xs="row" md="column">
          <Paper sx={{ p: 3}}>
            <Typography variant="h6" gutterBottom>
              Notifications
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {fakeNotifications.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No notifications yet.
              </Typography>
            )}

            <List>
              {fakeNotifications.slice(0, visibleCount).map((n) => {
                const color =
                  n.type === "cancellation"
                    ? "error.main"
                    : n.type === "availability"
                    ? "success.main"
                    : n.type === "timetableUpdate"
                    ? "info.main"
                    : n.type === "verification"
                    ? "success.main"
                    : "warning.main";

                return (
                  <ListItem
                    key={n.id}
                    sx={{
                      // base appearance
                      position: "relative",
                      mb: 0.5,
                      p: 2,
                      borderRadius: 0.5,
                      backgroundColor: `${color}22`, // transparent tint
                      overflow: "visible",
                    }}
                    >

                      {/* left bar */}
                      <Box
                      sx={{
                        position: "absolute",
                        left: 0,
                        top: 10,
                        bottom: 0,
                        width: "3px",
                        height: "70%",
                        backgroundColor: color,
                        borderRadius: "4px 0 0 4px",
                      }}
                    />

                    {/* underline */}
                    <Box
                      sx={{
                        display: "inline-block",
                        pb: 0.5,
                        borderBottom: `3px solid`,
                        borderColor: color,
                      }}
                    >
                      <ListItemText primary={n.message} />
                    </Box>
                  </ListItem>
                );
              })}
            </List>

            {fakeNotifications.length > 3 && (
              <Box sx={{ textAlign: "center", mt: 1 }}>
                <Button
                  variant="text"
                  onClick={() =>
                    setVisibleCount((prev) =>
                      prev >= fakeNotifications.length ? 3 : prev + 3
                    )
                  }
                >
                  {visibleCount >= fakeNotifications.length
                    ? "Show less"
                    : `Show ${Math.min(
                        3,
                        fakeNotifications.length - visibleCount
                      )} more notifications`}
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>

      </Grid>
    </Box>
  );
};