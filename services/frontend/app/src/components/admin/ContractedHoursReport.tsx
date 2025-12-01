import React from "react";
import {
  Paper,
  Typography,
  Stack,
  CircularProgress,
  Alert,
  Box,
} from "@mui/material";

export interface ContractedHoursData {
  contracted_hours: number;
  total_hours: number;
  remaining_hours?: number;
}

interface ContractedHoursReportProps {
  report: ContractedHoursData | null;
  loading: boolean;
  error: string | null;
  invigName?: string;
  fakeReport?: {
    total_hours: number;
    contracted_hours: number;
  };
}

export const ContractedHoursReport: React.FC<ContractedHoursReportProps> = ({
  report,
  loading,
  error,
  invigName,
}) => {
  
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 2,
        width: "100%",
        boxShadow: 1,
      }}
    >
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <Typography variant="h6" fontWeight={600}>
          Contracted Hours
        </Typography>
      </Stack>

      {/* Loading */}
      {loading && (
        <Stack alignItems="center" py={2}>
          <CircularProgress size={26} />
        </Stack>
      )}

      {/* Error */}
      {!loading && error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}

      {/* No data */}
      {!loading && !error && !report && (
        <Alert severity="info">No contracted hours available.</Alert>
      )}

      {/* Summary */}
      {!loading && !error && report && (
        <Stack direction="row" spacing={5} mt={1}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Total Allocated
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {report.total_hours} hours
            </Typography>
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary">
              Contracted
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {report.contracted_hours} hours
            </Typography>
          </Box>

          {report.remaining_hours !== undefined && (
            <Box mt={1}>
              <Typography
                variant="body2"
                color={
                  report.remaining_hours < 0 ? "error.main" : "success.main"
                }
              >
                {report.remaining_hours < 0 ? "Over Contract" : "Remaining"}
              </Typography>
              <Typography
                variant="body1"
                fontWeight={600}
                color={
                  report.remaining_hours < 0 ? "error.main" : "success.main"
                }
              >
                {Math.abs(report.remaining_hours)} hours
              </Typography>
            </Box>
          )}
        </Stack>
      )}
    </Paper>
  );
};