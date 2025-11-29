import React, { useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Button,
  Paper,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  InputBase,
  Grid,
  Pagination,
  Divider,
} from "@mui/material";
import {
  ArrowBack,
  ArrowForward,
  Today,
  GridView,
  Timeline,
  Search,
} from "@mui/icons-material";
import { ExamDetailsPopup } from "../../components/admin/ExamDetailsPopup";

interface ExamVenueInfo {
  venue: string;
  startTime: string;
  endTime: string;
  students: number;
  invigilators: number;
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

const departmentColors: Record<string, string> = {
  CS: "#4caf50",
  Math: "#2196f3",
  Physics: "#ff9800",
  English: "#9c27b0",
  Chemistry: "#e91e63",
};

const examData: ExamDetails[] = [
  {
    id: 1,
    code: "CS101",
    subject: "Introduction to Programming",
    department: "CS",
    mainVenue: "James Watt South - J15",
    mainStartTime: "2025-12-10T09:00",
    mainEndTime: "2025-12-10T11:00",
    venues: [
      { venue: "James Watt South - J15", startTime: "2025-12-10T09:00", endTime: "2025-12-10T11:00", students: 245, invigilators: 8 },
      { venue: "Boyd Orr - Lecture Theatre 1", startTime: "2025-12-10T09:00", endTime: "2025-12-10T11:00", students: 180, invigilators: 6 },
      { venue: "Sir Charles Wilson - Main Hall", startTime: "2025-12-10T09:00", endTime: "2025-12-10T11:00", students: 90, invigilators: 4 },
      { venue: "Separate Room SR7 (Provisions)", startTime: "2025-12-10T09:00", endTime: "2025-12-10T11:30", students: 12, invigilators: 3 },
    ],
  },
  {
    id: 2,
    code: "MATH201",
    subject: "Linear Algebra",
    department: "Math",
    mainVenue: "Boyd Orr - LT2",
    mainStartTime: "2025-12-10T14:00",
    mainEndTime: "2025-12-10T16:30",
    venues: [
      { venue: "Boyd Orr - LT2", startTime: "2025-12-10T14:00", endTime: "2025-12-10T16:30", students: 320, invigilators: 10 },
      { venue: "Rankine Building - 401", startTime: "2025-12-10T14:00", endTime: "2025-12-10T16:30", students: 120, invigilators: 5 },
      { venue: "Purple Cluster - PC2", startTime: "2025-12-10T14:00", endTime: "2025-12-10T16:30", students: 48, invigilators: 3 },
    ],
  },
  {
    id: 3,
    code: "PHY301",
    subject: "Quantum Physics",
    department: "Physics",
    mainVenue: "Kelvin Building - LT",
    mainStartTime: "2025-12-11T09:00",
    mainEndTime: "2025-12-11T12:00",
    venues: [
      { venue: "Kelvin Building - LT", startTime: "2025-12-11T09:00", endTime: "2025-12-11T12:00", students: 160, invigilators: 6 },
      { venue: "Separate Room SR12 (Provisions)", startTime: "2025-12-11T09:00", endTime: "2025-12-11T12:30", students: 8, invigilators: 2 },
    ],
  },
  {
    id: 4,
    code: "CHEM402",
    subject: "Organic Chemistry",
    department: "Chemistry",
    mainVenue: "Joseph Black Building - A101",
    mainStartTime: "2025-12-11T14:00",
    mainEndTime: "2025-12-11T17:00",
    venues: [
      { venue: "Joseph Black - A101", startTime: "2025-12-11T14:00", endTime: "2025-12-11T17:00", students: 280, invigilators: 9 },
      { venue: "Joseph Black - A102", startTime: "2025-12-11T14:00", endTime: "2025-12-11T17:00", students: 140, invigilators: 5 },
      { venue: "Purple Cluster - PC3", startTime: "2025-12-11T14:00", endTime: "2025-12-11T17:00", students: 35, invigilators: 3 },
    ],
  },
];

export const AdminCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"grid" | "timeline">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [popupOpen, setPopupOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<ExamDetails | null>(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 6;

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const examsToday = examData.filter(
    (e) =>
      new Date(e.mainStartTime).toDateString() === currentDate.toDateString() &&
      (e.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.mainVenue.toLowerCase().includes(searchQuery.toLowerCase()))
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

  return (
    <Box sx={{ p: 4, maxWidth: "1400px", mx: "auto" }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight={700}>
          Exams Calendar
        </Typography>
        <Typography variant="h6" color="text.secondary">
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

          <Button variant="outlined" size="medium" startIcon={<ArrowBack />} onClick={() => setCurrentDate(d => { const nd = new Date(d); nd.setDate(d.getDate() - 1); return nd; })}>
            Previous
          </Button>
          <Button variant="contained" size="medium" startIcon={<Today />} onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button variant="outlined" size="medium" endIcon={<ArrowForward />} onClick={() => setCurrentDate(d => { const nd = new Date(d); nd.setDate(d.getDate() + 1); return nd; })}>
            Next
          </Button>
        </Stack>

        <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} color="primary">
          <ToggleButton value="grid">
            <GridView/>
          </ToggleButton>
          <ToggleButton value="timeline">
            <Timeline/>
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
          <Grid container spacing={3}>
            {paginatedExams.map((exam) => (
              <Grid item xs={12} sm={6} lg={4} key={exam.id}>
                <Paper
                  elevation={3}
                  onClick={() => handleExamClick(exam)}
                  sx={{
                    height: 200,
                    width: 200,
                    p: 3,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    "&:hover": { transform: "translateY(-6px)", boxShadow: 8 },
                  }}
                >
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="start" mb={2}>
                      <Box>
                        <Typography variant="h6" fontWeight={700}>
                          {exam.code}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {exam.subject}
                        </Typography>
                      </Box>
                      <Chip
                        label={exam.department}
                        size="small"
                        sx={{
                          bgcolor: departmentColors[exam.department] || "#9e9e9e",
                          color: "white",
                          fontWeight: 600,
                        }}
                      />
                    </Stack>

                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Main:</strong> {exam.mainVenue}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {new Date(exam.mainStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                      {new Date(exam.mainEndTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Typography>
                  </Box>

                  <Box>
                    <Divider sx={{ mb: 1.5 }} />
                    <Typography variant="body2" color="primary" fontWeight={600}>
                      {exam.venues.length} venue{exam.venues.length > 1 ? "s" : ""} ·{" "}
                      {exam.venues.reduce((a, v) => a + v.students, 0)} students
                    </Typography>
                  </Box>
                </Paper>
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
          <Stack direction="column" spacing={4} minWidth={1200}>
            {Object.entries(examsByMainVenue).map(([mainVenue, exams]) => (
              <Box key={mainVenue}>
                <Typography variant="h6" fontWeight={700} mb={2} color="primary">
                  {mainVenue}
                </Typography>

                <Box sx={{ position: "relative", height: 60, bgcolor: "#f8f9fa", borderRadius: 1, mb: 3 }}>
                  {exams.map((exam) => {
                    const dayStart = 8 * 60;
                    const dayEnd = 20 * 60;
                    const startMins = new Date(exam.mainStartTime).getHours() * 60 + new Date(exam.mainStartTime).getMinutes();
                    const endMins = new Date(exam.mainEndTime).getHours() * 60 + new Date(exam.mainEndTime).getMinutes();
                    const left = ((startMins - dayStart) / (dayEnd - dayStart)) * 100;
                    const width = ((endMins - startMins) / (dayEnd - dayStart)) * 100;

                    const otherCount = exam.venues.length - 1;
                    const venueLabel = otherCount > 0 ? `(${otherCount} other venue${otherCount > 1 ? "s" : ""})` : "";

                    return (
                      <Box
                        key={exam.id}
                        onClick={() => handleExamClick(exam)}
                        sx={{
                          position: "absolute",
                          left: `${left}%`,
                          width: `${width}%`,
                          top: 14,
                          height: 32,
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
                          fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif !important",
                          letterSpacing: "0.01em",
                          boxShadow: 3,
                          transition: "all 0.2s",
                          "&:hover": { transform: "scale(1.06)", boxShadow: 6 },
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {exam.code} {venueLabel}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            ))}

            {/* Time ruler */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(25, 1fr)",
                gap: 0,
                mt: 4,
                width: "100%",
                overflow: "hidden",
                pb: 1,
              }}
            >
              {Array.from({ length: 25 }, (_, i) => {
                const hour = 8 + Math.floor(i / 2);
                const minute = i % 2 === 0 ? "00" : "30";
                const timeLabel = i % 2 === 0 ? `${hour}:${minute}` : `${hour}:${minute}`;

                return (
                  <Typography
                    key={i}
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      textAlign: "left",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {timeLabel}
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