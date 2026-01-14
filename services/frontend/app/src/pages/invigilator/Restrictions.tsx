import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Panel } from "../../components/Panel";
import { PillButton } from "../../components/PillButton";
import { apiBaseUrl, apiFetch } from "../../utils/api";

type SlotCode = "MORNING" | "AFTERNOON" | "EVENING";

type AvailabilityResponse = {
  diet: string;
  start_date: string;
  end_date: string;
  diets: { code: string; start_date: string; end_date: string }[];
  days: {
    date: string;
    slots: { slot: SlotCode; available: boolean }[];
  }[];
};

const slotLabels: Record<SlotCode, string> = {
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  EVENING: "Evening",
};

const slotOrder: SlotCode[] = ["MORNING", "AFTERNOON", "EVENING"];

export const InvigilatorRestrictions: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedDiet, setSelectedDiet] = useState<string | null>(null);
  const [days, setDays] = useState<AvailabilityResponse["days"]>([]);
  const [successOpen, setSuccessOpen] = useState(false);

  const availabilityQuery = useQuery<AvailabilityResponse>({
    queryKey: ["invigilator-availability", selectedDiet || "default"],
    queryFn: async () => {
      const dietParam = selectedDiet ? `?diet=${encodeURIComponent(selectedDiet)}` : "";
      const res = await apiFetch(`${apiBaseUrl}/invigilator/availability/${dietParam}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Unable to load restrictions");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (!selectedDiet) setSelectedDiet(data.diet);
      setDays(
        (data.days || []).map((d) => ({
          ...d,
          slots: [...d.slots].sort((a, b) => slotOrder.indexOf(a.slot) - slotOrder.indexOf(b.slot)),
        }))
      );
    },
    staleTime: 0,
    keepPreviousData: true,
  });

  const diets = useMemo(() => {
    return (availabilityQuery.data?.diets || []).map((d) => ({
      code: d.code,
      label: d.code.replace(/_/g, " "),
    }));
  }, [availabilityQuery.data?.diets]);

  useEffect(() => {
    if (availabilityQuery.data?.diet && selectedDiet !== availabilityQuery.data.diet && !selectedDiet) {
      setSelectedDiet(availabilityQuery.data.diet);
    }
  }, [availabilityQuery.data?.diet, selectedDiet]);

  const toggleSlot = (date: string, slot: SlotCode) => {
    setDays((prev) =>
      prev.map((day) =>
        day.date === date
          ? {
              ...day,
              slots: day.slots.map((s) =>
                s.slot === slot ? { ...s, available: !s.available } : s
              ),
            }
          : day
      )
    );
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedDiet) throw new Error("Select a diet first");
      const payload = {
        diet: selectedDiet,
        unavailable: days
          .flatMap((day) =>
            day.slots
              .filter((s) => !s.available)
              .map((s) => ({ date: day.date, slot: s.slot }))
          ),
      };
      const res = await apiFetch(`${apiBaseUrl}/invigilator/availability/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to submit restrictions");
      }
      return res.json();
    },
    onSuccess: (data: AvailabilityResponse & { unavailable_count?: number }) => {
      if (data.days) {
        setDays(
          data.days.map((d) => ({
            ...d,
            slots: [...d.slots].sort((a, b) => slotOrder.indexOf(a.slot) - slotOrder.indexOf(b.slot)),
          }))
        );
      }
      setSuccessOpen(true);
      queryClient.invalidateQueries({ queryKey: ["invigilator-availability"] });
    },
  });

  const handleDietChange = (diet: string) => {
    setSelectedDiet(diet);
  };

  const startDate = availabilityQuery.data?.start_date;
  const endDate = availabilityQuery.data?.end_date;

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2} sx={{ maxWidth: 1200, mx: "auto" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" spacing={1}>
          <Stack spacing={0.5}>
            <Typography variant="h4" fontWeight={700}>
              Restrictions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Deselect the slots you cannot work for the selected exam diet, then submit your restrictions.
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Exam diet
            </Typography>
            <Select
              size="small"
              value={selectedDiet || ""}
              onChange={(e) => handleDietChange(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              {diets.map((d) => (
                <MenuItem key={d.code} value={d.code}>
                  {d.label}
                </MenuItem>
              ))}
            </Select>
          </Stack>
        </Stack>

        <Panel sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="flex-start" spacing={1}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Availability for {selectedDiet || "diet"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {startDate && endDate
                    ? `${dayjs(startDate).format("D MMM YYYY")} - ${dayjs(endDate).format("D MMM YYYY")}`
                    : "Loading date range..."}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <PillButton
                  variant="outlined"
                  onClick={() => availabilityQuery.refetch()}
                  disabled={availabilityQuery.isFetching}
                >
                  Refresh
                </PillButton>
                <PillButton
                  variant="contained"
                  onClick={() => mutation.mutate()}
                  disabled={availabilityQuery.isLoading || mutation.isLoading || days.length === 0}
                >
                  Submit restrictions
                </PillButton>
              </Stack>
            </Stack>

            {availabilityQuery.isLoading && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress />
              </Box>
            )}

            {availabilityQuery.isError && (
              <Alert severity="error">
                {(availabilityQuery.error as Error)?.message || "Unable to load restrictions"}
              </Alert>
            )}

            {!availabilityQuery.isLoading && !availabilityQuery.isError && days.length === 0 && (
              <Alert severity="info">No availability data found for this diet.</Alert>
            )}

            <Grid container spacing={1.5}>
              {days.map((day) => {
                const dateLabel = dayjs(day.date).format("ddd, D MMM");
                return (
                  <Grid item xs={12} sm={6} md={4} key={day.date}>
                    <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
                      <Stack spacing={1}>
                        <Typography variant="subtitle2" fontWeight={700}>
                          {dateLabel}
                        </Typography>
                        <Divider />
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {day.slots.map((slot) => {
                            const available = slot.available;
                            const label = slotLabels[slot.slot];
                            return (
                              <Tooltip
                                key={slot.slot}
                                title={available ? "Available" : "Not available"}
                                arrow
                              >
                                <Chip
                                  label={label}
                                  color={available ? "success" : "default"}
                                  variant={available ? "filled" : "outlined"}
                                  onClick={() => toggleSlot(day.date, slot.slot)}
                                  sx={{
                                    borderRadius: 2,
                                    minWidth: 120,
                                    justifyContent: "center",
                                    opacity: available ? 1 : 0.7,
                                  }}
                                />
                              </Tooltip>
                            );
                          })}
                        </Stack>
                      </Stack>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>

            <Alert severity="info">
              Clicking a slot marks you as unavailable for that time. Submit to save your restrictions and notify administrators.
            </Alert>
          </Stack>
        </Panel>
      </Stack>

      <Snackbar
        open={successOpen}
        autoHideDuration={3500}
        onClose={() => setSuccessOpen(false)}
        message="Restrictions updated"
      />
    </Box>
  );
};

export default InvigilatorRestrictions;
