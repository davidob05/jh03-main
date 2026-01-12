import { Avatar, Box, Stack, Switch, Typography } from "@mui/material";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PillButton } from "../../components/PillButton";
import { Panel } from "../../components/Panel";

export const InvigilatorProfile: React.FC = () => {
  const navigate = useNavigate();

  const [profileDetails] = useState({
    name: "Invigilator Name",
    email: "invigilator@example.com",
    phone: "07123 456789",
  });

  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

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
