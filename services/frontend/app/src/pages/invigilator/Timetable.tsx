import * as React from 'react';
import { useEffect, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
  Box,
  Button,
  Typography,
} from '@mui/material';
import {
  StaticDatePicker,
} from '@mui/x-date-pickers';
import {ChevronRightIcon} from '@mui/icons-material/ChevronRight';
import {ChevronLeftIcon} from '@mui/icons-material/ChevronLeft';

export const InvigilatorTimetable: React.FC = () => {

    // Calendar state
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());
    const [calendarModalOpen, setCalendarModalOpen] = useState(false);
    const [month, setMonth] = useState(dayjs()); 
    
    const invigilators = [
    {
      name: "Sample",
      availableDates: ["2025-12-03", "2025-12-10", "2025-12-17"],
    },
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Box
            sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 2,
                mb: 1,
            }}
        >
            <Box
                sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                color: "text.primary",
                fontSize: "1.1rem",
                fontWeight: 500,
                }}
            >
                {month.format("MMMM YYYY")}
            </Box>
            
            <Box
                sx={{ cursor: "pointer", color: "text.secondary", display: "flex", alignItems: "center" }}
                onClick={() => setMonth((m) => m.subtract(1, "month"))}
                aria-label="previous month"
            >
                ←
            </Box>

            <Box
                sx={{ cursor: "pointer", color: "text.secondary", display: "flex", alignItems: "center" }}
                onClick={() => setMonth((m) => m.add(1, "month"))}
                aria-label="next month"
            >
                →
            </Box>
            </Box>

        {/* calendar */}
        <StaticDatePicker
            key={month.format("YYYY-MM")}
            displayStaticWrapperAs="desktop"
            value={selectedDate}
            onChange={(newValue) => {
                setSelectedDate(newValue);
            }}
            referenceDate={month}
            slots={{
                toolbar: () => null,
                calendarHeader: () => null,
                layout: (props) => <>{props.children}</>,
            }}
            slotProps={{
                day: (ownerState) => ({
                sx: invigilators.some((i) =>
                    i.availableDates?.includes(
                    (ownerState.day as Dayjs).format("YYYY-MM-DD")
                    )
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
                "& .MuiPickersDay-root": {
                width: 42,
                height: 42,
                fontSize: "0.9rem",
                },
            }}
        />
    </LocalizationProvider>
  );
}