import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Chip,
  Box,
  Tooltip,
  CircularProgress,
  Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import IconButton from "@mui/material/IconButton";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiBaseUrl, apiFetch } from "../../utils/api";
import { PillButton } from "../PillButton";

const VENUE_TYPES = [
  { value: "main_hall", label: "Main Hall" },
  { value: "purple_cluster", label: "Purple Cluster" },
  { value: "computer_cluster", label: "Computer Cluster" },
  { value: "separate_room", label: "Separate Room" },
  { value: "school_to_sort", label: "School To Sort" },
  { value: "kelvin_hall", label: "Kelvin Hall" },
  { value: "detached_duty", label: "Detached Duty" },
  { value: "vet_school", label: "Vet School" },
  { value: "scottish_event_campus", label: "Scottish Event Campus" },
  { value: "osce_exam", label: "OSCE Exam" },
  { value: "pre_sessional_english", label: "Pre-Sessional English" },
  { value: "admin", label: "Admin" },
];

const PROVISION_CHOICES = [
  { value: "separate_room_on_own", label: "Separate room on own" },
  { value: "separate_room_not_on_own", label: "Separate room not on own" },
  { value: "use_computer", label: "Use of a computer" },
  { value: "accessible_hall", label: "Accessible hall" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: (name: string) => void;
}

export const AddVenueDialog: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const [venueName, setVenueName] = useState("");
  const [capacity, setCapacity] = useState<number | "">("");
  const [venueType, setVenueType] = useState("");
  const [isAccessible, setIsAccessible] = useState(true);
  const [provisions, setProvisions] = useState<string[]>([]);

  const resetForm = () => {
    setVenueName("");
    setCapacity("");
    setVenueType("");
    setIsAccessible(true);
    setProvisions([]);
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const response = await apiFetch(`${apiBaseUrl}/venues/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venue_name: venueName,
          capacity: capacity ? Number(capacity) : 0,
          venuetype: venueType,
          is_accessible: isAccessible,
          provision_capabilities: provisions,
          qualifications: [],
          availability: [],
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Unable to add venue");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      onSuccess?.(data.venue_name);
      resetForm();
      onClose();
    },
    onError: (err: any) => {
      alert(err?.message || "Failed to add venue");
    },
  });

  const toggleProvision = (value: string) => {
    setProvisions((prev) => (prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]));
  };

  const mandatoryFilled = venueName && capacity !== "" && venueType;

  return (
    <Dialog open={open} onClose={addMutation.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Add Venue
        <IconButton
          aria-label="close"
          onClick={() => {
            if (!addMutation.isPending) onClose();
          }}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField label="Venue Name" value={venueName} onChange={(e) => setVenueName(e.target.value)} fullWidth required />
          <TextField label="Capacity" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value === "" ? "" : Number(e.target.value))} fullWidth required />
          <TextField label="Venue Type" select value={venueType} onChange={(e) => setVenueType(e.target.value)} fullWidth required>
            {VENUE_TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={<Checkbox checked={isAccessible} onChange={(e) => setIsAccessible(e.target.checked)} />}
            label="Accessible"
          />
          <Box>
            <Typography variant="body2" fontWeight={600} mb={1}>
              Provision Capabilities
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
              {PROVISION_CHOICES.map((p) => {
                const selected = provisions.includes(p.value);
                return (
                  <Tooltip key={p.value} title={selected ? "Click to remove" : "Click to add"}>
                    <Chip
                      label={p.label}
                      color={selected ? "primary" : "default"}
                      variant={selected ? "filled" : "outlined"}
                      onClick={() => toggleProvision(p.value)}
                      sx={{ cursor: "pointer" }}
                    />
                  </Tooltip>
                );
              })}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <PillButton
          variant="contained"
          onClick={() => addMutation.mutate()}
          disabled={!mandatoryFilled || addMutation.isPending}
          startIcon={addMutation.isPending ? <CircularProgress size={18} /> : undefined}
        >
          Add
        </PillButton>
      </DialogActions>
    </Dialog>
  );
};
