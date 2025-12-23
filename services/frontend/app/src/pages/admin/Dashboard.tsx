import React, { useMemo, useState } from "react";
import { Box, Grid, Card, Typography, Paper, Button } from "@mui/material";
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

const mockNotifications: NotificationItem[] = [
  {
    id: 1,
    type: "availability",
    message: "Invigilator Alex Chen submitted restrictions for 2025-11-20",
    timestamp: "2025-11-19T09:15:00Z",
  },
  {
    id: 2,
    type: "cancellation",
    message: "Invigilator Rajesh Kumar cancelled a shift for 2025-11-18",
    timestamp: "2025-11-18T14:30:00Z",
  },
  {
    id: 3,
    type: "examChange",
    message: "Exam 'Calculus 101' on 2025-11-20 has changed time",
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
    message: "Invigilator Li Wei submitted restrictions for 2025-11-22",
    timestamp: "2025-11-14T11:10:00Z",
  },
  {
    id: 7,
    type: "cancellation",
    message: "Invigilator Sarah Johnson cancelled a shift for 2025-11-21",
    timestamp: "2025-11-13T13:55:00Z",
  },
  {
    id: 8,
    type: "examChange",
    message: "Exam 'Physics 201' on 2025-11-23 venue has changed",
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
    message: "Invigilator Carlos Martinez submitted restrictions for 2025-11-25",
    timestamp: "2025-11-09T10:50:00Z",
  },
];

export const AdminDashboard: React.FC = () => {
  const [visibleCount, setVisibleCount] = useState(4); // show 4 by default
  const { data: exams = [], isLoading: loadingExams } = useQuery<ExamData[]>({
    queryKey: ["dashboard-exams"],
    queryFn: async () => {
      const res = await fetch(`${apiBaseUrl}/exams/`);
      if (!res.ok) throw new Error("Unable to load exams");
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

  return (
    <Box sx={{ p: 3, height: "100%", overflowY: "auto" }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {/* UploadTimetable Component */}
      <UploadFile />

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
              {loadingExams ? "…" : stats.totalExams}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: "center", width: "100%" }}>
            <Typography variant="subtitle2" color="text.secondary">
              Total Invigilators
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              {loadingInvigilators ? "…" : stats.totalInvigilators}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: "center", width: "100%" }}>
            <Typography variant="subtitle2" color="text.secondary">
              Active Venues
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              {loadingVenues ? "…" : stats.totalVenues}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: "center", width: "100%" }}>
            <Typography variant="subtitle2" color="text.secondary">
              Upcoming Exams
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              {loadingExams ? "…" : stats.upcomingExams}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: "center", width: "100%" }}>
            <Typography variant="subtitle2" color="text.secondary">
              Exams for Allocation
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              {loadingExams ? "…" : stats.examsForAllocation}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: "center", width: "100%" }}>
            <Typography variant="subtitle2" color="text.secondary">
              Slots to Allocate
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              {stats.slotsToAllocate ?? "—"}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: "center", width: "100%" }}>
            <Typography variant="subtitle2" color="text.secondary">
              Contracts Fulfilled
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              {stats.contractsFulfilled ?? "—"}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Notifications */}
      <NotificationsPanel notifications={mockNotifications.slice(0, visibleCount)} />
      {mockNotifications.length > 0 && (
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
            onClick={() =>
              setVisibleCount((prev) =>
                Math.min(prev + 4, mockNotifications.length)
              )
            }
            disabled={visibleCount >= mockNotifications.length}
            sx={{
              borderRadius: "999px",
              textTransform: "none",
              fontWeight: 600,
              px: 2.5,
            }}
          >
            {`Show ${Math.min(4, mockNotifications.length - visibleCount)} more`}
          </Button>
        </Box>
      )}
    </Box>
  );
};
