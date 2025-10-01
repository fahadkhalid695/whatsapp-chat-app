import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import MessageSearch from '../components/MessageSearch';
import { Message } from '../types';

type RootStackParamList = {
  Search: { conversationId?: string };
  Chat: { conversationId: string; messageId?: string };
};

type SearchScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Search'>;
type SearchScreenRouteProp = RouteProp<RootStackParamList, 'Search'>;

interface SearchScreenProps {
  navigation: SearchScreenNavigationProp;
  route: SearchScreenRouteProp;
}

const SearchScreen: React.FC<SearchScreenProps> = ({ navigation, route }) => {
  const { conversationId } = route.params || {};

  const handleMessageSelect = (message: Message) => {
    // Navigate to the chat screen with the selected message
    navigation.navigate('Chat', {
      conversationId: message.conversationId,
      messageId: message.id,
    });
  };

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <MessageSearch
        conversationId={conversationId}
        onMessageSelect={handleMessageSelect}
        onClose={handleClose}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default SearchScreen;