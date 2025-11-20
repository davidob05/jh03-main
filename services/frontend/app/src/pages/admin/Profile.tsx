import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Divider,
  Stack,
  Switch,
  Container, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableRow
} from "@mui/material";
import { Container, Table, TableBody, TableCell, TableContainer, TableRow } from "@mui/material";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CButton } from "../../utils/globalStyles";

export const AdminProfile: React.FC = () => {
  const navigate = useNavigate();

  const [profileDetails] = useState({
    name: "Test Name",
    email: "test@example.com",
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
    <Box sx={{ maxWidth: 800, mx: "auto", mt: 4 }}>

      {/* Profile overview */}
      <Card sx={{ p: 3, mb: 3 }}>
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

          <CButton
            variant="contained"
            color="primary"
            sx={{ mt: 2 }}
            onClick={() => navigate("/admin/profile/upload-photo")}
          >
            Upload / Change Photo
          </CButton>
        </Box>
      </Card>

      {/* Personal information */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Personal Information
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Stack spacing={3}>
          {/* Display Name */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Display Name
            </Typography>

            <Stack direction="row" justifyContent="space-between" mt={0.5}>
              <Typography>{profileDetails.name}</Typography>
              <CButton
                variant="contained"
                color="primary"
                onClick={() =>
                  navigate("/admin/profile/edit-display-name", {
                    state: { autofocus: "displayName" },
                  })
                }
              >
                Change
              </CButton>
            </Stack>
          </Box>

          {/* Email */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Email
            </Typography>

            <Stack direction="row" justifyContent="space-between" mt={0.5}>
              <Typography>{profileDetails.email}</Typography>
              <CButton
                variant="contained"
                color="primary"
                onClick={() =>
                  navigate("/admin/profile/edit-email", {
                    state: { autofocus: "email" },
                  })
                }
              >
                Change
              </CButton>
            </Stack>
          </Box>

          {/* Phone */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Phone Number
            </Typography>

            <Stack direction="row" justifyContent="space-between" mt={0.5}>
              <Typography>{profileDetails.phone}</Typography>
              <CButton
                variant="contained"
                color="primary"
                onClick={() =>
                  navigate("/admin/profile/edit-phone-number", {
                    state: { autofocus: "phone" },
                  })
                }
              >
                Change
              </CButton>
            </Stack>
          </Box>
        </Stack>
      </Card>

      {/* Security */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Password & Security
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Stack spacing={3}>
          <CButton
            variant="contained"
            color="primary"
            onClick={() => navigate("/admin/profile/change-password")}
          >
            Change Password
          </CButton>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography>Two-Factor Authentication</Typography>
            <Switch disabled /> {/* feature placeholder */}
          </Stack>
        </Stack>
      </Card>

      {/* Preferences */}
      <Card sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Preferences
        </Typography>
        <Divider sx={{ mb: 2 }} />

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
      </Card>
    </Box>
  );
};