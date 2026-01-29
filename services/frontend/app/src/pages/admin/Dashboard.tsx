import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Fab,
  Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
  TextField,
  Autocomplete,
} from "@mui/material";
import AddCommentIcon from "@mui/icons-material/AddComment";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { useQuery } from "@tanstack/react-query";
import { UploadFile } from "../../components/admin/UploadFile";
import { apiBaseUrl, apiFetch } from "../../utils/api";
import { formatDate } from "../../utils/dates";
import { NotificationsPanel, NotificationItem } from "../../components/admin/NotificationsPanel";
import { PillButton } from "../../components/PillButton";
import { Panel } from "../../components/Panel";
import { AddAnnouncementDialog } from "../../components/admin/AddAnnouncementDialog";
import { DietManager } from "../../components/admin/DietManager";

const fileSafe = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const extractFilename = (contentDisposition: string | null, fallback: string) => {
  if (!contentDisposition) return fallback;
  const match = contentDisposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallback;
};

const downloadProvisionExport = async (school?: string) => {
  const params = new URLSearchParams();
  if (school) params.set("school", school);
  const url = `${apiBaseUrl}/provisions/export/${params.toString() ? `?${params.toString()}` : ""}`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error("Failed to export provisions");
  const blob = await res.blob();
  const fallback = school ? `provisions_${fileSafe(school)}.csv` : "provisions.csv";
  const filename = extractFilename(res.headers.get("Content-Disposition"), fallback);
  downloadBlob(blob, filename);
};

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
  exam_school?: string;
  exam_venues: ExamVenueData[];
}

interface InvigilatorData {
  id: number;
  contracted_hours?: number | null;
  assignments?: {
    exam_venue: number;
    assigned_start: string;
    assigned_end: string;
    break_time_minutes?: number | null;
    cancel?: boolean;
  }[];
}

interface VenueData {
  venue_name: string;
}

