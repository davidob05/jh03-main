import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputBase,
  Paper,
  Radio,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Toolbar,
  Typography,
  Collapse,
  Snackbar,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Search as SearchIcon, ExpandMore as ExpandMoreIcon, Delete as DeleteIcon, Close } from "@mui/icons-material";
import { apiBaseUrl, apiFetch } from "../../utils/api";
import { formatTime } from "../../utils/dates";
import { Panel } from "../../components/Panel";
import { DeleteConfirmationDialog } from "../../components/admin/DeleteConfirmationDialog";
import { PillButton } from "../../components/PillButton";

type StudentProvisionRow = {
  student_id: string;
  student_name: string;
  exam_id: number;
  exam_name: string;
  course_code: string;
  provisions: string[];
  notes?: string | null;
  exam_venue_id: number | null;
  exam_venue_caps: string[];
  venue_name: string | null;
  venue_type: string | null;
  venue_accessible: boolean | null;
  required_capabilities: string[];
  allowed_venue_types: string[];
  matches_needs: boolean;
  allocation_issue?: string | null;
  student_exam_id: number | null;
};

type ExamVenueOption = {
  examvenue_id: number;
  exam: number;
  venue_name: string | null;
  start_time: string | null;
  exam_length: number | null;
  core: boolean;
  provision_capabilities: string[];
  venue_type?: string | null;
  venue_accessible?: boolean | null;
};

type ExamDetailResponse = {
  exam_id: number;
  exam_name: string;
  course_code: string;
  exam_venues: ExamVenueOption[];
};

type Order = "asc" | "desc";

