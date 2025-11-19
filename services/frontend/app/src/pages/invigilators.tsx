import React from "react";
import Avatar from "@mui/material/Avatar";
import Stack from "@mui/material/Stack";
import { styled } from '@mui/material/styles';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Typography from "@mui/material/Typography";
import { Box, IconButton } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import Link from "@mui/material/Link";

//profile setting
interface Profile {
  first_name: string;
  last_name: string;
  initial: string;
  color: string;
}

const profiles: Profile[] = [
  {first_name: "Mark", last_name: "Evans", initial: "first_name.charAt(0) + last_name.charAt(0)", color: "#006fcb"},
  {first_name: "Mark", last_name: "Evans", initial: "first_name.charAt(0) + last_name.charAt(0)", color: "#006fcb"},
  {first_name: "Mark", last_name: "Evans", initial: "first_name.charAt(0) + last_name.charAt(0)", color: "#006fcb"},
  {first_name: "Mark", last_name: "Evans", initial: "first_name.charAt(0) + last_name.charAt(0)", color: "#006fcb"},
  {first_name: "Mark", last_name: "Evans", initial: "first_name.charAt(0) + last_name.charAt(0)", color: "#006fcb"},
  {first_name: "Mark", last_name: "Evans", initial: "first_name.charAt(0) + last_name.charAt(0)", color: "#006fcb"},
  {first_name: "Mark", last_name: "Evans", initial: "first_name.charAt(0) + last_name.charAt(0)", color: "#006fcb"},
  {first_name: "Mark", last_name: "Evans", initial: "first_name.charAt(0) + last_name.charAt(0)", color: "#006fcb"},
  {first_name: "Mark", last_name: "Evans", initial: "first_name.charAt(0) + last_name.charAt(0)", color: "#006fcb"},

];

export function ProfileList() {
  const chunkSize = 6;
  const rows: Profile[][] = [];
  for (let i = 0; i < profiles.length; i += chunkSize) {
    rows.push(profiles.slice(i, i + chunkSize));
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%"
      }}
    >
      <Stack spacing={2} sx={{ width: "100%", alignItems: "center"}}>
        {rows.map((row, rowIndex) => (
          <React.Fragment key={rowIndex}>
            <Stack direction="row" spacing={2} justifyContent="center">
              {row.map((p, index) => {
                const initial = `${p.first_name.charAt(0)}${p.last_name.charAt(0)}`.toUpperCase();
                const slug = `${p.first_name}-${p.last_name}`.toLowerCase();
                return (
                  <Stack key={index} direction="column" alignItems="center" spacing={1} justifyContent="center">
                    <IconButton
                      component={RouterLink}
                      to={`/profile/${slug}`}
                    >
                      <Avatar sx={{ bgcolor: p.color, width: 120, height:120, fontSize: 54 }}>{initial}</Avatar>
                    </IconButton>
                    <Link
                      component={RouterLink}
                      to={`/profile/${slug}`}
                      underline="none"
                      sx={{
                        color: "#006fcb",
                        "&:hover": {
                          textDecoration: "underline",
                        },
                      }}
                    >
                      <Typography variant="body2">{p.first_name} {p.last_name}</Typography>
                    </Link>
                  </Stack>
                );
              })}
            </Stack>
            {/*only add divider if it's not the last row*/}
            {rowIndex < rows.length -1 && (<Divider sx={{ width: "60%", mt: 1 }} />
            )}
          </React.Fragment>
        ))}
      </Stack>
    </Box>
  );
}

//divider settings
const Root = styled('div')(({ theme }) => ({
  width: '100%',
  ...theme.typography.body2,
  color: (theme.vars || theme).palette.text.secondary,
  '& > :not(style) ~ :not(style)': {
    marginTop: theme.spacing(2),
  },
}));

export function DividerText() {
  
  return (
    <Root>
      <Divider />
    </Root>
  );
}

export const Invigilators: React.FC = () => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%"
      }}
    >
    <ProfileList />
    </Box>
  );
}