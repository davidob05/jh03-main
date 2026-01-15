import React, { useEffect, useMemo, useState } from "react";
import { Box, Fab, Grid, IconButton, Paper, Stack, Tooltip, Typography, CircularProgress } from "@mui/material";
import AddCommentIcon from "@mui/icons-material/AddComment";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useQuery } from "@tanstack/react-query";
import { UploadFile } from "../../components/admin/UploadFile";
import { apiBaseUrl, apiFetch } from "../../utils/api";
import { NotificationsPanel, NotificationItem } from "../../components/admin/NotificationsPanel";
import { PillButton } from "../../components/PillButton";
import { Panel } from "../../components/Panel";
import { AddAnnouncementDialog } from "../../components/admin/AddAnnouncementDialog";

type Announcement = {
  id: number;
  title: string;
  body: string;
  imageUrl?: string | null;
  image?: string | null;
  publishedAt?: string;
  published_at?: string;
  expiresAt?: string | null;
  expires_at?: string | null;
};

interface ExamVenueData {
  examvenue_id: number;
  venue_name: string | null;
  start_time: string | null;
  exam_length: number | null;
  core: boolean;
  provision_capabilities: string[];
}

interface ExamData {
  exam_id: number;
  exam_name: string;
  course_code: string;
  exam_venues: ExamVenueData[];
}

interface InvigilatorData {
  id: number;
}

interface VenueData {
  venue_name: string;
}

