import {
  Box,
  Typography,
  Avatar,
  Divider,
  Stack,
  Switch,
  TextField,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  CircularProgress,
  Card,
  CardContent,
  Chip,
} from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PillButton } from "../../components/PillButton";
import { PhotoCamera, Visibility, VisibilityOff, Logout } from "@mui/icons-material";
import { apiBaseUrl, apiFetch, getAuthToken, setAuthSession } from "../../utils/api";
import { DeleteConfirmationDialog } from "../../components/admin/DeleteConfirmationDialog";
import { Panel } from "../../components/Panel";

export const AdminProfile: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: userData, isLoading, isError, error } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await apiFetch(`${apiBaseUrl}/auth/me/`);
      if (!res.ok) throw new Error("Unable to load profile");
      return res.json();
    },
  });

  const displayFallbackName = useMemo(
    () => userData?.username || userData?.email || "User",
    [userData]
  );

  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [showPhotoSave, setShowPhotoSave] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });
  const [lastUpdated, setLastUpdated] = useState("Just now");
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState<"instant" | "daily" | "off">("instant");
  const [notifySms, setNotifySms] = useState(false);
  const [notifyPush, setNotifyPush] = useState(false);

  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [showPasswords, setShowPasswords] = useState(false);

  const {
    data: sessions,
    isLoading: sessionsLoading,
    isError: sessionsError,
    error: sessionsErrorObj,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const res = await apiFetch(`${apiBaseUrl}/auth/sessions/`);
      if (!res.ok) throw new Error("Unable to load sessions");
      return res.json();
    },
  });

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  const passwordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const label = score >= 4 ? "Strong" : score >= 3 ? "Medium" : score > 0 ? "Weak" : "Not set";
    return { score: Math.min(score, 4), label };
  };

  const handlePhotoChange = (file?: File | null) => {
    if (!file) {
      setPhotoPreview(null);
      setAvatarData(null);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setPhotoPreview(result);
      setAvatarData(result);
      setSnackbar({ open: true, message: "Photo ready to save.", severity: "success" });
      setShowPhotoSave(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    try {
      const res = await apiFetch(`${apiBaseUrl}/auth/me/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: name,
          email: email,
          phone: phone,
          avatar: avatarData ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSnackbar({ open: true, message: data?.detail || "Failed to update profile.", severity: "error" });
        return;
      }
      // Update local cached user info
      if (data) {
        const token = getAuthToken();
        if (token) {
          setAuthSession(token, data);
        }
        // keep in-memory state and react-query cache in sync
        setName(data.username || name);
        setEmail(data.email || email);
        setPhone(data.phone || "");
        setPhotoPreview(data.avatar || null);
        setAvatarData(data.avatar || null);
        queryClient.setQueryData(["me"], data);
      }
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      setSnackbar({ open: true, message: "Profile updated!", severity: "success" });
      setLastUpdated("Just now");
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || "Failed to update profile!", severity: "error" });
    }
  };

  const handleSavePassword = () => {
    if (passwords.next !== passwords.confirm) {
      setSnackbar({ open: true, message: "New passwords do not match", severity: "error" });
      return;
    }
    if (!passwords.current || !passwords.next) {
      setSnackbar({ open: true, message: "Current and new passwords are required.", severity: "error" });
      return;
    }
    apiFetch(`${apiBaseUrl}/auth/me/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_password: passwords.current,
        new_password: passwords.next,
        confirm_password: passwords.confirm,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          const msg = Array.isArray(data?.detail) ? data.detail.join(" ") : data?.detail || "Failed to update password.";
          throw new Error(msg);
        }
        setSnackbar({ open: true, message: "Password updated successfully!", severity: "success" });
        setPasswords({ current: "", next: "", confirm: "" });
      })
      .catch((err: any) => {
        setSnackbar({ open: true, message: err?.message || "Failed to update password.", severity: "error" });
      });
  };

  const handleTestNotification = () => {
    setSnackbar({ open: true, message: "Test notification sent", severity: "success" });
  };

  const handleExportData = () => {
    setSnackbar({ open: true, message: "Data export started", severity: "success" });
  };

  const handleDeleteAccount = async () => {
    try {
      const res = await apiFetch(`${apiBaseUrl}/auth/me/`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg = data?.detail || "Failed to delete account.";
        throw new Error(msg);
      }
      // Clear local auth state and redirect to login
      localStorage.removeItem(authTokenKey);
      localStorage.removeItem(authUserKey);
      setSnackbar({ open: true, message: "Account deleted.", severity: "success" });
      navigate("/login", { replace: true });
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || "Failed to delete account.", severity: "error" });
    } finally {
      setDeleteAccountOpen(false);
    }
  };

  const handleSignOutAll = async () => {
    try {
      const res = await apiFetch(`${apiBaseUrl}/auth/sessions/revoke-others/`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Failed to sign out of other sessions.");
      setSnackbar({ open: true, message: "Signed out of other sessions.", severity: "success" });
      await refetchSessions();
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || "Failed to sign out of other sessions.", severity: "error" });
    }
  };

  const handleRevokeSession = async (key: string) => {
    try {
      const res = await apiFetch(`${apiBaseUrl}/auth/sessions/revoke/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Failed to sign out of session.");
      setSnackbar({ open: true, message: "Session signed out.", severity: "success" });
      await refetchSessions();
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || "Failed to sign out of session.", severity: "error" });
    }
  };

  useEffect(() => {
    if (!userData) return;
    setName(userData.username || userData.email || "");
    setEmail(userData.email || userData.username || "");
    setPhone(userData.phone || "");
    setPhotoPreview(userData.avatar || null);
    setAvatarData(userData.avatar || null);
    setShowPhotoSave(false);
    setLastLogin(userData.last_login ? new Date(userData.last_login).toLocaleString() : null);
    setLastUpdated("Just now");
  }, [userData]);

  if (isLoading) {
    return (
      <Box sx={{ maxWidth: 900, mx: "auto", mt: 6, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading profile...</Typography>
      </Box>
    );
  }

  if (isError || !userData) {
    return (
      <Box sx={{ maxWidth: 900, mx: "auto", mt: 6 }}>
        <Alert severity="error">{(error as any)?.message || "Failed to load profile"}</Alert>
      </Box>
    );
  }

  const displayName = name || displayFallbackName;

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", mt: 4, pb: 6 }}>

      {/* Profile overview */}
      <Panel>
        <Box sx={{ textAlign: "center" }}>
          <Avatar
            sx={{
              width: 110,
              height: 110,
              mx: "auto",
              bgcolor: "primary.main",
              fontSize: "3rem",
            }}
            src={photoPreview || userData.avatar || undefined}
          >
            {photoPreview || userData.avatar ? "" : getInitials(displayName)}
          </Avatar>

          <Typography variant="h5" sx={{ mt: 2, fontWeight: 600 }}>
            {displayName}
          </Typography>

          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            {email || displayFallbackName}
          </Typography>

          <Stack direction="row" spacing={1} justifyContent="center" mt={2}>
            <PillButton
              variant="contained"
              color="primary"
              startIcon={<PhotoCamera />}
              component="label"
            >
              {photoPreview || userData.avatar ? "Change photo" : "Upload photo"}
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => handlePhotoChange(e.target.files?.[0] || null)}
              />
            </PillButton>
            {showPhotoSave && avatarData && (
              <PillButton variant="outlined" color="primary" onClick={handleSaveProfile}>
                Save
              </PillButton>
            )}
            {photoPreview && (
              <PillButton variant="outlined" color="error" onClick={() => setConfirmRemoveOpen(true)}>
                Remove
              </PillButton>
            )}
          </Stack>

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Last updated: {lastUpdated} • Last login: {lastLogin || "N/A"}
          </Typography>
        </Box>
      </Panel>

      {/* Personal information */}
      <Panel title="Personal Information">

        <Stack spacing={3}>
          {/* Display Name */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Display Name
            </Typography>

            <Stack direction="row" spacing={1} mt={0.5} alignItems="center">
              <TextField fullWidth size="small" value={name} onChange={(e) => setName(e.target.value)} />
              <PillButton variant="contained" onClick={handleSaveProfile}>Save</PillButton>
            </Stack>
          </Box>

          {/* Email */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Email
            </Typography>

            <Stack direction="row" spacing={1} mt={0.5} alignItems="center">
              <TextField fullWidth size="small" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
              <PillButton variant="contained" onClick={handleSaveProfile}>Save</PillButton>
            </Stack>
          </Box>

          {/* Phone */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Phone Number
            </Typography>

            <Stack direction="row" spacing={1} mt={0.5} alignItems="center">
              <TextField fullWidth size="small" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <PillButton variant="contained" onClick={handleSaveProfile}>Save</PillButton>
            </Stack>
          </Box>
        </Stack>
      </Panel>

      {/* Security */}
      <Panel title="Password & Security">

        <Stack spacing={3}>
          <Stack spacing={1.5}>
            {["current", "next", "confirm"].map((key) => (
              <TextField
                key={key}
                type={showPasswords ? "text" : "password"}
                label={
                  key === "current"
                    ? "Current password"
                    : key === "next"
                    ? "New password"
                    : "Confirm new password"
                }
                value={(passwords as any)[key]}
                onChange={(e) => setPasswords((prev) => ({ ...prev, [key]: e.target.value }))}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPasswords((p) => !p)} edge="end">
                        {showPasswords ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            ))}
            {(() => {
              const strength = passwordStrength(passwords.next);
              const colors = ["#d32f2f", "#ed6c02", "#f9a825", "#2e7d32", "#1b5e20"];
              const barColor = colors[Math.min(strength.score, colors.length - 1)];
              const percent = (strength.score / 4) * 100;
              return (
                <Box sx={{ mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Strength: {strength.label}
                  </Typography>
                  <Box
                    sx={{
                      mt: 0.5,
                      height: 8,
                      borderRadius: 999,
                      backgroundColor: "#e0e0e0",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        width: `${percent}%`,
                        maxWidth: "100%",
                        height: "100%",
                        borderRadius: 999,
                        background: barColor,
                        transition: "width 200ms ease",
                      }}
                    />
                  </Box>
                </Box>
              );
            })()}
            <PillButton variant="contained" onClick={handleSavePassword}>
              Update Password
            </PillButton>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography>Two-Factor Authentication</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Switch disabled /> {/* placeholder */}
              <Tooltip title="Manage 2FA setup">
                <PillButton variant="outlined" size="small" onClick={() => navigate("/admin/profile/two-factor")} disabled>
                  Manage
                </PillButton>
              </Tooltip>
            </Stack>
          </Stack>
          <Alert severity="info">
            Two-factor authentication controls are coming soon. This section is not yet available in the current build.
          </Alert>

          <Stack spacing={1}>
            <Typography variant="subtitle2">Active sessions</Typography>
            <Stack spacing={1}>
              {sessionsLoading && (
                <Card variant="outlined">
                  <CardContent sx={{ py: 1.5, textAlign: "center" }}>
                    <CircularProgress size={20} />
                  </CardContent>
                </Card>
              )}
              {sessionsError && (
                <Alert severity="error">{(sessionsErrorObj as any)?.message || "Failed to load sessions."}</Alert>
              )}
              {!sessionsLoading && !sessionsError && Array.isArray(sessions) && sessions.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No active sessions.
                </Typography>
              )}
              {!sessionsLoading &&
                !sessionsError &&
                Array.isArray(sessions) &&
                sessions.map((s: any) => (
                  <Card key={s.key} variant="outlined">
                    <CardContent sx={{ py: 1.5 }}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", sm: "center" }}
                        spacing={1}
                      >
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <Typography fontWeight={600}>Session</Typography>
                            {s.is_current && <Chip size="small" sx={{ fontWeight: 600 }} color="primary" label="Current" />}
                            {!s.is_active && <Chip size="small" sx={{ fontWeight: 600 }} color="default" label="Revoked" />}
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            Last active: {s.last_seen ? new Date(s.last_seen).toLocaleString() : "N/A"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Created: {s.created_at ? new Date(s.created_at).toLocaleString() : "N/A"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            IP: {s.ip_address || "Unknown"}
                          </Typography>
                          {s.user_agent && (
                            <Typography variant="body2" color="text.secondary">
                              Agent: {s.user_agent}
                            </Typography>
                          )}
                        </Box>
                        <Tooltip
                          title={s.is_current ? "You cannot sign out the current session here." : "Sign out this session"}
                        >
                          <span>
                            <IconButton
                              size="small"
                              disabled={s.is_current || !s.is_active}
                              onClick={() => handleRevokeSession(s.key)}
                            >
                              <Logout fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
            </Stack>
            <PillButton variant="outlined" color="error" onClick={handleSignOutAll}>
              Sign out of other sessions
            </PillButton>
          </Stack>
        </Stack>
      </Panel>

      {/* Preferences */}
      <Panel title="Preferences" disableDivider>

        <Stack spacing={3}>
          <Alert severity="info">
            Notification and appearance preferences are coming soon. These controls are not active yet.
          </Alert>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography>Dark Mode</Typography>
            <Switch
              checked={darkMode}
              onChange={() => setDarkMode(!darkMode)}
              disabled
            />
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography>Email Notifications</Typography>
            <FormControl size="small" sx={{ minWidth: 180 }} disabled>
              <InputLabel>Email frequency</InputLabel>
              <Select
                label="Email frequency"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value as any)}
              >
                <MenuItem value="instant">Instant</MenuItem>
                <MenuItem value="daily">Daily summary</MenuItem>
                <MenuItem value="weekly">Weekly summary</MenuItem>
                <MenuItem value="off">Off</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography>SMS Notifications</Typography>
            <Switch
              checked={notifySms}
              onChange={() => setNotifySms(!notifySms)}
              disabled
            />
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography>Push Notifications</Typography>
            <Switch
              checked={notifyPush}
              onChange={() => setNotifyPush(!notifyPush)}
              disabled
            />
          </Stack>

          <PillButton variant="contained" onClick={handleTestNotification} disabled>
            Send test notification
          </PillButton>

          <Divider />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <PillButton variant="outlined" onClick={handleExportData}>
              Export my data
            </PillButton>
            <PillButton variant="outlined" color="error" onClick={() => setDeleteAccountOpen(true)}>
              Delete my account
            </PillButton>
          </Stack>
        </Stack>
      </Panel>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
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

      <DeleteConfirmationDialog
        open={confirmRemoveOpen}
        title="Remove profile photo?"
        description="This will remove your current profile photo."
        confirmText="Remove"
        onClose={() => setConfirmRemoveOpen(false)}
        onConfirm={async () => {
          try {
            const res = await apiFetch(`${apiBaseUrl}/auth/me/`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ avatar: "" }),
            });
            const data = await res.json();
            if (!res.ok) {
              setSnackbar({ open: true, message: data?.detail || "Failed to remove photo.", severity: "error" });
              return;
            }
            const token = getAuthToken();
            if (token) {
              setAuthSession(token, data);
            }
            queryClient.setQueryData(["me"], data);
            setPhotoPreview(null);
            setAvatarData(null);
            setSnackbar({ open: true, message: "Profile photo removed.", severity: "success" });
          } catch (err: any) {
            setSnackbar({ open: true, message: err?.message || "Failed to remove photo.", severity: "error" });
          } finally {
            setConfirmRemoveOpen(false);
          }
        }}
      />
      <DeleteConfirmationDialog
        open={deleteAccountOpen}
        title="Delete account?"
        description="This will permanently delete your account and sign you out. This cannot be undone."
        confirmText="Delete"
        onClose={() => setDeleteAccountOpen(false)}
        onConfirm={handleDeleteAccount}
      />
    </Box>
  );
};
