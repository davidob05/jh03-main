import * as React from "react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Stack,
  Chip,
  Stepper,
  Step,
  StepLabel,
  Box,
  IconButton,
  Tooltip,
  InputAdornment,
  Divider,
  Typography,
} from "@mui/material";
import { Close, Visibility, VisibilityOff } from "@mui/icons-material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CollapsibleSection } from "../../components/CollapsibleSection";
import { BooleanCheckboxRow } from "../../components/BooleanCheckboxRow";
import { apiBaseUrl, apiFetch } from "../../utils/api";
import { PillButton } from "../PillButton";

const STEPS = ["Personal Details", "Login Details", "Qualifications", "Restrictions", "Availability"];

const QUALIFICATION_CHOICES = [
  { value: "SENIOR_INVIGILATOR", label: "Senior Invigilator", help: "Can lead an exam room and supervise assistants" },
  { value: "AKT_TRAINED", label: "AKT Trained", help: "Approved for AKT duties" },
  { value: "CHECK_IN", label: "Check-In", help: "Can support candidate check-in" },
];

const RESTRICTION_CHOICES = [
  { value: "accessibility_required", label: "Accessibility required", yes: "Has accessibility needs", no: "No accessibility needs" },
  { value: "separate_room_only", label: "Separate room only", yes: "Must be in a separate room", no: "Can work in main rooms" },
  { value: "purple_cluster", label: "Purple cluster", yes: "Can work in Purple Cluster", no: "Cannot work in Purple Cluster" },
  { value: "computer_cluster", label: "Computer cluster", yes: "Can work in computer clusters", no: "Cannot work in computer clusters" },
  { value: "vet_school", label: "Vet School", yes: "Can work at the Vet School", no: "Cannot work at the Vet School" },
  { value: "sec", label: "Scottish Event Campus", yes: "Can work at the SEC", no: "Cannot work at the SEC" },
  { value: "osce_golden_jubilee", label: "Golden Jubilee", yes: "Can work at Golden Jubilee", no: "Cannot work at Golden Jubilee" },
  { value: "osce_wolfson", label: "Wolfson", yes: "Can work at Wolfson", no: "Cannot work at Wolfson" },
  { value: "osce_queen_elizabeth", label: "Queen Elizabeth", yes: "Can work at Queen Elizabeth", no: "Cannot work at Queen Elizabeth" },
  { value: "approved_exemption", label: "Approved exemption", yes: "Has approved exemption", no: "No exemption" },
];

interface AddInvigilatorDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (name: string) => void;
}

type Diet = {
  id: number;
  code: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
};

const formatDietLabel = (diet: Diet) => {
  return (diet.name && diet.name.trim()) || diet.code || "";
};

