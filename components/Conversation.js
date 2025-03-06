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
  Animated,
  Alert,
  Platform
} from "react-native";
import * as Clipboard from 'expo-clipboard';
import { Feather, MaterialCommunityIcons, Ionicons, FontAwesome } from "@expo/vector-icons";
import * as DocumentPicker from 'expo-document-picker';

import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);

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

  // Add file size constants
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
  const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total

  // Add file validation function
  const validateFiles = (selectedFiles) => {
    let totalSize = 0;
    const invalidFiles = [];
    const validFiles = [];

    selectedFiles.forEach(file => {
      const fileSize = file.size;
      totalSize += fileSize;

      if (fileSize > MAX_FILE_SIZE) {
        invalidFiles.push({
          name: file.name,
          size: (fileSize / (1024 * 1024)).toFixed(2)
        });
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      const fileList = invalidFiles
        .map(f => `\n- ${f.name} (${f.size}MB)`)
        .join('');
      Alert.alert(
        'Files Too Large',
        `The following files exceed the 10MB limit:${fileList}\n\nPlease compress these files or select smaller ones.`
      );
      return false;
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      Alert.alert(
        'Total Size Too Large',
        'The total size of all files cannot exceed 50MB. Please reduce the number or size of files.'
      );
      return false;
    }

    return true;
  };

  // Add file picker function
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        multiple: true,
        copyToCacheDirectory: true
      });
      
      if (result.canceled === false && result.assets && result.assets.length > 0) {
        const newFiles = result.assets;
        
        console.log('Selected files:', newFiles.map(f => ({
          name: f.name,
          size: f.size,
          uri: f.uri
        })));
        
        if (!validateFiles(newFiles)) {
          return;
        }

        const existingSize = files.reduce((total, file) => total + file.size, 0);
        const newTotalSize = existingSize + newFiles.reduce((total, file) => total + file.size, 0);

        if (newTotalSize > MAX_TOTAL_SIZE) {
          Alert.alert(
            'Total Size Too Large',
            'Adding these files would exceed the 50MB total limit. Please remove some existing files first.'
          );
          return;
        }

        setFiles((prevFiles) => [...prevFiles, ...newFiles]);
      }
    } catch (err) {
      console.error('Document picker error:', err);
      Alert.alert('Error', 'Failed to pick documents');
    }
  };

  // Add upload function
  const handleUpload = async () => {
    if (files.length === 0) {
      Alert.alert('No Files', 'Please select files to upload first');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('creatorId', username);
      
      files.forEach((file) => {
        formData.append('pdfs', {
          uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
          type: 'application/pdf',
          name: file.name || 'document.pdf'
        });
      });

      const uploadResponse = await axios.post(
        `https://smartchat.tech/api/bot/mobile/knowledgeBase`,
        formData,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            setUploadProgress(Math.round(progress));
          },
          timeout: 30000,
        }
      );

      if (uploadResponse.data.success) {
        Alert.alert('Success', 'Knowledge base updated successfully!');
        setFiles([]);
        setShowUploadModal(false);
      } else {
        throw new Error(uploadResponse.data.error || 'Failed to upload PDFs');
      }
    } catch (err) {
      console.error('Upload error:', err);
      Alert.alert('Error', err.message || 'Failed to upload files');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

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

      {/* Add Upload Modal */}
      <Modal visible={showUploadModal} animationType="slide" transparent={true}>
        <View style={styles.uploadModalOverlay}>
          <View style={styles.uploadModalContent}>
            <View style={styles.uploadModalHeader}>
              <Text style={styles.uploadModalTitle}>Add Knowledge Base</Text>
              <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {isUploading && (
              <View style={styles.uploadProgressContainer}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.uploadProgressText}>
                  Uploading files: {uploadProgress}%
                </Text>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.uploadButton, files.length > 0 && styles.uploadButtonWithFiles]} 
              onPress={pickDocument}
            >
              <Feather name="paperclip" size={20} color="#3B82F6" />
              <Text style={styles.uploadText}>
                Upload PDF files ({files.length} selected)
              </Text>
            </TouchableOpacity>

            <ScrollView style={styles.filePreviewContainer}>
              {files.map((file, index) => (
                <View key={index} style={styles.filePreviewItem}>
                  <FontAwesome name="file-pdf-o" size={24} color="#3B82F6" />
                  <Text style={styles.filePreviewText}>{file.name}</Text>
                  <TouchableOpacity
                    onPress={() => setFiles(files.filter((_, i) => i !== index))}
                    style={styles.removeFileButton}
                  >
                    <Feather name="x" size={18} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity 
              style={styles.uploadSubmitButton}
              onPress={handleUpload}
              disabled={isUploading}
            >
              <Text style={styles.uploadSubmitText}>
                {isUploading ? 'Uploading...' : 'Upload Files'}
              </Text>
            </TouchableOpacity>
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
        <View style={styles.headerButtons}>
          {chatbot.creatorId === username && (
            <TouchableOpacity
              onPress={() => setShowUploadModal(true)}
              style={styles.headerButton}
            >
              <Feather name="plus-circle" size={24} color="white" />
            </TouchableOpacity>
          )}
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
          <Text style={styles.sendButtonText}><FontAwesome name="send" size={24} color="white" /></Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#151C2C',
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#4F46E5',
    elevation: 4,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  chatbotName: {
    color: '#F3F4F6',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  creatorId: {
    color: '#9CA3AF',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
  },
  menuButton: {
    padding: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  menu: {
    position: 'absolute',
    right: 16,
    top: 75,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 8,
    width: 180,
    zIndex: 100,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    borderWidth: 1,
    borderColor: '#374151',
  },
  menuItem: {
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginVertical: 1,
  },
  menuText: {
    color: '#F3F4F6',
    fontSize: 15,
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#0A0F1A',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 32,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#4F46E5',
    borderRadius: 20,
    borderTopRightRadius: 4,
    marginBottom: 12,
    padding: 14,
    maxWidth: '85%',
    elevation: 3,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#2D3748',
    borderRadius: 20,
    borderTopLeftRadius: 4,
    marginBottom: 12,
    padding: 14,
    maxWidth: '85%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  messageText: {
    color: '#F3F4F6',
    fontSize: 15.5,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#2D3748',
    borderRadius: 20,
    borderTopLeftRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9CA3AF',
    marginHorizontal: 3,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: '#151C2C',
    borderTopWidth: 1,
    borderTopColor: '#2D3748',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#2D3748',
    padding: 12,
    borderRadius: 24,
    color: '#F3F4F6',
    fontSize: 15.5,
    letterSpacing: 0.2,
  },
  sendButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 30,
    padding: 12,
    elevation: 3,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  sendButtonText: {
    color: '#F3F4F6',
    fontWeight: 'bold',
    fontSize: 15.5,
  },
  uploadModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  uploadModalContent: {
    backgroundColor: '#151C2C',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '80%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  uploadModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
  },
  uploadModalTitle: {
    color: '#F3F4F6',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D3748',
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  uploadButtonWithFiles: {
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    borderColor: '#4F46E5',
  },
  uploadText: {
    color: '#4F46E5',
    fontSize: 15.5,
    marginLeft: 12,
    fontWeight: '500',
  },
  filePreviewContainer: {
    maxHeight: 220,
    marginBottom: 16,
  },
  filePreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D3748',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  filePreviewText: {
    color: '#F3F4F6',
    marginLeft: 12,
    flex: 1,
    fontSize: 14.5,
    letterSpacing: 0.2,
  },
  removeFileButton: {
    backgroundColor: '#EF4444',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  uploadProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4F46E5',
  },
  uploadProgressText: {
    color: '#F3F4F6',
    marginLeft: 12,
    fontSize: 14.5,
    letterSpacing: 0.2,
  },
  uploadSubmitButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  uploadSubmitText: {
    color: '#F3F4F6',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#151C2C',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    borderWidth: 1,
    borderColor: '#2D3748',
  },
  modalTitle: {
    fontSize: 22,
    color: '#F3F4F6',
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  modalMessage: {
    color: '#9CA3AF',
    marginBottom: 24,
    textAlign: 'center',
    fontSize: 15.5,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    backgroundColor: '#2D3748',
    padding: 14,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    padding: 14,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: '#F3F4F6',
    fontWeight: 'bold',
    fontSize: 15.5,
    letterSpacing: 0.2,
  },
});

export default Conversation;
