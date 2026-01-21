import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
  Fab,
  Tooltip,
  Snackbar,
  Grid,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { Edit, Delete } from "@mui/icons-material";
import { apiBaseUrl, apiFetch } from "../../utils/api";
import { EditExamDialog } from "../../components/admin/EditExamDialog";
import { DeleteConfirmationDialog } from "../../components/admin/DeleteConfirmationDialog";
import { Panel } from "../../components/Panel";

type ExamVenue = {
  examvenue_id: number;
  exam: number;
  venue_name: string | null;
  start_time: string | null;
  exam_length: number | null;
  core: boolean;
  provision_capabilities: string[];
};

type ExamData = {
  exam_id: number;
  exam_name: string;
  course_code: string;
  exam_type: string;
  no_students: number;
  exam_school: string;
  school_contact: string;
  exam_venues: ExamVenue[];
};

type Invigilator = {
  id: number;
  preferred_name: string | null;
  full_name: string | null;
  resigned: boolean;
  availabilities?: { date: string; slot: "MORNING" | "EVENING"; available: boolean }[];
};

type InvigilatorAssignment = {
  id: number;
  invigilator: number;
  exam_venue: number;
  assigned_start: string;
  assigned_end: string;
  cancel?: boolean;
};

type ExamRouteParams = {
  examId?: string;
};

const fetchExam = async (examId: string): Promise<ExamData> => {
  const response = await apiFetch(`${apiBaseUrl}/exams/${examId}/`);
  if (!response.ok) throw new Error("Unable to load exam");
  return response.json();
};

const fetchInvigilators = async (): Promise<Invigilator[]> => {
  const response = await apiFetch(`${apiBaseUrl}/invigilators/`);
  if (!response.ok) throw new Error("Unable to load invigilators");
  return response.json();
};

const fetchAssignments = async (): Promise<InvigilatorAssignment[]> => {
  const response = await apiFetch(`${apiBaseUrl}/invigilator-assignments/`);
  if (!response.ok) throw new Error("Unable to load invigilator assignments");
  const data = await response.json();
  if (Array.isArray(data)) return data as InvigilatorAssignment[];
  if (Array.isArray(data?.results)) return data.results as InvigilatorAssignment[];
  if (Array.isArray(data?.assignments)) return data.assignments as InvigilatorAssignment[];
  return [];
};