export const AdminDashboard: React.FC = () => {
  const [visibleCount, setVisibleCount] = useState(4);
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [activeAnnouncementIndex, setActiveAnnouncementIndex] = useState(0);

  const { data: exams = [], isLoading: loadingExams } = useQuery<ExamData[]>({
    queryKey: ["dashboard-exams"],
    queryFn: async () => {
      const res = await apiFetch(`${apiBaseUrl}/exams/`);
      if (!res.ok) throw new Error("Unable to load exams");
      return res.json();
    },
  });

  const { data: notificationsFromApi, isError: notificationsError } = useQuery<NotificationItem[]>({
    queryKey: ["dashboard-notifications"],
    queryFn: async () => {
      const res = await apiFetch(`${apiBaseUrl}/notifications/`);
      if (!res.ok) throw new Error("Unable to load notifications");
      return res.json();
    },
  });

  const { data: invigilators = [], isLoading: loadingInvigilators } = useQuery<InvigilatorData[]>({
    queryKey: ["dashboard-invigilators"],
    queryFn: async () => {
      const res = await apiFetch(`${apiBaseUrl}/invigilators/`);
      if (!res.ok) throw new Error("Unable to load invigilators");
      return res.json();
    },
  });

  const { data: venues = [], isLoading: loadingVenues } = useQuery<VenueData[]>({
    queryKey: ["dashboard-venues"],
    queryFn: async () => {
      const res = await apiFetch(`${apiBaseUrl}/venues/`);
      if (!res.ok) throw new Error("Unable to load venues");
      return res.json();
    },
  });

  const stats = useMemo(() => {
    const totalExams = exams.length;
    const totalInvigilators = invigilators.length;
    const totalVenues = venues.length;

    const upcomingExamIds = new Set<number>();
    const unallocatedExamVenueIds = new Set<number>();
    const now = new Date();

    exams.forEach((exam) => {
      exam.exam_venues?.forEach((ev) => {
        if (ev.start_time) {
          const start = new Date(ev.start_time);
          if (start > now) upcomingExamIds.add(exam.exam_id);
        }
        if (ev.venue_name === null || ev.venue_name === undefined) {
          unallocatedExamVenueIds.add(ev.examvenue_id);
        }
      });
    });

    return {
      totalExams,
      totalInvigilators,
      totalVenues,
      upcomingExams: upcomingExamIds.size,
      examsForAllocation: unallocatedExamVenueIds.size,
      slotsToAllocate: null,
      contractsFulfilled: null,
    };
  }, [exams, invigilators, venues]);

  const notifications = (notificationsError ? [] : notificationsFromApi) || [];

  const placeholderAnnouncement: Announcement = {
    id: 0,
    title: "Future operations",
    body: "Announcements for staff will appear here. Publish a new one using the comment button.",
    imageUrl:
      "https://images.unsplash.com/photo-1521791136064-7986c2920216?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.1.0",
    publishedAt: new Date().toISOString(),
  };

  const {
    data: announcementsFromApi = [],
    isError: announcementsError,
    isLoading: announcementsLoading,
  } = useQuery<Announcement[]>({
    queryKey: ["admin-announcements", "all"],
    queryFn: async () => {
      const res = await apiFetch(`${apiBaseUrl}/announcements/?audience=all&active=true`);
      if (res.status === 404) return [];
      if (!res.ok) throw new Error("Unable to load announcements");
      return res.json();
    },
    retry: false,
  });

  const announcements = useMemo(() => {
    const now = new Date();
    const safeData = announcementsError ? [] : announcementsFromApi;
    return safeData.filter((a) => {
      if (!a) return false;
      const expires = a.expiresAt ?? a.expires_at;
      if (expires) {
        const exp = new Date(expires);
        if (!Number.isNaN(exp.getTime()) && exp < now) return false;
      }
      return true;
    });
  }, [announcementsError, announcementsFromApi]);

  useEffect(() => {
    const total = announcements.length || 1;
    setActiveAnnouncementIndex(0);
    const timer = window.setInterval(() => {
      setActiveAnnouncementIndex((prev) => (prev + 1) % total);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [announcements.length]);

  const showPrevAnnouncement = () => {
    const total = announcements.length || 1;
    setActiveAnnouncementIndex((prev) => (prev === 0 ? total - 1 : prev - 1));
  };

  const showNextAnnouncement = () => {
    const total = announcements.length || 1;
    setActiveAnnouncementIndex((prev) => (prev + 1) % total);
  };

  const activeAnnouncement = announcements[activeAnnouncementIndex] ?? placeholderAnnouncement;
  const announcementCount = announcements.length;
  const heroImage =
    activeAnnouncement.imageUrl ||
    activeAnnouncement.image ||
    placeholderAnnouncement.imageUrl;
  const publishedAtDisplay =
    activeAnnouncement.publishedAt ||
    activeAnnouncement.published_at ||
    placeholderAnnouncement.publishedAt ||
    new Date().toISOString();

  return (
    <Box sx={{ p: 3, height: "100%", overflowY: "auto" }}>
      <Typography variant="h4" fontWeight={700}>Dashboard</Typography>
      <Typography variant="body2" color="text.secondary">Browse and manage the exam scheduling system.</Typography>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} sx={{ mt: 1.5, mb: 3 }} alignItems="stretch">
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <UploadFile />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
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
              mt: 1,
              flex: 1,
              width: "100%",
              height: "100%",
              overflow: "hidden",
              color: "#fff",
              backgroundImage: heroImage
                ? `linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.65) 100%), url(${heroImage})`
                : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              "& .MuiTypography-h6": { color: "#fff" },
            }}
          >
            {activeAnnouncement && (
              <Stack
                key={activeAnnouncement.id}
                spacing={1.2}
                sx={{
                  pt: 0.5,
                  color: "#fff",
                  maxWidth: "82%",
                  animation: "fadeIn 0.6s ease-in-out",
                  "@keyframes fadeIn": {
                    from: { opacity: 0, transform: "translateY(6px)" },
                    to: { opacity: 1, transform: "translateY(0)" },
                  },
                }}
              >
                <Typography variant="overline" sx={{ letterSpacing: 0.6, opacity: 0.9 }}>
                  {new Date(publishedAtDisplay).toLocaleDateString("en-GB", {
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

            {announcementsLoading && (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 3,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backdropFilter: "blur(2px)",
                  backgroundColor: "rgba(0,0,0,0.45)",
                }}
              >
                <Stack spacing={1} alignItems="center" sx={{ color: "#fff" }}>
                  <CircularProgress size={32} sx={{ color: "#fff" }} />
                  <Typography variant="caption" sx={{ color: "#e8ecf1" }}>
                    Loading announcements...
                  </Typography>
                </Stack>
              </Box>
            )}

            {announcementCount > 1 && (
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  position: "absolute",
                  bottom: 12,
                  left: 16,
                  zIndex: 2,
                }}
              >
                {announcements.map((a, idx) => {
                  const isActive = idx === activeAnnouncementIndex;
                  return (
                    <Box
                      key={a.id}
                      onClick={() => setActiveAnnouncementIndex(idx)}
                      sx={{
                        width: isActive ? 12 : 10,
                        height: isActive ? 12 : 10,
                        borderRadius: "50%",
                        backgroundColor: isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)",
                        border: "1px solid rgba(255,255,255,0.7)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: isActive ? "0 0 0 3px rgba(255,255,255,0.18)" : "none",
                      }}
                    />
                  );
                })}
              </Stack>
            )}
          </Panel>
        </Box>
      </Stack>

      {/* Statistics */}
      <Panel title="Statistics" disableDivider>
        <Grid container spacing={2.5}>
          {[
            { label: "Total Exams", value: loadingExams ? "…" : stats.totalExams, tone: "#0c57a4" },
            { label: "Exams for Allocation", value: loadingExams ? "…" : stats.examsForAllocation, tone: "#0d47a1" },
            { label: "Upcoming Exams", value: loadingExams ? "…" : stats.upcomingExams, tone: "#e65100" },
            { label: "Active Venues", value: loadingVenues ? "…" : stats.totalVenues, tone: "#1b5e20" },
            { label: "Total Invigilators", value: loadingInvigilators ? "…" : stats.totalInvigilators, tone: "#4a148c" },
            { label: "Slots to Allocate", value: stats.slotsToAllocate ?? "…", tone: "#455a64" },
            { label: "Contracts Fulfilled", value: stats.contractsFulfilled ?? "…", tone: "#2e7d32" },
          ].map((item, idx) => (
            <Grid item xs={12} sm={6} md={3} key={idx}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: "#fff",
                }}
              >
                <Typography variant="subtitle2" sx={{ color: item.tone, fontWeight: 700, mb: 0.5 }}>
                  {item.label}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ color: "#0f172a" }}>
                  {item.value}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Panel>

      {/* Notifications */}
      <NotificationsPanel notifications={notifications.slice(0, visibleCount)} />
      {notifications.length > 0 && (
        <Box sx={{ textAlign: "center", mt: 3, display: "flex", justifyContent: "flex-end", gap: 1.5 }}>
          <PillButton
            variant="outlined"
            onClick={() => setVisibleCount(4)}
            disabled={visibleCount <= 4}
          >
            Show less
          </PillButton>
          <PillButton
            variant="contained"
            onClick={() => setVisibleCount((prev) => Math.min(prev + 4, notifications.length))}
            disabled={visibleCount >= notifications.length}
          >
            {`Show ${Math.min(4, Math.max(notifications.length - visibleCount, 0))} more`}
          </PillButton>
        </Box>
      )}

      {/* Add announcement floating action button */}
      <Tooltip title="Post an announcement">
        <Fab
          color="primary"
          size="large"
          onClick={() => setAnnouncementDialogOpen(true)}
          sx={{
            position: "fixed",
            bottom: 32,
            right: 32,
            boxShadow: 3,
          }}
        >
          <AddCommentIcon  fontSize="medium"/>
        </Fab>
      </Tooltip>

      <AddAnnouncementDialog
        open={announcementDialogOpen}
        onClose={() => setAnnouncementDialogOpen(false)}
        onCreated={() => setAnnouncementDialogOpen(false)}
      />
    </Box>
  );
};
