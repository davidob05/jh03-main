import React, { useState } from "react";
import { Avatar, Box, Grid, List, ListItem, ListItemText, Stack, Typography } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AccountBoxOutlined from "@mui/icons-material/AccountBoxOutlined";
import { Panel } from "../../components/Panel";
import { PillButton } from "../../components/PillButton";
import { NotificationItem, NotificationsPanel } from "../../components/admin/NotificationsPanel";

const notifications: NotificationItem[] = [
  {
    id: 1,
    type: "availability",
    message: "Your availability for Week 12 has been approved.",
    timestamp: "2025-11-19T09:15:00Z",
  },
  {
    id: 2,
    type: "venueChange",
    message: "Admin updated your assigned venue for MATH101.",
    timestamp: "2025-10-19T09:15:00Z",
  },
  {
    id: 3,
    type: "examChange",
    message: "You have a new exam assignment for COMP204.",
    timestamp: "2025-09-19T09:15:00Z",
  },
  {
    id: 4,
    type: "invigilatorUpdate",
    message: "Your qualification level has been verified.",
    timestamp: "2025-08-19T09:15:00Z",
  },
];

export const InvigilatorDashboard: React.FC = () => {
  const [visibleCount, setVisibleCount] = useState(4);

  const nextShift = {
    date: "2025-02-14",
    time: "09:00 - 11:00",
    exam: "MATH101 Final Examination",
    venue: "Exam Hall A",
  };

  const announcements = [
    "Reminder: Training seminar on Wednesday at 3 PM.",
    "Exam season peak begins next week - please update availability.",
  ];

  const activityStats = [
    { label: "Total shifts", value: "120", tone: "#0b4f8c" },
    { label: "Shifts this diet", value: "12", tone: "#1565c0" },
    { label: "Hours this diet", value: "28", tone: "#546e7a" },
    { label: "Restrictions this diet", value: "4", tone: "#d84315" },
    { label: "Extra shifts available", value: "3", tone: "#00796b" },
    { label: "Requests approved", value: "5", tone: "#2e7d32" },
    { label: "Requests denied", value: "1", tone: "#c62828" },
  ];

  return (
    <Box sx={{ p: 3, height: "100%", overflowY: "auto" }}>
      <Typography variant="h4" fontWeight={700}>
        Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Stay on top of upcoming exams, important information, and your actions.
      </Typography>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2.5}
        alignItems="stretch"
        sx={{ width: "100%" }}
      >
        <Box sx={{ flex: { xs: "1 1 100%", md: "0 0 350px" }, display: "flex" }}>
          <Panel title="Your Next Exam" sx={{ flex: 1 }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: "primary.main", width: 52, height: 52 }}>
                  <EventAvailableIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {nextShift.exam}
                  </Typography>
                  <Typography variant="body2">
                    {nextShift.date} - {nextShift.time}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Venue: {nextShift.venue}
                  </Typography>
                </Box>
              </Stack>

              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <PillButton
                  variant="contained"
                  startIcon={<CalendarMonthIcon />}
                  href="/invigilator/timetable"
                >
                  Show more
                </PillButton>
              </Box>
            </Stack>
          </Panel>
        </Box>

        <Box sx={{ flex: { xs: "1 1 100%", md: "0 0 250px" }, display: "flex" }}>
          <Panel title="Quick Actions" sx={{ flex: 1 }}>
            <Stack spacing={1}>
              <PillButton
                variant="outlined"
                fullWidth
                startIcon={<EditCalendarIcon />}
                href="/invigilator/timetable"
              >
                View timetable
              </PillButton>
              <PillButton
                variant="outlined"
                fullWidth
                startIcon={<AccessTimeIcon />}
                href="/invigilator/availability"
              >
                Submit restrictions
              </PillButton>
              <PillButton
                variant="outlined"
                fullWidth
                startIcon={<AccountBoxOutlined />}
                href="/invigilator/profile"
              >
                Edit profile
              </PillButton>
            </Stack>
          </Panel>
        </Box>

        <Box sx={{ flex: { xs: "1 1 100%", md: "1 1 auto" }, display: "flex" }}>
          <Panel title="Announcements" sx={{ flex: 1, width: "100%" }}>
            <List dense>
              {announcements.map((msg, i) => (
                <ListItem key={i} disableGutters>
                  <ListItemText
                    primary={msg}
                    primaryTypographyProps={{ variant: "body2", color: "text.primary" }}
                  />
                </ListItem>
              ))}
            </List>
          </Panel>
        </Box>
      </Stack>

      <Panel title="Your Activity" disableDivider sx={{ mt: 1 }}>
        <Grid container spacing={2.5}>
          {activityStats.map((item) => (
            <Grid item xs={12} sm={6} md={4} lg={2} key={item.label}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: "#f8f8f8",
                  textAlign: "center",
                }}
              >
                <Typography variant="subtitle1" sx={{ color: item.tone, fontWeight: 700, mb: 0.5 }}>
                  {item.label}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ color: "#0f172a" }}>
                  {item.value}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Panel>

      <Box sx={{ mt: 1.5 }}>
        <NotificationsPanel notifications={notifications.slice(0, visibleCount)} />
        {notifications.length > 0 && (
          <Box
            sx={{
              textAlign: "center",
              mt: 2,
              display: "flex",
              justifyContent: "flex-end",
              gap: 1.5,
            }}
          >
            <PillButton
              variant="outlined"
              onClick={() => setVisibleCount(4)}
              disabled={visibleCount <= 4}
            >
              Show less
            </PillButton>
            <PillButton
              variant="contained"
              onClick={() =>
                setVisibleCount((prev) => Math.min(prev + 4, notifications.length))
              }
              disabled={visibleCount >= notifications.length}
            >
              {`Show ${Math.min(
                4,
                Math.max(notifications.length - visibleCount, 0)
              )} more`}
            </PillButton>
          </Box>
        )}
      </Box>
    </Box>
  );
};
