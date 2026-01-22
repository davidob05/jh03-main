import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  InputBase,
  Box,
  Chip,
  Collapse,
  IconButton,
  TextField,
  Stack,
  Typography,
  Alert,
  Link as MUILink,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Close, ExpandMore, Search } from "@mui/icons-material";
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
  restrictions?: (string | { restrictions?: string[]; diet?: string })[];
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
    <DialogTitle sx={{ pr: 6, pb: 1.5 }}>
      Assign invigilator
      <IconButton
        aria-label="Close"
        onClick={onClose}
        sx={{ position: "absolute", right: 12, top: 10 }}
      >
        <Close />
      </IconButton>
    </DialogTitle>
    <DialogContent sx={{ pt: 0.5 }}>
      <AssignInvigilatorDialogBody
        open={open}
        examVenue={examVenue}
        invigilators={invigilators}
        assignments={assignments}
        onAssigned={onAssigned}
        onClose={onClose}
      />
    </DialogContent>
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
const restrictionLabels: Record<string, string> = {
  accessibility_required: "Accessibility required",
  separate_room_only: "Separate room only",
  purple_cluster: "Purple cluster",
  computer_cluster: "Computer cluster",
  vet_school: "Vet School",
  sec: "Scottish Event Campus",
  osce_golden_jubilee: "OSCE - Golden Jubilee",
  osce_wolfson: "OSCE - Wolfson",
  osce_queen_elizabeth: "OSCE - Queen Elizabeth",
  approved_exemption: "Approved exemption",
};

const formatQualification = (code: string) => qualificationLabels[code] || code;
const formatRequirement = (code: string) => restrictionLabels[code] || code;

