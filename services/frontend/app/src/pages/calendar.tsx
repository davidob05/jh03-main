import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Timeline, {
  TimelineHeaders,
  SidebarHeader,
  DateHeader,
} from "react-calendar-timeline";
import "react-calendar-timeline/dist/style.css";
import { Box, Button, Typography, Paper } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useNavigate } from "react-router-dom";
import { apiBaseUrl } from "../utils/api";

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

interface ExamData {
  exam_id: number;
  exam_name: string;
  course_code: string;
  exam_venues: ExamVenueData[];
}

interface ExamVenueData {
  examvenue_id: number;
  venue_name: string;
  start_time: string | null;
  exam_length: number | null;
  core: boolean;
}

const fetchExams = async (): Promise<ExamData[]> => {
  const response = await fetch(apiBaseUrl + "/exams/");
  if (!response.ok) throw new Error("Unable to load exams");
  return response.json();
};

export const Calendar: React.FC = () => {
  const navigate = useNavigate();
  const {
    data: examsData = [],
    isLoading,
    isError,
    error,
  } = useQuery<ExamData[], Error>({
    queryKey: ["exams"],
    queryFn: fetchExams,
  });

  const timelineData = useMemo(() => {
    const venueNames = new Set<string>();
    const items: (ExamItem & { venueName: string })[] = [];

    examsData.forEach((exam) => {
      (exam.exam_venues || []).forEach((venue) => {
        if (!venue.start_time) return;
        const startMs = new Date(venue.start_time).getTime();
        if (!Number.isFinite(startMs)) return;
        venueNames.add(venue.venue_name);
        const endMs =
          venue.exam_length != null
            ? startMs + venue.exam_length * 60000
            : startMs + 2 * 60 * 60 * 1000;
        items.push({
          id: venue.examvenue_id,
          code: exam.course_code || exam.exam_name,
          group: 0, // temporary until mapped
          title: `${exam.course_code ? `${exam.course_code} - ` : ""}${exam.exam_name}`,
          start_time: startMs,
          end_time: endMs,
          itemProps: {
            style: {
              background: venue.core ? "#1976d2" : "#0288d1",
              color: "#ffffff",
              border: "1px solid #1565c0",
              borderRadius: "4px",
            },
          },
          canMove: false,
          canResize: false,
          canChangeGroup: false,
          venueName: venue.venue_name,
        });
      });
    });

    const venues = Array.from(venueNames).sort();
    const groups: VenueGroup[] = venues.map((venue, index) => ({
      id: index + 1,
      title: venue,
    }));

    const groupLookup = new Map<string, number>(
      groups.map((group) => [group.title, group.id])
    );

    const normalizedItems = items
      .map((item) => ({
        ...item,
        group: groupLookup.get(item.venueName) ?? 0,
      }))
      .filter((item) => item.group !== 0)
      .map(({ venueName, ...rest }) => rest as ExamItem);

    const earliestStart = normalizedItems.length
      ? Math.min(...normalizedItems.map((item) => item.start_time))
      : null;

    return {
      groups,
      items: normalizedItems,
      earliestStart,
    };
  }, [examsData]);

  // Initialize with the first exam date at midnight
  const [currentDate, setCurrentDate] = useState(new Date());

  // Calculate visible time range (one day: 6 AM to 8 PM for better viewing)
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

  useEffect(() => {
    if (!timelineData.earliestStart) return;
    const first = new Date(timelineData.earliestStart);
    const normalized = new Date(first.getFullYear(), first.getMonth(), first.getDate());
    setCurrentDate(normalized);
    setTimeRange(getTimeRange(normalized));
  }, [timelineData.earliestStart]);

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
  const currentDayItems = timelineData.items.filter((item) => {
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

  if (isLoading) {
    return (
      <Box sx={{ width: "100%", p: 3 }}>
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="h6">Loading exam calendar...</Typography>
        </Paper>
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ width: "100%", p: 3 }}>
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography color="error" variant="h6">
            {error?.message || "Failed to load exam calendar"}
          </Typography>
        </Paper>
      </Box>
    );
  }

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
        {timelineData.items.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Typography variant="body1" color="text.secondary">
              No exam venues to display.
            </Typography>
          </Box>
        ) : (
          <Timeline
            groups={timelineData.groups}
            items={currentDayItems}
            visibleTimeStart={timeRange.visibleTimeStart}
            visibleTimeEnd={timeRange.visibleTimeEnd}
            canMove={false}
            canResize={false}
            canChangeGroup={false}
            stackItems
            onItemDoubleClick={(itemId) => {
              const item = timelineData.items.find((it) => it.id === itemId);
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
        )}
      </Paper>
    </Box>
  );
};
