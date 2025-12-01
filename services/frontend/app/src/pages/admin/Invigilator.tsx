import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  Grid,
  Tooltip,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Collapse,
} from "@mui/material";
import { CheckCircle, Cancel, GridView, CalendarViewMonth, ExpandMore, ExpandLess } from "@mui/icons-material";
import dayjs from "dayjs";
import { ContractedHoursReport } from "../../components/admin/ContractedHoursReport";

const fakeContractedHoursReport = {
  contracted_hours: 100,
  total_hours: 75,
  remaining_hours: 100 - 75,
};

const fakeInvigilator = {
  id: 1,
  preferred_name: "Alex",
  full_name: "Alexandra Chen",
  mobile: "07700 900123",
  alt_phone: "07700 900456",
  university_email: "a.chen@university.edu",
  personal_email: "allie.c@gmail.com",
};

const fakeRestrictions = [
  {
    diet: ["DEC2025", "APRMAY2026", "JULAUG2026", "DEC2026"],
    has_accessibility_req: true,
    separate_room_only: false,
    purple_cluster: true,
    computer_cluster: false,
    vet_school: false,
    sec: true,
    osce_golden_jubilee: true,
    osce_wolfson: false,
    osce_queen_elizabeth: false,
    resigned: false,
    approved_exemption: false,
    notes: "Prefers morning exams only, needs wheelchair access.",
  },
];

const fakeQualifications = [
  { qualification: "SENIOR_INVIGILATOR" },
  { qualification: "AKT_TRAINED" },
];

const fakeAvailability = [
  { date: "2025-12-01", slot: "Morning", available: true },
  { date: "2025-12-01", slot: "Afternoon", available: false },
  { date: "2025-12-01", slot: "Evening", available: true },
  { date: "2025-12-02", slot: "Morning", available: true },
  { date: "2025-12-02", slot: "Afternoon", available: true },
  { date: "2025-12-02", slot: "Evening", available: false },
  { date: "2025-12-03", slot: "Morning", available: false },
  { date: "2025-12-03", slot: "Afternoon", available: true },
  { date: "2025-12-03", slot: "Evening", available: false },
  { date: "2025-12-08", slot: "Morning", available: true },
  { date: "2025-12-08", slot: "Afternoon", available: true },
  { date: "2025-12-08", slot: "Evening", available: true },
];

const allPossibleDiets = [
  "DEC2025", "APRMAY2026", "JULAUG2026", "DEC2026",
  "APRMAY2027", "JULAUG2027", "DEC2027", "APRMAY2028",
  "JULAUG2028", "DEC2028", "APRMAY2029", "JULAUG2029",
];

const allQualifications: Record<string, string> = {
  SENIOR_INVIGILATOR: "Senior Invigilator",
  AKT_TRAINED: "AKT Trained",
  CHECK_IN: "Check-In",
};

