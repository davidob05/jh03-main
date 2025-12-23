import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Autocomplete,
  Button,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { apiBaseUrl, apiFetch } from "../../utils/api";

const PROVISION_CAPABILITIES = [
  { value: "separate_room_on_own", label: "Separate room on own" },
  { value: "separate_room_not_on_own", label: "Separate room not on own" },
  { value: "use_computer", label: "Use of a computer" },
  { value: "accessible_hall", label: "Accessible hall" },
];
type ProvisionCapabilityOption = (typeof PROVISION_CAPABILITIES)[number];

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

type EditableExamVenue = {
  id: number | string;
  venue_name: string;
  start_time: string;
  exam_length: number | null;
  provision_capabilities: string[];
};

type ExamRouteParams = {
  examId?: string;
};

type VenueOption = {
  venue_name: string;
  is_accessible: boolean;
};

const fetchExam = async (examId: string): Promise<ExamData> => {
  const response = await apiFetch(`${apiBaseUrl}/exams/${examId}/`);
  if (!response.ok) throw new Error("Unable to load exam");
  return response.json();
};

const fetchVenues = async (): Promise<VenueOption[]> => {
  const response = await apiFetch(`${apiBaseUrl}/venues/`);
  if (!response.ok) throw new Error("Unable to load venues");
  return response.json();
};

const toLocalInputValue = (isoDate?: string | null) => {
  if (!isoDate) return "";
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return "";
  const offsetMs = parsed.getTimezoneOffset() * 60000;
  const local = new Date(parsed.getTime() - offsetMs);
  return local.toISOString().slice(0, 16);
};

const toIsoString = (localValue: string) => {
  if (!localValue) return "";
  const parsed = new Date(localValue);
  if (Number.isNaN(parsed.getTime())) return "";
  const offsetMs = parsed.getTimezoneOffset() * 60000;
  return new Date(parsed.getTime() + offsetMs).toISOString();
};

