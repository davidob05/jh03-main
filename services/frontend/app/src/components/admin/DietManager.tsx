import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Checkbox,
  Grid,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Delete as DeleteIcon, Add as AddIcon, Close } from "@mui/icons-material";
import dayjs from "dayjs";
import { Panel } from "../Panel";
import { PillButton } from "../PillButton";
import { apiBaseUrl, apiFetch } from "../../utils/api";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";

export interface Diet {
  id: number;
  code: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  restriction_cutoff: string | null;
  is_active: boolean;
}

type DraftDiet = Omit<Diet, "id"> & { id?: number };

const emptyDraft: DraftDiet = {
  code: "",
  name: "",
  start_date: "",
  end_date: "",
  restriction_cutoff: "",
  is_active: true,
};

export const DietManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<DraftDiet>(emptyDraft);
  const [error, setError] = useState<string>("");
  const [dietToDelete, setDietToDelete] = useState<Diet | null>(null);

  const { data: diets = [], isLoading, isError } = useQuery<Diet[]>({
    queryKey: ["diets"],
    queryFn: async () => {
      const res = await apiFetch(`${apiBaseUrl}/diets/`);
      if (!res.ok) throw new Error("Unable to load diets");
      return res.json();
    },
    staleTime: 0,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: DraftDiet) => {
      const isEdit = Boolean(payload.id);
      const url = isEdit ? `${apiBaseUrl}/diets/${payload.id}/` : `${apiBaseUrl}/diets/`;
      const method = isEdit ? "PUT" : "POST";
      const body = {
        code: payload.code.trim(),
        name: payload.name.trim(),
        start_date: payload.start_date || null,
        end_date: payload.end_date || null,
        restriction_cutoff: payload.restriction_cutoff || null,
        is_active: payload.is_active,
      };
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to save diet");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diets"] });
      setDialogOpen(false);
      setDraft(emptyDraft);
      setError("");
    },
    onError: (err: any) => {
      setError(err?.message || "Failed to save diet");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`${apiBaseUrl}/diets/${id}/`, { method: "DELETE" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to delete diet");
      }
      return true;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["diets"] }),
  });

  const openDialog = (diet?: Diet) => {
    setError("");
    if (diet) {
      setDraft({
        id: diet.id,
        code: diet.code,
        name: diet.name,
        start_date: diet.start_date || "",
        end_date: diet.end_date || "",
        restriction_cutoff: diet.restriction_cutoff || "",
        is_active: diet.is_active,
      });
    } else {
      setDraft(emptyDraft);
    }
    setDialogOpen(true);
  };

  const confirmDelete = (diet: Diet) => {
    setDietToDelete(diet);
  };

  const sortedDiets = useMemo(() => {
    return [...diets].sort((a, b) => {
      const activeDiff = Number(b.is_active) - Number(a.is_active);
      if (activeDiff !== 0) return activeDiff;
      return (b.start_date || "").localeCompare(a.start_date || "");
    });
  }, [diets]);

  const handleSave = () => {
    if (!draft.code.trim() || !draft.name.trim()) {
      setError("Code and name are required.");
      return;
    }
    if (draft.start_date && draft.end_date) {
      const start = dayjs(draft.start_date);
      const end = dayjs(draft.end_date);
      if (start.isAfter(end)) {
        setError("Start date must be on or before end date.");
        return;
      }
    }
    saveMutation.mutate(draft);
  };

  return (
    <Panel
      title="Diets"
      actions={
        <PillButton size="small" startIcon={<AddIcon />} onClick={() => openDialog()}>
          Add diet
        </PillButton>
      }
    >
      {isError && <Alert severity="error">Unable to load diets</Alert>}
      {isLoading && <Typography variant="body2">Loading diets…</Typography>}

      {!isLoading && sortedDiets.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No diets configured yet. Add one to get started.
        </Typography>
      )}

      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        {sortedDiets.map((diet) => (
          <Grid item xs={12} md={6} key={diet.id}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: diet.is_active ? "#f0f9ff" : "#f8fafc",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 1.5,
              }}
            >
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  {diet.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  {diet.code}
                </Typography>
                <Typography variant="body2">
                  {diet.start_date && diet.end_date
                    ? `${diet.start_date} → ${diet.end_date}`
                    : "No date range set"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {diet.restriction_cutoff
                    ? `Restriction cutoff: ${diet.restriction_cutoff}`
                    : "Restriction cutoff: Not set"}
                </Typography>
                <Typography variant="caption" color={diet.is_active ? "success.main" : "text.secondary"}>
                  {diet.is_active ? "Active" : "Inactive"}
                </Typography>
              </Box>

              <Stack direction="row" spacing={0.5}>
                <Tooltip title="Edit diet">
                  <IconButton size="small" onClick={() => openDialog(diet)}>
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete diet">
                  <IconButton size="small" onClick={() => confirmDelete(diet)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          </Grid>
        ))}
      </Grid>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {draft.id ? "Edit diet" : "Add diet"}
          <IconButton onClick={() => setDialogOpen(false)} size="small" aria-label="Close">
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Code"
              value={draft.code}
              onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
              fullWidth
              required
              helperText="Stable identifier, e.g. DEC_2026"
            />
            <TextField
              label="Name"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              fullWidth
              required
              helperText="Display label, e.g. December 2025"
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                label="Start date"
                type="date"
                value={draft.start_date || ""}
                onChange={(e) => setDraft((d) => ({ ...d, start_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="End date"
                type="date"
                value={draft.end_date || ""}
                onChange={(e) => setDraft((d) => ({ ...d, end_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>
            <TextField
              label="Restriction cutoff"
              type="date"
              value={draft.restriction_cutoff || ""}
              onChange={(e) => setDraft((d) => ({ ...d, restriction_cutoff: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              helperText="Last date invigilators can submit restrictions for this diet"
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={draft.is_active}
                  onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
                />
              }
              label="Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <PillButton
            variant="contained"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            startIcon={saveMutation.isPending ? undefined : undefined}
          >
            {saveMutation.isPending ? "Saving…" : draft.id ? "Save" : "Add"}
          </PillButton>
        </DialogActions>
      </Dialog>

      <DeleteConfirmationDialog
        open={Boolean(dietToDelete)}
        title="Delete diet"
        description={`Delete diet ${dietToDelete?.code || ""}? This cannot be undone.`}
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (dietToDelete) {
            deleteMutation.mutate(dietToDelete.id);
          }
          setDietToDelete(null);
        }}
        onClose={() => setDietToDelete(null)}
      />
    </Panel>
  );
};

export default DietManager;
