import React from "react";
import { Box, Chip, Divider, Stack, Typography, Paper } from "@mui/material";
import { AccessTime, EventAvailable, Cancel, Update, EditNote, CheckCircle, InfoOutlined } from "@mui/icons-material";

export type NotificationType =
  | "availability"
  | "cancellation"
  | "shiftPickup"
  | "examChange"
  | "invigilatorUpdate";

export interface NotificationItem {
  id: number;
  type: NotificationType;
  message: string;
  timestamp: string;
}

const typeStyles: Record<
  NotificationType,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  availability: {
    label: "Restriction",
    color: "#0d47a1",
    bg: "rgba(13,71,161,0.08)",
    icon: <EventAvailable fontSize="small" />,
  },
  cancellation: {
    label: "Cancellation",
    color: "#b71c1c",
    bg: "rgba(183,28,28,0.08)",
    icon: <Cancel fontSize="small" />,
  },
  shiftPickup: {
    label: "Shift Pickup",
    color: "#1b5e20",
    bg: "rgba(27,94,32,0.08)",
    icon: <CheckCircle fontSize="small" />,
  },
  examChange: {
    label: "Exam Change",
    color: "#e65100",
    bg: "rgba(230,81,0,0.08)",
    icon: <Update fontSize="small" />,
  },
  invigilatorUpdate: {
    label: "Invigilator Update",
    color: "#4a148c",
    bg: "rgba(74,20,140,0.08)",
    icon: <EditNote fontSize="small" />,
  },
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const NotificationsPanel: React.FC<{ notifications: NotificationItem[] }> = ({ notifications }) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        background: "#ffffff",
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" fontWeight={700}>
          Notifications
        </Typography>
        <Chip
          label={`${notifications.length} updates`}
          size="small"
          sx={{
            backgroundColor: "#e3f2fd",
            color: "#0d47a1",
            fontWeight: 600,
          }}
        />
      </Stack>
      <Divider sx={{ mb: 2 }} />

      <Stack spacing={1.5}>
        {notifications.length === 0 ? (
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              border: "1px dashed",
              borderColor: "divider",
              backgroundColor: "#f9fafb",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <InfoOutlined fontSize="small" sx={{ color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">
              No notifications yet.
            </Typography>
          </Box>
        ) : (
          notifications.map((n) => {
            const style = typeStyles[n.type];
            return (
              <Box
                key={n.id}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: style.bg,
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      icon={style.icon}
                      label={style.label}
                      size="small"
                      sx={{
                        backgroundColor: "#fff",
                        color: style.color,
                        fontWeight: 700,
                        border: `1px solid ${style.color}`,
                        "& .MuiChip-icon": {
                          color: style.color,
                        },
                      }}
                    />
                    <Typography variant="body2" sx={{ color: "text.primary" }}>
                      {n.message}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: "text.secondary" }}>
                    <AccessTime fontSize="small" />
                    <Typography variant="caption">{formatDate(n.timestamp)}</Typography>
                  </Stack>
                </Stack>
              </Box>
            );
          })
        )}
      </Stack>
    </Paper>
  );
};
