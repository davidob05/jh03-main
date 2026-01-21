import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
  Alert,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import dayjs from "dayjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PillButton } from "../PillButton";
import { apiBaseUrl, apiFetch } from "../../utils/api";

type ExamVenue = {
  examvenue_id: number;
  venue_name: string | null;
  start_time: string | null;
  exam_length: number | null;
  core: boolean;
};

type Invigilator = {
  id: number;
  preferred_name: string | null;
  full_name: string | null;
  resigned: boolean;
  availabilities?: InvigilatorAvailability[];
  qualifications?: { qualification: string }[];
};

type InvigilatorAvailability = {
  date: string;
  slot: SlotCode;
  available: boolean;
};

type InvigilatorAssignment = {
  id: number;
  invigilator: number;
  exam_venue: number;
  assigned_start: string;
  assigned_end: string;
  cancel?: boolean;
};

type SlotCode = "MORNING" | "EVENING";

type AssignInvigilatorDialogProps = {
  open: boolean;
  onClose: () => void;
  examVenue: ExamVenue | null;
  invigilators: Invigilator[];
  assignments: InvigilatorAssignment[];
  onAssigned?: () => void;
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

export const AssignInvigilatorDialog: React.FC<AssignInvigilatorDialogProps> = ({
  open,
  onClose,
  examVenue,
  invigilators,
  assignments,
  onAssigned,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>Assign invigilator</DialogTitle>
    <DialogContent dividers>
      <AssignInvigilatorDialogBody
        examVenue={examVenue}
        invigilators={invigilators}
        assignments={assignments}
        onAssigned={onAssigned}
        onClose={onClose}
      />
    </DialogContent>
    <DialogActions>
      <AssignInvigilatorDialogActions examVenue={examVenue} onClose={onClose} />
    </DialogActions>
  </Dialog>
);

export default AssignInvigilatorDialog;

const displayName = (invigilator: Invigilator) =>
  invigilator.preferred_name || invigilator.full_name || `Invigilator #${invigilator.id}`;

const qualificationLabels: Record<string, string> = {
  SENIOR_INVIGILATOR: "Senior Invigilator",
  AKT_TRAINED: "AKT Trained",
  CHECK_IN: "Check-In",
};

const formatQualification = (code: string) => qualificationLabels[code] || code;

const AssignInvigilatorDialogBody: React.FC<{
  examVenue: ExamVenue | null;
  invigilators: Invigilator[];
  assignments: InvigilatorAssignment[];
  onAssigned?: () => void;
  onClose: () => void;
}> = ({ examVenue, invigilators, assignments, onAssigned, onClose }) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [showResigned, setShowResigned] = useState(false);
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const slotInfo = useMemo(() => {
    if (!examVenue?.start_time) return null;
    const start = dayjs(examVenue.start_time);
    if (!start.isValid()) return null;
    const slot: SlotCode = start.hour() < 12 ? "MORNING" : "EVENING";
    return { slot, dateKey: start.format("YYYY-MM-DD") };
  }, [examVenue?.start_time]);
  const examWindow = useMemo(() => {
    if (!examVenue?.start_time || examVenue.exam_length == null) return null;
    const start = dayjs(examVenue.start_time);
    if (!start.isValid()) return null;
    return { start, end: start.add(examVenue.exam_length, "minute") };
  }, [examVenue?.start_time, examVenue?.exam_length]);
  const assignedIds = useMemo(() => {
    if (!examVenue) return new Set<number>();
    return new Set(
      assignments
        .filter((a) => a.exam_venue === examVenue.examvenue_id)
        .map((a) => a.invigilator)
    );
  }, [assignments, examVenue]);
  const hasConflict = (invigilatorId: number) => {
    if (!examWindow) return false;
    return assignments.some((assignment) => {
      if (assignment.invigilator !== invigilatorId) return false;
      if (assignment.cancel) return false;
      if (examVenue && assignment.exam_venue === examVenue.examvenue_id) return false;
      const start = dayjs(assignment.assigned_start);
      const end = dayjs(assignment.assigned_end);
      if (!start.isValid() || !end.isValid()) return false;
      return start.isBefore(examWindow.end) && examWindow.start.isBefore(end);
    });
  };
  const filteredInvigilators = useMemo(() => {
    const base = showResigned ? invigilators : invigilators.filter((i) => !i.resigned);
    const query = search.trim().toLowerCase();
    const searched = query ? base.filter((i) => displayName(i).toLowerCase().includes(query)) : base;
    if (!onlyAvailable || !slotInfo) return searched;
    return searched.filter((invigilator) => {
      const entry = invigilator.availabilities?.find(
        (a) => a.date === slotInfo.dateKey && a.slot === slotInfo.slot
      );
      if (hasConflict(invigilator.id)) return false;
      return entry ? entry.available : true;
    });
  }, [invigilators, search, showResigned, onlyAvailable, slotInfo, examWindow, assignments]);

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (selectedIds.length === 0) throw new Error("Select at least one invigilator.");
      if (!examVenue?.start_time || examVenue.exam_length == null) {
        throw new Error("Exam start time or duration is missing.");
      }
      const start = dayjs(examVenue.start_time);
      if (!start.isValid()) throw new Error("Exam start time is invalid.");
      const end = start.add(examVenue.exam_length, "minute");
      const failures: { id: number; error: string }[] = [];
      for (const invigilatorId of selectedIds) {
        const response = await apiFetch(`${apiBaseUrl}/invigilator-assignments/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invigilator: invigilatorId,
            exam_venue: examVenue.examvenue_id,
            role: "assistant",
            assigned_start: start.toISOString(),
            assigned_end: end.toISOString(),
            break_time_minutes: 0,
            confirmed: false,
          }),
        });
        if (!response.ok) {
          const text = await response.text();
          failures.push({ id: invigilatorId, error: text || "Failed to assign." });
        }
      }
      if (failures.length) {
        const names = failures
          .map((f) => displayName(invigilators.find((i) => i.id === f.id) || { id: f.id, preferred_name: null, full_name: null, resigned: false }))
          .join(", ");
        throw new Error(`Failed to assign ${failures.length} invigilator(s): ${names}`);
      }
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invigilator-assignments"] });
      onAssigned?.();
      onClose();
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to assign invigilator.");
    },
  });
  const canAssign = Boolean(examWindow);
  const toggleSelected = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  };

  return (
    <Stack spacing={2}>
      {examVenue ? (
        <Stack spacing={0.75}>
          <Typography variant="subtitle2" color="text.secondary">Venue</Typography>
          <Typography variant="body1" fontWeight={600}>{examVenue.venue_name || "Unassigned"}</Typography>
          <Typography variant="body2" color="text.secondary">
            {formatDisplayDate(examVenue.start_time)} • {formatDuration(examVenue.exam_length)}
          </Typography>
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No exam venue selected.
        </Typography>
      )}

      <Stack spacing={0.5}>
        <Typography variant="subtitle2" color="text.secondary">Invigilators</Typography>
        <TextField
          size="small"
          placeholder="Search invigilators"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <FormControlLabel
          control={<Checkbox checked={showResigned} onChange={(e) => setShowResigned(e.target.checked)} />}
          label="Show resigned"
        />
        <FormControlLabel
          control={<Checkbox checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} />}
          label="Only show available"
        />
        {filteredInvigilators.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No invigilators available.</Typography>
        ) : (
          <List dense sx={{ border: "1px solid #e5e7eb", borderRadius: 1 }}>
            {filteredInvigilators.map((invigilator) => {
              const assigned = assignedIds.has(invigilator.id);
              const conflict = hasConflict(invigilator.id);
              let availabilityLabel: string | null = null;
              if (slotInfo && invigilator.availabilities) {
                const entry = invigilator.availabilities.find(
                  (a) => a.date === slotInfo.dateKey && a.slot === slotInfo.slot
                );
                if (entry) {
                  availabilityLabel = entry.available ? "Available for this slot" : "Unavailable for this slot";
                }
              }
              const qualificationNames = Array.from(
                new Set(
                  (invigilator.qualifications || [])
                    .map((q) => formatQualification(q.qualification))
                    .filter(Boolean)
                )
              );
              const qualificationsLabel = `Qualifications: ${
                qualificationNames.length ? qualificationNames.join(", ") : "None"
              }`;
              const secondaryParts = [
                assigned ? "Already assigned to this exam" : null,
                conflict ? "Conflicts with existing shift" : null,
                availabilityLabel,
                qualificationsLabel,
              ].filter(Boolean);
              return (
                <ListItemButton
                  key={invigilator.id}
                  selected={selectedIds.includes(invigilator.id)}
                  onClick={() => toggleSelected(invigilator.id)}
                  disabled={assigned || conflict}
                >
                  <Checkbox checked={selectedIds.includes(invigilator.id)} />
                  <ListItemText
                    primary={displayName(invigilator)}
                    secondary={secondaryParts.length ? secondaryParts.join(" • ") : undefined}
                  />
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      <PillButton
        variant="contained"
        onClick={() => assignMutation.mutate()}
        disabled={selectedIds.length === 0 || !canAssign || assignMutation.isPending}
      >
        {assignMutation.isPending ? "Assigning..." : `Assign ${selectedIds.length || 0} invigilator(s)`}
      </PillButton>
    </Stack>
  );
};

const AssignInvigilatorDialogActions: React.FC<{
  examVenue: ExamVenue | null;
  onClose: () => void;
}> = ({ examVenue, onClose }) => (
  <>
    {examVenue?.start_time ? null : (
      <Typography variant="caption" color="text.secondary">
        Exam time not set
      </Typography>
    )}
    <PillButton variant="outlined" onClick={onClose}>
      Close
    </PillButton>
  </>
);
