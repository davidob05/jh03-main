import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Radio,
  Select,
  Stack,
  TextField,
  Typography,
  Chip,
} from "@mui/material";
import dayjs from "dayjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiBaseUrl, apiFetch } from "../../utils/api";
import { PillButton } from "../PillButton";

type SlotCode = "MORNING" | "EVENING";

type ExamVenue = {
  examvenue_id: number;
  venue_name: string | null;
  start_time: string | null;
  exam_length: number | null;
  core: boolean;
};

type InvigilatorAvailability = {
  date: string;
  slot: SlotCode;
  available: boolean;
};

type Invigilator = {
  id: number;
  preferred_name: string | null;
  full_name: string | null;
  resigned: boolean;
  availabilities?: InvigilatorAvailability[];
};

type InvigilatorAssignment = {
  id: number;
  invigilator: number;
  exam_venue: number;
  assigned_start: string;
  assigned_end: string;
  cancel?: boolean;
};

type Candidate = {
  invigilator: Invigilator;
  name: string;
  available: boolean;
  hasConflict: boolean;
  alreadyAssigned: boolean;
};

type AssignInvigilatorDialogProps = {
  open: boolean;
  onClose: () => void;
  examVenue: ExamVenue | null;
  invigilators: Invigilator[];
  assignments: InvigilatorAssignment[];
  onAssigned?: () => void;
};

const roleOptions = [
  { value: "lead", label: "Lead invigilator" },
  { value: "assistant", label: "Assistant invigilator" },
  { value: "support", label: "Support invigilator" },
];

const displayName = (i: Invigilator) =>
  i.preferred_name || i.full_name || `Invigilator #${i.id}`;

const getSlotFromStart = (start: dayjs.Dayjs | null): SlotCode | null => {
  if (!start) return null;
  return start.hour() < 12 ? "MORNING" : "EVENING";
};

const formatSlotLabel = (slot: SlotCode | null) => {
  if (slot === "MORNING") return "Morning";
  if (slot === "EVENING") return "Evening";
  return "Unknown";
};

