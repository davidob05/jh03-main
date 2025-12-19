import React, { useMemo, useState } from "react";
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
  CircularProgress,
  Alert,
} from "@mui/material";
import { GridView, CalendarViewMonth } from "@mui/icons-material";
import dayjs from "dayjs";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ContractedHoursReport } from "../../components/admin/ContractedHoursReport";
import { CollapsibleSection } from "../../components/CollapsibleSection";
import { BooleanCheckboxRow } from "../../components/BooleanCheckboxRow";
import { apiBaseUrl } from "../../utils/api";

const baseDietOptions = [
  { code: "DEC_2025", label: "December 2025" },
  { code: "APR_MAY_2026", label: "April/May 2026" },
  { code: "AUG_2026", label: "August 2026" },
];

const allQualifications: Record<string, string> = {
  SENIOR_INVIGILATOR: "Senior Invigilator",
  AKT_TRAINED: "AKT Trained",
  CHECK_IN: "Check-In",
};

interface InvigilatorAvailability {
  date: string;
  slot: string;
  available: boolean;
}

interface InvigilatorRestriction {
  diet: string;
  restrictions: string[];
  notes?: string;
}

interface InvigilatorQualification {
  qualification: string;
}

interface InvigilatorData {
  id: number;
  preferred_name: string | null;
  full_name: string;
  mobile: string | null;
  mobile_text_only: string | null;
  janet_txt: string | null;
  alt_phone: string | null;
  university_email: string | null;
  personal_email: string | null;
  notes: string | null;
  resigned: boolean;
  contracted_hours?: number | null;
  qualifications: InvigilatorQualification[];
  restrictions: InvigilatorRestriction[];
  availabilities: InvigilatorAvailability[];
  assignments?: InvigilatorAssignment[];
}

interface InvigilatorAssignment {
  assigned_start: string;
  assigned_end: string;
  break_time_minutes: number;
}

const slotLabelMap: Record<string, string> = {
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  EVENING: "Evening",
};

