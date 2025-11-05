import { Container, Table, TableBody, TableCell, TableContainer, TableRow } from "@mui/material";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CButton } from "../utils/globalStyles";

export const Profile: React.FC = () => {
  const navigate = useNavigate();

  const [profileDetails, searchQuery] = useState({
    name: "Test Name",
    email: "test@example.com"
  });

  return (
    <Container style={{ maxWidth: 700 }}>
      <TableContainer>
        <Table aria-label="simple table">
          <TableBody>
            <TableRow>
              <TableCell
                style={{ fontSize: "1.1em" }}
                component="th"
                scope="row"
                align="right"
              >
                Display Name
              </TableCell>
              <TableCell style={{ fontSize: "1.1em" }} align="left">
                {profileDetails.name}
              </TableCell>
              <TableCell align="right">
                <CButton
                  color="primary"
                  variant="contained"
                  onClick={() =>
                    navigate("/profile/edit", {
                      state: { autofocus: "displayName" }
                    })
                  }
                >
                  CHANGE
                </CButton>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell
                style={{ fontSize: "1.1em" }}
                component="th"
                scope="row"
                align="right"
              >
                Email
              </TableCell>
              <TableCell style={{ fontSize: "1.1em" }} align="left">
                {profileDetails.email}
              </TableCell>
              <TableCell align="right">
                <CButton
                  color="primary"
                  variant="contained"
                  onClick={() =>
                    navigate("/profile/edit", {
                      state: { autofocus: "email" }
                    })
                  }
                >
                  CHANGE
                </CButton>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

    </Container>
  );
};