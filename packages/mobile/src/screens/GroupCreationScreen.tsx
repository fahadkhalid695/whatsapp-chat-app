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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList, Contact } from '../types';
import { useContactStore } from '../store/contactStore';
import { apiService } from '../services/api';

type GroupCreationScreenRouteProp = RouteProp<RootStackParamList, 'GroupCreation'>;
type GroupCreationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'GroupCreation'>;

interface GroupCreationStep {
  step: 'participants' | 'details';
}

const GroupCreationScreen: React.FC = () => {
  const [step, setStep] = useState<'participants' | 'details'>('participants');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const navigation = useNavigation<GroupCreationScreenNavigationProp>();
  const route = useRoute<GroupCreationScreenRouteProp>();
  const { contacts, loadContacts } = useContactStore();

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      title: step === 'participants' ? 'New Group' : 'Group Details',
      headerRight: () => (
        step === 'participants' ? (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleNext}
            disabled={selectedParticipants.length === 0}
          >
            <Text style={[
              styles.headerButtonText,
              selectedParticipants.length === 0 && styles.headerButtonDisabled
            ]}>
              Next
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleCreateGroup}
            disabled={!groupName.trim() || isCreating}
          >
            {isCreating ? (
              <ActivityIndicator size="small" color="#25D366" />
            ) : (
              <Text style={[
                styles.headerButtonText,
                !groupName.trim() && styles.headerButtonDisabled
              ]}>
                Create
              </Text>
            )}
          </TouchableOpacity>
        )
      ),
    });
  }, [step, selectedParticipants.length, groupName, isCreating]);

  const filteredContacts = contacts.filter(contact =>
    contact.isAppUser &&
    !contact.isBlocked &&
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleParticipantToggle = (contactUserId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(contactUserId)
        ? prev.filter(id => id !== contactUserId)
        : [...prev, contactUserId]
    );
  };

  const handleNext = () => {
    if (selectedParticipants.length === 0) return;
    setStep('details');
  };

  const handleBack = () => {
    if (step === 'details') {
      setStep('participants');
    } else {
      navigation.goBack();
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedParticipants.length === 0) return;

    setIsCreating(true);
    try {
      const response = await apiService.post('/conversations', {
        type: 'group',
        name: groupName.trim(),
        participants: selectedParticipants,
      });

      if (response.success) {
        navigation.navigate('Chat', {
          conversationId: response.data.id,
          conversationName: response.data.name,
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  const getContactName = (contactUserId: string): string => {
    const contact = contacts.find(c => c.contactUserId === contactUserId);
    return contact?.name || `User ${contactUserId.slice(-4)}`;
  };

  const renderParticipantItem = ({ item }: { item: Contact }) => {
    const isSelected = selectedParticipants.includes(item.contactUserId!);
    
    return (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => handleParticipantToggle(item.contactUserId!)}
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

  const renderSelectedParticipant = ({ item }: { item: string }) => (
    <View style={styles.selectedParticipant}>
      <View style={styles.selectedAvatar}>
        <Icon name="person" size={16} color="#666" />
      </View>
      <Text style={styles.selectedName} numberOfLines={1}>
        {getContactName(item)}
      </Text>
      <TouchableOpacity
        onPress={() => handleParticipantToggle(item)}
        style={styles.removeButton}
      >
        <Icon name="close" size={16} color="#666" />
      </TouchableOpacity>
    </View>
  );

  const renderParticipantSelection = () => (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {selectedParticipants.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedTitle}>
            Selected ({selectedParticipants.length})
          </Text>
          <FlatList
            data={selectedParticipants}
            renderItem={renderSelectedParticipant}
            keyExtractor={(item) => item}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.selectedList}
          />
        </View>
      )}

      <FlatList
        data={filteredContacts}
        renderItem={renderParticipantItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="people" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No contacts found' : 'No contacts available'}
            </Text>
          </View>
        }
      />
    </View>
  );

  const renderGroupDetails = () => (
    <View style={styles.container}>
      <View style={styles.groupDetailsHeader}>
        <View style={styles.groupAvatar}>
          <Icon name="group" size={40} color="#666" />
        </View>
        <TouchableOpacity style={styles.addPhotoButton}>
          <Text style={styles.addPhotoText}>Add Group Photo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.groupNameInput}
          placeholder="Group name"
          value={groupName}
          onChangeText={setGroupName}
          maxLength={100}
          autoFocus
        />
      </View>

      <View style={styles.participantsSection}>
        <Text style={styles.participantsTitle}>
          Participants ({selectedParticipants.length})
        </Text>
        <FlatList
          data={selectedParticipants}
          renderItem={({ item }) => (
            <View style={styles.participantItem}>
              <View style={styles.participantAvatar}>
                <Icon name="person" size={20} color="#666" />
              </View>
              <Text style={styles.participantName}>
                {getContactName(item)}
              </Text>
            </View>
          )}
          keyExtractor={(item) => item}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {step === 'participants' ? renderParticipantSelection() : renderGroupDetails()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
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
  headerButtonDisabled: {
    color: '#ccc',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  selectedContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  selectedList: {
    flexGrow: 0,
  },
  selectedParticipant: {
    flexDirection: 'column',
    alignItems: 'center',
    marginRight: 12,
    width: 60,
  },
  selectedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  selectedName: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
  },
  removeButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
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
    marginTop: 16,
  },
  groupDetailsHeader: {
    alignItems: 'center',
    paddingVertical: 32,
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
  addPhotoButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addPhotoText: {
    color: '#25D366',
    fontSize: 16,
  },
  inputContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  groupNameInput: {
    fontSize: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  participantsSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  participantsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  participantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  participantName: {
    fontSize: 16,
    color: '#000',
  },
});

export default GroupCreationScreen;