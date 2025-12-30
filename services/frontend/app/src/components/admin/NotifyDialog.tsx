import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Stack,
  TextField,
  Typography,
  IconButton,
} from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { apiBaseUrl, apiFetch } from "../../utils/api";
import { Panel } from "../Panel";
import { PillButton } from "../PillButton";
import { Close } from "@mui/icons-material";

export type NotifyMethod = "email" | "sms" | "call";

type Recipient = {
  id: number;
  name: string;
};

type NotifyDialogProps = {
  open: boolean;
  recipients: Recipient[];
  onClose: () => void;
  onSent?: (count: number) => void;
};

const METHOD_OPTIONS: { value: NotifyMethod; label: string; helper: string }[] = [
  { value: "email", label: "Email", helper: "Send to university/personal email" },
  { value: "sms", label: "SMS", helper: "Text the provided mobile numbers" },
  { value: "call", label: "Phone call", helper: "Place an automated call" },
];

export const NotifyDialog: React.FC<NotifyDialogProps> = ({
  open,
  recipients,
  onClose,
  onSent,
}) => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [methods, setMethods] = useState<NotifyMethod[]>(["email"]);
  const [error, setError] = useState<string | null>(null);

  const recipientIds = useMemo(() => recipients.map((r) => r.id), [recipients]);

  const notifyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`${apiBaseUrl}/notifications/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invigilator_ids: recipientIds,
          subject: subject.trim() || "Message from administrator",
          message: message.trim(),
          methods,
        }),
      });

      if (!res.ok) {
        if (res.status === 405) {
          throw new Error(
            "Notifications not yet implemented."
            // TODO: Implement notification methods in backend next
          );
        }
        const text = await res.text();
        throw new Error(text || "Failed to send notification");
      }
      return res.json().catch(() => null);
    },
    onSuccess: () => {
      onSent?.(recipientIds.length);
      setSubject("");
      setMessage("");
      setMethods(["email"]);
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.message || "Failed to send notification");
    },
  });

  const resetForm = React.useCallback(() => {
    setSubject("");
    setMessage("");
    setMethods(["email"]);
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
      notifyMutation.reset();
    }
  }, [open, resetForm, notifyMutation]);

  const handleToggleMethod = (method: NotifyMethod) => {
    setMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  const handleSend = () => {
    if (!message.trim()) {
      setError("Message is required.");
      return;
    }
    if (!methods.length) {
      setError("Choose at least one delivery method.");
      return;
    }
    if (!recipientIds.length) {
      setError("Select at least one invigilator to notify.");
      return;
    }

    setError(null);
    notifyMutation.mutate();
  };

  const sending = notifyMutation.isPending;

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!sending) {
          resetForm();
          notifyMutation.reset();
          onClose();
        }
      }}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        Send notification
        <IconButton
          aria-label="Close dialog"
          size="small"
          onClick={() => {
            if (!sending) {
              resetForm();
              notifyMutation.reset();
              onClose();
            }
          }}
        >
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {recipientIds.length === 1
            ? "Sending to 1 invigilator"
            : `Sending to ${recipientIds.length} invigilators`}
        </Typography>

        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
          {recipients.map((recipient) => (
            <Chip
              key={recipient.id}
              size="medium"
              label={recipient.name}
              sx={{
                backgroundColor: "#E3F2FD",
                color: "primary.main",
                fontWeight: 600,
              }}
            />
          ))}
          {recipients.length === 0 && (
            <Typography variant="caption" color="text.secondary">
              No recipients selected yet.
            </Typography>
          )}
        </Stack>

        <TextField
          label="Subject (optional)"
          value={subject}
          fullWidth
          margin="dense"
          onChange={(e) => setSubject(e.target.value)}
        />
        <TextField
          label="Message"
          value={message}
          fullWidth
          required
          multiline
          minRows={4}
          margin="dense"
          onChange={(e) => setMessage(e.target.value)}
        />

        <Panel sx={{ mt: 2, mb: 0, p: 2 }}>
          <FormLabel component="legend" sx={{ mb: 1, display: "block" }}>
            Delivery methods
          </FormLabel>
          <FormGroup row>
            {METHOD_OPTIONS.map((opt) => (
              <FormControlLabel
                key={opt.value}
                control={
                  <Checkbox
                    checked={methods.includes(opt.value)}
                    onChange={() => handleToggleMethod(opt.value)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {opt.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {opt.helper}
                    </Typography>
                  </Box>
                }
              />
            ))}
          </FormGroup>
        </Panel>

        {error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <PillButton
          variant="contained"
          onClick={handleSend}
          disabled={sending || !recipients.length}
        >
          {sending ? "Sending..." : "Send notification"}
        </PillButton>
      </DialogActions>
    </Dialog>
  );
};
