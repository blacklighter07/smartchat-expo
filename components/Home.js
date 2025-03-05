import {useNavigation} from '@react-navigation/native';
import React, {useState, useEffect, useRef} from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, PanResponder, Modal, TextInput, Button, ScrollView, useColorScheme, ActivityIndicator,Image, FlatList } from 'react-native';
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
    backgroundColor: isDarkMode ? '#121212' : '#121212',
    textColor: isDarkMode ? '#fd5901' : '#fd5901',
    cardColor: isDarkMode ? '#1E1E1E' : '#1E1E1E',
    accentColor: isDarkMode ? '#BB86FC' : '#BB86FC',
    timeColor: isDarkMode ? '#fd5901' : '#fd5901',
    dateColor: isDarkMode ? '#1DCED1' : '#1DCED1',
  };


  const goToConversationPage = (chatbotId) => {
    console.log(chatbotId);
    navigation.navigate('Conversation', { botId: chatbotId }); // Pass the chatbotId as a parameter
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {chatbots.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>loading</Text>
          {isLoading ? (
            <View
              style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
              <ActivityIndicator size="large" color="#ff8200" />
            </View>
          ) : null}
        </View>
      ) : (
        chatbots.map(chatbot => (
          <TouchableOpacity
            key={chatbot._id}
            style={styles.card}
            onPress={() => goToConversationPage(chatbot._id)}>
            <View style={styles.cardContent}>
              <View style={styles.imageContainer}>
                <Image
                  source={{uri: chatbot.botPicture}}
                  style={styles.chatbotImage}
                />
              </View>

              <View style={styles.textContent}>
                <Text style={styles.chatbotName} numberOfLines={1}>
                  {chatbot.name}
                </Text>
                {chatbot.creatorId && (
                  <Text style={styles.creatorText}>@{chatbot.creatorId}</Text>
                )}
                <Text style={styles.description} numberOfLines={3}>
                  {chatbot.description}
                </Text>

                <View style={styles.statsContainer}>
                  <View style={styles.stat}>
                    <Text>❤️</Text>
                    <Text style={styles.statText}>{chatbot.likes}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text>💬</Text>
                    <Text style={styles.statText}>{chatbot.botQueries}</Text>
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    marginTop: 16,
    width: "100%", // This ensures two cards fit in a row, you can adjust the percentage
    backgroundColor: "#D1D5DB", // Gray color for card background
    borderRadius: 20,
    padding: 12,
    elevation: 5, // Android shadow
    shadowColor: "#000", // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 20,
    overflow: "hidden",
    marginRight: 12,
  },
  chatbotImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  textContent: {
    flex: 1,
  },
  chatbotName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  creatorText: {
    fontSize: 14,
    color: "#4B5563", // Gray color for creator text
  },
  description: {
    fontSize: 14,
    color: "#000",
    marginBottom: 4,
    overflow: 'hidden', // Ensures that the overflow is hidden
    maxHeight: 48, // This limits the description height to 3 lines
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  statText: {
    marginLeft: 5,
    fontSize: 14,
    color: "#000",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    color: "#6B7280", // Gray color for empty state
    fontSize: 16,
  },
});



export default Home;
