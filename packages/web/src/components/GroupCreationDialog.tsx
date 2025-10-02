import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Chip,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Fade,
  Grow,
} from '@mui/material';
import {
  Close,
  Group,
  Person,
  PhotoCamera,
  ArrowBack,
  ArrowForward,
  Check,
} from '@mui/icons-material';
import { Contact } from '../store/chatStore';

interface GroupCreationDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateGroup: (name: string, participants: string[], avatar?: string) => void;
  availableContacts: Contact[];
}

const GroupCreationDialog: React.FC<GroupCreationDialogProps> = ({
  open,
  onClose,
  onCreateGroup,
  availableContacts,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [groupName, setGroupName] = useState('');
  const [groupAvatar, setGroupAvatar] = useState<string>('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const steps = ['Select Participants', 'Group Details', 'Review'];

  const filteredContacts = availableContacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phoneNumber.includes(searchQuery)
  );

  const handleContactToggle = (contactId: string) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleCreateGroup = () => {
    if (groupName.trim() && selectedContacts.length > 0) {
      onCreateGroup(groupName.trim(), selectedContacts, groupAvatar);
      handleClose();
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setGroupName('');
    setGroupAvatar('');
    setSelectedContacts([]);
    setSearchQuery('');
    onClose();
  };

  const getSelectedContactsData = () => {
    return availableContacts.filter(contact => 
      selectedContacts.includes(contact.id)
    );
  };

  const canProceedFromStep = (step: number) => {
    switch (step) {
      case 0: return selectedContacts.length > 0;
      case 1: return groupName.trim().length > 0;
      case 2: return true;
      default: return false;
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Add Participants
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select contacts to add to your group (minimum 1 required)
            </Typography>

            {/* Search */}
            <TextField
              fullWidth
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ mb: 2 }}
            />

            {/* Selected contacts chips */}
            {selectedContacts.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Selected ({selectedContacts.length}):
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {getSelectedContactsData().map((contact) => (
                    <Chip
                      key={contact.id}
                      avatar={<Avatar src={contact.avatar}>{contact.name.charAt(0)}</Avatar>}
                      label={contact.name}
                      onDelete={() => handleContactToggle(contact.id)}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Contacts list */}
            <Paper sx={{ maxHeight: 300, overflow: 'auto', borderRadius: 2 }}>
              <List>
                {filteredContacts.map((contact, index) => (
                  <Fade key={contact.id} in={true} timeout={300 + index * 50}>
                    <ListItem
                      button
                      onClick={() => handleContactToggle(contact.id)}
                      sx={{
                        borderRadius: 1,
                        mx: 1,
                        mb: 0.5,
                        '&:hover': {
                          bgcolor: 'rgba(37, 211, 102, 0.1)',
                        },
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar src={contact.avatar}>
                          {contact.name.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={contact.name}
                        secondary={contact.phoneNumber}
                      />
                      <ListItemSecondaryAction>
                        <Checkbox
                          checked={selectedContacts.includes(contact.id)}
                          onChange={() => handleContactToggle(contact.id)}
                          color="primary"
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  </Fade>
                ))}
              </List>
            </Paper>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Group Details
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Customize your group with a name and optional photo
            </Typography>

            {/* Group Avatar */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={groupAvatar}
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: 'primary.main',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'scale(1.05)',
                    },
                  }}
                  onClick={() => {
                    // Simulate avatar selection
                    const avatars = [
                      'https://i.pravatar.cc/150?img=10',
                      'https://i.pravatar.cc/150?img=11',
                      'https://i.pravatar.cc/150?img=12',
                    ];
                    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
                    setGroupAvatar(randomAvatar);
                  }}
                >
                  <Group sx={{ fontSize: 40 }} />
                </Avatar>
                <IconButton
                  size="small"
                  sx={{
                    position: 'absolute',
                    bottom: -5,
                    right: -5,
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                  }}
                  onClick={() => {
                    const avatars = [
                      'https://i.pravatar.cc/150?img=10',
                      'https://i.pravatar.cc/150?img=11',
                      'https://i.pravatar.cc/150?img=12',
                    ];
                    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
                    setGroupAvatar(randomAvatar);
                  }}
                >
                  <PhotoCamera fontSize="small" />
                </IconButton>
              </Box>
              <Box>
                <Typography variant="body2" fontWeight="medium">
                  Group Photo
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Click to add or change photo
                </Typography>
              </Box>
            </Box>

            {/* Group Name */}
            <TextField
              fullWidth
              label="Group Name"
              placeholder="Enter group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              error={groupName.trim().length === 0}
              helperText={groupName.trim().length === 0 ? 'Group name is required' : ''}
              sx={{ mb: 2 }}
            />

            {/* Participants preview */}
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Participants ({selectedContacts.length}):
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {getSelectedContactsData().slice(0, 5).map((contact) => (
                <Chip
                  key={contact.id}
                  avatar={<Avatar src={contact.avatar}>{contact.name.charAt(0)}</Avatar>}
                  label={contact.name}
                  size="small"
                  variant="outlined"
                />
              ))}
              {selectedContacts.length > 5 && (
                <Chip
                  label={`+${selectedContacts.length - 5} more`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Review Group
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Review your group details before creating
            </Typography>

            <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar
                  src={groupAvatar}
                  sx={{ width: 60, height: 60, bgcolor: 'primary.main' }}
                >
                  <Group sx={{ fontSize: 30 }} />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {groupName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedContacts.length} participant{selectedContacts.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              </Box>

              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                Participants:
              </Typography>
              <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                {getSelectedContactsData().map((contact, index) => (
                  <Grow key={contact.id} in={true} timeout={300 + index * 100}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        py: 1,
                        px: 1,
                        borderRadius: 1,
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Avatar src={contact.avatar} sx={{ width: 32, height: 32 }}>
                        {contact.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {contact.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {contact.phoneNumber}
                        </Typography>
                      </Box>
                    </Box>
                  </Grow>
                ))}
              </Box>
            </Paper>

            <Box
              sx={{
                p: 2,
                bgcolor: 'success.light',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Check color="success" />
              <Typography variant="body2" color="success.dark">
                Ready to create your group! All participants will be notified.
              </Typography>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          minHeight: 500,
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Group color="primary" />
            <Typography variant="h6" fontWeight="bold">
              Create Group
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>

        {/* Stepper */}
        <Stepper activeStep={activeStep} sx={{ mt: 2 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {renderStepContent()}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button
          onClick={activeStep === 0 ? handleClose : handleBack}
          startIcon={activeStep === 0 ? <Close /> : <ArrowBack />}
        >
          {activeStep === 0 ? 'Cancel' : 'Back'}
        </Button>
        
        <Box sx={{ flexGrow: 1 }} />
        
        {activeStep < steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!canProceedFromStep(activeStep)}
            endIcon={<ArrowForward />}
            sx={{
              background: 'linear-gradient(45deg, #25D366 30%, #128C7E 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #128C7E 30%, #25D366 90%)',
              },
            }}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleCreateGroup}
            disabled={!canProceedFromStep(activeStep)}
            startIcon={<Group />}
            sx={{
              background: 'linear-gradient(45deg, #25D366 30%, #128C7E 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #128C7E 30%, #25D366 90%)',
              },
            }}
          >
            Create Group
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default GroupCreationDialog;