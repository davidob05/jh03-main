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
} from "@mui/material";
import { Search } from "@mui/icons-material";
import { PillButton } from "../PillButton";

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
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>Assign invigilator</DialogTitle>
    <DialogContent dividers>
      <AssignInvigilatorDialogBody
        examVenue={examVenue}
        invigilators={invigilators}
        assignments={assignments}
      />
    </DialogContent>
    <DialogActions>
      <PillButton variant="outlined" onClick={onClose}>
        Close
      </PillButton>
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
}> = ({ examVenue, invigilators, assignments }) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showResigned, setShowResigned] = useState(false);
  const slotInfo = useMemo(() => {
    if (!examVenue?.start_time) return null;
    const start = new Date(examVenue.start_time);
    if (Number.isNaN(start.getTime())) return null;
    const slot: SlotCode = start.getHours() < 12 ? "MORNING" : "EVENING";
    const dateKey = start.toISOString().slice(0, 10);
    return { slot, dateKey };
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
    if (!query) return base;
    return base.filter((i) => displayName(i).toLowerCase().includes(query));
  }, [invigilators, search, showResigned]);

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
    </Stack>
  );
};
