import React from "react";
import Avatar from "@mui/material/Avatar";
import Stack from "@mui/material/Stack";
import { styled } from '@mui/material/styles';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Typography from "@mui/material/Typography";

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
    <Stack spacing={2} sx={{ width: "100%" }}>
      {rows.map((row, rowIndex) => (
        <React.Fragment key={rowIndex}>
          <Stack direction="row" spacing={2} alignItems="center">
            {row.map((p, index) => {
              const initial = `${p.first_name.charAt(0)}${p.last_name.charAt(0)}`.toUpperCase();
              return (
                <Stack key={index} direction="column" alignItems="center" spacing={1}>
                  <Avatar sx={{ bgcolor: p.color, width: 120, height:120, fontSize: 54 }}>{initial}</Avatar>
                  <Typography variant="body2">{p.first_name} {p.last_name}</Typography>
                </Stack>
              );
            })}
          </Stack>
          {/*only add divider if it's not the last row*/}
          {rowIndex < rows.length -1 && <Divider flexItem />}
        </React.Fragment>
      ))}
    </Stack>
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
    <div>
      <h1>Invigilators Page</h1>
      <p>This is the Invigilators page.</p>
    <ProfileList />
    </div>
  );
}