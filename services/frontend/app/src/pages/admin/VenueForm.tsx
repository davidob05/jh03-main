import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { apiBaseUrl } from "../../utils/api";

const PROVISION_CAPABILITIES = [
  { value: "separate_room_on_own", label: "Separate room on own" },
  { value: "separate_room_not_on_own", label: "Separate room not on own" },
  { value: "use_computer", label: "Use of a computer" },
  { value: "accessible_hall", label: "Accessible hall" },
];

const VENUE_TYPES = [
  { value: "main_hall", label: "Main Hall" },
  { value: "purple_cluster", label: "Purple Cluster" },
  { value: "computer_cluster", label: "Computer Cluster" },
  { value: "separate_room", label: "Separate Room" },
  { value: "school_to_sort", label: "School To Sort" },
];

type VenueRouteParams = {
  venueName?: string;
};

type VenueData = {
  venue_name: string;
  capacity: number;
  venuetype: string;
  is_accessible: boolean;
  provision_capabilities: string[];
  qualifications?: string[];
  availability?: unknown[];
};

const fetchVenue = async (venueName: string): Promise<VenueData> => {
  const response = await fetch(`${apiBaseUrl}/venues/${encodeURIComponent(venueName)}/`);
  if (!response.ok) throw new Error("Unable to load venue");
  return response.json();
};

export const AdminVenueForm: React.FC = () => {
  const { venueName } = useParams<VenueRouteParams>();
  const isEdit = Boolean(venueName);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [status, setStatus] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  const { data, isLoading, isError, error } = useQuery<VenueData, Error>({
    queryKey: ["venue", venueName],
    queryFn: () => fetchVenue(venueName || ""),
    enabled: isEdit,
  });

  const [form, setForm] = React.useState<VenueData>({
    venue_name: "",
    capacity: 0,
    venuetype: "main_hall",
    is_accessible: true,
    provision_capabilities: [],
    qualifications: [],
    availability: [],
  });

  React.useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const handleFieldChange = <K extends keyof VenueData>(field: K, value: VenueData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveVenue = useMutation({
    mutationFn: async () => {
      const payload = {
        venue_name: form.venue_name,
        capacity: Number(form.capacity) || 0,
        venuetype: form.venuetype,
        is_accessible: form.is_accessible,
        provision_capabilities: (form.provision_capabilities || []).map((cap) => cap.trim()).filter(Boolean),
        qualifications: form.qualifications || [],
        availability: form.availability || [],
      };

      const url = isEdit
        ? `${apiBaseUrl}/venues/${encodeURIComponent(venueName || "")}/`
        : `${apiBaseUrl}/venues/`;
      const method = isEdit ? "PATCH" : "POST";
      const resp = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const detail = await resp.text();
        throw new Error(detail || "Failed to save venue");
      }
      return resp.json();
    },
    onSuccess: () => {
      setStatus({ type: "success", message: "Venue saved." });
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      if (venueName) queryClient.invalidateQueries({ queryKey: ["venue", venueName] });
      navigate("/admin/venues");
    },
    onError: (err: any) => {
      setStatus({ type: "error", message: err?.message || "Failed to save venue." });
    },
  });

  if (isEdit && isLoading) {
    return (
      <Box sx={{ maxWidth: 900, mx: "auto", p: 3 }}>
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6">Loading venue...</Typography>
        </Paper>
      </Box>
    );
  }

  if (isEdit && (isError || !data)) {
    return (
      <Box sx={{ maxWidth: 900, mx: "auto", p: 3 }}>
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography color="error" variant="h6">
            {error?.message || "Unable to load venue"}
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Button variant="text" onClick={() => navigate("/admin/venues")}>Back to venues</Button>
        <Typography variant="h5" fontWeight={600}>{isEdit ? "Edit venue" : "Add venue"}</Typography>
      </Stack>

      {status && (
        <Alert severity={status.type} onClose={() => setStatus(null)}>
          {status.message}
        </Alert>
      )}

      <Paper sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} gap={2}>
          <TextField
            fullWidth
            label="Venue name"
            value={form.venue_name}
            onChange={(e) => handleFieldChange("venue_name", e.target.value)}
          />
          <TextField
            fullWidth
            type="number"
            label="Capacity"
            inputProps={{ min: 0 }}
            value={form.capacity}
            onChange={(e) => handleFieldChange("capacity", Number(e.target.value))}
          />
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} gap={2} alignItems={{ md: "center" }}>
          <TextField
            select
            fullWidth
            label="Venue type"
            value={form.venuetype}
            onChange={(e) => handleFieldChange("venuetype", e.target.value)}
          >
            {VENUE_TYPES.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={
              <Switch
                checked={form.is_accessible}
                onChange={(e) => handleFieldChange("is_accessible", e.target.checked)}
              />
            }
            label="Accessible"
          />
        </Stack>

        <Autocomplete
          multiple
          options={PROVISION_CAPABILITIES}
          getOptionLabel={(opt) => opt.label}
          value={PROVISION_CAPABILITIES.filter((opt) => (form.provision_capabilities || []).includes(opt.value))}
          onChange={(_, newValue) => handleFieldChange("provision_capabilities", newValue.map((opt) => opt.value))}
          renderInput={(params) => <TextField {...params} label="Provision capabilities" placeholder="Select provisions" />}
        />

        <Stack direction="row" justifyContent="flex-end" gap={1}>
          <Button variant="outlined" onClick={() => navigate("/admin/venues")}>Cancel</Button>
          <Button variant="contained" onClick={() => saveVenue.mutate()} disabled={saveVenue.isPending}>
            {saveVenue.isPending ? "Saving..." : "Save venue"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};
