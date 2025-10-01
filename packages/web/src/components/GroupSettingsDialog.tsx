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
  Avatar,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Person,
  Close,
  Group,
  MoreVert,
  AdminPanelSettings,
  PersonAdd,
  PersonRemove,
  ExitToApp,
} from '@mui/icons-material';
import { Conversation, Contact } from '../types';
import { useAuthStore } from '../store/authStore';

interface GroupSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  conversation: Conversation | null;
  contacts: Contact[];
  onUpdateGroupName: (name: string) => Promise<void>;
  onAddParticipants: (participantIds: string[]) => Promise<void>;
  onRemoveParticipant: (participantId: string) => Promise<void>;
  onPromoteToAdmin: (participantId: string) => Promise<void>;
  onDemoteFromAdmin: (participantId: string) => Promise<void>;
  onLeaveGroup: () => Promise<void>;
}

const GroupSettingsDialog: React.FC<GroupSettingsDialogProps> = ({
  open,
  onClose,
  conversation,
  contacts,
  onUpdateGroupName,
  onAddParticipants,
  onRemoveParticipant,
  onPromoteToAdmin,
  onDemoteFromAdmin,
  onLeaveGroup,
}) => {
  const [groupName, setGroupName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [showAddParticipants, setShowAddParticipants] = useState(false);
  const [selectedNewParticipants, setSelectedNewParticipants] = useState<string[]>([]);

  const { user } = useAuthStore();

  useEffect(() => {
    if (conversation) {
      setGroupName(conversation.name || '');
    }
  }, [conversation]);

  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setShowAddParticipants(false);
      setSelectedNewParticipants([]);
      setMenuAnchor(null);
      setSelectedParticipant(null);
    }
  }, [open]);

  if (!conversation || conversation.type !== 'group') {
    return null;
  }

  const isCurrentUserAdmin = conversation.admins?.includes(user?.id || '') || false;
  const canManageGroup = isCurrentUserAdmin;

  const handleUpdateGroupName = async () => {
    if (!groupName.trim() || groupName === conversation.name) {
      setIsEditing(false);
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdateGroupName(groupName.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update group name:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleParticipantMenuOpen = (event: React.MouseEvent<HTMLElement>, participantId: string) => {
    setMenuAnchor(event.currentTarget);
    setSelectedParticipant(participantId);
  };

  const handleParticipantMenuClose = () => {
    setMenuAnchor(null);
    setSelectedParticipant(null);
  };

  const handlePromoteToAdmin = async () => {
    if (!selectedParticipant) return;
    
    try {
      await onPromoteToAdmin(selectedParticipant);
    } catch (error) {
      console.error('Failed to promote to admin:', error);
    }
    handleParticipantMenuClose();
  };

  const handleDemoteFromAdmin = async () => {
    if (!selectedParticipant) return;
    
    try {
      await onDemoteFromAdmin(selectedParticipant);
    } catch (error) {
      console.error('Failed to demote from admin:', error);
    }
    handleParticipantMenuClose();
  };

  const handleRemoveParticipant = async () => {
    if (!selectedParticipant) return;
    
    try {
      await onRemoveParticipant(selectedParticipant);
    } catch (error) {
      console.error('Failed to remove participant:', error);
    }
    handleParticipantMenuClose();
  };

  const handleAddParticipants = async () => {
    if (selectedNewParticipants.length === 0) return;

    try {
      await onAddParticipants(selectedNewParticipants);
      setShowAddParticipants(false);
      setSelectedNewParticipants([]);
    } catch (error) {
      console.error('Failed to add participants:', error);
    }
  };

  const handleLeaveGroup = async () => {
    try {
      await onLeaveGroup();
      onClose();
    } catch (error) {
      console.error('Failed to leave group:', error);
    }
  };

  const getParticipantName = (participantId: string): string => {
    if (participantId === user?.id) return 'You';
    const contact = contacts.find(c => c.contactUserId === participantId);
    return contact?.name || `User ${participantId.slice(-4)}`;
  };

  const isParticipantAdmin = (participantId: string): boolean => {
    return conversation.admins?.includes(participantId) || false;
  };

  const availableContacts = contacts.filter(contact =>
    contact.isAppUser &&
    !contact.isBlocked &&
    contact.contactUserId &&
    !conversation.participants.includes(contact.contactUserId)
  );

  const renderGroupInfo = () => (
    <Box>
      <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
        <Avatar sx={{ width: 80, height: 80, mb: 2 }}>
          <Group sx={{ fontSize: 40 }} />
        </Avatar>
        
        {isEditing ? (
          <Box display="flex" alignItems="center" gap={1}>
            <TextField
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              size="small"
              inputProps={{ maxLength: 100 }}
              disabled={isUpdating}
            />
            <Button
              onClick={handleUpdateGroupName}
              disabled={isUpdating}
              size="small"
            >
              {isUpdating ? <CircularProgress size={16} /> : 'Save'}
            </Button>
            <Button
              onClick={() => {
                setIsEditing(false);
                setGroupName(conversation.name || '');
              }}
              size="small"
            >
              Cancel
            </Button>
          </Box>
        ) : (
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h6">{conversation.name}</Typography>
            {canManageGroup && (
              <IconButton
                size="small"
                onClick={() => setIsEditing(true)}
              >
                <Close />
              </IconButton>
            )}
          </Box>
        )}
        
        <Typography variant="body2" color="text.secondary">
          Created {conversation.createdAt.toLocaleDateString()}
        </Typography>
      </Box>

      <Typography variant="subtitle1" gutterBottom>
        Participants ({conversation.participants.length})
      </Typography>
      
      {canManageGroup && (
        <Button
          startIcon={<PersonAdd />}
          onClick={() => setShowAddParticipants(true)}
          sx={{ mb: 2 }}
          disabled={availableContacts.length === 0}
        >
          Add Participants
        </Button>
      )}

      <List>
        {conversation.participants.map(participantId => (
          <ListItem key={participantId}>
            <ListItemAvatar>
              <Avatar>
                <Person />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" gap={1}>
                  {getParticipantName(participantId)}
                  {isParticipantAdmin(participantId) && (
                    <AdminPanelSettings fontSize="small" color="primary" />
                  )}
                </Box>
              }
              secondary={isParticipantAdmin(participantId) ? 'Group Admin' : 'Participant'}
            />
            {canManageGroup && participantId !== user?.id && (
              <ListItemSecondaryAction>
                <IconButton
                  onClick={(e) => handleParticipantMenuOpen(e, participantId)}
                >
                  <MoreVert />
                </IconButton>
              </ListItemSecondaryAction>
            )}
          </ListItem>
        ))}
      </List>
    </Box>
  );

  const renderAddParticipants = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Add Participants
      </Typography>
      
      <List sx={{ maxHeight: 300, overflow: 'auto' }}>
        {availableContacts.map(contact => (
          <ListItem
            key={contact.id}
            button
            onClick={() => {
              const contactUserId = contact.contactUserId!;
              setSelectedNewParticipants(prev =>
                prev.includes(contactUserId)
                  ? prev.filter(id => id !== contactUserId)
                  : [...prev, contactUserId]
              );
            }}
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
              <input
                type="checkbox"
                checked={selectedNewParticipants.includes(contact.contactUserId!)}
                onChange={() => {}}
              />
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      {availableContacts.length === 0 && (
        <Typography color="text.secondary" textAlign="center" py={4}>
          No contacts available to add
        </Typography>
      )}
    </Box>
  );

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { minHeight: 500 }
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            {showAddParticipants ? 'Add Participants' : 'Group Info'}
            <IconButton onClick={onClose}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {showAddParticipants ? renderAddParticipants() : renderGroupInfo()}
        </DialogContent>

        <DialogActions>
          {showAddParticipants ? (
            <>
              <Button onClick={() => setShowAddParticipants(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddParticipants}
                disabled={selectedNewParticipants.length === 0}
                variant="contained"
              >
                Add ({selectedNewParticipants.length})
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleLeaveGroup}
                color="error"
                startIcon={<ExitToApp />}
              >
                Leave Group
              </Button>
              <Button onClick={onClose}>Close</Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Participant actions menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleParticipantMenuClose}
      >
        {selectedParticipant && !isParticipantAdmin(selectedParticipant) && (
          <MenuItem onClick={handlePromoteToAdmin}>
            <AdminPanelSettings sx={{ mr: 1 }} />
            Make Admin
          </MenuItem>
        )}
        {selectedParticipant && isParticipantAdmin(selectedParticipant) && (
          <MenuItem onClick={handleDemoteFromAdmin}>
            <PersonRemove sx={{ mr: 1 }} />
            Remove Admin
          </MenuItem>
        )}
        <MenuItem onClick={handleRemoveParticipant} sx={{ color: 'error.main' }}>
          <PersonRemove sx={{ mr: 1 }} />
          Remove from Group
        </MenuItem>
      </Menu>
    </>
  );
};

export default GroupSettingsDialog;