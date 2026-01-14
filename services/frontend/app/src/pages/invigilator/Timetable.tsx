import React, { useState } from "react";
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
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
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

interface Exam {
  id: string;
  title: string;
  location: string;
  start: string;
  end: string;
  date: string;
}

const examEvents: Exam[] = [
  {
    id: "1",
    title: "Calculus 101",
    location: "Hunter Hall East",
    start: "09:00",
    end: "11:00",
    date: dayjs().format("YYYY-MM-DD"),
  },
  {
    id: "2",
    title: "Physics 201",
    location: "Boyd Orr Building 202",
    start: "13:00",
    end: "15:00",
    date: dayjs().format("YYYY-MM-DD"),
  },
  {
    id: "3",
    title: "Chinese 1",
    location: "St Andrews Building 237A",
    start: "10:00",
    end: "12:00",
    date: dayjs().add(1, "day").format("YYYY-MM-DD"),
  },
];

const HOUR_HEIGHT = 45;

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes: number) =>
  dayjs().startOf("day").add(minutes, "minute").format("HH:mm");

export const InvigilatorTimetable: React.FC = () => {
  const today = dayjs();
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(today);
  const [month, setMonth] = useState(dayjs().startOf("month"));

  const selectedDayKey = selectedDate?.format("YYYY-MM-DD");

  const examsForSelectedDay = selectedDayKey
    ? examEvents
        .filter((e) => e.date === selectedDayKey)
        .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
    : [];

  const examDates = examEvents.map((e) => e.date);

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
            <PillButton
              variant="outlined"
              size="medium"
              startIcon={<ArrowBack />}
              onClick={handlePrevDay}
            >
              Previous
            </PillButton>
            <PillButton
              variant="contained"
              size="medium"
              color="primary"
              startIcon={<Today />}
              onClick={handleToday}
            >
              Today
            </PillButton>
            <PillButton
              variant="outlined"
              size="medium"
              endIcon={<ArrowForward />}
              onClick={handleNextDay}
            >
              Next
            </PillButton>
            <DatePicker
              value={selectedDate}
              onChange={(newValue) => setDay(newValue)}
              slotProps={{
                textField: {
                  size: "small",
                  sx: { minWidth: 210 },
                },
              }}
            />
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
              {examsForSelectedDay.length === 0 ? (
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
                    const start = toMinutes(event.start);
                    const end = toMinutes(event.end);
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
                            </Stack>
                          </Stack>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </Panel>
          </Box>
        </Stack>
      </Box>
    </LocalizationProvider>
  );
};
