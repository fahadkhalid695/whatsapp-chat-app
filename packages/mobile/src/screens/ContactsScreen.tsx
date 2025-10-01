import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useContactStore } from '../store/contactStore';
import { useChatStore } from '../store/chatStore';
import { Contact } from '../types';
import { ContactSearchResult } from '../services/contact';
import { RootStackParamList } from '../types';

type ContactsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

interface ContactItemProps {
  contact: Contact;
  onPress: () => void;
  onBlock: () => void;
  onUnblock: () => void;
}

interface SearchResultItemProps {
  result: ContactSearchResult;
  onPress: () => void;
}

const ContactItem: React.FC<ContactItemProps> = ({ contact, onPress, onBlock, onUnblock }) => {
  const [showOptions, setShowOptions] = useState(false);

  const handleLongPress = () => {
    if (contact.isAppUser && contact.contactUserId) {
      setShowOptions(true);
    }
  };

  const handleBlock = () => {
    setShowOptions(false);
    Alert.alert(
      'Block Contact',
      `Are you sure you want to block ${contact.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: onBlock },
      ]
    );
  };

  const handleUnblock = () => {
    setShowOptions(false);
    Alert.alert(
      'Unblock Contact',
      `Are you sure you want to unblock ${contact.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unblock', onPress: onUnblock },
      ]
    );
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.contactItem, contact.isBlocked && styles.blockedContact]}
        onPress={onPress}
        onLongPress={handleLongPress}
        disabled={contact.isBlocked}
      >
        <View style={styles.contactAvatar}>
          <Text style={styles.contactAvatarText}>
            {contact.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <View style={styles.contactInfo}>
          <Text style={[styles.contactName, contact.isBlocked && styles.blockedText]}>
            {contact.name}
          </Text>
          <Text style={[styles.contactPhone, contact.isBlocked && styles.blockedText]}>
            {contact.phoneNumber}
          </Text>
          {contact.isBlocked && (
            <Text style={styles.blockedLabel}>Blocked</Text>
          )}
        </View>

        <View style={styles.contactStatus}>
          {contact.isAppUser ? (
            <Icon name="chat" size={20} color="#25D366" />
          ) : (
            <Text style={styles.inviteText}>Invite</Text>
          )}
        </View>
      </TouchableOpacity>

      <Modal
        visible={showOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowOptions(false)}
        >
          <View style={styles.optionsModal}>
            <Text style={styles.optionsTitle}>{contact.name}</Text>
            
            {contact.isBlocked ? (
              <TouchableOpacity style={styles.optionItem} onPress={handleUnblock}>
                <Icon name="person-add" size={20} color="#25D366" />
                <Text style={styles.optionText}>Unblock</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.optionItem} onPress={handleBlock}>
                <Icon name="block" size={20} color="#f44336" />
                <Text style={[styles.optionText, { color: '#f44336' }]}>Block</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => setShowOptions(false)}
            >
              <Icon name="close" size={20} color="#666" />
              <Text style={styles.optionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const SearchResultItem: React.FC<SearchResultItemProps> = ({ result, onPress }) => {
  return (
    <TouchableOpacity style={styles.contactItem} onPress={onPress}>
      <View style={styles.contactAvatar}>
        <Text style={styles.contactAvatarText}>
          {result.displayName.charAt(0).toUpperCase()}
        </Text>
      </View>
      
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{result.displayName}</Text>
        <Text style={styles.contactPhone}>{result.phoneNumber}</Text>
        <View style={styles.onlineStatus}>
          <View style={[styles.onlineIndicator, { backgroundColor: result.isOnline ? '#25D366' : '#ccc' }]} />
          <Text style={styles.onlineText}>
            {result.isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      <View style={styles.contactStatus}>
        <Icon name="chat" size={20} color="#25D366" />
      </View>
    </TouchableOpacity>
  );
};

const ContactsScreen: React.FC = () => {
  const navigation = useNavigation<ContactsScreenNavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);

  const {
    contacts,
    searchResults,
    isLoading,
    isSearching,
    isSyncing,
    error,
    loadContacts,
    syncContacts,
    searchUsers,
    clearSearch,
    blockContact,
    unblockContact,
    clearError,
  } = useContactStore();

  const { createConversation } = useChatStore();

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: clearError }
      ]);
    }
  }, [error]);

  const filteredContacts = useMemo(() => {
    if (!searchQuery && !isSearchMode) {
      return contacts;
    }
    
    return contacts.filter(contact =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phoneNumber.includes(searchQuery)
    );
  }, [contacts, searchQuery, isSearchMode]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length > 2) {
      setIsSearchMode(true);
      await searchUsers(query);
    } else {
      setIsSearchMode(false);
      clearSearch();
    }
  };

  const handleContactPress = async (contact: Contact) => {
    if (!contact.isAppUser || !contact.contactUserId || contact.isBlocked) {
      return;
    }

    try {
      // Create or find existing conversation
      const conversation = await createConversation([contact.contactUserId], 'direct');
      
      navigation.navigate('Chat', {
        conversationId: conversation.id,
        conversationName: contact.name,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to start conversation');
    }
  };

  const handleSearchResultPress = async (result: ContactSearchResult) => {
    try {
      // Create or find existing conversation
      const conversation = await createConversation([result.id], 'direct');
      
      navigation.navigate('Chat', {
        conversationId: conversation.id,
        conversationName: result.displayName,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to start conversation');
    }
  };

  const handleRefresh = async () => {
    await loadContacts();
  };

  const handleSyncContacts = async () => {
    await syncContacts();
  };

  const handleBlockContact = async (contact: Contact) => {
    if (contact.contactUserId) {
      await blockContact(contact.contactUserId);
    }
  };

  const handleUnblockContact = async (contact: Contact) => {
    if (contact.contactUserId) {
      await unblockContact(contact.contactUserId);
    }
  };

  const renderContactItem = ({ item }: { item: Contact }) => (
    <ContactItem
      contact={item}
      onPress={() => handleContactPress(item)}
      onBlock={() => handleBlockContact(item)}
      onUnblock={() => handleUnblockContact(item)}
    />
  );

  const renderSearchResultItem = ({ item }: { item: ContactSearchResult }) => (
    <SearchResultItem
      result={item}
      onPress={() => handleSearchResultPress(item)}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="contacts" size={64} color="#ccc" />
      <Text style={styles.emptyStateTitle}>
        {isSearchMode ? 'No users found' : 'No contacts yet'}
      </Text>
      <Text style={styles.emptyStateSubtitle}>
        {isSearchMode 
          ? 'Try searching with a different name or phone number'
          : 'Sync your contacts to find friends using the app'
        }
      </Text>
      {!isSearchMode && (
        <TouchableOpacity style={styles.syncButton} onPress={handleSyncContacts}>
          <Text style={styles.syncButtonText}>Sync Contacts</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Contacts</Text>
        <TouchableOpacity
          style={styles.syncIconButton}
          onPress={handleSyncContacts}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#25D366" />
          ) : (
            <Icon name="sync" size={24} color="#25D366" />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts or find new users..."
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setIsSearchMode(false);
              clearSearch();
            }}
          >
            <Icon name="clear" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#25D366" />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      ) : (
        <FlatList
          data={isSearchMode ? searchResults : filteredContacts}
          renderItem={isSearchMode ? renderSearchResultItem : renderContactItem}
          keyExtractor={(item) => isSearchMode ? (item as ContactSearchResult).id : (item as Contact).id}
          style={styles.contactsList}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handleRefresh}
              colors={['#25D366']}
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}

      {isSearching && (
        <View style={styles.searchingOverlay}>
          <ActivityIndicator size="small" color="#25D366" />
          <Text style={styles.searchingText}>Searching...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#25D366',
  },
  syncIconButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  contactsList: {
    flex: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  blockedContact: {
    opacity: 0.6,
  },
  contactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  contactAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  blockedText: {
    color: '#999',
  },
  blockedLabel: {
    fontSize: 12,
    color: '#f44336',
    fontWeight: '500',
  },
  contactStatus: {
    alignItems: 'center',
  },
  inviteText: {
    fontSize: 12,
    color: '#25D366',
    fontWeight: '500',
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  onlineText: {
    fontSize: 12,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  syncButton: {
    backgroundColor: '#25D366',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchingOverlay: {
    position: 'absolute',
    top: 120,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchingText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsModal: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
});

export default ContactsScreen;