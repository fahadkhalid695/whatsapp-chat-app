import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList, Conversation, Contact } from '../types';
import { useAuthStore } from '../store/authStore';
import { useContactStore } from '../store/contactStore';
import { useChatStore } from '../store/chatStore';
import { apiService } from '../services/api';

type GroupSettingsScreenRouteProp = RouteProp<RootStackParamList, 'GroupSettings'>;
type GroupSettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'GroupSettings'>;

const GroupSettingsScreen: React.FC = () => {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showParticipantMenu, setShowParticipantMenu] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [showAddParticipants, setShowAddParticipants] = useState(false);
  const [selectedNewParticipants, setSelectedNewParticipants] = useState<string[]>([]);

  const navigation = useNavigation<GroupSettingsScreenNavigationProp>();
  const route = useRoute<GroupSettingsScreenRouteProp>();
  const { conversationId } = route.params;
  
  const { user } = useAuthStore();
  const { contacts } = useContactStore();
  const { conversations, setConversations } = useChatStore();

  useEffect(() => {
    const conv = conversations.find(c => c.id === conversationId);
    if (conv) {
      setConversation(conv);
      setGroupName(conv.name || '');
    }
  }, [conversationId, conversations]);

  useEffect(() => {
    navigation.setOptions({
      title: 'Group Info',
      headerRight: () => (
        isCurrentUserAdmin && (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setIsEditing(!isEditing)}
          >
            <Text style={styles.headerButtonText}>
              {isEditing ? 'Done' : 'Edit'}
            </Text>
          </TouchableOpacity>
        )
      ),
    });
  }, [isEditing, isCurrentUserAdmin]);

  if (!conversation || conversation.type !== 'group') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Group not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isCurrentUserAdmin = conversation.admins?.includes(user?.id || '') || false;

  const handleUpdateGroupName = async () => {
    if (!groupName.trim() || groupName === conversation.name) {
      setIsEditing(false);
      return;
    }

    setIsUpdating(true);
    try {
      const response = await apiService.put(`/conversations/${conversationId}`, {
        name: groupName.trim(),
      });

      if (response.success) {
        setConversations(prev =>
          prev.map(conv =>
            conv.id === conversationId
              ? { ...conv, name: groupName.trim(), updatedAt: new Date() }
              : conv
          )
        );
        setConversation(prev => prev ? { ...prev, name: groupName.trim() } : null);
        setIsEditing(false);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update group name');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleParticipantPress = (participantId: string) => {
    if (!isCurrentUserAdmin || participantId === user?.id) return;
    
    setSelectedParticipant(participantId);
    setShowParticipantMenu(true);
  };

  const handlePromoteToAdmin = async () => {
    if (!selectedParticipant) return;

    try {
      await apiService.put(`/conversations/${conversationId}/admin`, {
        targetUserId: selectedParticipant,
        makeAdmin: true,
      });

      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { 
                ...conv, 
                admins: [...(conv.admins || []), selectedParticipant]
              }
            : conv
        )
      );

      setConversation(prev => prev ? {
        ...prev,
        admins: [...(prev.admins || []), selectedParticipant]
      } : null);

      Alert.alert('Success', 'User promoted to admin');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to promote user');
    }
    
    setShowParticipantMenu(false);
    setSelectedParticipant(null);
  };

  const handleDemoteFromAdmin = async () => {
    if (!selectedParticipant) return;

    try {
      await apiService.put(`/conversations/${conversationId}/admin`, {
        targetUserId: selectedParticipant,
        makeAdmin: false,
      });

      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { 
                ...conv, 
                admins: conv.admins?.filter(id => id !== selectedParticipant) || []
              }
            : conv
        )
      );

      setConversation(prev => prev ? {
        ...prev,
        admins: prev.admins?.filter(id => id !== selectedParticipant) || []
      } : null);

      Alert.alert('Success', 'Admin privileges removed');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to remove admin privileges');
    }
    
    setShowParticipantMenu(false);
    setSelectedParticipant(null);
  };

  const handleRemoveParticipant = async () => {
    if (!selectedParticipant) return;

    Alert.alert(
      'Remove Participant',
      'Are you sure you want to remove this participant from the group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.delete(`/conversations/${conversationId}/participants`, {
                participantIds: [selectedParticipant],
              });

              setConversations(prev =>
                prev.map(conv =>
                  conv.id === conversationId
                    ? { 
                        ...conv, 
                        participants: conv.participants.filter(id => id !== selectedParticipant),
                        admins: conv.admins?.filter(id => id !== selectedParticipant)
                      }
                    : conv
                )
              );

              setConversation(prev => prev ? {
                ...prev,
                participants: prev.participants.filter(id => id !== selectedParticipant),
                admins: prev.admins?.filter(id => id !== selectedParticipant)
              } : null);

              Alert.alert('Success', 'Participant removed from group');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove participant');
            }
          },
        },
      ]
    );
    
    setShowParticipantMenu(false);
    setSelectedParticipant(null);
  };

  const handleAddParticipants = async () => {
    if (selectedNewParticipants.length === 0) return;

    try {
      await apiService.post(`/conversations/${conversationId}/participants`, {
        participantIds: selectedNewParticipants,
      });

      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, participants: [...conv.participants, ...selectedNewParticipants] }
            : conv
        )
      );

      setConversation(prev => prev ? {
        ...prev,
        participants: [...prev.participants, ...selectedNewParticipants]
      } : null);

      setShowAddParticipants(false);
      setSelectedNewParticipants([]);
      Alert.alert('Success', 'Participants added to group');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add participants');
    }
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.delete(`/conversations/${conversationId}/leave`);
              
              setConversations(prev => prev.filter(conv => conv.id !== conversationId));
              navigation.navigate('Conversations');
              Alert.alert('Success', 'You have left the group');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to leave group');
            }
          },
        },
      ]
    );
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

  const renderParticipant = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.participantItem}
      onPress={() => handleParticipantPress(item)}
      disabled={!isCurrentUserAdmin || item === user?.id}
    >
      <View style={styles.participantAvatar}>
        <Icon name="person" size={24} color="#666" />
      </View>
      
      <View style={styles.participantInfo}>
        <Text style={styles.participantName}>
          {getParticipantName(item)}
        </Text>
        <Text style={styles.participantRole}>
          {isParticipantAdmin(item) ? 'Group Admin' : 'Participant'}
        </Text>
      </View>
      
      {isParticipantAdmin(item) && (
        <Icon name="admin-panel-settings" size={20} color="#25D366" />
      )}
    </TouchableOpacity>
  );

  const renderAvailableContact = ({ item }: { item: Contact }) => {
    const isSelected = selectedNewParticipants.includes(item.contactUserId!);
    
    return (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => {
          const contactUserId = item.contactUserId!;
          setSelectedNewParticipants(prev =>
            prev.includes(contactUserId)
              ? prev.filter(id => id !== contactUserId)
              : [...prev, contactUserId]
          );
        }}
      >
        <View style={styles.contactAvatar}>
          <Icon name="person" size={24} color="#666" />
        </View>
        
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.name}</Text>
          <Text style={styles.contactPhone}>{item.phoneNumber}</Text>
        </View>
        
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Icon name="check" size={16} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.groupAvatar}>
          <Icon name="group" size={40} color="#666" />
        </View>
        
        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={styles.groupNameInput}
              value={groupName}
              onChangeText={setGroupName}
              maxLength={100}
              autoFocus
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleUpdateGroupName}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#25D366" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.groupName}>{conversation.name}</Text>
        )}
        
        <Text style={styles.groupInfo}>
          Created {conversation.createdAt.toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Participants ({conversation.participants.length})
          </Text>
          {isCurrentUserAdmin && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddParticipants(true)}
              disabled={availableContacts.length === 0}
            >
              <Icon name="person-add" size={20} color="#25D366" />
            </TouchableOpacity>
          )}
        </View>
        
        <FlatList
          data={conversation.participants}
          renderItem={renderParticipant}
          keyExtractor={(item) => item}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.leaveButton}
          onPress={handleLeaveGroup}
        >
          <Icon name="exit-to-app" size={20} color="#ff4444" />
          <Text style={styles.leaveButtonText}>Leave Group</Text>
        </TouchableOpacity>
      </View>

      {/* Participant menu modal */}
      <Modal
        visible={showParticipantMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowParticipantMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowParticipantMenu(false)}
        >
          <View style={styles.menuContainer}>
            {selectedParticipant && !isParticipantAdmin(selectedParticipant) && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handlePromoteToAdmin}
              >
                <Icon name="admin-panel-settings" size={20} color="#25D366" />
                <Text style={styles.menuItemText}>Make Admin</Text>
              </TouchableOpacity>
            )}
            {selectedParticipant && isParticipantAdmin(selectedParticipant) && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleDemoteFromAdmin}
              >
                <Icon name="person-remove" size={20} color="#ff9800" />
                <Text style={styles.menuItemText}>Remove Admin</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleRemoveParticipant}
            >
              <Icon name="person-remove" size={20} color="#ff4444" />
              <Text style={[styles.menuItemText, { color: '#ff4444' }]}>
                Remove from Group
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add participants modal */}
      <Modal
        visible={showAddParticipants}
        animationType="slide"
        onRequestClose={() => setShowAddParticipants(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowAddParticipants(false)}
            >
              <Icon name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Participants</Text>
            <TouchableOpacity
              onPress={handleAddParticipants}
              disabled={selectedNewParticipants.length === 0}
            >
              <Text style={[
                styles.modalAction,
                selectedNewParticipants.length === 0 && styles.modalActionDisabled
              ]}>
                Add ({selectedNewParticipants.length})
              </Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={availableContacts}
            renderItem={renderAvailableContact}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No contacts available to add
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerButtonText: {
    color: '#25D366',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  groupAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupNameInput: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginRight: 8,
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveButtonText: {
    color: '#25D366',
    fontWeight: '600',
  },
  groupName: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  groupInfo: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    flex: 1,
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  addButton: {
    padding: 8,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  participantRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  actions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  leaveButtonText: {
    fontSize: 16,
    color: '#ff4444',
    marginLeft: 8,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    minWidth: 200,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#000',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalAction: {
    color: '#25D366',
    fontSize: 16,
    fontWeight: '600',
  },
  modalActionDisabled: {
    color: '#ccc',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#25D366',
    borderColor: '#25D366',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
  },
});

export default GroupSettingsScreen;