const formatDisplayDate = (isoDate?: string | null) => {
  if (!isoDate) return "N/A";
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const formatDuration = (minutes?: number | null) => {
  if (minutes == null || Number.isNaN(minutes)) return "N/A";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return [hrs ? `${hrs}h` : "", mins ? `${mins}m` : ""].filter(Boolean).join(" ") || "0m";
};

export const AdminExamEdit: React.FC = () => {
  const { examId } = useParams<ExamRouteParams>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const initialVenueIdsRef = React.useRef<Set<number>>(new Set());
  const [status, setStatus] = React.useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const { data, isLoading, isError, error } = useQuery<ExamData, Error>({
    queryKey: ["exam", examId],
    queryFn: () => fetchExam(examId || ""),
    enabled: Boolean(examId),
  });

  const { data: venueOptions, isLoading: isVenueOptionsLoading } = useQuery<VenueOption[], Error>({
    queryKey: ["venues"],
    queryFn: fetchVenues,
  });

  const venueOptionsWithLabel = React.useMemo(() => {
    const opts = (venueOptions || []).filter((v) => v.venue_name);
    return opts
      .map((v) => ({
        ...v,
        label: v.is_accessible ? v.venue_name : `${v.venue_name} (Not accessible)`,
      }))
      .sort((a, b) => a.venue_name.localeCompare(b.venue_name));
  }, [venueOptions]);

  const coreVenue = React.useMemo(() => data?.exam_venues.find((ev) => ev.core) || data?.exam_venues[0], [data]);
  const [venues, setVenues] = React.useState<EditableExamVenue[]>([]);
  const [venueWarnings, setVenueWarnings] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (data) {
      const nonCore = (data.exam_venues || []).filter((ev) => !ev.core);
      initialVenueIdsRef.current = new Set(nonCore.map((ev) => ev.examvenue_id));
      setVenues(
        nonCore.map((ev) => ({
          id: ev.examvenue_id,
          venue_name: ev.venue_name || "",
          start_time: toLocalInputValue(ev.start_time),
          exam_length: ev.exam_length,
          provision_capabilities: ev.provision_capabilities || [],
        }))
      );
    }
  }, [data]);

  // Flag if alternative venue date differs from the core venue date.
  React.useEffect(() => {
    setVenueWarnings(
      venues.map((venue) => {
        if (!coreVenue?.start_time || !venue.start_time) return "";
        const coreDate = new Date(coreVenue.start_time);
        const venueDate = new Date(venue.start_time);
        if (Number.isNaN(coreDate.getTime()) || Number.isNaN(venueDate.getTime())) return "";
        return coreDate.toDateString() === venueDate.toDateString()
          ? ""
          : "Warning: Date does not match main venue date.";
      })
    );
  }, [venues, coreVenue?.start_time]);

  const handleVenueFieldChange = <K extends keyof EditableExamVenue>(id: EditableExamVenue["id"], field: K, value: EditableExamVenue[K]) => {
    setVenues((current) => current.map((venue) => (venue.id === id ? { ...venue, [field]: value } : venue)));
  };

  const handleCapabilitySelect = (id: EditableExamVenue["id"], values: string[]) => {
    handleVenueFieldChange(id, "provision_capabilities", values);
  };

  const handleRemoveVenue = (id: EditableExamVenue["id"]) => setVenues((current) => current.filter((venue) => venue.id !== id));

  const handleAddVenue = () => {
    const coreStart = toLocalInputValue(coreVenue?.start_time);
    const coreLength = coreVenue?.exam_length ?? null;
    setVenues((current) => [
      ...current,
      {
        id: `new-${Date.now()}`,
        venue_name: "",
        start_time: coreStart,
        exam_length: coreLength,
        provision_capabilities: [],
      },
    ]);
  };

  const saveVenuesMutation = useMutation({
    mutationFn: async () => {
      if (!examId || !data) throw new Error("Missing exam id");

      const cleanedCaps = (caps: string[]) => caps.map((cap) => cap.trim()).filter(Boolean);

      const currentIds = new Set(
        venues.filter((v) => typeof v.id === "number").map((v) => v.id as number)
      );
      const toDelete = Array.from(initialVenueIdsRef.current).filter((id) => !currentIds.has(id));
      const createPayloads = venues.filter((v): v is EditableExamVenue & { id: string } => typeof v.id === "string");
      const updatePayloads = venues.filter((v): v is EditableExamVenue & { id: number } => typeof v.id === "number");

      // Delete removed venues
      for (const id of toDelete) {
        const resp = await apiFetch(`${apiBaseUrl}/exam-venues/${id}/`, { method: "DELETE" });
        if (!resp.ok) {
          const detail = await resp.text();
          throw new Error(detail || `Failed to delete venue ${id}`);
        }
      }

      // Create new venues
      for (const venue of createPayloads) {
        const resp = await apiFetch(`${apiBaseUrl}/exam-venues/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exam: data.exam_id,
            venue_name: venue.venue_name || null,
            start_time: toIsoString(venue.start_time) || null,
            exam_length: venue.exam_length,
            core: false,
            provision_capabilities: cleanedCaps(venue.provision_capabilities),
          }),
        });
        if (!resp.ok) {
            const detail = await resp.text();
            throw new Error(detail || "Failed to create venue");
        }
      }

      // Update existing venues
      for (const venue of updatePayloads) {
        const resp = await apiFetch(`${apiBaseUrl}/exam-venues/${venue.id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            venue_name: venue.venue_name || null,
            start_time: toIsoString(venue.start_time) || null,
            exam_length: venue.exam_length,
            core: false,
            provision_capabilities: cleanedCaps(venue.provision_capabilities),
          }),
        });
        if (!resp.ok) {
          const detail = await resp.text();
          throw new Error(detail || `Failed to update venue ${venue.id}`);
        }
      }
    },
    onSuccess: async () => {
      setStatus({ type: "success", message: "Exam venues saved." });
      initialVenueIdsRef.current = new Set(
        venues.filter((v): v is EditableExamVenue & { id: number } => typeof v.id === "number").map((v) => v.id)
      );
      await queryClient.invalidateQueries({ queryKey: ["exam", examId] });
    },
    onError: (err: any) => {
      setStatus({ type: "error", message: err?.message || "Failed to save venues." });
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ maxWidth: 1100, mx: "auto", p: 3 }}>
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6">Loading exam...</Typography>
        </Paper>
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Box sx={{ maxWidth: 1100, mx: "auto", p: 3 }}>
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography color="error" variant="h6">
            {error?.message || "Unable to load exam"}
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Button variant="text" onClick={() => navigate(-1)}>Back to exams</Button>
        <Typography variant="h5" fontWeight={600}>Edit Exam</Typography>
      </Stack>

      <Paper sx={{ p: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={3} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }}>
          <Box>
            <Typography variant="h6">{data.exam_name}</Typography>
            <Typography color="text.secondary">{data.course_code}</Typography>
            <Typography color="text.secondary">{data.exam_type}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">School</Typography>
            <Typography>{data.exam_school || "N/A"}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Students: {data.no_students ?? "N/A"}</Typography>
          </Box>
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" fontWeight={600}>Core venue (read-only)</Typography>
        {coreVenue ? (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">Venue</Typography>
              <Typography>{coreVenue.venue_name || "Unassigned"}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">Start</Typography>
              <Typography>{formatDisplayDate(coreVenue.start_time)}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">Duration</Typography>
              <Typography>{formatDuration(coreVenue.exam_length)}</Typography>
            </Grid>
          </Grid>
        ) : (
          <Typography color="text.secondary" sx={{ mt: 1 }}>No core venue found for this exam.</Typography>
        )}
      </Paper>

      {status && (
        <Alert severity={status.type} onClose={() => setStatus(null)}>
          {status.message}
        </Alert>
      )}
      {!status && <Alert severity="info">Adjust additional venues below and save.</Alert>}

      <Paper sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Other Exam Venues</Typography>
          <Button startIcon={<AddIcon />} onClick={handleAddVenue} variant="outlined">Add venue</Button>
        </Stack>

        {venues.length === 0 && (
          <Typography color="text.secondary">No additional venues. Use &ldquo;Add venue&rdquo; to create one.</Typography>
        )}

        {venues.map((venue, index) => (
          <Box key={venue.id} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2, position: "relative" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>Venue {index + 1}</Typography>
              <IconButton aria-label="Remove venue" onClick={() => handleRemoveVenue(venue.id)}>
                <DeleteIcon />
              </IconButton>
            </Stack>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  fullWidth
                  options={venueOptionsWithLabel}
                  loading={isVenueOptionsLoading}
                  getOptionLabel={(opt) => opt.label || opt.venue_name}
                  value={venueOptionsWithLabel.find((opt) => opt.venue_name === venue.venue_name) || null}
                  onChange={(_, newValue) => handleVenueFieldChange(venue.id, "venue_name", newValue?.venue_name ?? "")}
                  isOptionEqualToValue={(option, value) => option.venue_name === value.venue_name}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Venue name"
                      placeholder={isVenueOptionsLoading ? "Loading venues..." : "Select venue"}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Start time"
                  type="datetime-local"
                  value={venue.start_time}
                  onChange={(e) => handleVenueFieldChange(venue.id, "start_time", e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Duration (minutes)"
                  type="number"
                  value={venue.exam_length ?? ""}
                  onChange={(e) => handleVenueFieldChange(venue.id, "exam_length", e.target.value === "" ? null : Number(e.target.value))}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete<ProvisionCapabilityOption, true, false, false>
                  multiple
                  fullWidth
                  options={PROVISION_CAPABILITIES}
                  getOptionLabel={(opt) => opt.label}
                  value={PROVISION_CAPABILITIES.filter((opt) => venue.provision_capabilities.includes(opt.value))}
                  onChange={(_, newValue) => handleCapabilitySelect(venue.id, newValue.map((opt) => opt.value))}
                  renderInput={(params) => <TextField {...params} label="Provision capabilities" placeholder="Select provisions" />}
                />
              </Grid>
              {venueWarnings[index] &&
                <Grid item xs={12} md={12}>
                  <Alert severity="warning">{venueWarnings[index]}</Alert>
                </Grid>
              }
            </Grid>
          </Box>
        ))}

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button variant="contained" color="primary" onClick={() => saveVenuesMutation.mutate()} disabled={saveVenuesMutation.isPending}>
            {saveVenuesMutation.isPending ? "Saving..." : "Save changes"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