export const AdminDashboard: React.FC = () => {
  const ALL_SCHOOLS_LABEL = "All schools";
  const ALL_SCHOOLS_BULK_LABEL = "All schools (separate files)";
  const [visibleCount, setVisibleCount] = useState(4);
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [announcementSnackbar, setAnnouncementSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: "" });
  const [exportSnackbar, setExportSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: "" });
  const [activeAnnouncementIndex, setActiveAnnouncementIndex] = useState(0);
  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [exporting, setExporting] = useState(false);
  const [bulkExporting, setBulkExporting] = useState(false);

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
    const assignedByVenue = new Map<number, number>();
    const now = new Date();

    invigilators.forEach((invigilator) => {
      (invigilator.assignments || []).forEach((assignment) => {
        if (assignment.cancel) return;
        assignedByVenue.set(
          assignment.exam_venue,
          (assignedByVenue.get(assignment.exam_venue) || 0) + 1
        );
      });
    });

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

    let slotsToAllocate = 0;
    exams.forEach((exam) => {
      exam.exam_venues?.forEach((ev) => {
        if (!ev.start_time) return;
        const start = new Date(ev.start_time);
        if (!(start > now)) return;
        if ((assignedByVenue.get(ev.examvenue_id) || 0) === 0) {
          slotsToAllocate += 1;
        }
      });
    });

    const contractsFulfilled = invigilators.reduce((count, invigilator) => {
      const contracted = invigilator.contracted_hours;
      if (contracted == null || contracted <= 0) return count;
      const assignedHours = (invigilator.assignments || []).reduce((sum, assignment) => {
        if (assignment.cancel) return sum;
        const start = new Date(assignment.assigned_start).getTime();
        const end = new Date(assignment.assigned_end).getTime();
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return sum;
        const durationMinutes = (end - start) / 60000 - (assignment.break_time_minutes || 0);
        return sum + Math.max(durationMinutes, 0) / 60;
      }, 0);
      return assignedHours >= contracted ? count + 1 : count;
    }, 0);

    return {
      totalExams,
      totalInvigilators,
      totalVenues,
      upcomingExams: upcomingExamIds.size,
      examsForAllocation: unallocatedExamVenueIds.size,
      slotsToAllocate,
      contractsFulfilled,
    };
  }, [exams, invigilators, venues]);

  const schoolOptions = useMemo(() => {
    const unique = new Set<string>();
    exams.forEach((exam) => {
      if (exam.exam_school) unique.add(exam.exam_school);
    });
    const sorted = Array.from(unique).sort((a, b) => a.localeCompare(b));
    const withAll = sorted.includes(ALL_SCHOOLS_LABEL) ? sorted : [ALL_SCHOOLS_LABEL, ...sorted];
    return withAll.includes(ALL_SCHOOLS_BULK_LABEL) ? withAll : [ALL_SCHOOLS_BULK_LABEL, ...withAll];
  }, [exams, ALL_SCHOOLS_LABEL, ALL_SCHOOLS_BULK_LABEL]);

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
    const filtered = safeData.filter((a) => {
      if (!a) return false;
      const expires = a.expiresAt ?? a.expires_at;
      if (expires) {
        const exp = new Date(expires);
        if (!Number.isNaN(exp.getTime()) && exp < now) return false;
      }
      return true;
    });
    return filtered.slice().sort((a, b) => {
      const priorityDiff = (b.priority ?? 0) - (a.priority ?? 0);
      if (priorityDiff !== 0) return priorityDiff;
      const aDate = new Date(a.publishedAt ?? a.published_at ?? 0).getTime();
      const bDate = new Date(b.publishedAt ?? b.published_at ?? 0).getTime();
      return bDate - aDate;
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

  const handleExport = async () => {
    if (selectedSchool === ALL_SCHOOLS_BULK_LABEL) {
      await handleExportAllSchools();
      return;
    }
    const normalizedSchool = selectedSchool === ALL_SCHOOLS_LABEL ? "" : selectedSchool;
    try {
      setExporting(true);
      await downloadProvisionExport(normalizedSchool || undefined);
      setExportSnackbar({
        open: true,
        message: normalizedSchool
          ? `Provisions exported for ${normalizedSchool}.`
          : "Provisions exported.",
      });
    } catch (err) {
      console.error(err);
      alert("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleExportAllSchools = async () => {
    const schools = schoolOptions.filter(
      (s) => s && s !== ALL_SCHOOLS_LABEL && s !== ALL_SCHOOLS_BULK_LABEL
    );
    if (!schools.length) {
      setExportSnackbar({ open: true, message: "No schools found to export." });
      return;
    }
    try {
      setBulkExporting(true);
      const url = `${apiBaseUrl}/provisions/export/?separate=1`;
      const res = await apiFetch(url);
      if (!res.ok) throw new Error("Failed to export provisions");
      const blob = await res.blob();
      const filename = extractFilename(
        res.headers.get("Content-Disposition"),
        "provisions_export_by_school.zip"
      );
      downloadBlob(blob, filename);
      setExportSnackbar({ open: true, message: "Provisions exported for all schools." });
    } catch (err) {
      console.error(err);
      alert("Export failed");
    } finally {
      setBulkExporting(false);
    }
  };

  return (
    <Box sx={{ p: 3, height: "100%", overflowY: "auto" }}>
      <Typography variant="h4" fontWeight={700}>Dashboard</Typography>
      <Typography variant="body2" color="text.secondary">Browse and manage the exam scheduling system.</Typography>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} sx={{ mt: 1.5, mb: 3 }} alignItems="stretch">
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack spacing={2}>
            <UploadFile />
            <Panel title="Export provisions" disableDivider sx={{ mb: 0 }}>
              <Stack spacing={1.5}>
                <Typography variant="body2" color="text.secondary">
                  Download a CSV of student provisions, optionally filtered by school.
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }}>
                  <Autocomplete
                    freeSolo
                    options={schoolOptions}
                    value={selectedSchool}
                    onChange={(_, value) => setSelectedSchool(value ?? "")}
                    onInputChange={(_, value) => setSelectedSchool(value)}
                    sx={{ flex: 1 }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="School filter"
                        placeholder="Start typing to search"
                        size="small"
                        fullWidth
                      />
                    )}
                  />
                  <PillButton
                    variant="contained"
                    disabled={exporting || bulkExporting}
                    onClick={handleExport}
                    startIcon={<FileDownloadIcon />}
                    sx={{ minWidth: 200 }}
                  >
                    {bulkExporting || exporting ? "Exporting..." : "Export"}
                  </PillButton>
                </Stack>
              </Stack>
            </Panel>
          </Stack>
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, display: "flex" }}>
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
              mb: 0,
              width: "100%",
              height: "100%",
              position: "relative",
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
                  {formatDate(publishedAtDisplay)}
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
                      role="button"
                      aria-label={`Go to announcement ${idx + 1}`}
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

      {/* Diets management */}
      <DietManager />

      {/* Notifications */}
      <NotificationsPanel
        notifications={notifications.slice(0, visibleCount)}
        messageKey="admin_message"
      />
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
        onCreated={(title) => {
          setAnnouncementDialogOpen(false);
          setAnnouncementSnackbar({ open: true, message: `${title} posted.` });
        }}
      />

      <Snackbar
        open={announcementSnackbar.open}
        autoHideDuration={3000}
        onClose={() => setAnnouncementSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setAnnouncementSnackbar((prev) => ({ ...prev, open: false }))}
          severity="success"
          variant="filled"
          sx={{
            backgroundColor: "#d4edda",
            color: "#155724",
            border: "1px solid #155724",
            borderRadius: "50px",
            fontWeight: 500,
          }}
        >
          {announcementSnackbar.message}
        </Alert>
      </Snackbar>

      <Snackbar
        open={exportSnackbar.open}
        autoHideDuration={3000}
        onClose={() => setExportSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setExportSnackbar((prev) => ({ ...prev, open: false }))}
          severity="success"
          variant="filled"
          sx={{
            backgroundColor: "#d4edda",
            color: "#155724",
            border: "1px solid #155724",
            borderRadius: "50px",
            fontWeight: 500,
          }}
        >
          {exportSnackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
