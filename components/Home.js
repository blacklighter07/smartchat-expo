import {useNavigation} from '@react-navigation/native';
import React, {useState, useEffect, useRef} from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, PanResponder, Modal, TextInput, Button, ScrollView, useColorScheme, ActivityIndicator, Image, FlatList, ImageBackground } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth} from './AuthContext';
import axios from 'axios';

const Home = ({navigation}) => {
  const [userData, setUserData] = useState({
    username: '',
    email: '',
  });
  const [chatbots, setChatbots] = useState([]);

  const {token} = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const colorScheme = useColorScheme();

  useEffect(() => {
    fetchData();
    fetchChatbots();
  }, [token]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token found');
      }
      const response = await axios.get(
        'https://smartchat.tech/api/users/profile',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      setUserData(response.data);
      // console.log(response.data.username);
      if (response.data.username) {
        await AsyncStorage.setItem("creatorId", response.data.username);
      }
      
    } catch (err) {
      console.error('Error fetching user data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChatbots = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`https://smartchat.tech/api/bot/bots`);
      setChatbots(response.data);
      setIsLoading(false);
    } catch (err) {
      alert('Failed to fetch chatbots');
      console.error('Failed to fetch chatbots');
    } finally {
      setIsLoading(false);
    }
  };

  const isDarkMode = colorScheme === 'dark';

  const theme = {
    primary: '#FF4B2B',
    secondary: '#FF416C',
    background: isDarkMode ? '#0A0A0A' : '#F8F9FA',
    surface: isDarkMode ? '#1A1A1A' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#1A1A1A',
    textSecondary: isDarkMode ? '#A0A0A0' : '#6C757D',
    divider: isDarkMode ? '#2D2D2D' : '#F0F0F0',
  };

  const goToConversationPage = (chatbotId) => {
    console.log(chatbotId);
    navigation.navigate('Conversation', { botId: chatbotId }); // Pass the chatbotId as a parameter
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.background }]}>
      <ImageBackground
        source={require('../Assets/background.webp')}
        style={styles.backgroundPattern}
        resizeMode="repeat"
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.text }]}>
              Loading chatbots...
            </Text>
          </View>
        ) : chatbots.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No chatbots available at the moment
            </Text>
          </View>
        ) : (
          <FlatList
            data={chatbots}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.container}
            renderItem={({item: chatbot}) => (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.surface }]}
                onPress={() => goToConversationPage(chatbot._id)}
                activeOpacity={0.95}>
                <Image
                  source={{uri: chatbot.botPicture}}
                  style={styles.chatbotImage}
                />
                <View style={[styles.cardOverlay, { backgroundColor: theme.surface }]}>
                  <View style={styles.cardContent}>
                    <View style={styles.headerRow}>
                      <Text style={[styles.chatbotName, { color: theme.text }]} numberOfLines={1}>
                        {chatbot.name}
                      </Text>
                      {chatbot.creatorId && (
                        <Text style={[styles.creatorText, { color: theme.textSecondary }]}>
                          @{chatbot.creatorId}
                        </Text>
                      )}
                    </View>
                    
                    <Text style={[styles.description, { color: theme.text }]} numberOfLines={3}>
                      {chatbot.description}
                    </Text>

                    <View style={[styles.statsContainer, { borderTopColor: theme.divider }]}>
                      <View style={styles.stat}>
                        <Text style={styles.emojiIcon}>❤️</Text>
                        <Text style={[styles.statText, { color: theme.textSecondary }]}>
                          {chatbot.likes}
                        </Text>
                      </View>
                      <View style={styles.stat}>
                        <Text style={styles.emojiIcon}>💬</Text>
                        <Text style={[styles.statText, { color: theme.textSecondary }]}>
                          {chatbot.botQueries}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  backgroundPattern: {
    flex: 1,
    width: '100%',
  },
  container: {
    padding: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  card: {
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    height: 160,
  },
  chatbotImage: {
    width: 100,
    height: '100%',
    resizeMode: 'cover',
  },
  cardOverlay: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 1,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(122, 122, 122, 0.5)',
  },
  headerRow: {
    flexDirection: 'column',  
    gap: 1,
  },
  chatbotName: {
    fontSize: 18,
    fontWeight: "700",
  },
  creatorText: {
    fontSize: 13,
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    lineHeight: 17,
    marginTop: 2,
    flex: 1,
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 2,
    borderTopWidth: 1,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  emojiIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  statText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default Home;
