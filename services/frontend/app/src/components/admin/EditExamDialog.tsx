import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  MenuItem,
  Grid,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Typography,
  Chip,
  Box,
  Paper,
} from "@mui/material";
import { Add, Close, Delete } from "@mui/icons-material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiBaseUrl, apiFetch } from "../../utils/api";
import { PillButton } from "../PillButton";

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
  school_contact: string | null;
  exam_venues: ExamVenue[];
};

type VenueOption = {
  venue_name: string;
  is_accessible: boolean;
  provision_capabilities: string[];
};

type ProvisionOption = {
  value: string;
  label: string;
};

type EditableVenue = {
  id: number | string;
  venue_name: string;
  start_time: string;
  exam_length: number | null;
  provision_capabilities: string[];
};

type Props = {
  open: boolean;
  examId: number | null;
  onClose: () => void;
  onSuccess?: (name: string) => void;
};

const PROVISION_CHOICES: ProvisionOption[] = [
  { value: "separate_room_on_own", label: "Separate room on own" },
  { value: "separate_room_not_on_own", label: "Separate room not on own" },
  { value: "use_computer", label: "Use of a computer" },
  { value: "accessible_hall", label: "Accessible hall" },
];

const fetchExam = async (examId: number): Promise<ExamData> => {
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
  // Preserve the exact local time the user picked and include the local timezone offset
  // so BST/GMT are respected by the backend.
  const withSeconds = localValue.length === 16 ? `${localValue}:00` : localValue;
  const localDate = new Date(withSeconds);
  if (Number.isNaN(localDate.getTime())) return withSeconds;
  const offsetMinutes = localDate.getTimezoneOffset(); // minutes behind UTC
  const sign = offsetMinutes > 0 ? "-" : "+";
  const abs = Math.abs(offsetMinutes);
  const hours = String(Math.floor(abs / 60)).padStart(2, "0");
  const mins = String(abs % 60).padStart(2, "0");
  return `${withSeconds}${sign}${hours}:${mins}`;
};