const formatLabel = (text?: string | null): string => {
  if (!text) return "Unknown";
  const spaced = text.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const formatDuration = (minutes?: number | null): string => {
  if (minutes == null || Number.isNaN(minutes)) return "N/A";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return [hrs ? `${hrs}h` : "", mins ? `${mins}m` : ""].filter(Boolean).join(" ") || "0m";
};

const formatTimeWindow = (start?: string | null, minutes?: number | null): string => {
  if (!start) return "Time TBC";
  const parsed = new Date(start);
  if (Number.isNaN(parsed.getTime())) return "Time TBC";
  const end = new Date(parsed.getTime() + ((minutes || 0) * 60 * 1000));
  const startLabel = formatTime(parsed, "Time TBC");
  const endLabel = formatTime(end, "Time TBC");
  return `${startLabel} - ${endLabel}`;
};

const fetchStudentProvisions = async (unallocatedOnly = false): Promise<StudentProvisionRow[]> => {
  const suffix = unallocatedOnly ? "?unallocated=1" : "";
  const response = await apiFetch(`${apiBaseUrl}/students/provisions/${suffix}`);
  if (!response.ok) throw new Error("Unable to load student provisions");
  return response.json();
};

const fetchExamVenues = async (examId: number): Promise<ExamDetailResponse> => {
  const response = await apiFetch(`${apiBaseUrl}/exams/${examId}/`);
  if (!response.ok) throw new Error("Unable to load exam venues");
  return response.json();
};

const updateStudentExamVenue = async (studentExamId: number, examVenueId: number | null): Promise<StudentProvisionRow> => {
  const response = await apiFetch(`${apiBaseUrl}/students/provisions/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_exam_id: studentExamId, exam_venue_id: examVenueId }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to update student venue");
  }
  return response.json();
};

const deleteStudentProvision = async (row: StudentProvisionRow): Promise<void> => {
  const response = await apiFetch(`${apiBaseUrl}/students/provisions/`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      student_exam_id: row.student_exam_id,
      student_id: row.student_id,
      exam_id: row.exam_id,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Delete failed");
  }
};

type SectionProps = {
  search: string;
  onSearchChange: (value: string) => void;
  query: ReturnType<typeof useQuery<StudentProvisionRow[], Error>>;
  emptyLabel: string;
};

type VenueDialogState = {
  studentExamId: number;
  examId: number;
  currentExamVenueId: number | null;
  studentName: string;
  examName: string;
};

type ChangeVenueDialogProps = VenueDialogState & {
  open: boolean;
  onClose: () => void;
  onSuccess?: (row: StudentProvisionRow, venueLabel: string) => void;
};

const ChangeVenueDialog: React.FC<ChangeVenueDialogProps> = ({
  open,
  onClose,
  onSuccess,
  studentExamId,
  examId,
  currentExamVenueId,
  studentName,
  examName,
}) => {
  const queryClient = useQueryClient();
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(currentExamVenueId ?? null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery<ExamDetailResponse, Error>({
    queryKey: ["exam-venues", examId],
    queryFn: () => fetchExamVenues(examId),
    enabled: open && Boolean(examId),
  });

  useEffect(() => {
    if (!open) return;
    const defaultVenue = currentExamVenueId ?? data?.exam_venues?.[0]?.examvenue_id ?? null;
    setSelectedVenueId(defaultVenue);
    setSaveError(null);
  }, [open, currentExamVenueId, data]);

  const mutation = useMutation<StudentProvisionRow, Error, number | null>({
    mutationFn: (venueId: number | null) => updateStudentExamVenue(studentExamId, venueId),
    onSuccess: (updatedRow) => {
      const updateCache = (key: any[], filterAllocated = false) =>
        queryClient.setQueryData<StudentProvisionRow[] | undefined>(key, (old) => {
          if (!old) return old;
          const exists = old.some((r) => r.student_exam_id === updatedRow.student_exam_id);
          if (!exists) return old;
          const mapped = old.map((r) => (r.student_exam_id === updatedRow.student_exam_id ? updatedRow : r));
          return filterAllocated ? mapped.filter((r) => !r.matches_needs) : mapped;
        });
      updateCache(["student-provisions", "all"]);
      updateCache(["student-provisions", "unallocated"], true);
      const matchedVenue = venues.find((venue) => venue.examvenue_id === selectedVenueId);
      const venueLabel = matchedVenue?.venue_name || "Unassigned venue";
      onSuccess?.(updatedRow, venueLabel);
      onClose();
    },
    onError: (err: any) => setSaveError(err?.message || "Failed to update venue"),
  });

  const venues = data?.exam_venues || [];

  const capabilityLabels = (caps: string[] = []) => Array.from(new Set(caps.map(formatLabel)));

  const handleSave = () => {
    setSaveError(null);
    mutation.mutate(selectedVenueId);
  };

  const disableSave = selectedVenueId === currentExamVenueId || mutation.isLoading || !studentExamId;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        Change venue for {studentName}
        <Typography variant="body2" color="text.secondary">{examName}</Typography>
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ position: "absolute", right: 12, top: 10 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {isLoading ? (
          <Stack spacing={1.5}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="rounded" height={88} />
            ))}
          </Stack>
        ) : isError ? (
          <Alert severity="error">{error?.message || "Failed to load venues for this exam"}</Alert>
        ) : venues.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No venues found for this exam.</Typography>
        ) : (
          <Stack spacing={1.5}>
            {venues.map((v) => {
              const selected = selectedVenueId === v.examvenue_id;
              const badges = capabilityLabels(v.provision_capabilities);
              return (
                <Paper
                  key={v.examvenue_id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderColor: selected ? "primary.main" : "divider",
                    boxShadow: selected ? "0 0 0 1px rgba(25,118,210,0.2)" : "none",
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <Radio
                      checked={selected}
                      onChange={() => setSelectedVenueId(v.examvenue_id)}
                      value={v.examvenue_id}
                      inputProps={{ "aria-label": v.venue_name || "Unassigned venue" }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" rowGap={0.5}>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {v.venue_name || "Unassigned venue"}
                        </Typography>
                        {v.core ? <Chip size="small" label="Core" color="primary" variant="outlined" /> : null}
                        {v.venue_type ? <Chip size="small" label={formatLabel(v.venue_type)} /> : null}
                        {v.venue_accessible ? <Chip size="small" label="Accessible" color="success" variant="outlined" /> : null}
                      </Stack>
                      <Typography variant="body2" color="text.secondary" mt={0.5}>
                        {formatTimeWindow(v.start_time, v.exam_length)} • Duration: {formatDuration(v.exam_length)}
                      </Typography>
                      {badges.length ? (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap mt={1}>
                          {badges.map((cap) => (
                            <Chip key={cap} label={cap} size="small" />
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary" mt={1}>
                          No special capabilities recorded.
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}
        {saveError ? <Alert severity="error" sx={{ mt: 2 }}>{saveError}</Alert> : null}
      </DialogContent>
      <DialogActions>
        <PillButton variant="contained" onClick={handleSave} disabled={disableSave}>
          {mutation.isLoading ? "Saving..." : "Save"}
        </PillButton>
      </DialogActions>
    </Dialog>
  );
};

const StudentTableSection: React.FC<SectionProps> = ({
  search,
  onSearchChange,
  query,
  emptyLabel,
}) => {
  const rows = query.data || [];
  const rowKey = useCallback((row: StudentProvisionRow) => `${row.student_id}::${row.exam_id}`, []);
  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<keyof StudentProvisionRow>("student_name");
  const [selected, setSelected] = useState<string[]>([]);
  const [openRows, setOpenRows] = useState<Record<string, boolean>>({});
  const [venueDialog, setVenueDialog] = useState<VenueDialogState | null>(null);
  const [venueSnackbar, setVenueSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: "" });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTargets, setDeleteTargets] = useState<StudentProvisionRow[]>([]);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation<void, Error, StudentProvisionRow[]>({
    mutationFn: async (targets: StudentProvisionRow[]) => {
      for (const target of targets) {
        await deleteStudentProvision(target);
      }
    },
    onSuccess: (_data, targets) => {
      const deletedKeys = new Set(targets.map(rowKey));
      setSelected((prev) => prev.filter((key) => !deletedKeys.has(key)));
      setDeleteOpen(false);
      setDeleteTargets([]);
      setDeleteError(null);
      queryClient.invalidateQueries({ queryKey: ["student-provisions"] });
    },
    onError: (err: any) => setDeleteError(err?.message || "Delete failed"),
  });
  const handleRequestSort = (_: React.MouseEvent<unknown>, property: keyof StudentProvisionRow) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const haystack = [
        row.student_id,
        row.student_name,
        row.exam_name,
        row.course_code,
        ...(row.provisions || []),
        ...(row.required_capabilities || []),
        ...(row.allowed_venue_types || []),
        ...(row.exam_venue_caps || []),
        row.venue_name || "",
        row.venue_type || "",
        row.allocation_issue || "",
        row.notes || "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search]);

  const sorted = useMemo(() => {
    const comparator = (a: StudentProvisionRow, b: StudentProvisionRow) => {
      const valA = (a[orderBy] ?? "") as any;
      const valB = (b[orderBy] ?? "") as any;
      if (valA < valB) return order === "asc" ? -1 : 1;
      if (valA > valB) return order === "asc" ? 1 : -1;
      return 0;
    };
    return [...filtered].sort(comparator);
  }, [filtered, order, orderBy]);

  const rowMap = useMemo(() => {
    const map = new Map<string, StudentProvisionRow>();
    rows.forEach((row) => map.set(rowKey(row), row));
    return map;
  }, [rows, rowKey]);
  const visibleKeys = useMemo(() => filtered.map(rowKey), [filtered, rowKey]);
  const visibleKeySet = useMemo(() => new Set(visibleKeys), [visibleKeys]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedVisibleCount = useMemo(
    () => visibleKeys.reduce((count, key) => count + (selectedSet.has(key) ? 1 : 0), 0),
    [visibleKeys, selectedSet]
  );
  const allVisibleSelected = visibleKeys.length > 0 && selectedVisibleCount === visibleKeys.length;

  useEffect(() => {
    setSelected((prev) => prev.filter((key) => visibleKeySet.has(key)));
  }, [visibleKeySet]);

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelected(event.target.checked ? visibleKeys : []);
  };

  const handleRowSelect = (key: string) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((value) => value !== key) : [...prev, key]));
  };

  const openVenueDialogForRow = (row: StudentProvisionRow) => {
    if (!row.student_exam_id) return;
    setVenueDialog({
      studentExamId: row.student_exam_id,
      examId: row.exam_id,
      currentExamVenueId: row.exam_venue_id,
      studentName: row.student_name,
      examName: `${row.course_code} • ${row.exam_name}`,
    });
  };

  const openDeleteDialogForRow = (row: StudentProvisionRow) => {
    setDeleteTargets([row]);
    setDeleteError(null);
    setDeleteOpen(true);
  };

  const openDeleteDialogForSelection = () => {
    const targets = selected.map((key) => rowMap.get(key)).filter(Boolean) as StudentProvisionRow[];
    if (!targets.length) return;
    setDeleteTargets(targets);
    setDeleteError(null);
    setDeleteOpen(true);
  };

  const deleteCount = deleteTargets.length;
  const deleteTarget = deleteTargets[0];

  if (query.isLoading) {
    return (
      <Box sx={{ p: 6, textAlign: "center" }}>
        <CircularProgress size={60} />
        <Typography sx={{ mt: 2 }}>Loading students...</Typography>
      </Box>
    );
  }

  if (query.isError) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error" variant="body1">{query.error?.message || "Failed to load students"}</Typography>
      </Box>
    );
  }

  return (
    <Panel disableDivider sx={{ p: 0, overflow: "hidden" }}>
      <Toolbar
        sx={[
          { pl: { sm: 2 }, pr: { xs: 1, sm: 1 } },
          selected.length > 0 && { bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity) },
        ]}
      >
        {selected.length > 0 ? (
          <>
            <Typography sx={{ flex: "1 1 100%" }} color="inherit" variant="subtitle1" component="div">
              {selected.length} selected
            </Typography>
            <PillButton
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={openDeleteDialogForSelection}
              disabled={deleteMutation.isPending}
            >
              Delete
            </PillButton>
          </>
        ) : (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: "1 1 100%" }}>
            <Box sx={{ display: "flex", alignItems: "center", backgroundColor: "action.hover", borderRadius: 1, px: 2, py: 0.5 }}>
              <SearchIcon sx={{ color: "action.active", mr: 1 }} />
              <InputBase placeholder="Search students..." value={search} onChange={(e) => onSearchChange(e.target.value)} sx={{ width: 250 }} />
            </Box>
          </Box>
        )}
      </Toolbar>
      <Divider />
      <TableContainer>
        <Table sx={{ minWidth: 750 }} size="medium">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  color="primary"
                  indeterminate={selectedVisibleCount > 0 && !allVisibleSelected}
                  checked={allVisibleSelected}
                  onChange={handleSelectAllClick}
                  inputProps={{ "aria-label": "select all students" }}
                  disabled={!visibleKeys.length || deleteMutation.isPending}
                />
              </TableCell>
              <TableCell padding="none" sortDirection={orderBy === "student_name" ? order : false}>
                <TableSortLabel
                  active={orderBy === "student_name"}
                  direction={orderBy === "student_name" ? order : "asc"}
                  onClick={(e) => handleRequestSort(e, "student_name")}
                >
                  Student
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={orderBy === "course_code" ? order : false}>
                <TableSortLabel
                  active={orderBy === "course_code"}
                  direction={orderBy === "course_code" ? order : "asc"}
                  onClick={(e) => handleRequestSort(e, "course_code")}
                >
                  Exam Code
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={orderBy === "venue_name" ? order : false}>
                <TableSortLabel
                  active={orderBy === "venue_name"}
                  direction={orderBy === "venue_name" ? order : "asc"}
                  onClick={(e) => handleRequestSort(e, "venue_name")}
                >
                  Venue
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={orderBy === "matches_needs" ? order : false}>
                <TableSortLabel
                  active={orderBy === "matches_needs"}
                  direction={orderBy === "matches_needs" ? order : "asc"}
                  onClick={(e) => handleRequestSort(e, "matches_needs")}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((row) => {
              const statusColor = row.matches_needs ? "success" : "warning";
              const statusLabel = row.matches_needs ? "Allocated" : row.allocation_issue || "needs allocation";
              const key = rowKey(row);
                const isOpen = openRows[key] || false;
                const isSelected = selectedSet.has(key);
                return (
                  <React.Fragment key={key}>
                    <TableRow hover role="checkbox" aria-checked={isSelected} selected={isSelected}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          color="primary"
                          checked={isSelected}
                          onChange={() => handleRowSelect(key)}
                          inputProps={{ "aria-label": `select ${row.student_name}` }}
                          disabled={deleteMutation.isPending}
                        />
                      </TableCell>
                      <TableCell padding="none">
                        <Typography fontWeight={600}>{row.student_name}</Typography>
                        <Typography variant="body2" color="text.secondary">{row.student_id}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={600}>{row.course_code}</Typography>
                        <Typography variant="body2" color="text.secondary">{row.exam_name}</Typography>
                      </TableCell>
                      <TableCell>
                        {row.venue_name ? (
                          <>
                            <Typography fontWeight={600}>{row.venue_name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {formatLabel(row.venue_type) + (row.venue_accessible ? " • Accessible" : "")}
                            </Typography>
                          </>
                        ) : (
                          <Typography variant="body2" color="text.secondary">Not assigned</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={statusLabel}
                          color={statusColor as any}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            backgroundColor: row.matches_needs
                              ? alpha("#2e7d32", 0.12)
                              : alpha("#ed6c02", 0.12),
                            color: row.matches_needs ? "success.main" : "warning.dark",
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          aria-label={isOpen ? "Collapse details" : "Expand details"}
                          onClick={() => setOpenRows((prev) => ({ ...prev, [key]: !isOpen }))}
                        >
                          <ExpandMoreIcon sx={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                        <Collapse in={isOpen} timeout="auto" unmountOnExit>
                          <Box sx={{ margin: 2, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                            <Box>
                              <Typography variant="subtitle2">Provisions</Typography>
                              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap mt={0.5}>
                                {(row.provisions || []).length
                                  ? row.provisions.map((p) => <Chip key={p} label={formatLabel(p)} size="small" sx={{ mb: 0.5 }} />)
                                  : <Typography variant="body2" color="text.secondary">None</Typography>}
                              </Stack>
                              {row.required_capabilities?.length ? (
                                <Typography variant="body2" color="text.secondary" mt={1}>
                                  Required capabilities: {row.required_capabilities.map(formatLabel).join(", ")}
                                </Typography>
                              ) : null}
                              {row.allowed_venue_types?.length ? (
                                <Typography variant="body2" color="text.secondary" mt={0.5}>
                                  Allowed venue types: {row.allowed_venue_types.map(formatLabel).join(", ")}
                                </Typography>
                              ) : null}
                            </Box>
                            <Box>
                              <Typography variant="subtitle2">Notes & Matching</Typography>
                              <Typography variant="body2" color="text.secondary" mt={0.5}>{row.notes || "—"}</Typography>
                              {!row.matches_needs && row.allocation_issue ? (
                                <Typography variant="body2" color="warning.dark" mt={1}>
                                  Issue: {row.allocation_issue}
                                </Typography>
                              ) : null}
                              {!row.matches_needs && row.allocation_issue === "Venue is missing required provisions" ? (() => {
                                const missing = (row.required_capabilities || []).filter(
                                  (cap) => !(row.exam_venue_caps || []).includes(cap)
                                );
                                return missing.length ? (
                                  <Typography variant="body2" color="warning.dark" mt={0.5}>
                                    Missing: {missing.map(formatLabel).join(", ")}
                                  </Typography>
                                ) : null;
                              })() : null}
                              {row.exam_venue_caps?.length ? (
                                <Typography variant="body2" color="text.secondary" mt={1}>
                                  Assigned venue supports: {row.exam_venue_caps.map(formatLabel).join(", ")}
                                </Typography>
                              ) : null}
                            </Box>
                            <Box sx={{ gridColumn: { xs: "1", sm: "1 / -1" }, display: "flex", justifyContent: "flex-end" }}>
                              <PillButton
                                variant="outlined"
                                size="small"
                                onClick={() => openVenueDialogForRow(row)}
                                disabled={!row.student_exam_id}
                              >
                                Change venue
                              </PillButton>
                            </Box>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
              {!filtered.length && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary">{emptyLabel}</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      {venueDialog ? (
        <ChangeVenueDialog
          open
          onClose={() => setVenueDialog(null)}
          onSuccess={(row, venueLabel) => {
            setVenueSnackbar({
              open: true,
              message: `Updated ${row.student_name}'s venue to ${venueLabel}.`,
            });
          }}
          {...venueDialog}
        />
      ) : null}
      <DeleteConfirmationDialog
        open={deleteOpen}
        title={deleteCount > 1 ? "Delete student records?" : "Delete student record?"}
        description={
          <>
            {deleteCount > 1 ? (
              <>
                This will permanently delete <strong>{deleteCount}</strong> student provision records.
              </>
            ) : (
              <>
                This will permanently delete the provision record for{" "}
                <strong>{deleteTarget?.student_name || "this student"}</strong>{" "}
                {deleteTarget?.course_code
                  ? `in ${deleteTarget.course_code} • ${deleteTarget.exam_name}.`
                  : "in this exam."}
              </>
            )}
            {deleteError ? (
              <Typography sx={{ mt: 2 }} color="error">
                {deleteError}
              </Typography>
            ) : null}
          </>
        }
        confirmText={deleteCount > 1 ? `Delete ${deleteCount}` : "Delete"}
        loading={deleteMutation.isPending}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setDeleteOpen(false);
            setDeleteTargets([]);
            setDeleteError(null);
          }
        }}
        onConfirm={() => {
          if (deleteTargets.length) deleteMutation.mutate(deleteTargets);
        }}
      />
      <Snackbar
        open={venueSnackbar.open}
        autoHideDuration={3000}
        onClose={() => setVenueSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setVenueSnackbar((prev) => ({ ...prev, open: false }))}
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
          {venueSnackbar.message}
        </Alert>
      </Snackbar>
    </Panel>
  );
};

