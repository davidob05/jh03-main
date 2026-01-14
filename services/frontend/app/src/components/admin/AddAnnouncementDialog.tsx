import React, { useMemo, useState } from "react";
import {
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PillButton } from "../PillButton";
import { Panel } from "../Panel";
import { apiBaseUrl, apiFetch } from "../../utils/api";

type Audience = "invigilator" | "all";

interface AddAnnouncementDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (title: string) => void;
}

const formatDateTimeInput = (value?: string | Date | null) => {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
};

export const AddAnnouncementDialog: React.FC<AddAnnouncementDialogProps> = ({
  open,
  onClose,
  onCreated,
}) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("invigilator");
  const [imageUrl, setImageUrl] = useState("");
  const [publishedAt, setPublishedAt] = useState(formatDateTimeInput(new Date()));
  const [expiresAt, setExpiresAt] = useState("");
  const [priority, setPriority] = useState<number | "">(0);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setTitle("");
    setBody("");
    setAudience("invigilator");
    setImageUrl("");
    setPublishedAt(formatDateTimeInput(new Date()));
    setExpiresAt("");
    setPriority(0);
    setIsActive(true);
    setError(null);
  };

  const handleClose = () => {
    if (mutation.isPending) return;
    resetForm();
    onClose();
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await apiFetch(`${apiBaseUrl}/announcements/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          audience,
          image: imageUrl.trim() || null,
          published_at: publishedAt ? new Date(publishedAt).toISOString() : undefined,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          is_active: isActive,
          priority: priority === "" ? 0 : Number(priority),
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to create announcement");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invigilator-announcements"] });
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      onCreated?.(data?.title ?? "Announcement");
      handleClose();
    },
    onError: (err: any) => {
      setError(err?.message || "Failed to create announcement");
    },
  });

  const previewDate = useMemo(() => {
    const base = publishedAt ? new Date(publishedAt) : new Date();
    if (Number.isNaN(base.getTime())) return "Publish date TBC";
    return base.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [publishedAt]);

  const expiresHint = useMemo(() => {
    if (!expiresAt) return "No expiry set";
    const exp = new Date(expiresAt);
    if (Number.isNaN(exp.getTime())) return "Invalid expiry date";
    return `Expires ${exp.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }, [expiresAt]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        Add announcement
        <IconButton aria-label="Close dialog" size="small" onClick={handleClose}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            fullWidth
            required
            multiline
            minRows={3}
          />
          <TextField
            label="Audience"
            select
            value={audience}
            onChange={(e) => setAudience(e.target.value as Audience)}
            fullWidth
          >
            <MenuItem value="invigilator">Invigilators only</MenuItem>
            <MenuItem value="all">All users</MenuItem>
          </TextField>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              label="Publish at"
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Expires at (optional)"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
          <TextField
            label="Image URL (optional)"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/hero.jpg"
            fullWidth
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              label="Priority"
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value === "" ? "" : Number(e.target.value))}
              helperText="Higher numbers are shown first."
              fullWidth
              inputProps={{ min: 0 }}
            />
            <Panel
              sx={{
                flex: 1,
                p: 2,
                mb: 0,
                backgroundColor: "#f9fafb",
              }}
              disableDivider
            >
              <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary">
                  Status
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Chip
                    size="small"
                    label={audience === "all" ? "All users" : "Invigilators"}
                    sx={{ backgroundColor: "#e3f2fd", color: "#0d47a1", fontWeight: 600 }}
                  />
                  <Chip
                    size="small"
                    label={isActive ? "Active" : "Inactive"}
                    color={isActive ? "success" : "default"}
                    variant={isActive ? "filled" : "outlined"}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {expiresHint}
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {`Publishes ${previewDate}`}
                </Typography>
              </Stack>
            </Panel>
          </Stack>
          <FormControlLabel
            control={
              <Switch
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                color="primary"
              />
            }
            label="Show this announcement immediately"
          />

          {error && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "error.light",
                backgroundColor: "rgba(244, 67, 54, 0.06)",
              }}
            >
              <Typography variant="body2" color="error">
                {error}
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <PillButton variant="outlined" onClick={handleClose}>
          Cancel
        </PillButton>
        <PillButton
          variant="contained"
          onClick={() => {
            if (!title.trim() || !body.trim()) {
              setError("Title and body are required.");
              return;
            }
            setError(null);
            mutation.mutate();
          }}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Saving..." : "Save announcement"}
        </PillButton>
      </DialogActions>
    </Dialog>
  );
};