export const EditExamDialog: React.FC<Props> = ({ open, examId, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const { data: venues } = useQuery<VenueOption[], Error>({
    queryKey: ["venues"],
    queryFn: fetchVenues,
    enabled: open,
  });

  const { data: exam, isLoading, isError, error } = useQuery<ExamData, Error>({
    queryKey: ["exam", examId],
    queryFn: () => fetchExam(examId as number),
    enabled: open && Boolean(examId),
  });

  const coreVenue = useMemo(() => exam?.exam_venues.find((ev) => ev.core) || exam?.exam_venues[0], [exam]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [examType, setExamType] = useState("");
  const [students, setStudents] = useState<number | "">("");
  const [school, setSchool] = useState("");
  const [contact, setContact] = useState("");
  const [mainVenue, setMainVenue] = useState("");
  const [mainStart, setMainStart] = useState("");
  const [mainLength, setMainLength] = useState<number | "">("");
  const [mainProvisions, setMainProvisions] = useState<string[]>([]);
  const [extraVenues, setExtraVenues] = useState<EditableVenue[]>([]);
  const [initialExtraIds, setInitialExtraIds] = useState<Set<number>>(new Set());

  const formatProvisionLabel = (prov: string) => {
    const spaced = prov.replace(/_/g, " ");
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  };

  const toggleProvision = (current: string[], value: string) => {
    const mutuallyExclusive = new Set(["separate_room_on_own", "separate_room_not_on_own"]);
    let next = current.includes(value) ? current.filter((p) => p !== value) : [...current, value];
    if (mutuallyExclusive.has(value)) {
      const other = value === "separate_room_on_own" ? "separate_room_not_on_own" : "separate_room_on_own";
      next = next.filter((p) => p !== other);
    }
    return next;
  };

  const venueOptions = useMemo(
    () =>
      (venues || []).map((v) => {
        const provs = v.provision_capabilities || [];
        const suffix = provs.length ? ` (${provs.map(formatProvisionLabel).join(", ")})` : "";
        return { value: v.venue_name, label: `${v.venue_name}${suffix}`, caps: provs };
      }),
    [venues]
  );

  const filteredVenueOptions = (requiredCaps: string[]) => {
    if (!requiredCaps.length) return venueOptions;
    return venueOptions.filter((v) => {
      const caps = v.caps || [];
      return requiredCaps.every((cap) => caps.includes(cap));
    });
  };

  useEffect(() => {
    if (!exam) return;
    setName(exam.exam_name);
    setCode(exam.course_code);
    setExamType(exam.exam_type);
    setStudents(exam.no_students);
    setSchool(exam.exam_school);
    setContact(exam.school_contact);
    setMainVenue(coreVenue?.venue_name || "");
    setMainStart(toLocalInputValue(coreVenue?.start_time));
    setMainLength(coreVenue?.exam_length ?? "");
    setMainProvisions(coreVenue?.provision_capabilities || []);

    const extras = (exam.exam_venues || []).filter((ev) => !coreVenue || ev.examvenue_id !== coreVenue.examvenue_id);
    setInitialExtraIds(new Set(extras.map((ev) => ev.examvenue_id)));
    setExtraVenues(
      extras.map((ev) => ({
        id: ev.examvenue_id,
        venue_name: ev.venue_name || "",
        start_time: toLocalInputValue(ev.start_time),
        exam_length: ev.exam_length,
        provision_capabilities: ev.provision_capabilities || [],
      }))
    );
  }, [exam, coreVenue]);

  const addExtraVenue = () => {
    setExtraVenues((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        venue_name: "",
        start_time: mainStart || "",
        exam_length: typeof mainLength === "number" ? mainLength : null,
        provision_capabilities: [],
      },
    ]);
  };

  const removeExtraVenue = (id: number | string) => {
    setExtraVenues((prev) => prev.filter((v) => v.id !== id));
  };

  const updateExtraVenue = <K extends keyof EditableVenue>(id: number | string, field: K, value: EditableVenue[K]) => {
    setExtraVenues((prev) => prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!examId) throw new Error("Missing exam id");

      // Update exam details
      const examRes = await apiFetch(`${apiBaseUrl}/exams/${examId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_name: name,
          course_code: code,
          exam_type: examType,
          no_students: students === "" ? 0 : Number(students),
          exam_school: school,
          school_contact: contact ? contact : null,
        }),
      });
      if (!examRes.ok) {
        const text = await examRes.text();
        throw new Error(text || "Failed to update exam");
      }

      // Handle main venue only if none exists yet (cannot modify existing core via API).
      if (!coreVenue && mainVenue) {
        const mainRes = await apiFetch(`${apiBaseUrl}/exam-venues/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exam: examId,
            venue_name: mainVenue,
            start_time: toIsoString(mainStart) || null,
            exam_length: mainLength === "" ? null : mainLength,
            core: true,
            provision_capabilities: [],
          }),
        });
        if (!mainRes.ok) {
          const text = await mainRes.text();
          throw new Error(text || "Failed to set main venue");
        }
      }

      // Extras: create/update/delete non-core venues
      const currentIds = new Set(extraVenues.filter((v) => typeof v.id === "number").map((v) => v.id as number));
      const toDelete = Array.from(initialExtraIds).filter((id) => !currentIds.has(id));

      for (const id of toDelete) {
        const delRes = await apiFetch(`${apiBaseUrl}/exam-venues/${id}/`, { method: "DELETE" });
        if (!delRes.ok) {
          const text = await delRes.text();
          throw new Error(text || `Failed to delete venue ${id}`);
        }
      }

      for (const v of extraVenues) {
        const payload = {
          exam: examId,
          venue_name: v.venue_name || null,
          start_time: toIsoString(v.start_time) || null,
          exam_length: v.exam_length,
          core: false,
          provision_capabilities: [],
        };
        if (typeof v.id === "number") {
          const putRes = await apiFetch(`${apiBaseUrl}/exam-venues/${v.id}/`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!putRes.ok) {
            const text = await putRes.text();
            throw new Error(text || `Failed to update venue ${v.id}`);
          }
        } else {
          const postRes = await apiFetch(`${apiBaseUrl}/exam-venues/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!postRes.ok) {
            const text = await postRes.text();
            throw new Error(text || "Failed to add additional venue");
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam", examId] });
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      onSuccess?.(name);
      onClose();
    },
    onError: (err: any) => alert(err?.message || "Failed to update exam"),
  });

  const venueOptions = useMemo(() => (venues || []).map((v) => v.venue_name), [venues]);
  // Allow save without school contact; keep other essentials populated
  const canSave = Boolean(name && code && examType && school);

  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>
        Edit Exam
        <IconButton
          aria-label="close"
          onClick={() => {
            if (!mutation.isPending) onClose();
          }}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {isLoading && (
          <Stack alignItems="center" py={2}>
            <CircularProgress />
          </Stack>
        )}
        {isError && <Alert severity="error">Failed to load exam: {error?.message}</Alert>}
        {!isLoading && !isError && (
          <Stack spacing={3}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Exam name" value={name} onChange={(e) => setName(e.target.value)} fullWidth required />
              <TextField label="Course code" value={code} onChange={(e) => setCode(e.target.value)} fullWidth required />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Exam type" value={examType} onChange={(e) => setExamType(e.target.value)} fullWidth required />
              <TextField
                label="Number of students"
                type="number"
                value={students}
                onChange={(e) => setStudents(e.target.value === "" ? "" : Number(e.target.value))}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Exam school" value={school} onChange={(e) => setSchool(e.target.value)} fullWidth required />
              <TextField label="School contact" value={contact} onChange={(e) => setContact(e.target.value)} fullWidth />
            </Stack>

            <Stack spacing={1}>
              <Typography variant="subtitle1" fontWeight={700}>Main venue</Typography>
              {coreVenue && (
                <Alert severity="info" sx={{ mb: 1 }}>
                  Main venue already assigned ({coreVenue.venue_name || "Unassigned"}). Editing core venues is not supported.
                </Alert>
              )}
              <Box>
                <Typography variant="body2" fontWeight={700} mb={0.5}>Provision capabilities</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
                  {PROVISION_CHOICES.map((p) => {
                    const selected = mainProvisions.includes(p.value);
                    return (
                      <Chip
                        key={p.value}
                        label={p.label}
                        color={selected ? "primary" : "default"}
                        variant={selected ? "filled" : "outlined"}
                        onClick={() => {
                          if (coreVenue) return;
                          setMainProvisions((prev) => toggleProvision(prev, p.value));
                        }}
                        sx={{ cursor: coreVenue ? "not-allowed" : "pointer" }}
                      />
                    );
                  })}
                </Stack>
              </Box>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Venue"
                  select
                  value={mainVenue}
                  onChange={(e) => setMainVenue(e.target.value)}
                  fullWidth
                  disabled={Boolean(coreVenue)}
                >
                  {filteredVenueOptions(mainProvisions).map((v) => (
                    <MenuItem key={v.value} value={v.value}>{v.label}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Start time"
                  type="datetime-local"
                  value={mainStart}
                  onChange={(e) => setMainStart(e.target.value)}
                  fullWidth
                  disabled={Boolean(coreVenue)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Duration (minutes)"
                  type="number"
                  value={mainLength}
                  onChange={(e) => setMainLength(e.target.value === "" ? "" : Number(e.target.value))}
                  fullWidth
                  disabled={Boolean(coreVenue)}
                />
              </Stack>
            </Stack>

            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle1" fontWeight={700}>Additional venues</Typography>
                <Tooltip title="Add additional venue">
                  <IconButton onClick={addExtraVenue} size="small" color="primary">
                    <Add />
                  </IconButton>
                </Tooltip>
              </Stack>
              {extraVenues.length === 0 && <Typography variant="body2" color="text.secondary">No additional venues.</Typography>}
              {extraVenues.map((v) => (
                <Paper key={v.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12}>
                      <Typography variant="body2" fontWeight={700} mb={0.5}>Provision capabilities</Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
                        {PROVISION_CHOICES.map((p) => {
                          const selected = v.provision_capabilities.includes(p.value);
                          return (
                            <Chip
                              key={p.value}
                              label={p.label}
                              color={selected ? "primary" : "default"}
                              variant={selected ? "filled" : "outlined"}
                              onClick={() =>
                                updateExtraVenue(v.id, "provision_capabilities", toggleProvision(v.provision_capabilities, p.value))
                              }
                              sx={{ cursor: "pointer" }}
                            />
                          );
                        })}
                      </Stack>
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <TextField
                        label="Venue"
                        select
                        value={v.venue_name}
                        onChange={(e) => updateExtraVenue(v.id, "venue_name", e.target.value)}
                        fullWidth
                        sx={{ minWidth: { sm: 220, xs: "100%" } }}
                      >
                        {filteredVenueOptions(v.provision_capabilities).map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Start time"
                        type="datetime-local"
                        value={v.start_time}
                        onChange={(e) => updateExtraVenue(v.id, "start_time", e.target.value)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={10} sm={2.5}>
                      <TextField
                        label="Duration (minutes)"
                        type="number"
                        value={v.exam_length ?? ""}
                        onChange={(e) =>
                          updateExtraVenue(v.id, "exam_length", e.target.value === "" ? null : Number(e.target.value))
                        }
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={2} sm={0.5} sx={{ display: "flex", justifyContent: "flex-end" }}>
                      <Tooltip title="Remove">
                        <IconButton onClick={() => removeExtraVenue(v.id)} size="small" color="error">
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Stack>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <PillButton
          variant="contained"
          onClick={() => mutation.mutate()}
          disabled={!canSave || mutation.isPending}
          startIcon={mutation.isPending ? <CircularProgress size={18} /> : undefined}
        >
          Save
        </PillButton>
      </DialogActions>
    </Dialog>
  );
};