export const AdminInvigilatorProfile: React.FC = () => {
  const [availabilityView] = useState<"list" | "calendar">("list");
  const { id } = useParams();

  const { data, isLoading, isError, error } = useQuery<InvigilatorData, Error>({
    queryKey: ["invigilator", id],
    queryFn: async () => {
      const response = await fetch(`${apiBaseUrl}/invigilators/${id}/`);
      if (!response.ok) throw new Error("Unable to load invigilator");
      return response.json();
    },
    enabled: Boolean(id),
  });

  const restrictionsUnion = useMemo(() => {
    const set = new Set<string>();
    data?.restrictions?.forEach((r) => r.restrictions?.forEach((code) => set.add(code)));
    return set;
  }, [data]);

  const diets = useMemo(() => data?.restrictions?.map((r) => r.diet) || [], [data]);

  const dietOptions = useMemo(() => {
    const extras = diets
      .filter((code) => !baseDietOptions.some((d) => d.code === code))
      .map((code) => ({ code, label: code.replace(/_/g, " ") }));
    return [...baseDietOptions, ...extras];
  }, [diets]);

  const groupedAvailability = (data?.availabilities || []).reduce<Record<string, InvigilatorAvailability[]>>((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});

  const totalAssignedHours = useMemo(() => {
    const assignments = data?.assignments || [];
    return assignments.reduce((sum, assignment) => {
      const start = new Date(assignment.assigned_start).getTime();
      const end = new Date(assignment.assigned_end).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return sum;
      const durationMinutes = (end - start) / 60000 - (assignment.break_time_minutes || 0);
      return sum + Math.max(durationMinutes, 0) / 60;
    }, 0);
  }, [data]);

  const contractedHoursReport = useMemo(() => {
    const contracted = data?.contracted_hours ?? null;
    if (contracted == null && totalAssignedHours === 0) return null;
    return {
      contracted_hours: contracted ?? 0,
      total_hours: totalAssignedHours,
      remaining_hours: contracted != null ? contracted - totalAssignedHours : undefined,
    };
  }, [data?.contracted_hours, totalAssignedHours]);

  if (isLoading) {
    return (
      <Box sx={{ p: 4, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{error?.message || "Failed to load invigilator"}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, minHeight: "100vh" }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Tooltip title="Invigilator identity">
          <Box>
            <Typography variant="h4" fontWeight={700}>
              {data.preferred_name || data.full_name}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {data.full_name} - {data.university_email || "No university email"}
            </Typography>
          </Box>
        </Tooltip>

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
                  <Tooltip title="Primary mobile number for urgent contact">
                    <Box>
                      <Typography variant="body2" color="text.secondary">Mobile</Typography>
                      {data.mobile ? (
                        <Typography
                          variant="body1"
                          component="a"
                          href={`tel:${data.mobile}`}
                          sx={{ textDecoration: "none", color: "primary.main" }}
                        >
                          {data.mobile}
                        </Typography>
                      ) : (
                        <Typography variant="body1">—</Typography>
                      )}
                    </Box>
                  </Tooltip>
                  {data.mobile_text_only && (
                    <Tooltip title="Text-only mobile number">
                      <Box>
                        <Typography variant="body2" color="text.secondary">Mobile (Text Only)</Typography>
                        <Typography
                          variant="body1"
                          component="a"
                          href={`sms:${data.mobile_text_only}`}
                          sx={{ textDecoration: "none", color: "primary.main" }}
                        >
                          {data.mobile_text_only}
                        </Typography>
                      </Box>
                    </Tooltip>
                  )}
                  {data.janet_txt && (
                    <Tooltip title="Janet txt contact">
                      <Box>
                        <Typography variant="body2" color="text.secondary">Janet txt</Typography>
                        <Typography
                          variant="body1"
                          component="a"
                          href={`sms:${data.janet_txt}`}
                          sx={{ textDecoration: "none", color: "primary.main" }}
                        >
                          {data.janet_txt}
                        </Typography>
                      </Box>
                    </Tooltip>
                  )}
                  {data.alt_phone && (
                    <Tooltip title="Alternative phone number">
                      <Box>
                        <Typography variant="body2" color="text.secondary">Alternative Phone</Typography>
                        <Typography
                          variant="body1"
                          component="a"
                          href={`tel:${data.alt_phone}`}
                          sx={{ textDecoration: "none", color: "primary.main" }}
                        >
                          {data.alt_phone}
                        </Typography>
                      </Box>
                    </Tooltip>
                  )}
                  <Tooltip title="Preferred university email">
                    <Box>
                      <Typography variant="body2" color="text.secondary">University Email</Typography>
                      {data.university_email ? (
                        <Typography
                          variant="body1"
                          component="a"
                          href={`mailto:${data.university_email}`}
                          sx={{ textDecoration: "none", color: "primary.main" }}
                        >
                          {data.university_email}
                        </Typography>
                      ) : (
                        <Typography variant="body1">—</Typography>
                      )}
                    </Box>
                  </Tooltip>
                  {data.personal_email && (
                    <Tooltip title="Personal email on file">
                      <Box>
                        <Typography variant="body2" color="text.secondary">Personal Email</Typography>
                        <Typography
                          variant="body1"
                          component="a"
                          href={`mailto:${data.personal_email}`}
                          sx={{ textDecoration: "none", color: "primary.main" }}
                        >
                          {data.personal_email}
                        </Typography>
                      </Box>
                    </Tooltip>
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
                    const hasQual = data.qualifications?.some((q) => q.qualification === key);
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
                      {dietOptions.map((d) => {
                        const hasDiet = diets.includes(d.code);
                        return (
                          <Tooltip key={d.code} title={hasDiet ? `Contracted for ${d.label}` : `Not contracted for ${d.label}`}>
                            <Chip
                              label={d.label}
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
                      <Tooltip
                        title={
                          restrictionsUnion.has("accessibility_required")
                            ? "Has accessibility needs"
                            : "No accessibility requirements"
                        }
                      >
                        <Box>
                          <BooleanCheckboxRow
                            label="Accessibility Requirements"
                            value={restrictionsUnion.has("accessibility_required")}
                            onChange={() => {}}
                            yesLabel="Has accessibility needs"
                            noLabel="No accessibility requirements"
                          />
                        </Box>
                      </Tooltip>
                      <Tooltip
                        title={
                          restrictionsUnion.has("separate_room_only")
                            ? "Must be in separate room"
                            : "Can be in regular exam room"
                        }
                      >
                        <Box>
                          <BooleanCheckboxRow
                            label="Separate Room Only"
                            value={restrictionsUnion.has("separate_room_only")}
                            onChange={() => {}}
                            yesLabel="Must be in separate room"
                            noLabel="Can be in regular exam room"
                          />
                        </Box>
                      </Tooltip>
                      <Tooltip
                        title={
                          restrictionsUnion.has("purple_cluster")
                            ? "Can work in a Purple Cluster"
                            : "Cannot work in a Purple Cluster"
                        }
                      >
                        <Box>
                          <BooleanCheckboxRow
                            label="Purple Cluster"
                            value={restrictionsUnion.has("purple_cluster")}
                            onChange={() => {}}
                            yesLabel="Can work in a Purple Cluster"
                            noLabel="Cannot work in a Purple Cluster"
                          />
                        </Box>
                      </Tooltip>
                      <Tooltip
                        title={
                          restrictionsUnion.has("computer_cluster")
                            ? "Can work in a Computer Cluster"
                            : "Cannot work in a Computer Cluster"
                        }
                      >
                        <Box>
                          <BooleanCheckboxRow
                            label="Computer Cluster"
                            value={restrictionsUnion.has("computer_cluster")}
                            onChange={() => {}}
                            yesLabel="Can work in a Computer Cluster"
                            noLabel="Cannot work in a Computer Cluster"
                          />
                        </Box>
                      </Tooltip>
                    </Stack>
                  </CollapsibleSection>

                  {/* Locations & OSCE Sites */}
                  <CollapsibleSection title="Locations & OSCE Sites" defaultExpanded={false}>
                    <Stack spacing={1.8}>
                      <Tooltip
                        title={
                          restrictionsUnion.has("vet_school")
                            ? "Can work at the Vet School"
                            : "Cannot work at the Vet School"
                        }
                      >
                        <Box>
                          <BooleanCheckboxRow
                            label="Vet School"
                            value={restrictionsUnion.has("vet_school")}
                            onChange={() => {}}
                            yesLabel="Can work at the Vet School"
                            noLabel="Cannot work at the Vet School"
                          />
                        </Box>
                      </Tooltip>
                      <Tooltip title={restrictionsUnion.has("sec") ? "Can work at the SEC" : "Cannot work at the SEC"}>
                        <Box>
                          <BooleanCheckboxRow
                            label="SEC"
                            value={restrictionsUnion.has("sec")}
                            onChange={() => {}}
                            yesLabel="Can work at the SEC"
                            noLabel="Cannot work at the SEC"
                          />
                        </Box>
                      </Tooltip>
                      <Tooltip
                        title={
                          restrictionsUnion.has("osce_golden_jubilee")
                            ? "Can work at the Golden Jubilee"
                            : "Cannot work at the Golden Jubilee"
                        }
                      >
                        <Box>
                          <BooleanCheckboxRow
                            label="Golden Jubilee"
                            value={restrictionsUnion.has("osce_golden_jubilee")}
                            onChange={() => {}}
                            yesLabel="Can work at the Golden Jubilee"
                            noLabel="Cannot work at the Golden Jubilee"
                          />
                        </Box>
                      </Tooltip>
                      <Tooltip
                        title={
                          restrictionsUnion.has("osce_wolfson")
                            ? "Can work at the Wolfson"
                            : "Cannot work at the Wolfson"
                        }
                      >
                        <Box>
                          <BooleanCheckboxRow
                            label="Wolfson"
                            value={restrictionsUnion.has("osce_wolfson")}
                            onChange={() => {}}
                            yesLabel="Can work at the Wolfson"
                            noLabel="Cannot work at the Wolfson"
                          />
                        </Box>
                      </Tooltip>
                      <Tooltip
                        title={
                          restrictionsUnion.has("osce_queen_elizabeth")
                            ? "Can work at the Queen Elizabeth"
                            : "Cannot work at the Queen Elizabeth"
                        }
                      >
                        <Box>
                          <BooleanCheckboxRow
                            label="Queen Elizabeth"
                            value={restrictionsUnion.has("osce_queen_elizabeth")}
                            onChange={() => {}}
                            yesLabel="Can work at the Queen Elizabeth"
                            noLabel="Cannot work at the Queen Elizabeth"
                          />
                        </Box>
                      </Tooltip>
                    </Stack>
                  </CollapsibleSection>

                  {/* Status */}
                  <CollapsibleSection title="Status" defaultExpanded={false}>
                    <Stack spacing={1.8}>
                      <Tooltip title={data.resigned ? "Has resigned" : "Active invigilator"}>
                        <Box>
                          <BooleanCheckboxRow
                            label="Resigned"
                            value={data.resigned || false}
                            onChange={() => {}}
                            yesLabel="Has resigned"
                            noLabel="Active invigilator"
                          />
                        </Box>
                      </Tooltip>
                      <Tooltip
                        title={
                          restrictionsUnion.has("approved_exemption") ? "Exemption approved" : "No exemption"
                        }
                      >
                        <Box>
                          <BooleanCheckboxRow
                            label="Approved Exemption"
                            value={restrictionsUnion.has("approved_exemption")}
                            onChange={() => {}}
                            yesLabel="Exemption approved"
                            noLabel="No exemption"
                          />
                        </Box>
                      </Tooltip>
                    </Stack>
                  </CollapsibleSection>
                </Stack>

                {/* Notes */}
                {(data.restrictions?.[0]?.notes || data.notes) && (
                  <Box mt={4}>
                    <Typography variant="body2">
                      <strong>Notes:</strong> {data.restrictions?.[0]?.notes || data.notes}
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
                        <Tooltip key={i} title={s.available ? "Available for this slot" : "Unavailable for this slot"}>
                          <Chip
                            label={slotLabelMap[s.slot] || s.slot}
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
              report={contractedHoursReport}
              loading={false}
              error={null}
              invigName={data.preferred_name || data.full_name}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
