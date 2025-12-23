import React from "react";
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
} from "@mui/material";
import { useParams } from "react-router-dom";
import Grid from "@mui/material/Grid";
import { apiBaseUrl } from "../../utils/api";

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

type ExamRouteParams = {
  examId?: string;
};

const fetchExam = async (examId: string): Promise<ExamData> => {
  const response = await fetch(`${apiBaseUrl}/exams/${examId}/`);
  if (!response.ok) throw new Error("Unable to load exam");
  return response.json();
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

export const AdminExamDetails: React.FC = () => {
  const { examId } = useParams<ExamRouteParams>();

  const { data, isLoading, isError, error } = useQuery<ExamData, Error>({
    queryKey: ["exam", examId],
    queryFn: () => fetchExam(examId || ""),
    enabled: Boolean(examId),
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
          <Chip label={`Students: ${data.no_students}`} variant="outlined" />
          <Chip label={data.exam_school || "School"} color="primary" variant="outlined" />
        </Stack>
      </Stack>

      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>Exam details</Typography>
        <Stack spacing={1.2}>
          <Typography variant="body2"><strong>Course code:</strong> {data.course_code}</Typography>
          <Typography variant="body2"><strong>Exam type:</strong> {formatExamType(data.exam_type)}</Typography>
          <Typography variant="body2"><strong>School contact:</strong> {data.school_contact || "N/A"}</Typography>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>Main venue</Typography>
        <Divider sx={{ mb: 2 }} />
        {coreVenue ? (
          <Stack spacing={1}>
            <Typography variant="subtitle1" fontWeight={600}>{coreVenue.venue_name || "Unassigned"}</Typography>
            <Typography variant="body2" color="text.secondary">{formatDisplayDate(coreVenue.start_time)}</Typography>
            <Typography variant="body2">Duration: {formatDuration(coreVenue.exam_length)}</Typography>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">No venue assigned.</Typography>
        )}
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>Additional venues</Typography>
        <Divider sx={{ mb: 2 }} />
        {extraVenues.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No additional venues.</Typography>
        ) : (
          <Grid container spacing={2} alignItems="stretch">
            {extraVenues.map((ev) => (
              <Grid item xs={12} sm={6} md={4} key={ev.examvenue_id} sx={{ display: "flex" }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.5,
                    width: "100%",
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={600}>
                    {ev.venue_name || "Unassigned"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">{formatDisplayDate(ev.start_time)}</Typography>
                  <Typography variant="body2">Duration: {formatDuration(ev.exam_length)}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>
    </Box>
  );
};
