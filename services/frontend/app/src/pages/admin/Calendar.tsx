import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Button,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  InputBase,
  TextField,
  Grid,
  Pagination,
  Divider,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import {
  ArrowBack,
  ArrowForward,
  Today,
  GridView,
  Timeline,
  Search,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { ExamDetailsPopup } from "../../components/admin/ExamDetailsPopup";
import { apiBaseUrl } from "../../utils/api";

interface ExamVenueData {
  examvenue_id: number;
  venue_name: string | null;
  start_time: string | null;
  exam_length: number | null;
  core: boolean;
  provision_capabilities: string[];
}

interface ExamData {
  exam_id: number;
  exam_name: string;
  course_code: string;
  no_students: number;
  exam_school: string;
  school_contact: string;
  exam_venues: ExamVenueData[];
}

interface ExamVenueInfo {
  venue: string;
  startTime: string;
  endTime: string;
  students?: number;
  invigilators?: number;
}

interface ExamDetails {
  id: number;
  code: string;
  subject: string;
  department: string;
  mainVenue: string;
  mainStartTime: string;
  mainEndTime: string;
  venues: ExamVenueInfo[];
}

interface AdminCalendarProps {
  initialExams?: ExamDetails[];
  fetchEnabled?: boolean;
}

export const examData: ExamDetails[] = [];

const departmentColors: Record<string, string> = {
  CS: "#4caf50",
  Math: "#2196f3",
  Physics: "#ff9800",
  English: "#9c27b0",
  Chemistry: "#e91e63",
  Law: "#3f51b5",
  Biology: "#009688",
};

const fetchExams = async (): Promise<ExamDetails[]> => {
  const response = await fetch(`${apiBaseUrl}/exams/`);
  if (!response.ok) throw new Error("Unable to load exams");
  const data: ExamData[] = await response.json();
  return data.map(toCalendarExam).filter((exam): exam is ExamDetails => Boolean(exam));
};

const getPrimaryExamVenue = (exam: ExamData): ExamVenueData | undefined => {
  return exam.exam_venues.find((v) => v.core) || exam.exam_venues[0];
};

const addMinutes = (start: string, minutes: number | null) => {
  if (!start || minutes == null) return "";
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return "";
  const endDate = new Date(startDate.getTime() + minutes * 60000);
  return endDate.toISOString();
};

const toCalendarExam = (exam: ExamData): ExamDetails | null => {
  const coreVenue = getPrimaryExamVenue(exam);
  if (!coreVenue?.start_time) return null;

  const mainStartTime = coreVenue.start_time;
  const mainEndTime = addMinutes(coreVenue.start_time, coreVenue.exam_length);
  if (!mainEndTime) return null;

  const venues = exam.exam_venues
    .filter((v) => v.start_time)
    .map((venue) => ({
      venue: venue.venue_name || "Unassigned",
      startTime: venue.start_time as string,
      endTime: addMinutes(venue.start_time as string, venue.exam_length) || venue.start_time || "",
    }));

  return {
    id: exam.exam_id,
    code: exam.course_code,
    subject: exam.exam_name,
    department: exam.exam_school || "Other",
    mainVenue: coreVenue.venue_name || "Unassigned",
    mainStartTime,
    mainEndTime,
    venues,
  };
};

const isSameDay = (dateTime: string, target: Date) => {
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return false;
  return date.toDateString() === target.toDateString();
};

const minutesSinceMidnight = (dateTime: string) => {
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return null;
  return date.getHours() * 60 + date.getMinutes();
};

export const AdminCalendar: React.FC<AdminCalendarProps> = ({ initialExams, fetchEnabled }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"grid" | "timeline">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [popupOpen, setPopupOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<ExamDetails | null>(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 6;

  const fallbackExams = initialExams ?? examData;
  const shouldFetch = fetchEnabled ?? import.meta.env.MODE !== "test";

  const {
    data: calendarExams,
    isLoading: queryLoading,
    isError: queryError,
    error,
  } = useQuery<ExamDetails[], Error>({
    queryKey: ["exams"],
    queryFn: fetchExams,
    enabled: shouldFetch,
    retry: false,
    ...(shouldFetch ? {} : { initialData: fallbackExams }),
  });

  const effectiveExams = calendarExams ?? fallbackExams;
  const isLoading = shouldFetch && queryLoading;
  const isError = shouldFetch && queryError;

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const formatDateInput = (date: Date) => date.toISOString().split("T")[0];

  const examsToday = useMemo(
    () =>
      effectiveExams.filter((exam) => {
        const matchesDate = isSameDay(exam.mainStartTime, currentDate);
        const query = searchQuery.toLowerCase();
        const matchesQuery =
          !query ||
          exam.code.toLowerCase().includes(query) ||
          exam.subject.toLowerCase().includes(query) ||
          exam.mainVenue.toLowerCase().includes(query) ||
          exam.department.toLowerCase().includes(query);
        return matchesDate && matchesQuery;
      }),
    [effectiveExams, currentDate, searchQuery]
  );

  const paginatedExams = examsToday.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(examsToday.length / itemsPerPage);

  const handleExamClick = (exam: ExamDetails) => {
    setSelectedExam(exam);
    setPopupOpen(true);
  };

  // Group exams by main venue for timeline
  const examsByMainVenue = examsToday.reduce((acc, exam) => {
    if (!acc[exam.mainVenue]) acc[exam.mainVenue] = [];
    acc[exam.mainVenue].push(exam);
    return acc;
  }, {} as Record<string, ExamDetails[]>);

  const { startMinutes, endMinutes } = useMemo(() => {
    const defaultStart = 8 * 60;
    const defaultEnd = 20 * 60;

    let minStart = Number.POSITIVE_INFINITY;
    let maxEnd = Number.NEGATIVE_INFINITY;

    examsToday.forEach((exam) => {
      const start = minutesSinceMidnight(exam.mainStartTime);
      const end = minutesSinceMidnight(exam.mainEndTime);
      if (start != null) minStart = Math.min(minStart, start);
      if (end != null) maxEnd = Math.max(maxEnd, end);
    });

    if (!Number.isFinite(minStart) || !Number.isFinite(maxEnd)) {
      return { startMinutes: defaultStart, endMinutes: defaultEnd };
    }

    const padding = 30;
    return {
      startMinutes: Math.min(defaultStart, minStart - padding),
      endMinutes: Math.max(defaultEnd, maxEnd + padding),
    };
  }, [examsToday]);

  const halfHourTicks = Math.max(Math.ceil((endMinutes - startMinutes) / 30) + 1, 1);

  if (isLoading)
    return (
      <Box sx={{ p: 6, textAlign: "center" }}>
        <CircularProgress size={60} />
        <Typography sx={{ mt: 2 }}>Loading exams...</Typography>
      </Box>
    );

  if (isError)
    return (
      <Box sx={{ maxWidth: 900, mx: "auto", p: 4 }}>
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography color="error" variant="h6">
            {error?.message || "Failed to load exams"}
          </Typography>
        </Paper>
      </Box>
    );

  return (
    <Box sx={{ p: 4, maxWidth: "1400px", mx: "auto" }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight={700}>
          Exams Calendar
        </Typography>
        <Typography variant="h6" color="text.secondary" data-testid="date-header">
          {formatDate(currentDate)}
        </Typography>
      </Stack>

      {/* Controls */}
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems="center" mb={4} spacing={2}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Paper elevation={0} sx={{ display: "flex", alignItems: "center", px: 2, py: 1, bgcolor: "#f8f9fa" }}>
            <Search sx={{ color: "action.active", mr: 1 }} />
            <InputBase
              placeholder="Search exams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ width: 300 }}
            />
          </Paper>

          <TextField
            label="Select a date"
            type="date"
            size="small"
            value={formatDateInput(currentDate)}
            onChange={(e) => {
              if (!e.target.value) return;
              const picked = new Date(e.target.value);
              if (!Number.isNaN(picked.getTime())) setCurrentDate(picked);
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 180 }}
          />

          <Button
            variant="outlined"
            size="medium"
            startIcon={<ArrowBack />}
            onClick={() =>
              setCurrentDate((d) => {
                const nd = new Date(d);
                nd.setDate(d.getDate() - 1);
                return nd;
              })
            }
          >
            Previous
          </Button>
          <Button variant="contained" size="medium" startIcon={<Today />} onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button
            variant="outlined"
            size="medium"
            endIcon={<ArrowForward />}
            onClick={() =>
              setCurrentDate((d) => {
                const nd = new Date(d);
                nd.setDate(d.getDate() + 1);
                return nd;
              })
            }
          >
            Next
          </Button>
        </Stack>

        <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} color="primary">
          <ToggleButton value="grid" data-testid="grid-btn">
            <GridView />
          </ToggleButton>
          <ToggleButton value="timeline" data-testid="timeline-btn">
            <Timeline />
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* Summary */}
      <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: "#f5f5f5", borderRadius: 2 }}>
        <Typography variant="h6">
          {examsToday.length > 0
            ? `${examsToday.length} exam${examsToday.length > 1 ? "s" : ""} scheduled today`
            : "No exams scheduled today"}
        </Typography>
      </Paper>

      {/* Grid View */}
      {viewMode === "grid" && (
        <>
          <Grid container spacing={3} alignItems="stretch">
            {paginatedExams.map((exam) => (
              <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={exam.id} sx={{ display: "flex" }}>
                <Tooltip
                  title={
                    <>
                      <strong>
                        {exam.code} - {exam.subject}
                      </strong>
                      <br />
                      {exam.mainVenue}
                      <br />
                      {new Date(exam.mainStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                      {new Date(exam.mainEndTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      <br />
                      {exam.venues.length} venue{exam.venues.length !== 1 ? "s" : ""}
                    </>
                  }
                  arrow
                  placement="top"
                >
                  <Paper
                    data-testid={`exam-${exam.id}`}
                    elevation={3}
                    onClick={() => handleExamClick(exam)}
                    sx={{
                      height: "100%",
                      width: "100%",
                      minHeight: 240,
                      p: 3,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      boxSizing: "border-box",
                      "&:hover": { transform: "translateY(-6px)", boxShadow: 8 },
                    }}
                  >
                    <Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight={700}>
                          {exam.code}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {exam.subject}
                        </Typography>
                      </Box>

                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Main:</strong> {exam.mainVenue}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        {new Date(exam.mainStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                        {new Date(exam.mainEndTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Typography>
                    </Box>

                    <Box>
                      <Divider sx={{ mb: 1.5 }} />
                      <Typography variant="body2" color="primary" fontWeight={600}>
                        {exam.venues.length} venue{exam.venues.length > 1 ? "s" : ""}
                      </Typography>
                    </Box>
                  </Paper>
                </Tooltip>
              </Grid>
            ))}
          </Grid>

          {totalPages > 1 && (
            <Stack direction="row" justifyContent="center" mt={6}>
              <Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)} color="primary" size="large" />
            </Stack>
          )}
        </>
      )}

      {/* Timeline View */}
      {viewMode === "timeline" && (
        <Box sx={{ overflowX: "auto", py: 2 }}>
          <Stack direction="column" spacing={5} minWidth={1200}>
            {Object.entries(examsByMainVenue).map(([mainVenue, exams]) => {
              // Sort exams by start time
              const sortedExams = [...exams].sort(
                (a, b) => new Date(a.mainStartTime).getTime() - new Date(b.mainStartTime).getTime()
              );

              // Build lanes to prevent overlap
              const lanes: ExamDetails[][] = [];
              sortedExams.forEach((exam) => {
                if (!exam.mainStartTime || !exam.mainEndTime) return;
                let placed = false;
                for (const lane of lanes) {
                  const lastInLane = lane[lane.length - 1];
                  if (new Date(lastInLane.mainEndTime) <= new Date(exam.mainStartTime)) {
                    lane.push(exam);
                    placed = true;
                    break;
                  }
                }
                if (!placed) {
                  lanes.push([exam]);
                }
              });

              const rowHeight = 40; // height per exam bar + spacing
              const totalHeight = lanes.length * rowHeight + 20;

              return (
                <Box key={mainVenue}>
                  <Typography variant="h6" fontWeight={700} mb={2} color="primary">
                    {mainVenue}
                  </Typography>

                  <Box
                    sx={{
                      position: "relative",
                      height: totalHeight,
                      bgcolor: "#f8f9fa",
                      borderRadius: 2,
                      mb: 4,
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    {lanes.flatMap((lane, laneIndex) =>
                      lane.map((exam) => {
                        const startMins = minutesSinceMidnight(exam.mainStartTime);
                        const endMins = minutesSinceMidnight(exam.mainEndTime);
                        if (startMins == null || endMins == null) return null;

                        const totalWindow = Math.max(endMinutes - startMinutes, 1);
                        const left = ((startMins - startMinutes) / totalWindow) * 100;
                        const width = Math.max(((endMins - startMins) / totalWindow) * 100, 2);

                        const otherCount = exam.venues.length - 1;
                        const venueLabel =
                          otherCount > 0 ? `(${otherCount} other venue${otherCount > 1 ? "s" : ""})` : "";

                        return (
                          <Tooltip
                            key={exam.id}
                            title={
                              <>
                                <strong>
                                  {exam.code} - {exam.subject}
                                </strong>
                                <br />
                                Main venue: {exam.mainVenue}
                                <br />
                                {new Date(exam.mainStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                                {new Date(exam.mainEndTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                <br />
                                {exam.venues.length} venue{exam.venues.length !== 1 ? "s" : ""}
                              </>
                            }
                            arrow
                            placement="top"
                          >
                            <Box
                              data-testid={`exam-${exam.id}`}
                              onClick={() => handleExamClick(exam)}
                              sx={{
                                position: "absolute",
                                left: `${left}%`,
                                width: `${width}%`,
                                top: 10 + laneIndex * rowHeight,
                                height: 34,
                                bgcolor: departmentColors[exam.department] || "#9e9e9e",
                                color: "white",
                                borderRadius: 1,
                                px: 1.5,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                fontWeight: 600,
                                fontSize: "0.8125rem",
                                fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
                                letterSpacing: "0.01em",
                                boxShadow: 3,
                                transition: "all 0.2s",
                                "&:hover": { transform: "scale(1.06)", boxShadow: 6, zIndex: 10 },
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {exam.code} {venueLabel}
                            </Box>
                          </Tooltip>
                        );
                      })
                    )}
                  </Box>
                </Box>
              );
            })}

            {/* Perfect half-hour time ruler - always on one line */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: `repeat(${halfHourTicks}, 1fr)`,
                gap: 0,
                mt: 4,
                width: "100%",
                pb: 2,
              }}
            >
              {Array.from({ length: halfHourTicks }, (_, i) => {
                const minutesFromStart = startMinutes + i * 30;
                const hour = Math.floor(minutesFromStart / 60);
                const minute = minutesFromStart % 60 === 0 ? "00" : "30";
                const isHour = minute === "00";

                return (
                  <Typography
                    key={i}
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      textAlign: "center",
                      fontSize: "0.75rem",
                      fontWeight: isHour ? 600 : 400,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {hour}:{minute}
                  </Typography>
                );
              })}
            </Box>
          </Stack>
        </Box>
      )}

      <ExamDetailsPopup
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
        exam={selectedExam}
        departmentColors={departmentColors}
      />
    </Box>
  );
};
