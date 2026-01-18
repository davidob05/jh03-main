import React, { useMemo, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { StaticDatePicker, DatePicker } from "@mui/x-date-pickers";
import {
  Box,
  Chip,
  Divider,
  Grid,
  Stack,
  Typography,
  Tooltip,
  Drawer,
  IconButton,
  TextField,
  Alert,
  Snackbar,
} from "@mui/material";
import { useQuery, useMutation } from "@tanstack/react-query";
import ArrowBack from "@mui/icons-material/ArrowBack";
import ArrowForward from "@mui/icons-material/ArrowForward";
import Today from "@mui/icons-material/Today";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import AvTimerIcon from "@mui/icons-material/AvTimer";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckIcon from "@mui/icons-material/Check";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import CloseIcon from "@mui/icons-material/Close";
import UndoOutlinedIcon from "@mui/icons-material/UndoOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import { Panel } from "../../components/Panel";
import { PillButton } from "../../components/PillButton";
import { apiBaseUrl, apiFetch } from "../../utils/api";

interface Exam {
  id: string;
  title: string;
  location: string;
  start: string;
  end: string;
  date: string;
  confirmed?: boolean;
  cancel?: boolean;
}

interface InvigilatorAssignment {
  id: number;
  exam_name?: string | null;
  venue_name?: string | null;
  assigned_start: string;
  assigned_end: string;
  exam_start?: string | null;
  exam_length?: number | null;
  role?: string | null;
  break_time_minutes?: number | null;
  notes?: string | null;
  confirmed?: boolean | null;
  cancel?: boolean | null;
  cover?: boolean | null;
  cancel_cause?: string | null;
  cover_filled?: boolean | null;
}

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
};

const minutesToTime = (minutes: number) =>
  dayjs().startOf("day").add(minutes, "minute").format("HH:mm");

