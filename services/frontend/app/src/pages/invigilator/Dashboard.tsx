import React from "react";
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
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AccountBoxOutlined from "@mui/icons-material/AccountBoxOutlined";

export const InvigilatorDashboard: React.FC = () => {
  // Placeholder data (replace with future API calls)
  const nextShift = {
    date: "2025-02-14",
    time: "09:00 - 11:00",
    exam: "MATH101 Final Examination",
    venue: "Exam Hall A",
  };

  const notifications = [
    "Your availability for Week 12 has been approved.",
    "Admin updated your assigned venue for MATH101.",
    "You have a new exam assignment for COMP204.",
    "Your qualification level has been verified.",
  ];

  const announcements = [
    "Reminder: Training seminar on Wednesday at 3 PM.",
    "Exam season peak begins next week — please update availability.",
  ];

  return (
    <Box sx={{ p: 3 }}>

      {/* Title */}
      <Typography variant="h4" sx={{ mb: 3 }}>
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        
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

        {/* Notifications */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Notifications
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {notifications.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No notifications yet.
              </Typography>
            )}

            <List>
              {notifications.slice(0, 4).map((note, index) => (
                <ListItem key={index} disablePadding>
                  <ListItemText primary={note} />
                </ListItem>
              ))}
            </List>

            {notifications.length > 4 && (
              <Button fullWidth sx={{ mt: 1 }}>
                Show More
              </Button>
            )}
          </Paper>
        </Grid>

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

      </Grid>
    </Box>
  );
};