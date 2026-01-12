import { Alert, Avatar, Box, CircularProgress, Stack, Switch, Typography } from "@mui/material";
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { PillButton } from "../../components/PillButton";
import { Panel } from "../../components/Panel";
import { apiBaseUrl, apiFetch } from "../../utils/api";

export const InvigilatorProfile: React.FC = () => {
  const navigate = useNavigate();

  const { data: userData, isLoading, isError, error } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await apiFetch(`${apiBaseUrl}/auth/me/`);
      if (!res.ok) throw new Error("Unable to load profile");
      return res.json();
    },
  });

  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const profileDetails = useMemo(
    () => ({
      name: userData?.username || userData?.email || "Invigilator",
      email: userData?.email || "",
      phone: userData?.phone || "",
      avatar: userData?.avatar || null,
      lastLogin: userData?.last_login || null,
    }),
    [userData]
  );

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

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
            src={profileDetails.avatar || undefined}
          >
            {getInitials(profileDetails.name)}
          </Avatar>

          <Typography variant="h5" sx={{ mt: 2, fontWeight: 600 }}>
            {profileDetails.name}
          </Typography>

          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            {profileDetails.email}
          </Typography>

          <Stack direction="row" spacing={1} justifyContent="center" mt={2}>
            <PillButton
              variant="contained"
              color="primary"
              onClick={() => navigate("/invigilator/profile/upload-photo")}
            >
              Upload / Change Photo
            </PillButton>
          </Stack>
        </Box>
      </Panel>

      {/* Personal information */}
      <Panel title="Personal Information">

        <Stack spacing={3}>
          {/* Display Name */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1}
          >
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Display Name
              </Typography>
              <Typography>{profileDetails.name}</Typography>
            </Box>
            <PillButton
              variant="contained"
              onClick={() =>
                navigate("/invigilator/profile/edit-display-name", {
                  state: { autofocus: "displayName" },
                })
              }
            >
              Change
            </PillButton>
          </Stack>

          {/* Email */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1}
          >
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Email
              </Typography>
              <Typography>{profileDetails.email}</Typography>
            </Box>
            <PillButton
              variant="contained"
              onClick={() =>
                navigate("/invigilator/profile/edit-email", {
                  state: { autofocus: "email" },
                })
              }
            >
              Change
            </PillButton>
          </Stack>

          {/* Phone */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1}
          >
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Phone Number
              </Typography>
              <Typography>{profileDetails.phone}</Typography>
            </Box>
            <PillButton
              variant="contained"
              onClick={() =>
                navigate("/invigilator/profile/edit-phone-number", {
                  state: { autofocus: "phone" },
                })
              }
            >
              Change
            </PillButton>
          </Stack>
        </Stack>
      </Panel>

      {/* Security */}
      <Panel title="Password & Security">

        <Stack spacing={3}>
          <PillButton variant="contained" onClick={() => navigate("/invigilator/profile/change-password")}>
            Change Password
          </PillButton>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography>Two-Factor Authentication</Typography>
            <Switch disabled /> {/* feature placeholder */}
          </Stack>
        </Stack>
      </Panel>

      {/* Preferences */}
      <Panel title="Preferences" disableDivider>

        <Stack spacing={3}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography>Dark Mode</Typography>
            <Switch
              checked={darkMode}
              onChange={() => setDarkMode(!darkMode)}
            />
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography>Email Notifications</Typography>
            <Switch
              checked={notifications}
              onChange={() => setNotifications(!notifications)}
            />
          </Stack>
        </Stack>
      </Panel>
    </Box>
  );
};
