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
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import ArrowBack from "@mui/icons-material/ArrowBack";
import ArrowForward from "@mui/icons-material/ArrowForward";
import Today from "@mui/icons-material/Today";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import AvTimerIcon from "@mui/icons-material/AvTimer";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckIcon from "@mui/icons-material/Check";
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
}

const HOUR_HEIGHT = 45;

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
      if (Array.isArray(data?.assignments)) return data.assignments as InvigilatorAssignment[];
      throw new Error("Assignments data missing");
    },
  });

  const examEvents: Exam[] = useMemo(
    () =>
      (assignments || []).map((a) => {
        const start = dayjs(a.assigned_start);
        const end = dayjs(a.assigned_end);
        return {
          id: String(a.id),
          title: a.exam_name || "Exam",
          location: a.venue_name || "Venue TBC",
          start: start.isValid() ? start.format("HH:mm") : "",
          end: end.isValid() ? end.format("HH:mm") : "",
          date: start.isValid() ? start.format("YYYY-MM-DD") : "",
        };
      }),
    [assignments]
  );

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
                              <Typography variant="h5" fontWeight={800}>
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
                                <Tooltip title="This shift is confirmed">
                                  <Chip
                                    size="small"
                                    label="Confirmed"
                                    icon={<CheckIcon fontSize="small" />}
                                    sx={{
                                      bgcolor: "#e8f5e9",
                                      color: "#1b5e20",
                                      fontWeight: 700,
                                      "& .MuiChip-icon": { color: "#1b5e20" },
                                    }}
                                  />
                                </Tooltip>
                                <Tooltip title="Total duration including required early arrival">
                                  <Chip
                                    size="small"
                                    label={`${totalDuration} minutes`}
                                    icon={<AccessTimeIcon fontSize="small" />}
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
                                    icon={<AvTimerIcon fontSize="small" />}
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
    </LocalizationProvider>
  );
};
