import React, { useMemo, useState } from "react";
import { Box, Grid, Typography, Paper, Button } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { UploadFile } from "../../components/admin/UploadFile";
import { apiBaseUrl } from "../../utils/api";
import { NotificationsPanel, NotificationItem } from "../../components/admin/NotificationsPanel";

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

const mockNotifications: NotificationItem[] = [];

export const AdminDashboard: React.FC = () => {
  const [visibleCount, setVisibleCount] = useState(4);
  const { data: exams = [], isLoading: loadingExams } = useQuery<ExamData[]>({
    queryKey: ["dashboard-exams"],
    queryFn: async () => {
      const res = await fetch(`${apiBaseUrl}/exams/`);
      if (!res.ok) throw new Error("Unable to load exams");
      return res.json();
    },
  });

  const {
    data: notificationsFromApi,
    isError: notificationsError,
  } = useQuery<NotificationItem[]>({
    queryKey: ["dashboard-notifications"],
    queryFn: async () => {
      const res = await fetch(`${apiBaseUrl}/notifications/`);
      if (!res.ok) throw new Error("Unable to load notifications");
      return res.json();
    },
  });

  const { data: invigilators = [], isLoading: loadingInvigilators } = useQuery<InvigilatorData[]>({
    queryKey: ["dashboard-invigilators"],
    queryFn: async () => {
      const res = await fetch(`${apiBaseUrl}/invigilators/`);
      if (!res.ok) throw new Error("Unable to load invigilators");
      return res.json();
    },
  });

  const { data: venues = [], isLoading: loadingVenues } = useQuery<VenueData[]>({
    queryKey: ["dashboard-venues"],
    queryFn: async () => {
      const res = await fetch(`${apiBaseUrl}/venues/`);
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
        if (!ev.venue_name) unallocatedExamVenueIds.add(ev.examvenue_id);
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

  return (
    <Box sx={{ p: 3, height: "100%", overflowY: "auto" }}>
      <Typography variant="h4" fontWeight={700}>Dashboard</Typography>
      <Typography variant="body2" color="text.secondary">Browse and manage the exam scheduling system.</Typography>

      {/* UploadTimetable Component */}
      <UploadFile />

      {/* Statistics */}
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
        Statistics
      </Typography>
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {[
          { label: "Total Exams", value: loadingExams ? "…" : stats.totalExams, tone: "#0c57a4" },
          { label: "Exams for Allocation", value: loadingExams ? "…" : stats.examsForAllocation, tone: "#0d47a1" },
          { label: "Upcoming Exams", value: loadingExams ? "…" : stats.upcomingExams, tone: "#e65100" },
          { label: "Active Venues", value: loadingVenues ? "…" : stats.totalVenues, tone: "#1b5e20" },
          { label: "Total Invigilators", value: loadingInvigilators ? "…" : stats.totalInvigilators, tone: "#4a148c" },
          { label: "Slots to Allocate", value: stats.slotsToAllocate ?? "—", tone: "#455a64" },
          { label: "Contracts Fulfilled", value: stats.contractsFulfilled ?? "—", tone: "#2e7d32" },
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

      {/* Notifications */}
      <NotificationsPanel notifications={notifications.slice(0, visibleCount)} />
      {notifications.length > 0 && (
        <Box sx={{ textAlign: "center", mt: 3, display: "flex", justifyContent: "flex-end", gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={() => setVisibleCount(4)}
            disabled={visibleCount <= 4}
            sx={{
              borderRadius: "999px",
              textTransform: "none",
              fontWeight: 600,
              px: 2.5,
            }}
          >
            Show less
          </Button>
          <Button
            variant="contained"
            onClick={() => setVisibleCount((prev) => Math.min(prev + 4, notifications.length))}
            disabled={visibleCount >= notifications.length}
            sx={{
              borderRadius: "999px",
              textTransform: "none",
              fontWeight: 600,
              px: 2.5,
            }}
          >
            {`Show ${Math.min(4, Math.max(notifications.length - visibleCount, 0))} more`}
          </Button>
        </Box>
      )}
    </Box>
  );
};
