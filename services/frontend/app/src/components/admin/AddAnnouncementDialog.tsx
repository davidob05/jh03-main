import React, { useState } from "react";
import {
  Box,
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
import { Close, Upload } from "@mui/icons-material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PillButton } from "../PillButton";
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
  const [audience, setAudience] = useState<Audience | "">("");
  const [imageData, setImageData] = useState("");
  const [imageName, setImageName] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState(formatDateTimeInput(new Date()));
  const [expiresAt, setExpiresAt] = useState("");
  const [priority, setPriority] = useState<number | "">("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isValidDateInput = (value: string) => {
    if (!value) return true;
    const d = new Date(value);
    return !Number.isNaN(d.getTime());
  };

  const resetForm = () => {
    setTitle("");
    setBody("");
    setAudience("");
    setImageData("");
    setImageName(null);
    setPublishedAt(formatDateTimeInput(new Date()));
    setExpiresAt("");
    setPriority("");
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
      if (!imageData) {
        throw new Error("Image is required.");
      }

      const response = await apiFetch(`${apiBaseUrl}/announcements/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          audience,
          image: imageData,
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

  const isSaveDisabled =
    !title.trim() ||
    !body.trim() ||
    !imageData ||
    !audience ||
    priority === "" ||
    !isValidDateInput(publishedAt) ||
    !isValidDateInput(expiresAt);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        Post announcement
        <IconButton aria-label="Close dialog" size="small" onClick={handleClose}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.2}>
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

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
            <TextField
              label="Audience"
              select
              value={audience}
              onChange={(e) => setAudience(e.target.value as Audience | "")}
              fullWidth
            >
              <MenuItem value="" disabled>
                Select audience
              </MenuItem>
              <MenuItem value="invigilator">Invigilators only</MenuItem>
              <MenuItem value="all">All users</MenuItem>
            </TextField>
            <TextField
              label="Priority"
              select
              value={priority === "" ? "" : String(priority)}
              onChange={(e) => setPriority(Number(e.target.value))}
              fullWidth
            >
              <MenuItem value="" disabled>
                Select priority
              </MenuItem>
              <MenuItem value="1">Low</MenuItem>
              <MenuItem value="2">Medium</MenuItem>
              <MenuItem value="3">High</MenuItem>
            </TextField>
            <FormControlLabel
              control={
                <Switch
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  color="primary"
                />
              }
              label="Active"
              sx={{ ml: { md: 1 }, mt: { xs: 1, md: 0 } }}
            />
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
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

          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Image
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  JPEG or PNG; shown as the announcement hero.
                </Typography>
                {imageName ? (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                    Selected: {imageName}
                  </Typography>
                ) : null}
              </Box>
              <PillButton
                variant="outlined"
                size="small"
                component="label"
                startIcon={<Upload />}
                disabled={mutation.isPending}
              >
                Upload
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!file.type.startsWith("image/")) {
                      setError("Please select an image file.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      setImageData(reader.result as string);
                      setImageName(file.name);
                      setError(null);
                    };
                    reader.onerror = () => {
                      setError("Failed to read image file.");
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </PillButton>
            </Stack>
            {imageData && (
              <Box
                sx={{
                  height: 180,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundImage: `url(${imageData})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            )}
          </Stack>

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
        <PillButton
          variant="contained"
          onClick={() => {
            if (!title.trim() || !body.trim()) {
              setError("Title and body are required.");
              return;
            }
            if (!imageData) {
              setError("Image is required.");
              return;
            }
            if (publishedAt && Number.isNaN(new Date(publishedAt).getTime())) {
              setError("Publish date is invalid.");
              return;
            }
            if (expiresAt && Number.isNaN(new Date(expiresAt).getTime())) {
              setError("Expiry date is invalid.");
              return;
            }
            setError(null);
            mutation.mutate();
          }}
          disabled={mutation.isPending || isSaveDisabled}
        >
          {mutation.isPending ? "Posting..." : "Post"}
        </PillButton>
      </DialogActions>
    </Dialog>
  );
};
