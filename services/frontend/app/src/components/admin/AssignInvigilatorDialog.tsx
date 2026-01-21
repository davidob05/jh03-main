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
  Radio,
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

const AssignInvigilatorDialogBody: React.FC<{
  examVenue: ExamVenue | null;
  invigilators: Invigilator[];
  assignments: InvigilatorAssignment[];
  onAssigned?: () => void;
  onClose: () => void;
}> = ({ examVenue, invigilators, assignments, onAssigned, onClose }) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
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
  const assignedIds = useMemo(() => {
    if (!examVenue) return new Set<number>();
    return new Set(
      assignments
        .filter((a) => a.exam_venue === examVenue.examvenue_id)
        .map((a) => a.invigilator)
    );
  }, [assignments, examVenue]);
  const filteredInvigilators = useMemo(() => {
    const base = showResigned ? invigilators : invigilators.filter((i) => !i.resigned);
    const query = search.trim().toLowerCase();
    const searched = query ? base.filter((i) => displayName(i).toLowerCase().includes(query)) : base;
    if (!onlyAvailable || !slotInfo) return searched;
    return searched.filter((invigilator) => {
      const entry = invigilator.availabilities?.find(
        (a) => a.date === slotInfo.dateKey && a.slot === slotInfo.slot
      );
      return entry ? entry.available : true;
    });
  }, [invigilators, search, showResigned, onlyAvailable, slotInfo]);

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) throw new Error("Select an invigilator first.");
      if (!examVenue?.start_time || examVenue.exam_length == null) {
        throw new Error("Exam start time or duration is missing.");
      }
      const start = dayjs(examVenue.start_time);
      if (!start.isValid()) throw new Error("Exam start time is invalid.");
      const end = start.add(examVenue.exam_length, "minute");

      const response = await apiFetch(`${apiBaseUrl}/invigilator-assignments/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invigilator: selectedId,
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
        throw new Error(text || "Failed to assign invigilator.");
      }
      return response.json();
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
              let availabilityLabel: string | null = null;
              if (slotInfo && invigilator.availabilities) {
                const entry = invigilator.availabilities.find(
                  (a) => a.date === slotInfo.dateKey && a.slot === slotInfo.slot
                );
                if (entry) {
                  availabilityLabel = entry.available ? "Available for this slot" : "Unavailable for this slot";
                }
              }
              const secondaryParts = [
                assigned ? "Already assigned to this exam" : null,
                availabilityLabel,
              ].filter(Boolean);
              return (
                <ListItemButton
                  key={invigilator.id}
                  selected={selectedId === invigilator.id}
                  onClick={() => setSelectedId(invigilator.id)}
                  disabled={assigned}
                >
                  <Radio checked={selectedId === invigilator.id} />
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
        disabled={!selectedId || assignMutation.isPending}
      >
        {assignMutation.isPending ? "Assigning..." : "Assign invigilator"}
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
