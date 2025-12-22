import * as React from "react";
import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Stack,
  Chip,
  Stepper,
  Step,
  StepLabel,
  Box,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CollapsibleSection } from "../../components/CollapsibleSection";
import { BooleanCheckboxRow } from "../../components/BooleanCheckboxRow";
import { apiBaseUrl, apiFetch } from "../../utils/api";

const STEPS = ["Personal Details", "Qualifications", "Restrictions", "Availability"];

const DIET_CHOICES = [
  { value: "DEC_2025", label: "December 2025" },
  { value: "APR_MAY_2026", label: "April / May 2026" },
  { value: "AUG_2026", label: "August 2026" },
];

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

export const AddInvigilatorDialog: React.FC<AddInvigilatorDialogProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState(0);

  // Personal details
  const [preferredName, setPreferredName] = useState("");
  const [fullName, setFullName] = useState("");
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

      case 2:
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

      case 3:
        return (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {DIET_CHOICES.map(diet => {
              const selected = availabilityDiets.includes(diet.value);
              return (
                <Tooltip key={diet.value} title={selected ? `Remove ${diet.label}` : `Add ${diet.label}`}>
                  <Chip
                    label={diet.label}
                    clickable
                    color={selected ? "primary" : "default"}
                    variant={selected ? "filled" : "outlined"}
                    onClick={() =>
                      setAvailabilityDiets(prev =>
                        prev.includes(diet.value)
                          ? prev.filter(d => d !== diet.value)
                          : [...prev, diet.value]
                      )
                    }
                  />
                </Tooltip>
              );
            })}
          </Stack>
        );

      default:
        return null;
    }
  };

  const mandatoryFieldsFilled =
    preferredName && fullName && mobile && universityEmail && personalEmail;

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
        {activeStep > 0 && <Button onClick={() => setActiveStep(s => s - 1)}>Back</Button>}
        {activeStep < STEPS.length - 1 ? (
          <Button
            variant="contained"
            onClick={() => setActiveStep(s => s + 1)}
            disabled={activeStep === 0 && !mandatoryFieldsFilled}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={() => addMutation.mutate()}
            disabled={addMutation.isPending || !mandatoryFieldsFilled}
          >
            {addMutation.isPending ? <CircularProgress size={22} /> : "Add"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