export const AssignInvigilatorDialog: React.FC<AssignInvigilatorDialogProps> = ({
  open,
  onClose,
  examVenue,
  invigilators,
  assignments,
  onAssigned,
}) => {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [role, setRole] = useState("assistant");
  const [breakMinutes, setBreakMinutes] = useState("0");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startTime = useMemo(() => {
    if (!examVenue?.start_time) return null;
    const parsed = dayjs(examVenue.start_time);
    return parsed.isValid() ? parsed : null;
  }, [examVenue?.start_time]);

  const endTime = useMemo(() => {
    if (!startTime || examVenue?.exam_length == null) return null;
    return startTime.add(examVenue.exam_length, "minute");
  }, [startTime, examVenue?.exam_length]);

  const slot = getSlotFromStart(startTime);
  const dateKey = startTime ? startTime.format("YYYY-MM-DD") : null;

  useEffect(() => {
    if (open) {
      setSelectedId(null);
      setRole("assistant");
      setBreakMinutes("0");
      setNotes("");
      setSearch("");
      setShowUnavailable(false);
      setError(null);
    }
  }, [open, examVenue?.examvenue_id]);

  const hasTimeConflict = (invigilatorId: number) => {
    if (!startTime || !endTime) return false;
    const startMs = startTime.valueOf();
    const endMs = endTime.valueOf();
    return assignments.some((a) => {
      if (a.cancel) return false;
      if (a.invigilator !== invigilatorId) return false;
      if (examVenue && a.exam_venue === examVenue.examvenue_id) return false;
      const aStart = dayjs(a.assigned_start);
      const aEnd = dayjs(a.assigned_end);
      if (!aStart.isValid() || !aEnd.isValid()) return false;
      return aStart.valueOf() < endMs && startMs < aEnd.valueOf();
    });
  };

  const isAvailableForSlot = (invigilator: Invigilator) => {
    if (!dateKey || !slot) return false;
    const entry = invigilator.availabilities?.find(
      (a) => a.date === dateKey && a.slot === slot
    );
    if (!entry) return true;
    return entry.available;
  };

  const candidates = useMemo(() => {
    const filtered = invigilators
      .filter((i) => !i.resigned)
      .map<Candidate>((i) => {
        const availability = isAvailableForSlot(i);
        const conflict = hasTimeConflict(i.id);
        const alreadyAssigned = assignments.some(
          (a) => a.invigilator === i.id && examVenue && a.exam_venue === examVenue.examvenue_id && !a.cancel
        );
        return {
          invigilator: i,
          name: displayName(i),
          available: availability && !conflict && !alreadyAssigned,
          hasConflict: conflict,
          alreadyAssigned,
        };
      });

    const searchLower = search.trim().toLowerCase();
    const searched = searchLower
      ? filtered.filter((c) => c.name.toLowerCase().includes(searchLower))
      : filtered;

    const availableOnly = searched.filter((c) => c.available);
    return showUnavailable ? searched : availableOnly;
  }, [assignments, examVenue, invigilators, search, showUnavailable]);

  const canAssign = Boolean(startTime && endTime && endTime.isAfter(startTime));

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) throw new Error("Select an invigilator first.");
      if (!examVenue) throw new Error("Exam venue not found.");
      if (!startTime || !endTime) throw new Error("Exam time is missing.");

      const response = await apiFetch(`${apiBaseUrl}/invigilator-assignments/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invigilator: selectedId,
          exam_venue: examVenue.examvenue_id,
          role,
          assigned_start: startTime.toISOString(),
          assigned_end: endTime.toISOString(),
          break_time_minutes: Number(breakMinutes) || 0,
          notes: notes.trim() || null,
          confirmed: false,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to assign invigilator.");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invigilator-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["invigilators"] });
      onAssigned?.();
      onClose();
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to assign invigilator.");
    },
  });

  const venueLabel = examVenue?.venue_name || "Unassigned venue";
  const timeLabel = startTime && endTime
    ? `${startTime.format("D MMM YYYY, HH:mm")} – ${endTime.format("HH:mm")} (${formatSlotLabel(slot)})`
    : "Exam time not set";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Assign invigilator</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">Venue</Typography>
            <Typography variant="body1" fontWeight={600}>{venueLabel}</Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">Exam time</Typography>
            <Typography variant="body2">{timeLabel}</Typography>
          </Box>

          {!canAssign && (
            <Alert severity="warning">This exam venue is missing a start time or duration.</Alert>
          )}

          <Divider />

          <TextField
            label="Search invigilators"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            fullWidth
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={showUnavailable}
                onChange={(e) => setShowUnavailable(e.target.checked)}
              />
            }
            label="Show unavailable invigilators"
          />

          {candidates.length === 0 ? (
            <Typography color="text.secondary">No invigilators available for this slot.</Typography>
          ) : (
            <List dense sx={{ maxHeight: 280, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 1 }}>
              {candidates.map((c) => {
                const disabled = !c.available;
                const statusLabel = c.alreadyAssigned
                  ? "Assigned"
                  : c.hasConflict
                  ? "Busy"
                  : c.available
                  ? "Available"
                  : "Unavailable";
                const statusColor = c.available ? "success" : c.alreadyAssigned ? "warning" : "default";
                return (
                  <ListItemButton
                    key={c.invigilator.id}
                    selected={selectedId === c.invigilator.id}
                    onClick={() => !disabled && setSelectedId(c.invigilator.id)}
                    disabled={disabled}
                  >
                    <Radio checked={selectedId === c.invigilator.id} />
                    <ListItemText
                      primary={c.name}
                      secondary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="caption" color="text.secondary">
                            {c.invigilator.preferred_name && c.invigilator.full_name && c.invigilator.preferred_name !== c.invigilator.full_name
                              ? c.invigilator.full_name
                              : ""}
                          </Typography>
                          <Chip size="small" label={statusLabel} color={statusColor} />
                        </Stack>
                      }
                    />
                  </ListItemButton>
                );
              })}
            </List>
          )}

          <FormControl fullWidth size="small">
            <InputLabel>Role</InputLabel>
            <Select value={role} label="Role" onChange={(e) => setRole(String(e.target.value))}>
              {roleOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Break time (minutes)"
            type="number"
            value={breakMinutes}
            onChange={(e) => setBreakMinutes(e.target.value)}
            size="small"
            fullWidth
          />

          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            size="small"
            fullWidth
            multiline
            minRows={2}
          />

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <PillButton variant="outlined" onClick={onClose}>Cancel</PillButton>
        <PillButton
          variant="contained"
          onClick={() => assignMutation.mutate()}
          disabled={!canAssign || !selectedId || assignMutation.isPending}
        >
          {assignMutation.isPending ? "Assigning..." : "Assign invigilator"}
        </PillButton>
      </DialogActions>
    </Dialog>
  );
};

export default AssignInvigilatorDialog;
