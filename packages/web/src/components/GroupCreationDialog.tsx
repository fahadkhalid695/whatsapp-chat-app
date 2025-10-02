import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Avatar,
  Typography,
  Box,
  Chip,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Person, Close, Group } from '@mui/icons-material';
import { Contact } from '../types';
import { useChatStore } from '../store/chatStore';

interface GroupCreationDialogProps {
  open: boolean;
  onClose: () => void;
  contacts: Contact[];
  onCreateGroup: (name: string, participants: string[]) => Promise<void>;
}

const GroupCreationDialog: React.FC<GroupCreationDialogProps> = ({
  open,
  onClose,
  contacts,
  onCreateGroup,
}) => {
  const [step, setStep] = useState<'participants' | 'details'>('participants');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { isLoading } = useChatStore();

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep('participants');
      setSelectedParticipants([]);
      setGroupName('');
      setSearchQuery('');
      setIsCreating(false);
    }
  }, [open]);

  const filteredContacts = contacts.filter(contact =>
    contact.isAppUser &&
    !contact.isBlocked &&
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleParticipantToggle = (contactId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleNext = () => {
    if (selectedParticipants.length === 0) return;
    setStep('details');
  };

  const handleBack = () => {
    setStep('participants');
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedParticipants.length === 0) return;

    setIsCreating(true);
    try {
      await onCreateGroup(groupName.trim(), selectedParticipants);
      onClose();
    } catch (error) {
      console.error('Failed to create group:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const getContactName = (contactId: string): string => {
    const contact = contacts.find(c => c.contactUserId === contactId);
    return contact?.name || `User ${contactId.slice(-4)}`;
  };

  const renderParticipantSelection = () => (
    <>
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <Group sx={{ mr: 1 }} />
          New Group
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <TextField
          fullWidth
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ mb: 2 }}
        />

        {selectedParticipants.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Selected ({selectedParticipants.length})
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {selectedParticipants.map(participantId => (
                <Chip
                  key={participantId}
                  label={getContactName(participantId)}
                  onDelete={() => handleParticipantToggle(participantId)}
                  size="small"
                />
              ))}
            </Box>
          </Box>
        )}

        <List sx={{ maxHeight: 300, overflow: 'auto' }}>
          {filteredContacts.map(contact => (
            <ListItem
              key={contact.id}
              button
              onClick={() => handleParticipantToggle(contact.contactUserId!)}
            >
              <ListItemAvatar>
                <Avatar>
                  <Person />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={contact.name}
                secondary={contact.phoneNumber}
              />
              <ListItemSecondaryAction>
                <Checkbox
                  checked={selectedParticipants.includes(contact.contactUserId!)}
                  onChange={() => handleParticipantToggle(contact.contactUserId!)}
                />
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>

        {filteredContacts.length === 0 && (
          <Box textAlign="center" py={4}>
            <Typography color="text.secondary">
              {searchQuery ? 'No contacts found' : 'No contacts available'}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleNext}
          disabled={selectedParticipants.length === 0}
          variant="contained"
        >
          Next ({selectedParticipants.length})
        </Button>
      </DialogActions>
    </>
  );

  const renderGroupDetails = () => (
    <>
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <IconButton onClick={handleBack} sx={{ mr: 1 }}>
            <Close />
          </IconButton>
          Group Details
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
          <Avatar sx={{ width: 80, height: 80, mb: 2 }}>
            <Group sx={{ fontSize: 40 }} />
          </Avatar>
          <Button variant="outlined" size="small">
            Add Group Photo
          </Button>
        </Box>

        <TextField
          fullWidth
          label="Group Name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Enter group name"
          sx={{ mb: 3 }}
          inputProps={{ maxLength: 100 }}
        />

        <Typography variant="subtitle2" gutterBottom>
          Participants ({selectedParticipants.length})
        </Typography>
        <List dense>
          {selectedParticipants.map(participantId => (
            <ListItem key={participantId}>
              <ListItemAvatar>
                <Avatar sx={{ width: 32, height: 32 }}>
                  <Person />
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={getContactName(participantId)} />
            </ListItem>
          ))}
        </List>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleBack}>Back</Button>
        <Button
          onClick={handleCreateGroup}
          disabled={!groupName.trim() || isCreating}
          variant="contained"
          startIcon={isCreating ? <CircularProgress size={16} /> : null}
        >
          {isCreating ? 'Creating...' : 'Create Group'}
        </Button>
      </DialogActions>
    </>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { minHeight: 500 }
      }}
    >
      {step === 'participants' ? renderParticipantSelection() : renderGroupDetails()}
    </Dialog>
  );
};

export default GroupCreationDialog;