export const AdminStudents: React.FC = () => {
  const [unallocatedSearch, setUnallocatedSearch] = useState("");
  const [allSearch, setAllSearch] = useState("");

  const unallocatedQuery = useQuery<StudentProvisionRow[], Error>({
    queryKey: ["student-provisions", "unallocated"],
    queryFn: () => fetchStudentProvisions(true),
  });
  const allQuery = useQuery<StudentProvisionRow[], Error>({
    queryKey: ["student-provisions", "all"],
    queryFn: () => fetchStudentProvisions(false),
  });

  if (unallocatedQuery.isLoading || allQuery.isLoading) {
    return (
      <Box sx={{ p: 6, textAlign: "center" }}>
        <CircularProgress size={60} />
        <Typography sx={{ mt: 2 }}>Loading students...</Typography>
      </Box>
    );
  }

  if (unallocatedQuery.isError || allQuery.isError) {
    const err = unallocatedQuery.error || allQuery.error;
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error" variant="body1">{err?.message || "Failed to load students"}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", maxWidth: 1200, p: { xs: 2, md: 4 }, mx: "auto" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" rowGap={1.5}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Students</Typography>
          <Typography variant="body2" color="text.secondary">Track provision needs and allocations.</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip
            label={`${unallocatedQuery.data?.length ?? 0} needs allocation`}
            size="medium"
            sx={{ backgroundColor: "#fff3e0", color: "warning.dark", fontWeight: 600 }}
          />
          <Chip
            label={`${allQuery.data?.length ?? 0} with provisions`}
            size="medium"
            sx={{ backgroundColor: "#e3f2fd", color: "primary.main", fontWeight: 600 }}
          />
        </Stack>
      </Stack>

      <Stack spacing={3}>
        <StudentTableSection
          search={allSearch}
          onSearchChange={setAllSearch}
          query={allQuery}
          emptyLabel="No student provision records found."
        />
      </Stack>
    </Box>
  );
};
