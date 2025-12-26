import React from "react";
import { Paper, Stack, Typography, Divider } from "@mui/material";
import { SxProps, Theme } from "@mui/system";

type PanelProps = {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  disableDivider?: boolean;
};

const baseSx: SxProps<Theme> = {
  p: 3,
  mb: 3,
  borderRadius: 3,
  border: "1px solid #e5e7eb",
  boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
  backgroundColor: "#fff",
};

export const Panel: React.FC<PanelProps> = ({ title, actions, children, sx, disableDivider = false }) => {
  const hasHeader = Boolean(title) || Boolean(actions);
  return (
    <Paper sx={{ ...baseSx, ...sx }}>
      {hasHeader && (
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="flex-start" mb={2} spacing={1}>
          {title && (
            <Typography variant="h6" fontWeight={700}>
              {title}
            </Typography>
          )}
          {actions}
        </Stack>
      )}
      {hasHeader && !disableDivider && <Divider sx={{ mb: 2 }} />}
      {children}
    </Paper>
  );
};

export default Panel;
