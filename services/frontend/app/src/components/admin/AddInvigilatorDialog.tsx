import * as React from 'react';
import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Button,
  CircularProgress,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiBaseUrl } from '../../utils/api';
import { Invigilator } from './types'; // Assume you have types; otherwise import from Invigilators.tsx

interface AddInvigilatorDialogProps {
  open: boolean;
  onClose: () => void;
}

export const AddInvigilatorDialog: React.FC<AddInvigilatorDialogProps> = ({ open, onClose }) => {
  const queryClient = useQueryClient();
  const [preferredName, setPreferredName] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [mobile, setMobile] = useState<string | null>(null);
  const [mobileTextOnly, setMobileTextOnly] = useState<string | null>(null);
  const [altPhone, setAltPhone] = useState<string | null>(null);
  const [universityEmail, setUniversityEmail] = useState<string | null>(null);
  const [personalEmail, setPersonalEmail] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);

  const addMutation = useMutation({
    mutationFn: async (data: Omit<Invigilator, 'id' | 'availableDates' | 'availableSlots'>) => {
      const response = await fetch(`${apiBaseUrl}/invigilators/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to add invigilator');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invigilators'] }); // Refresh list
      handleClose(); // Close and reset
    },
  });

  const handleSubmit = () => {
    addMutation.mutate({
      preferred_name: preferredName,
      full_name: fullName,
      mobile,
      mobile_text_only: mobileTextOnly,
      alt_phone: altPhone,
      university_email: universityEmail,
      personal_email: personalEmail,
      notes,
      is_active: isActive,
    });
  };

  const handleClose = () => {
    // Reset form
    setPreferredName(null);
    setFullName(null);
    setMobile(null);
    setMobileTextOnly(null);
    setAltPhone(null);
    setUniversityEmail(null);
    setPersonalEmail(null);
    setNotes(null);
    setIsActive(true);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Invigilator</DialogTitle>
      <DialogContent>
        <TextField
          label="Preferred Name"
          fullWidth
          margin="normal"
          value={preferredName || ''}
          onChange={(e) => setPreferredName(e.target.value || null)}
        />
        <TextField
          label="Full Name"
          fullWidth
          margin="normal"
          value={fullName || ''}
          onChange={(e) => setFullName(e.target.value || null)}
        />
        <TextField
          label="Mobile"
          fullWidth
          margin="normal"
          value={mobile || ''}
          onChange={(e) => setMobile(e.target.value || null)}
        />
        <TextField
          label="Mobile Text Only"
          fullWidth
          margin="normal"
          value={mobileTextOnly || ''}
          onChange={(e) => setMobileTextOnly(e.target.value || null)}
        />
        <TextField
          label="Alternative Phone"
          fullWidth
          margin="normal"
          value={altPhone || ''}
          onChange={(e) => setAltPhone(e.target.value || null)}
        />
        <TextField
          label="University Email"
          fullWidth
          margin="normal"
          value={universityEmail || ''}
          onChange={(e) => setUniversityEmail(e.target.value || null)}
        />
        <TextField
          label="Personal Email"
          fullWidth
          margin="normal"
          value={personalEmail || ''}
          onChange={(e) => setPersonalEmail(e.target.value || null)}
        />
        <TextField
          label="Notes"
          fullWidth
          multiline
          rows={4}
          margin="normal"
          value={notes || ''}
          onChange={(e) => setNotes(e.target.value || null)}
        />
        <FormControlLabel
          control={<Checkbox checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
          label="Is Active"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={addMutation.isPending}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={addMutation.isPending || !preferredName || !fullName} // Basic validation: require names
        >
          {addMutation.isPending ? <CircularProgress size={24} /> : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};