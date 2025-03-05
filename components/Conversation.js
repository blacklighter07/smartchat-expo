import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  ActivityIndicator,
  ToastAndroid,
  Animated
} from "react-native";
import * as Clipboard from 'expo-clipboard';

import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const Conversation = ({ route }) => {
  const { botId } = route.params;
  const [username, setUsername] = useState("");
  const [messages, setMessages] = useState([]);
  const [userId, setUserId] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [chatbot, setChatbot] = useState({});
  const scrollViewRef = useRef(null);

  const defaultImageURI =
    "https://storage.googleapis.com/smartchat-pictures-bucket/generated-images/1735855572500.png";

  const imageSource = chatbot.botPicture
    ? { uri: chatbot.botPicture }
    : { uri: defaultImageURI };

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  useEffect(() => {
    scrollToBottom();
  }, []);

  useEffect(() => {
    if (botId) {
      fetchProfile(userId);
    }
  }, [userId, botId]);

  const fetchProfile = async (userId) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        "https://smartchat.tech/api/users/profile",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUserId(response.data._id);
      setUsername(response.data.username);
      if (userId.length > 0) {
        fetchMessages(userId, botId);
      }
      fetchchatbot(botId);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

// Helper function to escape text safely
const escapeText = (str) => str.replace(/</g, "‹").replace(/>/g, "›");

const formatBotResponse = (response) => {
    const elements = [];
    const lines = response.split('\n');

    let inCodeBlock = false;
    let codeLang = '';
    let codeContent = [];

    lines.forEach((line, index) => {
        // Start of a code block
        if (line.startsWith('```') && !inCodeBlock) {
            inCodeBlock = true;
            codeLang = line.replace(/```/g, '').trim(); // Extract language if present
            codeContent = []; // Reset code content
            return; // Skip rendering this line
        }

        // End of a code block
        if (line.startsWith('```') && inCodeBlock) {
            inCodeBlock = false;
            const codeText = codeContent.join('\n');
            
            elements.push(
                <View key={index} style={{ backgroundColor: 'black', padding: 10, borderRadius: 5, marginVertical: 5 }}>
                    <TouchableOpacity onPress={() => Clipboard.setStringAsync(codeText) }>
                        <Text style={{ color: 'gray', fontSize: 12, marginTop: 5 }}> Copy</Text>
                    </TouchableOpacity>
                        <Text style={{ color: 'aqua', fontFamily: 'monospace' }}>{escapeText(codeText)}</Text>
                </View>
            );
            return; // Skip rendering this line
        }

        // Collect lines inside a code block
        if (inCodeBlock) {
            codeContent.push(line);
            return; // Skip rendering this line as regular text
        }

        // Headers
        if (line.startsWith('# ')) {
            elements.push(<Text key={index} style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>{line.replace('# ', '')}</Text>);
        } else if (line.startsWith('## ')) {
            elements.push(<Text key={index} style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }}>{line.replace('## ', '')}</Text>);
        }
        // Bold Text
        else if (line.includes('**')) {
            const boldText = line.replace(/\*\*(.*?)\*\*/g, (match, p1) => `**${p1}**`);
            elements.push(<Text key={index} style={{ fontWeight: 'bold', color: 'white' }}>{boldText}</Text>);
        }
        // Math (requires external library)
        else if (line.startsWith('$')) {
            elements.push(<Text key={index} style={{ fontStyle: 'italic', color: 'white' }}>{line.replace(/\$/g, '')}</Text>);
        }
        // Bullet points
        else if (line.startsWith('- ')) {
            elements.push(<Text key={index} style={{ marginLeft: 10, color: 'white' }}>• {line.replace('- ', '')}</Text>);
        }
        // Regular text
        else {
            elements.push(<Text key={index} style={{ color: 'white' }}>{line}</Text>);
        }
    });

    return <View>{elements}</View>;
};

  const fetchchatbot = async (botId) => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `https://smartchat.tech/api/bot/${botId}`
      );
      setChatbot(response.data);
    } catch (err) {
      setError("Failed to load chatbot details");
    } finally {
      setIsLoading(false);
    }
  };
  const fetchMessages = async (userId, botId) => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `https://smartchat.tech/api/chat/messages/${userId}/${botId}`
      );
      if (Object.keys(response.data).length === 0) {
        return setMessages([]);
      }
      const structuredMesssage = response.data.map((message) => {
        const botResponse = formatBotResponse(message.content);
        return {
          text: botResponse,
          sender: message.role,
        };
      });
      setMessages(structuredMesssage);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (userId, botId, inputText) => {
    if (inputText.trim()) {
      const newMessage = {
        text: inputText,
        sender: "user",
        timestamp: new Date().toISOString(),
      };

      // add user message
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setInputMessage("");
      try {
        setIsTyping(true);
        const response = await axios.post(
          `https://smartchat.tech/api/chat/message`,
          { userId: userId, botId: botId, message: inputText }
        );
        const botResponse = formatBotResponse(response.data);
        const botMessage = {
          text: botResponse,
          sender: "bot",
          timestamp: new Date().toISOString(),
        };
        setMessages((prevMessages) => [...prevMessages, botMessage]);
      } catch (error) {
        console.error("Error sending message:", error);
      } finally {
        setIsTyping(false);
      }
    }
  };
  const deleteChatHistory = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `https://smartchat.tech/api/chat/delete/${userId}/${botId}`
      );
      if (response.status === 200) {
        ToastAndroid.show(
          "Chat history deleted successfully",
          ToastAndroid.SHORT
        );
        setShowMenu(false);
        fetchMessages(userId, botId);
      }
    } catch (error) {
      console.error("Error fetching chat history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChatContext = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `https://smartchat.tech/api/chat/deleteContext/${userId}/${botId}`
      );
      if (response.status === 200) {
        ToastAndroid.show("Context Cleared", ToastAndroid.SHORT);
        setShowMenu(false);
        fetchMessages(userId, botId);
      }
    } catch (err) {
      console.error("Error fetching chat history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteChatbot = async (botId) => {
    setIsLoading(true);
    try {
      const response = await axios.delete(
        `https://smartchat.tech/api/bot/${botId}`
      );
      if (response.status === 200) {
        ToastAndroid.show("Chatbot deleted successfully", ToastAndroid.SHORT);
        setShowMenu(false);
        setTimeout(() => {
          navigation.navigate("Home");
        }, 1000);
      }
    } catch (err) {
      alert("Failed to delete chatbot");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const [dots] = useState([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]);

  useEffect(() => {
    if (isTyping) {
      const animations = dots.map((dot, index) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(dot, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
              delay: index * 200,
            }),
            Animated.timing(dot, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
              delay: 0,
            }),
          ])
        )
      );

      Animated.parallel(animations).start();
    } else {
      dots.forEach((dot) => dot.stopAnimation());
    }
  }, [isTyping, dots]);

  return (
    <View style={styles.container}>
      {/* Modal Dialog for Deleting Chatbot */}
      <Modal visible={isOpen} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Are you Sure?</Text>
            <Text style={styles.modalMessage}>
              Once deleted there is no way to recover it.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsOpen(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteChatbot(botId)}
              >
                <Text style={styles.buttonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Chatbot Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <Image source={imageSource} style={styles.avatar} />
          </View>
          <View>
            <Text style={styles.chatbotName}>{chatbot.name}</Text>
            <Text style={styles.creatorId}>@{chatbot.creatorId}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setShowMenu(!showMenu)}
          style={styles.menuButton}
        >
          <Ionicons
            name={showMenu ? "close" : "ellipsis-vertical"}
            size={24}
            color="white"
          />
        </TouchableOpacity>
      </View>

      {showMenu && (
        <View style={styles.menu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => deleteChatHistory()}
          >
            <Text style={styles.menuText}>Delete History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => deleteChatContext()}
          >
            <Text style={styles.menuText}>Delete Context</Text>
          </TouchableOpacity>
          {chatbot.creatorId === username && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setIsOpen(true)}
            >
              <Text style={styles.menuText}>Delete Bot</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        onContentSizeChange={scrollToBottom}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {isLoading ? (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator size="large" color="#ff8200" />
          </View>
        ) : null}
        {messages.map((message, index) => (
          <View
            key={index}
            style={
              message.sender === "user" ? styles.userMessage : styles.botMessage
            }
          >
            <Text style={styles.messageText}>{message.text}</Text>
          </View>
        ))}
        {isTyping && (
          <View style={styles.typingContainer}>
            {dots.map((dot, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    opacity: dot,
                  },
                ]}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputMessage}
          onChangeText={setInputMessage}
          placeholder="Type a message"
          placeholderTextColor="#ccc"
          onSubmitEditing={() => sendMessage(userId, botId, inputMessage)}
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={() => sendMessage(userId, botId, inputMessage)}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)", // Changed to black overlay for better visibility
  },
  modalContent: {
    position: "absolute",
    width: "80%",
    padding: 20,
    backgroundColor: "white", // Changed to white
    borderRadius: 10,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    color: "black", // Changed to black
    fontWeight: "bold",
  },
  modalMessage: {
    color: "black", // Changed to black
    marginVertical: 10,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  cancelButton: {
    backgroundColor: "#555",
    padding: 10,
    borderRadius: 5,
  },
  deleteButton: {
    backgroundColor: "red",
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
    alignItems: "center",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
    marginRight: 12,
  },
  avatar: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  chatbotName: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  creatorId: {
    color: "#bbb",
    fontSize: 14,
  },
  menuButton: {
    padding: 10,
  },
  menu: {
    position: "absolute",
    right: 10,
    top: 60, // Adjusted top value
    backgroundColor: "#333",
    borderRadius: 10,
    padding: 10,
    width: 130,
    zIndex: 100, // Added zIndex to ensure it's on top
  },
  menuItem: {
    paddingVertical: 5,
  },
  menuText: {
    color: "white",
    fontSize: 14,
  },
  messagesContainer: {
    backgroundColor: "#333",
    flex: 1,
    paddingBottom: 10,
  },
  messagesContent: {
    padding: 10,
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#0066FF",
    borderRadius: 15,
    marginBottom: 10,
    padding: 12,
    maxWidth: "70%",
  },
  botMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#444",
    borderRadius: 15,
    marginBottom: 10,
    padding: 12,
    maxWidth: "90%",
  },
  messageText: {
    color: "white",
    fontSize: 14,
  },
  timeUser: {
    color: "#aaa",
    fontSize: 10,
    textAlign: "right",
  },
  timeBot: {
    color: "#aaa",
    fontSize: 10,
    textAlign: "left",
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "gray",
    marginHorizontal: 3,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#333",
    borderTopWidth: 1,
    borderTopColor: "#444",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#555",
    padding: 10,
    borderRadius: 20,
    color: "white",
  },
  sendButton: {
    backgroundColor: "#0066FF",
    borderRadius: 20,
    marginLeft: 10,
    padding: 10,
  },
  sendButtonText: {
    color: "white",
    fontWeight: "bold",
  },
});

export default Conversation;
