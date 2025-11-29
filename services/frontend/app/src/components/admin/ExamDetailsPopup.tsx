import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, Stack, Button, Paper, Chip } from "@mui/material";

export interface ExamVenueInfo {
  venue: string;
  startTime: string;
  endTime: string;
  students: number;
  invigilators: number;
}

export interface ExamDetails {
  code: string;
  subject: string;
  department?: string;
  mainVenue?: string;
  mainStartTime?: string;
  mainEndTime?: string;
  venues: ExamVenueInfo[];
}

interface ExamDetailsPopupProps {
  open: boolean;
  onClose: () => void;
  exam: ExamDetails | null;
  departmentColors?: Record<string, string>;
}

export const ExamDetailsPopup: React.FC<ExamDetailsPopupProps> = ({ open, onClose, exam, departmentColors }) => {
  if (!exam) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {exam.code} - {exam.subject}{" "}
        {exam.department && (
          <Chip
            label={exam.department}
            sx={{ ml: 1, bgcolor: departmentColors?.[exam.department] || "#9e9e9e", color: "#fff" }}
          />
        )}
      </DialogTitle>
      <DialogContent dividers>
        {exam.mainVenue && exam.mainStartTime && exam.mainEndTime && (
          <Paper elevation={0} sx={{ p: 3, bgcolor: "#f8f9fa", borderRadius: 2, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Main Exam Location
            </Typography>
            <Typography variant="body2">Venue: {exam.mainVenue}</Typography>
            <Typography variant="body2">
              Time: {new Date(exam.mainStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
              {new Date(exam.mainEndTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Typography>
          </Paper>
        )}

        <Typography variant="subtitle1" fontWeight={600} mb={1}>All Venues</Typography>
        <Stack spacing={1}>
          {exam.venues.map((v, i) => (
            <Paper key={i} sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: 1, bgcolor: "#fafafa" }}>
              <Stack spacing={0.5}>
                <Typography variant="body1">{v.venue}</Typography>
                <Typography variant="body2">
                  {new Date(v.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                  {new Date(v.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Typography>
              </Stack>
              <Stack spacing={0.5} alignItems="flex-end">
                <Typography variant="body2">Students: {v.students}</Typography>
                <Typography variant="body2">Invigilators: {v.invigilators}</Typography>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};