export const AddInvigilatorDialog: React.FC<AddInvigilatorDialogProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const DEFAULT_TEMP_PASSWORD = "TempPass123!";
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState(0);

  // Personal details
  const [preferredName, setPreferredName] = useState("");
  const [fullName, setFullName] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [tempPassword, setTempPassword] = useState(DEFAULT_TEMP_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [mobile, setMobile] = useState("");
  const [mobileTextOnly, setMobileTextOnly] = useState("");
  const [janetTxt, setJanetTxt] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [universityEmail, setUniversityEmail] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [contractedHours, setContractedHours] = useState("100");
  const [notes, setNotes] = useState("");

  // Multi-step selections
  const [qualifications, setQualifications] = useState<string[]>([]);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [resigned, setResigned] = useState(false);
  const [availabilityDiets, setAvailabilityDiets] = useState<string[]>([]);
  const dietsQuery = useQuery<Diet[]>({
    queryKey: ["diets"],
    queryFn: async () => {
      const res = await apiFetch(`${apiBaseUrl}/diets/`);
      if (!res.ok) throw new Error("Unable to load diets");
      return res.json();
    },
  });
  const activeDiets = React.useMemo(
    () => (dietsQuery.data || []).filter((d) => d.is_active),
    [dietsQuery.data]
  );

  const toggleArrayValue = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const handleClose = () => {
    setActiveStep(0);
    setPreferredName("");
    setFullName("");
    setLoginUsername("");
    setTempPassword(DEFAULT_TEMP_PASSWORD);
    setMobile("");
    setMobileTextOnly("");
    setJanetTxt("");
    setAltPhone("");
    setUniversityEmail("");
    setPersonalEmail("");
    setContractedHours("100");
    setNotes("");
    setQualifications([]);
    setRestrictions([]);
    setAvailabilityDiets([]);
    onClose();
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const deriveUsernameFromEmail = (email: string) => {
        const trimmed = (email || "").trim();
        if (!trimmed) return "";
        const atIdx = trimmed.indexOf("@");
        return atIdx === -1 ? trimmed : trimmed.slice(0, atIdx);
      };
      const emailUsername = deriveUsernameFromEmail(universityEmail);
      const usernameToUse = (loginUsername || emailUsername || "").trim();
      const passwordToUse = (tempPassword || "").trim();
      if (!usernameToUse) {
        throw new Error("Username is required to create the invigilator login.");
      }
      if (!passwordToUse) {
        throw new Error("Temporary password cannot be empty.");
      }

      const response = await apiFetch(`${apiBaseUrl}/invigilators/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferred_name: preferredName,
          full_name: fullName,
          mobile,
          mobile_text_only: mobileTextOnly,
          janet_txt: janetTxt,
          alt_phone: altPhone,
          university_email: universityEmail,
          personal_email: personalEmail,
          contracted_hours: contractedHours ? Number(contractedHours) : null,
          notes,
          resigned,
          user: {
            username: usernameToUse,
            email: universityEmail || personalEmail || undefined,
            password: passwordToUse,
          },

          qualifications: qualifications.map(q => ({ qualification: q })),

          restrictions: availabilityDiets.map(diet => ({
            diet,
            restrictions,
            notes: "",
          })),
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text);
      }

      return response.json();
    },

    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ["invigilators"] });
      onSuccess?.(data.preferred_name || data.full_name || "Invigilator");
      handleClose();
    },

    onError: (err: any) => {
      alert(`Failed to add invigilator: ${err.message}`);
    },
  });

  useEffect(() => {
    // Autofill username from university email to save admin effort.
    if (!loginUsername && universityEmail) {
      const atIdx = universityEmail.indexOf("@");
      const derived = atIdx === -1 ? universityEmail : universityEmail.slice(0, atIdx);
      setLoginUsername(derived);
    }
  }, [loginUsername, universityEmail]);

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Stack spacing={2}>
            <TextField label="Preferred Name" value={preferredName} onChange={e => setPreferredName(e.target.value)} fullWidth required />
            <TextField label="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} fullWidth required />
            <TextField label="Mobile" value={mobile} onChange={e => setMobile(e.target.value)} fullWidth required />
            <TextField label="Mobile Text Only" value={mobileTextOnly} onChange={e => setMobileTextOnly(e.target.value)} fullWidth />
            <TextField label="Janet txt" value={janetTxt} onChange={e => setJanetTxt(e.target.value)} fullWidth required />
            <TextField label="Alternative Phone" value={altPhone} onChange={e => setAltPhone(e.target.value)} fullWidth />
            <TextField label="University Email" value={universityEmail} onChange={e => setUniversityEmail(e.target.value)} fullWidth required />
            <TextField label="Personal Email" value={personalEmail} onChange={e => setPersonalEmail(e.target.value)} fullWidth required />
            <TextField label="Contracted Hours" type="number" value={contractedHours} onChange={e => setContractedHours(e.target.value)} fullWidth />
            <TextField label="Notes" value={notes} onChange={e => setNotes(e.target.value)} fullWidth multiline rows={3} />
            <BooleanCheckboxRow
              label="Resigned"
              value={resigned}
              onChange={setResigned}
              yesLabel="Has resigned"
              noLabel="Active invigilator"
            />
          </Stack>
        );

      case 1:
        return (
          <Stack spacing={2} divider={<Divider flexItem />}>
            <TextField
              label="Username"
              value={loginUsername}
              onChange={e => setLoginUsername(e.target.value)}
              fullWidth
              required
              helperText="Auto-filled from University Email if left blank."
            />
            <TextField
              label="Temporary Password"
              value={tempPassword}
              onChange={e => setTempPassword(e.target.value)}
              fullWidth
              required
              helperText="Starter password which the invigilator can change after first login."
              type={showPassword ? "text" : "password"}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((s) => !s)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        );

      case 2:
        return (
          <CollapsibleSection title="Qualifications" defaultExpanded>
            {QUALIFICATION_CHOICES.map(q => (
              <Tooltip key={q.value} title={q.help || q.label}>
                <Box>
                  <BooleanCheckboxRow
                    label={q.label}
                    value={qualifications.includes(q.value)}
                    onChange={() => toggleArrayValue(q.value, setQualifications)}
                  />
                </Box>
              </Tooltip>
            ))}
          </CollapsibleSection>
        );

      case 3:
        return (
          <Stack spacing={2}>
            {/* General Requirements */}
            <CollapsibleSection title="General Requirements" defaultExpanded>
              {["accessibility_required", "separate_room_only", "purple_cluster", "computer_cluster"].map(r => {
                const choice = RESTRICTION_CHOICES.find(c => c.value === r);
                if (!choice) return null;
                return (
                  <Tooltip key={choice.value} title={restrictions.includes(choice.value) ? choice.yes || choice.label : choice.no || choice.label}>
                    <Box>
                      <BooleanCheckboxRow
                        label={choice.label}
                        value={restrictions.includes(choice.value)}
                        onChange={() => toggleArrayValue(choice.value, setRestrictions)}
                        yesLabel={choice.yes}
                        noLabel={choice.no}
                      />
                    </Box>
                  </Tooltip>
                );
              })}
            </CollapsibleSection>

            {/* Locations & OSCE Sites */}
            <CollapsibleSection title="Locations & OSCE Sites" defaultExpanded={false}>
              {["vet_school", "sec", "osce_golden_jubilee", "osce_wolfson", "osce_queen_elizabeth"].map(r => {
                const choice = RESTRICTION_CHOICES.find(c => c.value === r);
                if (!choice) return null;
                return (
                  <Tooltip key={choice.value} title={restrictions.includes(choice.value) ? choice.yes || choice.label : choice.no || choice.label}>
                    <Box>
                      <BooleanCheckboxRow
                        label={choice.label}
                        value={restrictions.includes(choice.value)}
                        onChange={() => toggleArrayValue(choice.value, setRestrictions)}
                        yesLabel={choice.yes}
                        noLabel={choice.no}
                      />
                    </Box>
                  </Tooltip>
                );
              })}
            </CollapsibleSection>

            {/* Status / Exemptions */}
            <CollapsibleSection title="Status / Exemptions" defaultExpanded={false}>
              {["approved_exemption"].map(r => {
                const choice = RESTRICTION_CHOICES.find(c => c.value === r);
                if (!choice) return null;
                return (
                  <Tooltip key={choice.value} title={restrictions.includes(choice.value) ? choice.yes || choice.label : choice.no || choice.label}>
                    <Box>
                      <BooleanCheckboxRow
                        label={choice.label}
                        value={restrictions.includes(choice.value)}
                        onChange={() => toggleArrayValue(choice.value, setRestrictions)}
                        yesLabel={choice.yes}
                        noLabel={choice.no}
                      />
                    </Box>
                  </Tooltip>
                );
              })}
            </CollapsibleSection>
          </Stack>
        );

      case 4:
        return (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {activeDiets.map(diet => {
              const label = formatDietLabel(diet);
              const selected = availabilityDiets.includes(diet.code);
              return (
                <Tooltip key={diet.code} title={selected ? `Remove ${label}` : `Add ${label}`}>
                  <Chip
                    label={label}
                    clickable
                    color={selected ? "primary" : "default"}
                    variant={selected ? "filled" : "outlined"}
                    onClick={() =>
                      setAvailabilityDiets(prev =>
                        prev.includes(diet.code)
                          ? prev.filter(d => d !== diet.code)
                          : [...prev, diet.code]
                      )
                    }
                  />
                </Tooltip>
              );
            })}
            {activeDiets.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No diets available. Add diets first from the admin dashboard.
              </Typography>
            )}
          </Stack>
        );

      default:
        return null;
    }
  };

  const mandatoryFieldsFilled =
    preferredName &&
    fullName &&
    mobile &&
    universityEmail &&
    personalEmail &&
    (loginUsername || universityEmail || personalEmail) &&
    tempPassword;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Add New Invigilator
        <IconButton onClick={handleClose} sx={{ position: "absolute", right: 8, top: 8 }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} alternativeLabel>
          {STEPS.map(step => (
            <Step key={step}>
              <StepLabel>{step}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box mt={3}>{renderStepContent()}</Box>
      </DialogContent>

      <DialogActions>
        {activeStep > 0 && (
          <PillButton onClick={() => setActiveStep(s => s - 1)}>
            Back
          </PillButton>
        )}
        {activeStep < STEPS.length - 1 ? (
          <PillButton
            variant="contained"
            onClick={() => setActiveStep(s => s + 1)}
            disabled={activeStep === 0 && !mandatoryFieldsFilled}
          >
            Next
          </PillButton>
        ) : (
          <PillButton
            variant="contained"
            onClick={() => addMutation.mutate()}
            disabled={addMutation.isPending || !mandatoryFieldsFilled}
          >
            {addMutation.isPending ? <CircularProgress size={22} /> : "Add"}
          </PillButton>
        )}
      </DialogActions>
    </Dialog>
  );
};
