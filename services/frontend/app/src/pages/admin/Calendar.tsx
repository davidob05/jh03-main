import React, { useState } from "react";
import Timeline, {
  TimelineHeaders,
  SidebarHeader,
  DateHeader,
} from "react-calendar-timeline";
import "react-calendar-timeline/dist/style.css";
import { Box, Button, Typography, Paper } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Dayjs } from 'dayjs';
import { useNavigate } from "react-router-dom";

interface ExamItem {
  id: number;
  code: string;
  group: number;
  title: string;
  start_time: number;
  end_time: number;
  itemProps: {
    style: {
      background: string;
      color: string;
      border: string;
      borderRadius: string;
    };
  };
  canMove: boolean;
  canResize: boolean;
  canChangeGroup: boolean;
}

interface VenueGroup {
  id: number;
  title: string;
}

const examData = [
  {
    id: 1,
    code: "CS101",
    subject: "Introduction to Computer Science",
    venue: "Room A101",
    startTime: "2025-11-15T09:00",
    endTime: "2025-11-15T11:00",
  },
  {
    id: 2,
    code: "MATH201",
    subject: "Calculus II",
    venue: "Room B205",
    startTime: "2025-11-16T14:00",
    endTime: "2025-11-16T16:30",
  },
  {
    id: 3,
    code: "PHY301",
    subject: "Quantum Mechanics",
    venue: "Lab Building 3",
    startTime: "2025-11-17T09:00",
    endTime: "2025-11-17T12:00",
  },
  {
    id: 4,
    code: "ENG102",
    subject: "English Literature",
    venue: "Hall C",
    startTime: "2025-11-18T10:00",
    endTime: "2025-11-18T12:00",
  },
  {
    id: 5,
    code: "CHEM202",
    subject: "Organic Chemistry",
    venue: "Science Block 2",
    startTime: "2025-11-19T13:00",
    endTime: "2025-11-19T15:30",
  },
  {
    id: 6,
    code: "BIO101",
    subject: "Biology Fundamentals",
    venue: "Room A101",
    startTime: "2025-11-15T13:00",
    endTime: "2025-11-15T15:00",
  },
  {
    id: 7,
    code: "HIST201",
    subject: "World History",
    venue: "Hall C",
    startTime: "2025-11-15T15:30",
    endTime: "2025-11-15T17:30",
  },
  {
    id: 8,
    code: "REL101",
    subject: "World Religion",
    venue: "Hall C",
    startTime: "2025-11-15T15:30",
    endTime: "2025-11-15T17:30",
  },
];

// Get unique venues and create groups
const venues = Array.from(new Set(examData.map((exam) => exam.venue))).sort();
const groups: VenueGroup[] = venues.map((venue, index) => ({
  id: index + 1,
  title: venue,
}));

// Create venue to group ID mapping
const venueToGroupId: { [key: string]: number } = {};
venues.forEach((venue, index) => {
  venueToGroupId[venue] = index + 1;
});

// Transform exam data to timeline items
const items: ExamItem[] = examData.map((exam) => ({
  id: exam.id,
  code: exam.code,
  group: venueToGroupId[exam.venue],
  title: `${exam.code} - ${exam.subject}`,
  start_time: new Date(exam.startTime).getTime(),
  end_time: new Date(exam.endTime).getTime(),
  itemProps: {
    style: {
      background: "#1976d2",
      color: "#ffffff",
      border: "1px solid #1976d2",
      borderRadius: "4px",
    },
  },
  canMove: false,
  canResize: false,
  canChangeGroup: false,
}));

export const AdminCalendar: React.FC = () => {

  const navigate = useNavigate();

  // Find the earliest exam date
  const firstExamDate = new Date(
    Math.min(...examData.map((exam) => new Date(exam.startTime).getTime()))
  );

  // Initialise with the first exam date at midnight
  const [currentDate, setCurrentDate] = useState(
    new Date(firstExamDate.getFullYear(), firstExamDate.getMonth(), firstExamDate.getDate())
  );

  // Calculate visible time range (one day: 8 AM to 8 PM for better viewing)
  const getTimeRange = (date: Date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(8, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(20, 0, 0, 0);

    return {
      visibleTimeStart: startOfDay.getTime(),
      visibleTimeEnd: endOfDay.getTime(),
    };
  };

  const [timeRange, setTimeRange] = useState(getTimeRange(currentDate));

  const handlePreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
    setTimeRange(getTimeRange(newDate));
  };

  const handleNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
    setTimeRange(getTimeRange(newDate));
  };

  const handleToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setCurrentDate(today);
    setTimeRange(getTimeRange(today));
  };

  // Filter items to only show exams on the current day
  const currentDayItems = items.filter((item) => {
    const itemDate = new Date(item.start_time);
    return (
      itemDate.getFullYear() === currentDate.getFullYear() &&
      itemDate.getMonth() === currentDate.getMonth() &&
      itemDate.getDate() === currentDate.getDate()
    );
  });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Box sx={{ width: "100%", p: 3 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Typography variant="h4" component="h1">
            Exam Calendar
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handlePreviousDay}
            >
              Previous Day
            </Button>
            <Button variant="contained" onClick={handleToday}>
              Today
            </Button>
            <Button
              variant="outlined"
              endIcon={<ArrowForwardIcon />}
              onClick={handleNextDay}
            >
              Next Day
            </Button>
          </Box>
        </Box>
        <Typography variant="h6" color="text.secondary">
          {formatDate(currentDate)}
        </Typography>
        {currentDayItems.length === 0 && (
          <Typography variant="body1" sx={{ mt: 2 }} color="text.secondary">
            No exams scheduled for this day
          </Typography>
        )}
      </Paper>

      <Paper sx={{ p: 0, overflow: "hidden" }}>
        <div
          style={{
            textAlign: "center",
            fontWeight: "normal",
            fontSize: "18px",
            fontFamily: "arial",
            padding: "16 px",
            borderBottom: "1px solid #ccc",
            background: "#fafafa",
          }}
          >
            {formatDate(currentDate)}
          </div>
        <Timeline
          groups={groups}
          items={currentDayItems}
          visibleTimeStart={timeRange.visibleTimeStart}
          visibleTimeEnd={timeRange.visibleTimeEnd}
          canMove={false}
          canResize={false}
          canChangeGroup={false}
          stackItems
          onItemDoubleClick={(itemId) => {
            const item = items.find((it) => it.id === itemId);
            if (!item || !item.code) return;
            navigate(`/exams/${item.code}`);
          }}
          itemHeightRatio={0.75}
          sidebarWidth={150}
          onTimeChange={() => {
            // Prevent time range changes - keep it fixed to one day
          }}
        >
          <TimelineHeaders>
            <SidebarHeader>
              {({ getRootProps }) => (
                <div
                  {...getRootProps()}
                  style={{
                    background: "#f5f5f5",
                    color: "#333",
                    fontWeight: "bold",
                    textAlign: "center",
                    padding: "10px",
                    width: "150px",
                  }}
                >
                  Venues
                </div>
              )}
            </SidebarHeader>
            <DateHeader
              unit="hour"
              labelFormat={([startTime]) => {
                const date = new Date(startTime.valueOf());
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                return `${hours}:${minutes}`;
              }}
            />
          </TimelineHeaders>
        </Timeline>
      </Paper>
    </Box>
  );
};