const formatDisplayDate = (isoDate?: string | null) => {
  if (!isoDate) return "N/A";
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleString("en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const formatDuration = (minutes?: number | null) => {
  if (minutes == null || Number.isNaN(minutes)) return "N/A";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return [hrs ? `${hrs}h` : "", mins ? `${mins}m` : ""].filter(Boolean).join(" ") || "0m";
};

const formatExamType = (code?: string) => {
  if (!code) return "N/A";
  const normalized = code.trim().toUpperCase();
  if (normalized === "ONCM") return "On campus";
  if (normalized === "CMOL") return "On campus online";
  return code;
};

const formatSchool = (text?: string): string => {
  if (!text) return "Unknown";

  return text
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export const AdminExamDetails: React.FC = () => {
  const { examId } = useParams<ExamRouteParams>();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery<ExamData, Error>({
    queryKey: ["exam", examId],
    queryFn: () => fetchExam(examId || ""),
    enabled: Boolean(examId),
  });
  const { data: invigilators = [] } = useQuery<Invigilator[], Error>({
    queryKey: ["invigilators"],
    queryFn: fetchInvigilators,
  });
  const { data: assignments = [] } = useQuery<InvigilatorAssignment[], Error>({
    queryKey: ["invigilator-assignments"],
    queryFn: fetchAssignments,
  });

  if (isLoading) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading exam...</Typography>
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{error?.message || "Failed to load exam"}</Alert>
      </Box>
    );
  }

  const examVenueIds = new Set(data.exam_venues.map((ev) => ev.examvenue_id));
  const assignedInvigilators = assignments.filter(
    (assignment) => examVenueIds.has(assignment.exam_venue) && !assignment.cancel
  ).length;
  const requiredInvigilators = Math.ceil((data.no_students || 0) / 100);
  const remainingInvigilators = Math.max(requiredInvigilators - assignedInvigilators, 0);
  const ratioMet = assignedInvigilators >= requiredInvigilators;

  const coreVenue = data.exam_venues.find((ev) => ev.core) || data.exam_venues[0];
  const extraVenues = data.exam_venues.filter((ev) => !coreVenue || ev.examvenue_id !== coreVenue.examvenue_id);

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: { xs: 2, md: 4 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" rowGap={1.5}>
        <Box>
          <Typography variant="h4" fontWeight={700}>{data.exam_name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {data.course_code} • {formatExamType(data.exam_type)}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip
            label={`${data.no_students} Students`}
            size="medium"
            sx={{
              backgroundColor: "#f0f0f0ff",
              fontWeight: 600,
            }}
          />
          <Chip
            label={
              ratioMet
                ? `Invigilators: ${assignedInvigilators} / ${requiredInvigilators}`
                : `Invigilators: ${assignedInvigilators} / ${requiredInvigilators} (${remainingInvigilators} more needed)`
            }
            size="medium"
            color={ratioMet ? "success" : "warning"}
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
          <Chip
            label={formatSchool(data.exam_school) || "School"}
            size="medium"
            sx={{
              backgroundColor: "#e3f2fd",
              color: "primary.main",
              fontWeight: 600,
            }}
          />
        </Stack>
      </Stack>

      <Panel title="Exam details">
        <Stack spacing={1.2}>
          <Typography variant="body2"><strong>Course code:</strong> {data.course_code}</Typography>
          <Typography variant="body2"><strong>Exam type:</strong> {formatExamType(data.exam_type)}</Typography>
          <Typography variant="body2"><strong>School contact:</strong> {data.school_contact || "N/A"}</Typography>
        </Stack>
      </Panel>

      <Panel title="Main venue">
        {coreVenue ? (
          <Stack spacing={1}>
            <Typography variant="subtitle1" fontWeight={600}>{coreVenue.venue_name || "Unassigned"}</Typography>
            <Typography variant="body2" color="text.secondary">{formatDisplayDate(coreVenue.start_time)}</Typography>
            <Typography variant="body2">Duration: {formatDuration(coreVenue.exam_length)}</Typography>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">No venue assigned.</Typography>
        )}
      </Panel>

      <Panel title="Additional venues">
        {extraVenues.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No additional venues.</Typography>
        ) : (
          <Grid container spacing={2} alignItems="stretch">
            {extraVenues.map((ev) => (
              <Grid item xs={12} sm={6} md={4} key={ev.examvenue_id} sx={{ display: "flex" }}>
                <Panel
                  disableDivider
                  sx={{
                    p: 2,
                    mb: 0,
                    width: "100%",
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={600}>
                    {ev.venue_name || "Unassigned"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">{formatDisplayDate(ev.start_time)}</Typography>
                  <Typography variant="body2">Duration: {formatDuration(ev.exam_length)}</Typography>
                </Panel>
              </Grid>
            ))}
          </Grid>
        )}
      </Panel>

      <Box
        sx={{
          position: "fixed",
          bottom: 32,
          right: 32,
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
        }}
      >
        <Tooltip title="Edit exam">
          <Fab color="primary" onClick={() => setEditOpen(true)}>
            <Edit />
          </Fab>
        </Tooltip>
        <Tooltip title="Delete exam">
          <Fab color="error" onClick={() => setDeleteOpen(true)}>
            <Delete />
          </Fab>
        </Tooltip>
      </Box>

      {data && (
        <EditExamDialog
          open={editOpen}
          examId={data?.exam_id ?? null}
          onClose={() => setEditOpen(false)}
          onSuccess={(name) => {
            setSuccessMessage(`${name || "Exam"} updated successfully!`);
            setSuccessOpen(true);
            setEditOpen(false);
            refetch();
          }}
        />
      )}

      <DeleteConfirmationDialog
        open={deleteOpen}
        title="Delete exam?"
        description="This will permanently delete this exam."
        confirmText="Delete"
        loading={deleting}
        onClose={() => {
          if (!deleting) setDeleteOpen(false);
        }}
        onConfirm={async () => {
          if (!examId) return;
          try {
            setDeleting(true);
            const res = await apiFetch(`${apiBaseUrl}/exams/${examId}/`, { method: "DELETE" });
            if (!res.ok) {
              const text = await res.text();
              throw new Error(text || "Delete failed");
            }
            setSuccessMessage("Exam deleted successfully!");
            setSuccessOpen(true);
            setDeleteOpen(false);
            setTimeout(() => navigate("/admin/exams"), 400);
          } catch (err: any) {
            alert(err?.message || "Delete failed");
          } finally {
            setDeleting(false);
          }
        }}
      />

      <Snackbar
        open={successOpen}
        autoHideDuration={3000}
        onClose={() => setSuccessOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSuccessOpen(false)}
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
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};
