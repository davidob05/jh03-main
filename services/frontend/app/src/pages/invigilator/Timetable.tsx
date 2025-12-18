import * as React from 'react';
import { useEffect, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers';
import {
  Box,
  Button,
  Typography,
  Paper,
} from '@mui/material';
import {
  StaticDatePicker,
} from '@mui/x-date-pickers';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

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

const invigilators = [
    {
      name: "Sample",
      availableDates: ["2025-12-03", "2025-12-10", "2025-12-17"],
    },
  ];


export const InvigilatorTimetable: React.FC = () => {

    // calendar state - days logic
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());
    const [month, setMonth] = useState(dayjs().startOf("month")); 

    const selectedDayKey = selectedDate?.format("YYYY-MM-DD");

    const examsForSelectedDay = selectedDayKey
    ? examEvents.filter((e) => e.date === selectedDayKey)
    : [];

    const examDates = examEvents.map((e) => e.date);

    // month navigation
    const goToMonth = (newMonth: Dayjs) => {
        setMonth(newMonth.startOf("month"));

        if (newMonth.isSame(dayjs(), "month")) {
            setSelectedDate(dayjs());
        } else {
            setSelectedDate(null);
        }
    }


  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Box sx={{ maxWidth: 800, mx: "auto" }}> 
            
            { /*calendar header */ }
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 2,
                    mb: 1,
                    bgcolor: "primary.main",
                    height: 40,
                }}
            >
                <Box
                    sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    color: "white",
                    fontSize: "1.2rem",
                    fontWeight: 500,
                    }}
                >
                    {month.format("MMMM YYYY")}
                </Box>
                
                <Box
                    sx={{ cursor: "pointer", color: "white", display: "flex", alignItems: "center" }}
                    onClick={() => goToMonth(month.subtract(1, "month"))}
                    aria-label="previous month"
                >
                    <ChevronLeftIcon />
                </Box>

                <Box
                    sx={{ cursor: "pointer", color: "white", display: "flex", alignItems: "center" }}
                    onClick={() => goToMonth(month.add(1, "month"))}
                    aria-label="next month"
                >
                    <ChevronRightIcon />
                </Box>
            </Box>

            <Box
                sx={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                    transform: "scale(1.15)",
                    transformOrigin: "top center",
                }}
            >
                {/* calendar */}
                <StaticDatePicker
                    value={selectedDate}
                    onChange={(newValue) => {
                        setSelectedDate(newValue);
                        if (newValue) {
                        setMonth(newValue.startOf("month"));
                        }
                    }}
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
                        width: "100%",
                        "& .MuiPickersDay-root": {
                            width: "100%",
                        },
                    }}
                />
            </Box>

            {/* exams events */}
            <Typography variant="h6" sx={{ mb: 2 }}>
                Schedule
            </Typography>

            <Box>
                {examsForSelectedDay.length === 0 ? (
                    <Typography color="text.secondary">
                        No exams scheduled for this day.
                    </Typography>
                    ) : (
                    examsForSelectedDay.map((event) => {
                        const start = toMinutes(event.start);
                        const end = toMinutes(event.end);
                        const duration = end - start;

                        return (
                            <Box
                                key={event.id}
                                sx={{
                                    display: "flex",
                                    height: `${(duration / 60) * HOUR_HEIGHT}px`,
                                    mb: 1.5,
                                    borderRadius: 1,
                                    overflow: "hidden",
                                    boxShadow: 1,
                                }}
                            >
                                { /* time box */}
                                <Box
                                    sx={{
                                        width: 80,
                                        bgcolor: "primary.main",
                                        color: "white",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: 600,
                                    }}
                                >
                                    <Typography sx={{ fontWeight: 600 }}>
                                        {event.start}
                                    </Typography>

                                    <Typography>
                                        -
                                    </Typography>

                                    <Typography sx={{ fontWeight: 600 }}>
                                        {event.end}
                                    </Typography>
                                </Box>

                                { /* exam details */ }
                                <Box
                                    sx={{
                                        flex: 1,
                                        bgcolor: "background.paper",
                                        p: 2,
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Typography fontWeight={600}>
                                        {event.title}
                                    </Typography>

                                    <Typography variant="body2" color="text.secondary">
                                        {event.location}
                                    </Typography>
                                </Box>
                            </Box>
                        );
                    })
                )}
            </Box>
        </Box>
    </LocalizationProvider>
  );
}