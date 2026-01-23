import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Typography,
  Chip,
  Box,
  Link as MUILink,
  IconButton,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { Dayjs } from "dayjs";
import { Close } from "@mui/icons-material";
import { formatDate } from "../../utils/dates";

interface Invigilator {
  id: number;
  preferred_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  availableDates?: string[];
  availableSlots?: string[];
  availabilities?: { date: string; slot: string; available: boolean }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  date: Dayjs | null;
  invigilators: Invigilator[];
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const displayPreferredAndFull = (i: Invigilator) => {
  if (i.preferred_name && i.full_name && i.preferred_name !== i.full_name) {
    return { main: i.preferred_name, sub: i.full_name };
  }
  return {
    main: i.preferred_name || i.full_name || `Invigilator #${i.id}`,
    sub: "",
  };
};

export const InvigilatorAvailabilityModal: React.FC<Props> = ({
  open,
  onClose,
  date,
  invigilators
}) => {
  if (!date) return null;

  const dateStr = date.format("YYYY-MM-DD");

  const allowedSlots = new Set(["MORNING", "EVENING"]);

  const slotLabel = (slot: string) => {
    switch (slot) {
      case "MORNING":
        return "Morning";
      case "EVENING":
        return "Evening";
      default:
        return slot;
    }
  };

  const available = invigilators.filter(
    (i) =>
      i.availabilities?.some((a) => a.available && a.date === dateStr) ||
      i.availableDates?.includes(dateStr)
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        Available on {formatDate(date)}
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ position: "absolute", right: 12, top: 10 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {available.length === 0 ? (
          <Typography color="text.secondary" align="center" py={4}>
            No invigilators available on {formatDate(date)}
          </Typography>
        ) : (
          <List>
            {available.map((i) => {
              const slotsOnDate =
                i.availabilities
                  ?.filter((a) => a.available && a.date === dateStr && allowedSlots.has(a.slot))
                  .map((a) => slotLabel(a.slot)) ||
                i.availableSlots
                  ?.filter((slot) => slot.startsWith(dateStr))
                  .map((slot) => slot.split("T")[1]?.slice(0, 5))
                  .filter(Boolean)
                  .map((time) => `Available (${time})`) ||
                [];

              const names = displayPreferredAndFull(i);
              const initials = getInitials(names.main);

              return (
                <ListItem key={i.id} divider>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: "primary.main" }}>
                      {initials}
                    </Avatar>
                  </ListItemAvatar>

                  <ListItemText
                    primaryTypographyProps={{ component: "div" }}
                    secondaryTypographyProps={{ component: "div" }}
                    primary={
                      <Box>
                        <MUILink
                          component={RouterLink}
                          to={`/admin/invigilators/${i.id}`}
                          color="primary"
                          underline="none"
                          sx={{ fontWeight: 600, mr: 1 }}
                        >
                          {names.main}
                        </MUILink>
                        {names.sub && (
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.secondary"
                          >
                            ({names.sub})
                          </Typography>
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {i.email}
                        </Typography>

                        {slotsOnDate.length > 0 ? (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="subtitle2" color="primary">
                              Available slots:
                            </Typography>
                            {slotsOnDate.map((slot, idx) => (
                              <Chip
                                key={idx}
                                label={slot}
                                size="small"
                                color="success"
                                variant="outlined"
                                sx={{ mr: 1, mt: 0.5 }}
                              />
                            ))}
                          </Box>
                        ) : (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 1 }}
                          >
                            Available (no specific time slots recorded)
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>

      <DialogActions />
    </Dialog>
  );
};
