import { useNavigation } from '@react-navigation/native';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  useColorScheme,
  ScrollView,
  Image,
  Modal
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { Ionicons } from '@expo/vector-icons';


const Profile = () => {
  const [userData, setUserData] = useState({
    username: '',
    email: '',
  });
  const [chatbots, setChatbots] = useState([]);
  const [privateChatbots, setPrivateChatbots] = useState([]);
  const colorScheme = useColorScheme();
  const [isLoading, setIsLoading] = useState(true);
  const { signOut } = useAuth();
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }
        const response = await axios.get('https://smartchat.tech/api/users/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setUserData(response.data);
        fetchPrivateBots(response.data.username);
        fetchCreatorBots(response.data.username);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err.message || 'An error occurred while fetching user data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const fetchPrivateBots = async (creatorId) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`https://smartchat.tech/api/bot/private/${creatorId}`);
      setPrivateChatbots(response.data);
    } catch (err) {
      Alert.alert('Failed to fetch private chatbots');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCreatorBots = async (creatorId) => {
    setIsLoading(true);
    try {
      const botsResponse = await axios.get(`https://smartchat.tech/api/bot/creator/${creatorId}`);
      setChatbots(botsResponse.data.bots);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      console.error('Error fetching creator bots:', err);
    }
  };

  const goToConversationPage = (chatbotId) => {
    navigation.navigate('HomeStack', {
      screen: 'Conversation',
      params: { botId: chatbotId },
    });
  };

  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  const handleLogoutModal = () => {
    setIsLogoutModalVisible(!isLogoutModalVisible);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Logout failed', 'Please try again.');
    }
  };

  const isDarkMode = colorScheme === 'dark';

  const theme = {
    backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
    textColor: isDarkMode ? '#FFFFFF' : '#333333',
    cardColor: isDarkMode ? '#2C2C2E' : '#F0F0F0',
    accentColor: '#007AFF',
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundColor }]}
    >
      <View style={styles.profileHeader}>
        <Image
          source={require("../Assets/profile.jpeg")}
          style={styles.profileImage}
        />
        <View style={styles.profileTextContainer}>
          <Text style={[styles.username, { color: theme.textColor }]}>
            {userData.username}
          </Text>
          <Text style={[styles.email, { color: theme.textColor }]}>
            {userData.email}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.optionsButton}
          onPress={handleLogoutModal}
        >
          <Text style={styles.optionsButtonText}>
            <Ionicons name={"ellipsis-vertical"} size={24} color="black" />
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={isLogoutModalVisible}
        onRequestClose={handleLogoutModal}
      >
        <View style={styles.centeredView}>
          <View
            style={[styles.modalView, { backgroundColor: theme.cardColor }]}
          >
            <TouchableOpacity
              style={styles.modalLogOutButton}
              onPress={() => {
                handleLogout();
                handleLogoutModal();
              }}
            >
              <Text style={styles.modalLogOutButtonText}>Log Out</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={handleLogoutModal}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Text style={[styles.sectionTitle, { color: theme.textColor }]}>
        Private Chatbots
      </Text>
      {privateChatbots.length === 0 ? (
        <View style={styles.emptyState}>
          {isLoading ? (
            <ActivityIndicator size="large" color={theme.accentColor} />
          ) : (
            <Text style={[styles.emptyText, { color: theme.textColor }]}>
              No private chatbots found.
            </Text>
          )}
        </View>
      ) : (
        privateChatbots.map((privateChatbot) => (
          <TouchableOpacity
            key={privateChatbot._id}
            style={[styles.card, { backgroundColor: theme.cardColor }]}
            onPress={() => goToConversationPage(privateChatbot._id)}
          >
            <View style={styles.cardContent}>
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: privateChatbot.botPicture }}
                  style={styles.chatbotImage}
                />
              </View>
              <View style={styles.textContent}>
                <Text style={[styles.chatbotName, { color: theme.textColor }]}>
                  {privateChatbot.name}
                </Text>
                {privateChatbot.creatorId && (
                  <Text
                    style={[styles.creatorText, { color: theme.textColor }]}
                  >
                    @{privateChatbot.creatorId}
                  </Text>
                )}
                <Text style={[styles.description, { color: theme.textColor }]}>
                  {privateChatbot.description}
                </Text>
                <View style={styles.statsContainer}>
                  <View style={styles.stat}>
                    <Text style={{ color: theme.textColor }}>❤️</Text>
                    <Text style={[styles.statText, { color: theme.textColor }]}>
                      {privateChatbot.likes}
                    </Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={{ color: theme.textColor }}>💬</Text>
                    <Text style={[styles.statText, { color: theme.textColor }]}>
                      {privateChatbot.botQueries}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}

      <Text style={[styles.sectionTitle, { color: theme.textColor }]}>
        Public Chatbots
      </Text>
      {chatbots.length === 0 ? (
        <View style={styles.emptyState}>
          {isLoading ? (
            <ActivityIndicator size="large" color={theme.accentColor} />
          ) : (
            <Text style={[styles.emptyText, { color: theme.textColor }]}>
              No public chatbots found.
            </Text>
          )}
        </View>
      ) : (
        chatbots.map((chatbot) => (
          <TouchableOpacity
            key={chatbot._id}
            style={[styles.card, { backgroundColor: theme.cardColor }]}
            onPress={() => goToConversationPage(chatbot._id)}
          >
            <View style={styles.cardContent}>
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: chatbot.botPicture }}
                  style={styles.chatbotImage}
                />
              </View>
              <View style={styles.textContent}>
                <Text style={[styles.chatbotName, { color: theme.textColor }]}>
                  {chatbot.name}
                </Text>
                {chatbot.creatorId && (
                  <Text
                    style={[styles.creatorText, { color: theme.textColor }]}
                  >
                    @{chatbot.creatorId}
                  </Text>
                )}
                <Text style={[styles.description, { color: theme.textColor }]}>
                  {chatbot.description}
                </Text>
                <View style={styles.statsContainer}>
                  <View style={styles.stat}>
                    <Text style={{ color: theme.textColor }}>❤️</Text>
                    <Text style={[styles.statText, { color: theme.textColor }]}>
                      {chatbot.likes}
                    </Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={{ color: theme.textColor }}>💬</Text>
                    <Text style={[styles.statText, { color: theme.textColor }]}>
                      {chatbot.botQueries}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom:10,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 30,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 10,
  },
  profileTextContainer: {
    flex: 1,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 12,
  },
  optionsButton: {
    padding: 10,
  },
  optionsButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  // Modal styles
  centeredView: {
    position: 'absolute',
    right: 10,
    top: 60, // Adjusted top value
    borderRadius: 10,
    padding: 10,
    width: 130,
    zIndex: 100,
  },
  modalView: {
    paddingVertical: 1,
  },
  modalLogOutButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 5,
    width: '100%',
    alignItems: 'center',
  },
  modalLogOutButtonText: {
    color: 'white',
    fontSize: 14,
  },
  modalCloseButton: {
    backgroundColor: 'gray',
    padding: 10,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: 'white',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 1,
    marginBottom: 5,
  },
  card: {
    marginTop: 10,
    borderRadius: 20,
    padding: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardContent: {
    flexDirection: 'row',
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 12,
  },
  chatbotImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  textContent: {
    flex: 1,
  },
  chatbotName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  creatorText: {
    fontSize: 14,
    color: '#6B7280',
  },
  description: {
    fontSize: 14,
    marginBottom: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    marginLeft: 5,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
});

export default Profile;