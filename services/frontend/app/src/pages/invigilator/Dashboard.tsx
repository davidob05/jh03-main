import React, { useEffect, useMemo, useState } from "react";
import { Avatar, Box, Grid, IconButton, Stack, Typography } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AccountBoxOutlined from "@mui/icons-material/AccountBoxOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Panel } from "../../components/Panel";
import { PillButton } from "../../components/PillButton";
import { NotificationItem, NotificationsPanel } from "../../components/admin/NotificationsPanel";

type Announcement = {
  id: number;
  title: string;
  body: string;
  imageUrl: string;
  publishedAt: string;
};

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
  const [activeAnnouncementIndex, setActiveAnnouncementIndex] = useState(0);

  const nextShift = {
    date: "2025-02-14",
    time: "09:00 - 11:00",
    exam: "MATH101 Final Examination",
    venue: "Exam Hall A",
  };

  const announcements: Announcement[] = useMemo(
    () => [
      {
        id: 1,
        title: "Exam season kicks off next week",
        body: "Confirm your availability and re-check venues for late changes.",
        imageUrl:
          "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1600&q=80",
        publishedAt: "2025-02-01T09:00:00Z",
      },
      {
        id: 2,
        title: "New training resources",
        body: "Updated invigilation handbook and fire safety guide are now live.",
        imageUrl:
          "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1600&q=80",
        publishedAt: "2025-02-05T10:00:00Z",
      },
      {
        id: 3,
        title: "Extra shifts available",
        body: "Pickup slots for COMP204 have opened. Grab them if you are free.",
        imageUrl:
          "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1600&q=80",
        publishedAt: "2025-02-07T12:00:00Z",
      },
    ],
    []
  );

  const activityStats = [
    { label: "Total shifts", value: "120", tone: "#0b4f8c" },
    { label: "Shifts this diet", value: "12", tone: "#1565c0" },
    { label: "Hours this diet", value: "28", tone: "#546e7a" },
    { label: "Restrictions this diet", value: "4", tone: "#d84315" },
    { label: "Extra shifts available", value: "3", tone: "#00796b" },
    { label: "Requests approved", value: "5", tone: "#2e7d32" },
    { label: "Requests denied", value: "1", tone: "#c62828" },
  ];

  useEffect(() => {
    if (announcements.length === 0) return undefined;
    const timer = window.setInterval(
      () => setActiveAnnouncementIndex((prev) => (prev + 1) % announcements.length),
      7000
    );
    return () => window.clearInterval(timer);
  }, [announcements.length]);

  const showPrevAnnouncement = () => {
    setActiveAnnouncementIndex((prev) =>
      prev === 0 ? announcements.length - 1 : prev - 1
    );
  };

  const showNextAnnouncement = () => {
    setActiveAnnouncementIndex((prev) => (prev + 1) % announcements.length);
  };

  const activeAnnouncement = announcements[activeAnnouncementIndex];

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
          <Panel
            title={activeAnnouncement ? activeAnnouncement.title : "Announcements"}
            actions={
              <Stack direction="row" spacing={1}>
                <IconButton
                  aria-label="Previous announcement"
                  onClick={showPrevAnnouncement}
                  sx={{
                    color: "#fff",
                    backgroundColor: "rgba(255,255,255,0.14)",
                    "&:hover": { backgroundColor: "rgba(255,255,255,0.24)" },
                  }}
                >
                  <ChevronLeftIcon />
                </IconButton>
                <IconButton
                  aria-label="Next announcement"
                  onClick={showNextAnnouncement}
                  sx={{
                    color: "#fff",
                    backgroundColor: "rgba(255,255,255,0.14)",
                    "&:hover": { backgroundColor: "rgba(255,255,255,0.24)" },
                  }}
                >
                  <ChevronRightIcon />
                </IconButton>
              </Stack>
            }
            disableDivider
            sx={{
              flex: 1,
              width: "100%",
              position: "relative",
              overflow: "hidden",
              minHeight: { xs: 220, md: 240 },
              color: "#fff",
              backgroundImage: activeAnnouncement
                ? `linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.65) 100%), url(${activeAnnouncement.imageUrl})`
                : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              "& .MuiTypography-h6": { color: "#fff" },
            }}
          >
            {activeAnnouncement && (
              <Stack spacing={1.2} sx={{ pt: 0.5, color: "#fff", maxWidth: "82%" }}>
                <Typography variant="overline" sx={{ letterSpacing: 0.6, opacity: 0.9 }}>
                  {new Date(activeAnnouncement.publishedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Typography>
                <Typography variant="body1" sx={{ color: "#e8ecf1" }}>
                  {activeAnnouncement.body}
                </Typography>
              </Stack>
            )}
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