export const InvigilatorTimetable: React.FC = () => {
  const today = dayjs();
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(today);
  const [month, setMonth] = useState(dayjs().startOf("month"));

  const {
    data: assignments = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<InvigilatorAssignment[]>({
    queryKey: ["invigilator-assignments"],
    queryFn: async () => {
      const url = `${apiBaseUrl}/invigilator/assignments/`;
      const res = await apiFetch(url);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Unable to load assignments");
      }
      const data = await res.json();
      if (Array.isArray(data)) return data as InvigilatorAssignment[];
      if (Array.isArray(data?.results)) return data.results as InvigilatorAssignment[];
      if (Array.isArray(data?.assignments)) return data.assignments as InvigilatorAssignment[];
      throw new Error("Assignments data missing");
    },
  });

  const examEvents: Exam[] = useMemo(
    () =>
      (assignments || []).map((a) => {
        const assignedStart = a.assigned_start ? dayjs(a.assigned_start) : null;
        const assignedEnd = a.assigned_end ? dayjs(a.assigned_end) : null;

        const fallbackStart = a.exam_start ? dayjs(a.exam_start) : null;
        const fallbackEnd =
          fallbackStart && a.exam_length != null
            ? fallbackStart.add(a.exam_length, "minute")
            : null;

        const start = assignedStart && assignedStart.isValid() ? assignedStart : fallbackStart;
        const end = assignedEnd && assignedEnd.isValid() ? assignedEnd : fallbackEnd;
        return {
          id: String(a.id),
          title: a.exam_name || "Exam",
          location: a.venue_name || "Venue TBC",
          start: start && start.isValid() ? start.format("HH:mm") : "",
          end: end && end.isValid() ? end.format("HH:mm") : "",
          date: start && start.isValid() ? start.format("YYYY-MM-DD") : "",
          confirmed: Boolean(a.confirmed),
          cancel: Boolean(a.cancel),
        };
      }),
    [assignments]
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerAssignment, setDrawerAssignment] = useState<InvigilatorAssignment | null>(null);
  const [cancelNote, setCancelNote] = useState("");
  const [drawerMode, setDrawerMode] = useState<"request" | "undo">("request");
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  const requestCancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await apiFetch(`${apiBaseUrl}/invigilator-assignments/${id}/request-cancel/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Unable to request cancellation");
      }
      return res.json();
    },
    onSuccess: () => {
      refetch();
      setDrawerOpen(false);
      setCancelNote("");
      setSnackbar({ open: true, message: "Cancellation requested.", severity: "success" });
    },
  });

  const undoCancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await apiFetch(`${apiBaseUrl}/invigilator-assignments/${id}/undo-cancel/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Unable to undo cancellation");
      }
      return res.json();
    },
    onSuccess: () => {
      refetch();
      setDrawerOpen(false);
      setCancelNote("");
      setSnackbar({ open: true, message: "Cancellation withdrawn.", severity: "success" });
    },
  });

  const selectedDayKey = selectedDate?.format("YYYY-MM-DD");

  const examsForSelectedDay = selectedDayKey
    ? examEvents
        .filter((e) => e.date === selectedDayKey)
        .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start))
    : [];

  const examDates = useMemo(() => examEvents.map((e) => e.date), [examEvents]);

  const goToMonth = (newMonth: Dayjs) => {
    setMonth(newMonth.startOf("month"));

    if (newMonth.isSame(today, "month")) {
      setSelectedDate(today);
    } else {
      setSelectedDate(null);
    }
  };

  const setDay = (dayValue: Dayjs | null) => {
    if (!dayValue) {
      setSelectedDate(null);
      return;
    }
    setSelectedDate(dayValue);
    setMonth(dayValue.startOf("month"));
  };

  const handleToday = () => setDay(today);
  const handlePrevDay = () =>
    setDay((selectedDate || today).subtract(1, "day"));
  const handleNextDay = () => setDay((selectedDate || today).add(1, "day"));

  const friendlyDate = selectedDate
    ? selectedDate.format("dddd, D MMMM")
    : "Pick a day to see exams";
  const headerDate = (selectedDate ?? month).format("dddd, D MMMM YYYY");

  const openDrawer = (assignment: InvigilatorAssignment, mode: "request" | "undo" = "request") => {
    setDrawerAssignment(assignment);
    setCancelNote("");
    setDrawerMode(mode);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setCancelNote("");
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: 3 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={1}
          sx={{ mb: 2 }}
        >
          <Stack spacing={0.5}>
            <Typography variant="h4" fontWeight={700}>
              Timetable
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Browse your upcoming exams, jump between days, and quickly pick any
              date from the calendar.
            </Typography>
          </Stack>
          <Typography variant="h6" color="text.secondary">
            {headerDate}
          </Typography>
        </Stack>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="space-between"
          sx={{ mb: 2.5 }}
        >
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Tooltip title="Go to the previous day">
              <Box>
                <PillButton
                  variant="outlined"
                  size="medium"
                  startIcon={<ArrowBack />}
                  onClick={handlePrevDay}
                >
                  Previous
                </PillButton>
              </Box>
            </Tooltip>
            <Tooltip title="Jump back to today">
              <Box>
                <PillButton
                  variant="contained"
                  size="medium"
                  color="primary"
                  startIcon={<Today />}
                  onClick={handleToday}
                >
                  Today
                </PillButton>
              </Box>
            </Tooltip>
            <Tooltip title="Skip forward to the next day">
              <Box>
                <PillButton
                  variant="outlined"
                  size="medium"
                  endIcon={<ArrowForward />}
                  onClick={handleNextDay}
                >
                  Next
                </PillButton>
              </Box>
            </Tooltip>
            <Tooltip title="Pick a specific date">
              <Box>
                <DatePicker
                  value={selectedDate}
                  onChange={(newValue) => setDay(newValue)}
                  slotProps={{
                    textField: {
                      variant: "outlined",
                      size: "small",
                      sx: {
                        minWidth: 220,
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "999px",
                          bgcolor: "#f8fafc",
                          border: "1px solid #b9c0d0",
                          fontWeight: 600,
                          letterSpacing: 0.2,
                          transition: "all 0.2s ease",
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#b9c0d0",
                            borderRadius: "999px",
                          },
                          "&:hover": {
                            transform: "translateY(-1px)",
                            boxShadow: "0px 4px 18px rgba(0,0,0,0.12)",
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: "primary.main",
                          },
                          "&.Mui-focused": {
                            boxShadow:
                              "0 0 0 2px rgba(25,118,210,0.16), 0px 4px 18px rgba(0,0,0,0.12)",
                          },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: "primary.main",
                            borderRadius: "999px",
                          },
                        },
                        "& .MuiInputBase-input": {
                          py: 1.1,
                        },
                        "& .MuiSvgIcon-root": { color: "primary.main" },
                      },
                      InputProps: {
                        sx: {
                          borderRadius: "999px",
                        },
                      },
                    },
                  }}
                />
              </Box>
            </Tooltip>
          </Stack>
        </Stack>

        <Panel
          disableDivider
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <CalendarTodayOutlinedIcon fontSize="small" />
              <Typography variant="subtitle1" fontWeight={700}>
                Schedule at a glance
              </Typography>
            </Stack>
          }
          sx={{
            mb: 3,
            background: "linear-gradient(135deg, #f8fafc, #eef2ff)",
            borderColor: "#e0e7ff",
            boxShadow: "0 12px 35px rgba(79, 70, 229, 0.08)",
          }}
        >
          <Typography color="text.secondary">
            Select a day from the calendar or use the navigation buttons to get started.
            <br />
            Each exam will show its start and end times, location, and when you are expected to arrive.
          </Typography>
        </Panel>

        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={2.5}
          alignItems="stretch"
        >
          <Box sx={{ flexShrink: 0, width: { xs: "100%", lg: 350 } }}>
            <Panel
              title="Calendar"
              sx={{
                height: 375,
                maxHeight: 375,
                overflow: "visible",
              }}
            >
              <StaticDatePicker
                value={selectedDate}
                onChange={(newValue) => setDay(newValue)}
                onMonthChange={(newMonth) => {
                  goToMonth(newMonth);
                }}
                referenceDate={month}
                slots={{
                  toolbar: () => null,
                  calendarHeader: () => null,
                  layout: (props) => <>{props.children}</>,
                }}
                slotProps={{
                  day: (ownerState) => ({
                    sx: examDates.includes(
                      (ownerState.day as Dayjs).format("YYYY-MM-DD")
                    )
                      ? {
                          "&::after": {
                            content: '""',
                            position: "absolute",
                            bottom: 6,
                            right: 6,
                            width: 10,
                            height: 10,
                            bgcolor: "success.main",
                            borderRadius: "50%",
                            border: "2px solid white",
                          },
                        }
                      : {},
                  }),
                }}
                views={["day"]}
                showDaysOutsideCurrentMonth
                sx={{
                  "--DateCalendar-daySize": "68px",
                  "--DateCalendar-slideTransitionHeight": "420px",
                  width: "100%",
                  "& .MuiDateCalendar-root": {
                    width: "100%",
                    maxWidth: "none",
                    minWidth: 900,
                    mx: "auto",
                    transform: "scale(1.4)",
                    transformOrigin: "top center",
                  },
                  "& .MuiDayCalendar-monthContainer": {
                    px: 4,
                    pb: 3.5,
                  },
                  "& .MuiPickersDay-root": {
                    width: 74,
                    height: 74,
                    fontSize: "1.15rem",
                  },
                  "& .MuiDayCalendar-weekContainer": {
                    justifyContent: "space-between",
                    px: 1.5,
                  },
                  "& .MuiPickersSlideTransition-root": {
                    minHeight: 440,
                  },
                  "& .MuiPickersDay-dayOutsideMonth": {
                    opacity: 0.55,
                  },
                  "& .MuiPickersDay-today": {
                    borderColor: "primary.main",
                  },
                }}
              />
            </Panel>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Panel
              title="Schedule"
              actions={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={`${examsForSelectedDay.length} exam${
                      examsForSelectedDay.length === 1 ? "" : "s"
                    }`}
                    size="medium"
                    sx={{
                      backgroundColor: "#e3f2fd",
                      color: "#0d47a1",
                      fontWeight: 600,
                    }}
                  />
                </Stack>
              }
              sx={{
                height: 375,
                width: "100%",
                overflow: "visible",
              }}
            >
              {isLoading && (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography color="text.secondary">Loading assignments...</Typography>
                </Box>
              )}
              {isError && (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography color="error">
                    {error?.message || "Failed to load assignments."}
                  </Typography>
                </Box>
              )}
              {!isLoading && !isError && (
                examsForSelectedDay.length === 0 ? (
                  <Box
                    sx={{
                      textAlign: "center",
                      py: 6,
                      color: "text.secondary",
                      border: "1px dashed #e5e7eb",
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      No exams on this day
                    </Typography>
                    <Typography>
                      Select a day with a green dot to view the schedule.
                    </Typography>
                  </Box>
                ) : (
                  <Grid container spacing={2.5}>
                    {examsForSelectedDay.map((event) => {
                      const start = timeToMinutes(event.start);
                      const end = timeToMinutes(event.end);
                      const duration = end - start;
                      const arrival = Math.max(0, start - 30);
                      const arrivalTime = minutesToTime(arrival);
                      const totalDuration = duration + 30;
                      const isConfirmed = event.confirmed === true;
                      const isCancelled = event.cancel === true;
                      const statusChip = (() => {
                        if (isCancelled) {
                          return {
                            label: isConfirmed ? "Cancelled" : "Cancellation requested",
                            bg: "#ffebee",
                            fg: "#b71c1c",
                            icon: (
                              <CloseIcon
                                fontSize="small"
                                sx={{ color: "#b71c1c !important" }}
                              />
                            ),
                          };
                        }
                        if (isConfirmed) {
                          return {
                            label: "Confirmed",
                            bg: "#e8f5e9",
                            fg: "#1b5e20",
                            icon: (
                              <CheckIcon
                                fontSize="small"
                                sx={{ color: "#1b5e20 !important" }}
                              />
                            ),
                          };
                        }
                        return {
                          label: "Pending confirmation",
                          bg: "#fff4e5",
                          fg: "#b45309",
                          icon: (
                            <HourglassEmptyIcon
                              fontSize="small"
                              sx={{ color: "#b45309 !important" }}
                            />
                          ),
                        };
                      })();
                      const correspondingAssignment = assignments.find((a) => String(a.id) === event.id) || null;
                      const coverFilled = correspondingAssignment?.cover_filled === true;
                      const canRequestCancel =
                        !isCancelled &&
                        correspondingAssignment?.assigned_start &&
                        dayjs(correspondingAssignment.assigned_start).isAfter(dayjs());
                      const canUndoCancel = isCancelled && !coverFilled;

                      return (
                        <Grid item xs={12} sm={6} key={event.id}>
                          <Box
                            sx={{
                              display: "grid",
                              gridTemplateColumns: { xs: "1fr", sm: "150px 1fr" },
                              gap: 2.5,
                              p: 2.5,
                              borderRadius: 3,
                              border: "1px solid #e5e7eb",
                              background:
                                "linear-gradient(135deg, #f8fafc, #e3f2fd)",
                              boxShadow: "0 8px 25px rgba(0,0,0,0.04)",
                              minHeight: 260,
                              height: "100%",
                              alignItems: "center",
                            }}
                          >
                            <Stack
                              spacing={1.2}
                              alignItems="flex-start"
                              sx={{ minWidth: 130, justifySelf: "center" }}
                            >
                              <Typography variant="body2" color="text.secondary">
                                Start
                              </Typography>
                              <Typography fontWeight={700} fontSize="1.15rem">
                                {event.start}
                              </Typography>
                              <Divider sx={{ width: "100%", my: 0.5 }} />
                              <Typography variant="body2" color="text.secondary">
                                End
                              </Typography>
                              <Typography fontWeight={700} fontSize="1.15rem">
                                {event.end}
                              </Typography>
                            </Stack>

                            <Stack spacing={1.2} justifyContent="center">
                              <Typography
                                variant="h6"
                                fontWeight={700}
                                sx={{
                                  maxWidth: 240,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={event.title}
                              >
                                {event.title}
                              </Typography>
                              <Stack
                                direction="row"
                                spacing={1.2}
                                alignItems="center"
                              >
                                <LocationOnOutlinedIcon
                                  fontSize="small"
                                  color="action"
                                />
                                <Typography
                                  variant="body1"
                                  color="text.secondary"
                                >
                                  {event.location}
                                </Typography>
                              </Stack>
                              <Divider sx={{ width: "100%", my: 0.5 }} />
                              <Stack direction="column" spacing={0.8} alignItems="flex-start">
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Tooltip
                                    title={
                                      isCancelled
                                        ? statusChip.label
                                        : isConfirmed
                                        ? "This shift is confirmed"
                                        : "Awaiting confirmation"
                                    }
                                  >
                                    <Chip
                                      size="small"
                                      label={statusChip.label}
                                      icon={statusChip.icon}
                                      sx={{
                                        bgcolor: statusChip.bg,
                                        color: statusChip.fg,
                                        fontWeight: 700,
                                        "& .MuiChip-icon": { color: statusChip.fg },
                                      }}
                                    />
                                  </Tooltip>
                                  {canRequestCancel && (
                                    <Tooltip title="Request cancellation">
                                      <span>
                                        <IconButton
                                          size="small"
                                          color="error"
                                          aria-label="Request cancellation"
                                          data-testid={`request-cancel-${event.id}`}
                                          onClick={() =>
                                            correspondingAssignment && openDrawer(correspondingAssignment, "request")
                                          }
                                        >
                                          <EventBusyOutlinedIcon fontSize="small" />
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                  )}
                                  {!canRequestCancel && canUndoCancel && (
                                    <Tooltip title="Withdraw cancellation request">
                                      <span>
                                        <IconButton
                                          size="small"
                                          color="primary"
                                          aria-label="Withdraw cancellation"
                                          data-testid={`undo-cancel-${event.id}`}
                                          onClick={() =>
                                            correspondingAssignment && openDrawer(correspondingAssignment, "undo")
                                          }
                                        >
                                          <UndoOutlinedIcon fontSize="small" />
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                  )}
                                </Stack>
                                <Tooltip title="Total duration including required early arrival">
                                  <Chip
                                    size="small"
                                    label={`${totalDuration} minutes`}
                                    icon={<AccessTimeIcon fontSize="small" sx={{ color: "#42307d !important" }} />}
                                    sx={{
                                      bgcolor: "#ede9fe",
                                      color: "#42307d",
                                      fontWeight: 700,
                                      "& .MuiChip-icon": { color: "#42307d" },
                                    }}
                                  />
                                </Tooltip>
                                <Tooltip title="Arrive 30 minutes before the exam starts">
                                  <Chip
                                    icon={<AvTimerIcon fontSize="small" sx={{ color: "#b45309 !important" }} />}
                                    label={`Arrive by ${arrivalTime}`}
                                    size="small"
                                    sx={{
                                      bgcolor: "#fff4e5",
                                      color: "#b45309",
                                      fontWeight: 700,
                                      "& .MuiChip-icon": { color: "#b45309" },
                                    }}
                                  />
                                </Tooltip>
                              </Stack>
                            </Stack>
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                )
              )}
            </Panel>
          </Box>
        </Stack>
      </Box>
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={closeDrawer}
        PaperProps={{ sx: { width: { xs: "100%", sm: 420 }, p: 3 } }}
      >
        {drawerAssignment ? (
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" fontWeight={700}>
                {drawerMode === "undo" ? "Withdraw cancellation" : "Request cancellation"}
              </Typography>
              <IconButton onClick={closeDrawer} aria-label="Close">
                <CloseIcon />
              </IconButton>
            </Stack>

            <Stack spacing={0.5}>
              <Typography fontWeight={700}>{drawerAssignment.exam_name || "Exam"}</Typography>
              <Typography color="text.secondary">
                {dayjs(drawerAssignment.assigned_start).format("ddd, D MMM YYYY @ HH:mm")} - 
                {dayjs(drawerAssignment.assigned_end).format("HH:mm")}
              </Typography>
              <Typography color="text.secondary">
                {drawerAssignment.venue_name || "Venue TBC"}
              </Typography>
            </Stack>

            <TextField
              label="Reason (optional)"
              multiline
              minRows={3}
              value={cancelNote}
              onChange={(e) => setCancelNote(e.target.value)}
            />

            {(drawerMode === "request" ? requestCancelMutation.isError : undoCancelMutation.isError) && (
              <Alert severity="error">
                {((drawerMode === "request" ? requestCancelMutation.error : undoCancelMutation.error) as Error)
                  ?.message || "Unable to submit request."}
              </Alert>
            )}

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <PillButton
                variant="contained"
                color={drawerMode === "undo" ? "primary" : "error"}
                fullWidth
                onClick={() =>
                  drawerAssignment &&
                  (drawerMode === "undo"
                    ? undoCancelMutation.mutate({ id: drawerAssignment.id, reason: cancelNote.trim() })
                    : requestCancelMutation.mutate({ id: drawerAssignment.id, reason: cancelNote.trim() }))
                }
                disabled={
                  drawerMode === "undo" ? undoCancelMutation.isPending : requestCancelMutation.isPending
                }
              >
                {drawerMode === "undo"
                  ? undoCancelMutation.isPending
                    ? "Submitting..."
                    : "Withdraw cancellation"
                  : requestCancelMutation.isPending
                  ? "Requesting..."
                  : "Submit request"}
              </PillButton>
            </Stack>
          </Stack>
        ) : (
          <Typography>No shift selected.</Typography>
        )}
      </Drawer>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={
            snackbar.severity === "success"
              ? {
                  backgroundColor: "#d4edda",
                  color: "#155724",
                  border: "1px solid #155724",
                  borderRadius: "50px",
                  fontWeight: 500,
                }
              : undefined
          }
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </LocalizationProvider>
  );
};

export default InvigilatorTimetable;