export const AdminInvigilatorProfile: React.FC = () => {
  const [availabilityView] = useState<"list" | "calendar">("list");

  const CollapsibleSection: React.FC<{
    title: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
    }> = ({ title, children, defaultExpanded = false }) => {
    const [expanded, setExpanded] = useState(defaultExpanded);

    return (
        <Box>
        <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
            cursor: "pointer",
            py: 1.5,
            px: 0.5,
            borderRadius: 1,
            "&:hover": { bgcolor: "action.hover" },
            }}
            onClick={() => setExpanded(!expanded)}
        >
            <Typography variant="subtitle2" fontWeight={600}>
            {title}
            </Typography>
            {expanded ? <ExpandLess /> : <ExpandMore />}
        </Stack>

        <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ mt: 1, pl: 1 }}>
            {children}
            </Box>
        </Collapse>
        </Box>
    );
  };

  const renderBoolRow = (
    label: string,
    value: boolean,
    tooltip: { yes: string; no: string }
  ) => (
    <Tooltip title={value ? tooltip.yes : tooltip.no}>
      <Stack direction="row" alignItems="center" spacing={1}>
        {value ? (
          <CheckCircle sx={{ color: "success.main" }} />
        ) : (
          <Cancel sx={{ color: "error.main" }} />
        )}
        <Typography variant="body2">{label}</Typography>
      </Stack>
    </Tooltip>
  );

  const groupedAvailability = fakeAvailability.reduce<Record<string, typeof fakeAvailability>>((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, minHeight: "100vh" }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            {fakeInvigilator.preferred_name || fakeInvigilator.full_name}
          </Typography>
          <Typography variant="h6" color="text.secondary">
            {fakeInvigilator.full_name} • {fakeInvigilator.university_email}
          </Typography>
        </Box>

        <ToggleButtonGroup value={availabilityView} exclusive color="primary">
          <ToggleButton value="list">
            <GridView />
          </ToggleButton>
          <ToggleButton value="calendar" disabled>
            <CalendarViewMonth />
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* Container for left and right columns */}
      <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {/* Left Column - Contact, Qualifications, Diet, Restrictions */}
        <Box sx={{ flex: "0 0 450px" }}>
            <Paper sx={{ p: 4, height: "fit-content" }}>
                <Stack spacing={5}>
                    {/* Contact Details */}
                    <Box>
                        <Typography variant="h6" fontWeight={700} mb={3}>
                        Contact Details
                        </Typography>
                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">Mobile</Typography>
                                <Typography variant="body1">{fakeInvigilator.mobile}</Typography>
                            </Box>
                            {fakeInvigilator.alt_phone && (
                                <Box>
                                <Typography variant="body2" color="text.secondary">Alt Phone</Typography>
                                <Typography variant="body1">{fakeInvigilator.alt_phone}</Typography>
                                </Box>
                            )}
                            <Box>
                                <Typography variant="body2" color="text.secondary">University Email</Typography>
                                <Typography variant="body1">{fakeInvigilator.university_email}</Typography>
                            </Box>
                            {fakeInvigilator.personal_email && (
                                <Box>
                                <Typography variant="body2" color="text.secondary">Personal Email</Typography>
                                <Typography variant="body1">{fakeInvigilator.personal_email}</Typography>
                                </Box>
                            )}
                        </Stack>
                    </Box>

                    <Divider />

                    {/* Qualifications */}
                    <Box>
                        <Typography variant="h6" fontWeight={700} mb={3}>
                        Qualifications
                        </Typography>
                        <Stack direction="row" spacing={1.5} flexWrap="wrap" gap={1}>
                        {Object.entries(allQualifications).map(([key, label]) => {
                            const hasQual = fakeQualifications.some((q) => q.qualification === key);
                            return (
                            <Tooltip key={key} title={hasQual ? `${label}: Qualified` : `${label}: Not qualified`}>
                                <Chip
                                label={label}
                                color={hasQual ? "primary" : "default"}
                                variant={hasQual ? "filled" : "outlined"}
                                size="medium"
                                />
                            </Tooltip>
                            );
                        })}
                        </Stack>
                    </Box>

                    <Divider />

                    {/* Restrictions & Requirements */}
                    <Box>
                    <Typography variant="h6" fontWeight={700} mb={3}>
                        Restrictions & Requirements
                    </Typography>

                    <Stack spacing={4}>
                        {/* Exam Diets */}
                        <CollapsibleSection title="Exam Diets" defaultExpanded={false}>
                            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} sx={{ rowGap: 1.5 }}>
                                {allPossibleDiets.map((d) => {
                                const hasDiet = fakeRestrictions[0]?.diet.includes(d);
                                return (
                                    <Tooltip key={d} title={hasDiet ? `Contracted for ${d}` : `Not contracted for ${d}`}>
                                    <Chip
                                        label={d}
                                        size="small"
                                        color={hasDiet ? "primary" : "default"}
                                        variant={hasDiet ? "filled" : "outlined"}
                                    />
                                    </Tooltip>
                                );
                                })}
                            </Stack>
                        </CollapsibleSection>

                        {/* General Requirements */}
                        <CollapsibleSection title="General Requirements" defaultExpanded={false}>
                            <Stack spacing={1.8}>
                            {renderBoolRow("Accessibility Requirements", fakeRestrictions[0]?.has_accessibility_req || false, {
                                yes: "Has accessibility needs",
                                no: "No accessibility requirements",
                            })}
                            {renderBoolRow("Separate Room Only", fakeRestrictions[0]?.separate_room_only || false, {
                                yes: "Must be in separate room",
                                no: "Can be in regular exam room",
                            })}
                            {renderBoolRow("Purple Cluster", fakeRestrictions[0]?.purple_cluster || false, {
                                yes: "Can work in a Purple Cluster",
                                no: "Cannot work in a Purple Cluster",
                            })}
                            {renderBoolRow("Computer Cluster", fakeRestrictions[0]?.computer_cluster || false, {
                                yes: "Can work in a Computer Cluster",
                                no: "Cannot work in a Computer Cluster",
                            })}
                            </Stack>
                        </CollapsibleSection>

                        {/* Locations & OSCE Sites */}
                        <CollapsibleSection title="Locations & OSCE Sites" defaultExpanded={false}>
                            <Stack spacing={1.8}>
                            {renderBoolRow("Vet School", fakeRestrictions[0]?.vet_school || false, {
                                yes: "Can work at the Vet School",
                                no: "Cannot work at the Vet School",
                            })}
                            {renderBoolRow("SEC", fakeRestrictions[0]?.sec || false, {
                                yes: "Can work at the SEC",
                                no: "Cannot work at the SEC",
                            })}
                            {renderBoolRow("Golden Jubilee", fakeRestrictions[0]?.osce_golden_jubilee || false, {
                                yes: "Can work at the Golden Jubilee",
                                no: "Cannot work at the Golden Jubilee",
                            })}
                            {renderBoolRow("Wolfson", fakeRestrictions[0]?.osce_wolfson || false, {
                                yes: "Can work at the Wolfson",
                                no: "Cannot work at the Wolfson",
                            })}
                            {renderBoolRow("Queen Elizabeth", fakeRestrictions[0]?.osce_queen_elizabeth || false, {
                                yes: "Can work at the Queen Elizabeth",
                                no: "Cannot work at the Queen Elizabeth",
                            })}
                            </Stack>
                        </CollapsibleSection>

                        {/* Status */}
                        <CollapsibleSection title="Status" defaultExpanded={false}>
                            <Stack spacing={1.8}>
                            {renderBoolRow("Resigned", fakeRestrictions[0]?.resigned || false, {
                                yes: "Has resigned",
                                no: "Active invigilator",
                            })}
                            {renderBoolRow("Approved Exemption", fakeRestrictions[0]?.approved_exemption || false, {
                                yes: "Exemption approved",
                                no: "No exemption",
                            })}
                            </Stack>
                        </CollapsibleSection>
                        </Stack>

                        {/* Notes */}
                        {fakeRestrictions[0]?.notes && (
                        <Box mt={4}>
                            <Typography variant="body2">
                            <strong>Notes:</strong> {fakeRestrictions[0].notes}
                            </Typography>
                        </Box>
                        )}
                    </Box>
                </Stack>
            </Paper>
        </Box>

        {/* Right Column - Availability, Contract */}
        <Box sx={{ flex: 1, minWidth: 300 }}>
            {/* Availability */}
            <Paper sx={{ p: 4 }}>
                <Typography variant="h6" fontWeight={700} mb={3}>
                Availability
                </Typography>

                <Grid container spacing={3}>
                {Object.entries(groupedAvailability).map(([date, slots]) => (
                    <Grid item xs={12} key={date}>
                    <Paper sx={{ p: 3, bgcolor: "#f9f9f9", borderRadius: 2 }}>
                        <Typography variant="subtitle1" fontWeight={600} mb={2}>
                        {dayjs(date).format("dddd, D MMMM YYYY")}
                        </Typography>
                        <Stack direction="row" spacing={1.5} flexWrap="wrap">
                        {slots.map((s, i) => (
                            <Tooltip key={i} title={s.available ? "Available" : "Unavailable"}>
                            <Chip
                                label={s.slot}
                                color={s.available ? "success" : "default"}
                                variant={s.available ? "filled" : "outlined"}
                                size="medium"
                            />
                            </Tooltip>
                        ))}
                        </Stack>
                    </Paper>
                    </Grid>
                ))}
                </Grid>
            </Paper>

            {/* Contracted Hours */}
            <Box sx={{ mt: 4, mr: 6 }}>
                <ContractedHoursReport
                    report={fakeContractedHoursReport}
                    loading={false}
                    error={null}
                    invigName={fakeInvigilator.preferred_name}
                />
            </Box>
        </Box>
      </Box>
    </Box>
  );
};