import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { FreeCancellation } from "@mui/icons-material";
import dayjs from "dayjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Panel } from "../../components/Panel";
import { PillButton } from "../../components/PillButton";
import { apiBaseUrl, apiFetch } from "../../utils/api";

type SlotCode = "MORNING" | "EVENING";

type AvailabilityEntry = {
  date: string;
  slot: SlotCode;
  available: boolean;
};

type AvailabilityResponse = {
  diet: string;
  diet_name?: string | null;
  start_date: string | null;
  end_date: string | null;
  restriction_cutoff?: string | null;
  diets: { code: string; name?: string; start_date: string; end_date: string; restriction_cutoff?: string | null }[];
  days: {
    date: string;
    slots: { slot: SlotCode; available: boolean }[];
  }[];
  availabilities?: AvailabilityEntry[];
};

const slotLabels: Record<SlotCode, string> = {
  MORNING: "Morning",
  EVENING: "Evening",
};

const slotOrder: SlotCode[] = ["MORNING", "EVENING"];

export const InvigilatorRestrictions: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedDiet, setSelectedDiet] = useState<string | null>(null);
  const [days, setDays] = useState<AvailabilityResponse["days"]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

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
    staleTime: 0,
    keepPreviousData: true,
  });

  useEffect(() => {
    if (!availabilityQuery.data) return;
    if (!selectedDiet) setSelectedDiet(availabilityQuery.data.diet);
    setDays(buildDays(availabilityQuery.data));
  }, [availabilityQuery.data, selectedDiet]);

  const buildDays = (data: AvailabilityResponse) => {
    const entries = data.availabilities || [];
    const byDate: Record<string, Record<SlotCode, boolean>> = {};
    const isKnownSlot = (slot: string): slot is SlotCode => slot === "MORNING" || slot === "EVENING";

    entries.forEach((e) => {
      if (!isKnownSlot(e.slot)) return;
      if (!byDate[e.date]) byDate[e.date] = {} as Record<SlotCode, boolean>;
      byDate[e.date][e.slot] = e.available;
    });

    // Prefer server-provided days if present
    if (data.days && data.days.length > 0) {
      return data.days.map((d) => ({
        ...d,
        slots: slotOrder.map((slot) => {
          const fromServer = d.slots.find((s) => s.slot === slot);
          const fallback = byDate[d.date]?.[slot];
          return { slot, available: fromServer ? fromServer.available : fallback ?? true };
        }),
      }));
    }

    // Build from date range if supplied
    if (data.start_date && data.end_date) {
      const start = dayjs(data.start_date);
      const end = dayjs(data.end_date);
      const rows: { date: string; slots: { slot: SlotCode; available: boolean }[] }[] = [];
      if (start.isValid() && end.isValid()) {
        let cursor = start.startOf("day");
        while (cursor.isSame(end, "day") || cursor.isBefore(end, "day")) {
          const key = cursor.format("YYYY-MM-DD");
          const slots = slotOrder.map((slot) => ({
            slot,
            available: byDate[key]?.[slot] ?? true,
          }));
          rows.push({ date: key, slots });
          cursor = cursor.add(1, "day");
        }
        return rows;
      }
    }

    // Fallback to whatever entries we have grouped by date
    return Object.entries(byDate)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([date, slotsMap]) => ({
        date,
        slots: slotOrder.map((slot) => ({ slot, available: slotsMap[slot] ?? true })),
      }));
  };

  const diets = useMemo(() => {
    return (availabilityQuery.data?.diets || []).map((d) => ({
      code: d.code,
      label: d.name || d.code.replace(/_/g, " "),
      restriction_cutoff: d.restriction_cutoff,
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
      setDays(buildDays(data));
      setSnackbar({ open: true, message: "Restrictions updated!", severity: "success" });
      queryClient.invalidateQueries({ queryKey: ["invigilator-availability"] });
    },
    onError: (_err: any) => {
      setSnackbar({ open: true, message: "Failed to update restrictions", severity: "error" });
    },
  });

  const handleDietChange = (diet: string) => {
    setSelectedDiet(diet);
  };

  const startDate = availabilityQuery.data?.start_date;
  const endDate = availabilityQuery.data?.end_date;
  const selectedDietLabel =
    diets.find((d) => d.code === selectedDiet)?.label || availabilityQuery.data?.diet_name || selectedDiet || "";
  const selectedDietCutoff =
    diets.find((d) => d.code === selectedDiet)?.restriction_cutoff ||
    availabilityQuery.data?.restriction_cutoff ||
    null;
  const cutoffReached =
    selectedDietCutoff && dayjs().isSame(dayjs(selectedDietCutoff), "day")
      ? true
      : selectedDietCutoff
      ? dayjs().isAfter(dayjs(selectedDietCutoff), "day")
      : false;

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={2.5}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={1.5}>
            <Stack spacing={0.5}>
              <Typography variant="h4" fontWeight={700}>
                Restrictions
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Deselect the slots you cannot work for the selected exam diet, then submit your restrictions.
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="body2" color="text.secondary">
                Exam diet
              </Typography>
              <Select
                size="small"
                value={selectedDiet || ""}
                onChange={(e) => handleDietChange(e.target.value)}
                sx={{ minWidth: 200 }}
              >
                {diets.map((d) => (
                  <MenuItem key={d.code} value={d.code}>
                    {d.label}
                  </MenuItem>
                ))}
              </Select>
              <PillButton
                variant="outlined"
                onClick={() => availabilityQuery.refetch()}
                disabled={availabilityQuery.isFetching}
                size="small"
              >
                Refresh
              </PillButton>
              <PillButton
                variant="contained"
                onClick={() => mutation.mutate()}
                disabled={cutoffReached || availabilityQuery.isLoading || mutation.isLoading || days.length === 0}
                size="small"
              >
                Submit restrictions
              </PillButton>
            </Stack>
          </Stack>

        <Panel
          disableDivider
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <FreeCancellation fontSize="small" />
              <Typography variant="subtitle1" fontWeight={700}>
                Update your restrictions
              </Typography>
            </Stack>
          }
          sx={{
            mb: 1,
            background: "linear-gradient(135deg, #f8fafc, #eef2ff)",
            borderColor: "#e0e7ff",
            boxShadow: "0 12px 35px rgba(79, 70, 229, 0.08)",
          }}
        >
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            Find the dates and times you are unavailable to invigilate and deselect the corresponding slots.
          </Typography>
          {selectedDietCutoff && (
            <Alert severity={cutoffReached ? "warning" : "info"} sx={{ mt: 1 }}>
              {cutoffReached
                ? "Restrictions are closed for this diet. Please email admin to request changes."
                : `Restrictions remain open until ${dayjs(selectedDietCutoff).format("D MMM YYYY")}.`}
            </Alert>
          )}
        </Panel>

        <Panel sx={{ p: 3 }}>
          <Stack spacing={2}>
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
                    <Panel
                      disableDivider
                      title={
                        <Typography variant="subtitle2" fontWeight={700}>
                          {dateLabel}
                        </Typography>
                      }
                      sx={{
                        height: "100%",
                        borderRadius: 3,
                        p: 2,
                      }}
                    >
                      <Stack spacing={1.25}>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {day.slots.map((slot) => {
                            const available = slot.available;
                            const label = slotLabels[slot.slot];
                            return (
                              <PillButton
                                key={slot.slot}
                                variant={available ? "contained" : "outlined"}
                                color="success"
                                size="medium"
                                onClick={() => !cutoffReached && toggleSlot(day.date, slot.slot)}
                                disabled={cutoffReached}
                                sx={{
                                  borderRadius: 10,
                                  minWidth: 120,
                                  justifyContent: "center",
                                  borderWidth: 1.5,
                                  borderColor: available ? "success.main" : "success.main",
                                  backgroundColor: available ? "success.main" : "transparent",
                                  color: available ? "#fff" : "success.dark",
                                  opacity: cutoffReached ? 0.6 : 1,
                                  "&:hover": {
                                    backgroundColor: cutoffReached
                                      ? undefined
                                      : available
                                      ? "success.dark"
                                      : "success.light",
                                    color: available ? "#fff" : "success.dark",
                                    borderColor: "success.dark",
                                  },
                                }}
                              >
                                {label}
                              </PillButton>
                            );
                          })}
                        </Stack>
                      </Stack>
                    </Panel>
                  </Grid>
                );
              })}
            </Grid>
          </Stack>
        </Panel>
      </Stack>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={
            snackbar.severity === "success"
              ? {
                  backgroundColor: "#d4edda",
                  color: "#155724",
                  border: "1px solid #155724",
                  borderRadius: "50px",
                  fontWeight: 500,
                }
              : undefined
          }
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default InvigilatorRestrictions;