const AssignInvigilatorDialogBody: React.FC<{
  open: boolean;
  examVenue: ExamVenue | null;
  invigilators: Invigilator[];
  assignments: InvigilatorAssignment[];
  onAssigned?: () => void;
  onClose: () => void;
}> = ({ open, examVenue, invigilators, assignments, onAssigned, onClose }) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const assignedAssignments = useMemo(() => {
    if (!examVenue) return [];
    return assignments.filter((a) => a.exam_venue === examVenue.examvenue_id);
  }, [assignments, examVenue]);

  const assignedIds = useMemo(() => new Set(assignedAssignments.map((a) => a.invigilator)), [assignedAssignments]);

  const assignmentByInvigilator = useMemo(() => {
    const map = new Map<number, InvigilatorAssignment>();
    assignedAssignments.forEach((assignment) => {
      map.set(assignment.invigilator, assignment);
    });
    return map;
  }, [assignedAssignments]);

  const selectionDelta = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    const toAdd = selectedIds.filter((id) => !assignedIds.has(id));
    const toRemove = Array.from(assignedIds).filter((id) => !selectedSet.has(id));
    return {
      toAdd,
      toRemove,
      hasChanges: toAdd.length > 0 || toRemove.length > 0,
    };
  }, [assignedIds, selectedIds]);

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

  useEffect(() => {
    if (!open) return;
    setSelectedIds(Array.from(new Set(assignedAssignments.map((a) => a.invigilator))));
    setError(null);
  }, [assignedAssignments, examVenue?.examvenue_id, open]);

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
    const base = invigilators.filter((i) => !i.resigned || assignedIds.has(i.id));
    const query = search.trim().toLowerCase();
    const searched = query ? base.filter((i) => displayName(i).toLowerCase().includes(query)) : base;
    if (!onlyAvailable || !slotInfo) return searched;
    return searched.filter((invigilator) => {
      if (assignedIds.has(invigilator.id)) return true;
      const entry = invigilator.availabilities?.find(
        (a) => a.date === slotInfo.dateKey && a.slot === slotInfo.slot
      );
      if (hasConflict(invigilator.id)) return false;
      if (!entry) return false; // If no availability recorded for the exam slot, treat as unavailable
      return entry.available;
    });
  }, [assignedIds, invigilators, search, onlyAvailable, slotInfo, examWindow, assignments]);

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!examVenue) throw new Error("Exam venue is missing.");
      const selectedSet = new Set(selectedIds);
      const toAdd = selectedIds.filter((id) => !assignedIds.has(id));
      const toRemove = Array.from(assignedIds).filter((id) => !selectedSet.has(id));
      if (toAdd.length === 0 && toRemove.length === 0) {
        throw new Error("No assignment changes to save.");
      }
      const failures: { id: number; error: string; action: "assign" | "unassign" }[] = [];
      for (const invigilatorId of toRemove) {
        const assignment = assignmentByInvigilator.get(invigilatorId);
        if (!assignment) {
          failures.push({ id: invigilatorId, error: "Assignment not found.", action: "unassign" });
          continue;
        }
        const response = await apiFetch(`${apiBaseUrl}/invigilator-assignments/${assignment.id}/`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const text = await response.text();
          failures.push({ id: invigilatorId, error: text || "Failed to unassign.", action: "unassign" });
        }
      }
      if (toAdd.length > 0) {
        if (!examWindow) {
          throw new Error("Exam start time or duration is missing.");
        }
        for (const invigilatorId of toAdd) {
          const response = await apiFetch(`${apiBaseUrl}/invigilator-assignments/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              invigilator: invigilatorId,
              exam_venue: examVenue.examvenue_id,
              role: "assistant",
              assigned_start: examWindow.start.toISOString(),
              assigned_end: examWindow.end.toISOString(),
              break_time_minutes: 0,
              confirmed: false,
            }),
          });
          if (!response.ok) {
            const text = await response.text();
            failures.push({ id: invigilatorId, error: text || "Failed to assign.", action: "assign" });
          }
        }
      }
      if (failures.length) {
        const names = failures
          .map((f) => displayName(invigilators.find((i) => i.id === f.id) || { id: f.id, preferred_name: null, full_name: null, resigned: false }))
          .join(", ");
        const hasAssignFailures = failures.some((f) => f.action === "assign");
        const hasUnassignFailures = failures.some((f) => f.action === "unassign");
        let actionLabel = "update";
        if (hasAssignFailures && hasUnassignFailures) actionLabel = "assign/unassign";
        else if (hasAssignFailures) actionLabel = "assign";
        else if (hasUnassignFailures) actionLabel = "unassign";
        throw new Error(`Failed to ${actionLabel} ${failures.length} invigilator(s): ${names}`);
      }
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invigilator-assignments"] });
      onAssigned?.();
      onClose();
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to update invigilator assignments.");
    },
  });

  const canUpdate = Boolean(examVenue)
    && selectionDelta.hasChanges
    && (selectionDelta.toAdd.length === 0 || Boolean(examWindow));

  const toggleSelected = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  };

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const requirementLabelsFor = (invigilator: Invigilator) => {
    const raw = invigilator.restrictions || [];
    const codes = raw.flatMap((entry) => {
      if (!entry) return [];
      if (typeof entry === "string") return [entry];
      if (Array.isArray(entry.restrictions)) return entry.restrictions.filter(Boolean) as string[];
      return [];
    });
    return Array.from(new Set(codes.map(formatRequirement))).filter(Boolean);
  };

  const toneStyles = (tone: "success" | "error" | "warning" | "info" | "default", solid?: boolean) => {
    const palette: Record<typeof tone, { bg: string; fg: string; solidBg: string }> = {
      success: { bg: alpha("#2e7d32", 0.12), fg: "#166534", solidBg: "#2e7d32" },
      warning: { bg: alpha("#ed6c02", 0.12), fg: "#b45309", solidBg: "#ed6c02" },
      info: { bg: "#e3f2fd", fg: "primary.main", solidBg: "#1d4ed8" },
      error: { bg: alpha("#b91c1c", 0.12), fg: "#b91c1c", solidBg: "#dc2626" },
      default: { bg: "#f5f5f5", fg: "#424242", solidBg: "#424242" },
    };
    const colors = palette[tone] || palette.default;
    if (solid) {
      return { bg: colors.solidBg, fg: "#fff" };
    }
    return { bg: colors.bg, fg: colors.fg };
  };

  const pluralize = (count: number, singular: string, plural?: string) =>
    count === 1 ? singular : plural || `${singular}s`;

  return (
    <Stack spacing={2}>
      {examVenue ? (
        <Stack spacing={0.25} sx={{ bgcolor: "grey.50", borderRadius: 2, p: 2, border: "1px solid", borderColor: "divider" }}>
          <Typography
            variant="overline"
            sx={{
              color: "text.secondary",
              letterSpacing: 0.8,
              lineHeight: 1.1,
              mb: 0,
            }}
          >
            Venue
          </Typography>
          <Typography variant="h6" fontWeight={700}>{examVenue.venue_name || "Unassigned"}</Typography>
          <Typography variant="body2" color="text.secondary">
            {formatDisplayDate(examVenue.start_time)} • {formatDuration(examVenue.exam_length)}
          </Typography>
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No exam venue selected.
        </Typography>
      )}

      <Stack spacing={0.75}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>Invigilators</Typography>
            <Typography variant="caption" color="text.secondary">
              Select or deselect invigilators to assign or unassign to this exam.
            </Typography>
          </Box>
          <FormControlLabel
            control={<Checkbox checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} />}
            label="Available"
            sx={{ m: 0, "& .MuiFormControlLabel-label": { fontSize: 12, color: "text.secondary" } }}
          />
        </Stack>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            backgroundColor: "action.hover",
            borderRadius: 1,
            px: 2,
            py: 0.75,
          }}
        >
          <Search sx={{ color: "action.active", mr: 1 }} />
          <InputBase
            placeholder="Search invigilators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: "100%" }}
          />
        </Box>
        {filteredInvigilators.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No invigilators available.</Typography>
        ) : (
          <Stack spacing={1.25}>
            {filteredInvigilators.map((invigilator) => {
              const assigned = assignedIds.has(invigilator.id);
              const isSelected = selectedIds.includes(invigilator.id);
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
              if (!availabilityLabel && hasConflict(invigilator.id)) {
                availabilityLabel = "Conflicts with another shift";
              }
              let assignmentLabel: string | null = null;
              if (assigned && isSelected) assignmentLabel = "Assigned to this exam";
              if (assigned && !isSelected) assignmentLabel = "Will be unassigned";
              if (!assigned && isSelected) assignmentLabel = "Will be assigned";
              const qualificationNames = Array.from(
                new Set(
                  (invigilator.qualifications || [])
                    .map((q) => formatQualification(q.qualification))
                    .filter(Boolean)
                )
              );
              const requirementNames = requirementLabelsFor(invigilator);
              const summaryParts = [
                qualificationNames.length ? `${qualificationNames.length} qualification${qualificationNames.length > 1 ? "s" : ""}` : null,
                requirementNames.length ? `${requirementNames.length} requirement${requirementNames.length > 1 ? "s" : ""}` : null,
              ].filter(Boolean);
              const statusChips: { label: string; tone: "success" | "error" | "warning" | "info" | "default"; solid?: boolean }[] = [];
              if (assigned && isSelected) statusChips.push({ label: "Assigned", tone: "success", solid: true });
              if (assigned && !isSelected) statusChips.push({ label: "Unassigning", tone: "error", solid: true });
              if (!assigned && isSelected) statusChips.push({ label: "Assigning", tone: "success" });
              if (conflict) statusChips.push({ label: "Has conflict", tone: "error", solid: true });
              if (availabilityLabel) {
                const available = availabilityLabel.toLowerCase().startsWith("available");
                statusChips.push({ label: available ? "Available" : "Unavailable", tone: available ? "success" : "warning", solid: !available });
              }
              if (invigilator.resigned) statusChips.push({ label: "Resigned", tone: "default" });

              return (
                <Box
                  key={invigilator.id}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1.5,
                    overflow: "hidden",
                    backgroundColor: "background.paper",
                    boxShadow: "0 4px 12px rgba(18, 38, 63, 0.05)",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      px: 1.25,
                      py: 1,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Checkbox
                      checked={selectedIds.includes(invigilator.id)}
                      onChange={() => toggleSelected(invigilator.id)}
                      disabled={!assigned && conflict}
                      inputProps={{ "aria-label": displayName(invigilator) }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={700} noWrap title={displayName(invigilator)}>
                        <MUILink
                          href={`/admin/invigilators/${invigilator.id}`}
                          underline="none"
                          color="primary"
                          sx={{ fontWeight: 700, "&:hover": { textDecoration: "none" } }}
                        >
                          {displayName(invigilator)}
                        </MUILink>
                      </Typography>
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" rowGap={0.75} sx={{ mt: 0.5 }}>
                        {statusChips.map((chip) => {
                          const tone = toneStyles(chip.tone, chip.solid);
                          return (
                            <Chip
                              key={chip.label}
                              label={chip.label}
                              size="small"
                              variant="outlined"
                              sx={{
                                fontWeight: 600,
                                borderRadius: 999,
                                px: 0.75,
                                bgcolor: tone.bg,
                                color: tone.fg,
                                borderColor: "transparent",
                              }}
                            />
                          );
                        })}
                      </Stack>
                      {summaryParts.length > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                          {summaryParts.join(" / ")}
                        </Typography>
                      )}
                      {assignmentLabel && (
                        <Typography variant="caption" color="text.secondary">
                          {assignmentLabel}
                        </Typography>
                      )}
                      {conflict && (
                        <Typography variant="caption" color="error.main">
                          Conflicts with existing shift
                        </Typography>
                      )}
                    </Box>
                    <IconButton
                      onClick={() => toggleExpanded(invigilator.id)}
                      size="small"
                      aria-label="Toggle details"
                      sx={{
                        transform: expandedIds.has(invigilator.id) ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.15s ease",
                        color: "text.secondary",
                      }}
                    >
                      <ExpandMore />
                    </IconButton>
                  </Box>
                  <Collapse in={expandedIds.has(invigilator.id)} timeout="auto" unmountOnExit>
                    <Box sx={{ px: 2, py: 1.5 }}>
                      <Stack spacing={1}>
                        <Stack spacing={0.5}>
                          <Typography variant="caption" color="text.secondary" fontWeight={700}>Qualifications</Typography>
                            {qualificationNames.length ? (
                              <Stack direction="row" spacing={0.75} flexWrap="wrap" rowGap={0.75}>
                                {qualificationNames.map((q) => (
                                  <Chip
                                    key={q}
                                    label={q}
                                    size="small"
                                    variant="filled"
                                    sx={{
                                      borderRadius: 999,
                                      bgcolor: "#e3f2fd",
                                      color: "primary.main",
                                      borderColor: "transparent",
                                      fontWeight: 600,
                                    }}
                                  />
                                ))}
                              </Stack>
                          ) : (
                            <Typography variant="body2" color="text.secondary">None recorded.</Typography>
                          )}
                        </Stack>
                        <Stack spacing={0.5}>
                          <Typography variant="caption" color="text.secondary" fontWeight={700}>Requirements</Typography>
                            {requirementNames.length ? (
                              <Stack direction="row" spacing={0.75} flexWrap="wrap" rowGap={0.75}>
                                {requirementNames.map((r) => (
                                  <Chip
                                    key={r}
                                    label={r}
                                    size="small"
                                    variant="filled"
                                    sx={{
                                      borderRadius: 999,
                                      bgcolor: "#fff4e5",
                                      color: "#b45309",
                                      borderColor: "transparent",
                                      fontWeight: 600,
                                    }}
                                  />
                                ))}
                              </Stack>
                          ) : (
                            <Typography variant="body2" color="text.secondary">No requirements recorded.</Typography>
                          )}
                        </Stack>
                        {availabilityLabel && (
                          <Typography variant="body2" color="text.secondary">
                            {availabilityLabel}
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
          </Stack>
        )}
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {/** Helper to keep singular/plural tidy */}      
      <PillButton
        variant="contained"
        onClick={() => assignMutation.mutate()}
        disabled={!canUpdate || assignMutation.isPending}
      >
        {assignMutation.isPending
          ? "Updating..."
          : selectionDelta.toAdd.length && selectionDelta.toRemove.length
            ? "Update assignments"
            : selectionDelta.toAdd.length
              ? `Assign ${selectionDelta.toAdd.length} ${pluralize(selectionDelta.toAdd.length, "invigilator")}`
              : selectionDelta.toRemove.length
                ? `Unassign ${selectionDelta.toRemove.length} ${pluralize(selectionDelta.toRemove.length, "invigilator")}`
                : "Update assignments"}
      </PillButton>
    </Stack>
  );
};
