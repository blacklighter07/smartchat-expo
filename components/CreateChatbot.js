import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import axios from 'axios';
import { Feather, MaterialCommunityIcons, Ionicons, FontAwesome } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Pdf from 'react-native-pdf';

const CreateChatbot = ({navigation}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [fileTexts, setFileTexts] = useState([]);
  const [newChatbot, setNewChatbot] = useState({
    name: '',
    description: '',
    botImagePrompt: '',
    botPrompt: '',
    knowledgeBase: fileTexts,
    containsMaterial: false,
    creatorId: '',
    modelType: 'gemini-2.0-flash',
    visible: 'public',
  });

  useEffect(() => {
    const fetchCreatorId = async () => {
      const storedCreatorId = await AsyncStorage.getItem("creatorId");
      if (storedCreatorId) {
        setNewChatbot(prev => ({
          ...prev,
          creatorId: storedCreatorId, // Ensure it's a string
        }));
      }
    };
  
    fetchCreatorId();
  }, []);

  useEffect(() => {
    setNewChatbot((prev) => ({
      ...prev,
      knowledgeBase: fileTexts,
    }));
  }, [fileTexts]);
  
  const modelOptions = [
    'grok-2',
    'claude-3-5-haiku-latest',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'o1-mini',
    'gpt-4.5-preview',
    'gpt-4o',
    'gpt-4o-mini',
    'meta.llama3-70b-instruct-v1:0',
    'mistral.mistral-large-2402-v1:0',
  ];

  const [isModelPickerVisible, setIsModelPickerVisible] = useState(false);

  const handleModelSelection = model => {
    setNewChatbot({...newChatbot, modelType: model});
    setIsModelPickerVisible(false);
  };

  const [isVisibilityPickerVisible, setIsVisibilityPickerVisible] =
    useState(false);

  const handleVisibilitySelection = visibility => {
    setNewChatbot({...newChatbot, visible: visibility});
    setIsVisibilityPickerVisible(false);
  };

  const handleCreateChatbot = async () => {
    if (!newChatbot.name || !newChatbot.description || !newChatbot.botPrompt) {
      Alert.alert('Please fill in all required fields');
      return;
    }
    setIsLoading(true);
    try {
        console.log(newChatbot);
      const response = await axios.post(
        `https://smartchat.tech/api/bot/create`,
        newChatbot,
      );
      console.log(response);
      if (response.status === 200) {
        ToastAndroid.show('Bot created successfully', ToastAndroid.SHORT);
      }
      goToProfilePage();
      setNewChatbot(prev => ({
        ...prev, name: "" , description: "" , botImagePrompt: "" , botPrompt : "" }));
    } catch (err) {
      Alert.alert('Failed to create chatbot');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        multiple: true,
      });
      console.log(result);
      if (result.canceled === false && result.assets && result.assets.length > 0) {
        const newFiles = result.assets;
        setFiles((prevFiles) => [
          ...prevFiles,
          ...newFiles.map((file) => file.name),
        ]);

        newFiles.forEach(async (file) => {
          const fileUri = file.uri;
          await extractText(fileUri, file.name);
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const extractText = async (fileUri, filename) => {
    try {
      const pdf = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const pdfBase64 = `data:application/pdf;base64,${pdf}`;

      const pdfData = await Pdf.convertBase64UrlToPdf(pdfBase64);
      const text = await Pdf.extractAllText(pdfData);

      const chunkText = (text, maxChunkSize = 8000) => {
        let chunks = [];
        for (let i = 0; i < text.length; i += maxChunkSize) {
          chunks.push(text.substring(i, i + maxChunkSize));
        }
        return chunks;
      };

      setFileTexts((prevText) => [...(prevText || []), ...chunkText(text)]);
      setNewChatbot((prev) => ({ ...prev, containsMaterial: true }));
    } catch (error) {
      console.error("Error extracting text:", error);
    }
  };

  const goToProfilePage = () => {
    navigation.navigate('Profile');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <MaterialCommunityIcons name="robot" size={32} color="#3B82F6" />
            <Text style={styles.headerTitle}>Create New Chatbot</Text>
          </View>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor={ '#fff' }
            value={newChatbot.name}
            onChangeText={text => setNewChatbot({...newChatbot, name: text})}
          />
          <TextInput
            style={styles.input}
            placeholder="Description"
            placeholderTextColor={ '#fff' }
            value={newChatbot.description}
            onChangeText={text =>
              setNewChatbot({...newChatbot, description: text})
            }
          />

          <TouchableOpacity style={styles.uploadButton} onPress={pickDocument}>
            <Feather name="paperclip" size={20} color="#3B82F6" />
            <Text style={styles.uploadText}>Upload PDF files</Text>
          </TouchableOpacity>

          <View style={styles.filePreviewContainer}>
            {files.map((fileName, index) => (
              <View key={index} style={styles.filePreviewItem}>
                <FontAwesome name="file-text-o" size={24} color="#3B82F6" />
                <Text style={styles.filePreviewText}>{fileName}</Text>
                <TouchableOpacity
                  onPress={() => setFiles(files.filter((_, i) => i !== index))}
                  style={styles.removeFileButton}
                >
                  <Feather name="x" size={18} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <TextInput
            style={styles.textArea}
            placeholder="Image Prompt ( e.g. Generate image of a transformer Optimus prime to be exact)"
            placeholderTextColor={ '#fff' }
            multiline
            value={newChatbot.botImagePrompt}
            onChangeText={text =>
              setNewChatbot({...newChatbot, botImagePrompt: text})
            }
          />
          <TextInput
            style={styles.textArea}
            placeholder="System Prompt ( e.g. You are Optimus Prime )"
            placeholderTextColor={ '#fff' }
            multiline
            value={newChatbot.botPrompt}
            onChangeText={text =>
              setNewChatbot({...newChatbot, botPrompt: text  })
            }
          />

          <View style={styles.selectContainer}>
            <Text style={styles.selectLabel}>Model</Text>
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() => setIsModelPickerVisible(true)}>
              <Ionicons
                name="sparkles"
                size={20}
                color="#3B82F6"
                style={styles.selectIcon}
              />
              <Text style={styles.selectText}>{newChatbot.modelType}</Text>
            </TouchableOpacity>
          </View>
          {/* Model Picker Modal */}
          <Modal
            visible={isModelPickerVisible}
            transparent={true}
            animationType="slide">
            <TouchableOpacity
              style={styles.modalOverlay}
              onPress={() => setIsModelPickerVisible(false)}
            />
            <View style={styles.modelPickerContainer}>
              <ScrollView>
                {modelOptions.map((model, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.modelPickerItem}
                    onPress={() => handleModelSelection(model)}>
                    <Text style={styles.modelPickerText}>{model}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Modal>

          <View style={styles.selectContainer}>
            <Text style={styles.selectLabel}>Visibility</Text>
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() => setIsVisibilityPickerVisible(true)}>
              {newChatbot.visible === 'public' ? (
                <MaterialCommunityIcons
                  name="earth"
                  size={20}
                  color="#3B82F6"
                  style={styles.selectIcon}
                />
              ) : (
                <Feather
                  name="lock"
                  size={20}
                  color="#3B82F6"
                  style={styles.selectIcon}
                />
              )}
              <Text style={styles.selectText}>{newChatbot.visible}</Text>
            </TouchableOpacity>
          </View>

          {/* Visibility Picker Modal */}
          <Modal
            visible={isVisibilityPickerVisible}
            transparent={true}
            animationType="slide">
            <TouchableOpacity
              style={styles.modalOverlay}
              onPress={() => setIsVisibilityPickerVisible(false)}
            />
            <View style={styles.visibilityPickerContainer}>
              <TouchableOpacity
                style={styles.visibilityPickerItem}
                onPress={() => handleVisibilitySelection('public')}>
                <Text style={styles.visibilityPickerText}>Public</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.visibilityPickerItem}
                onPress={() => handleVisibilitySelection('private')}>
                <Text style={styles.visibilityPickerText}>Private</Text>
              </TouchableOpacity>
            </View>
          </Modal>

          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateChatbot}>
            <Text style={styles.createButtonText}>Create Chatbot</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={isLoading} transparent={true} animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scrollContainer: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 10,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    borderRadius: 12,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  textArea: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    textAlignVertical: 'top',
    height: 120,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  uploadText: {
    color: '#3B82F6',
    marginLeft: 10,
  },
  filePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  filePreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 10,
    position: 'relative',
  },
  filePreviewText: {
    color: 'white',
    marginLeft: 5,
    marginRight: 20,
    maxWidth: 80,
  },
  removeFileButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'red',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectContainer: {
    marginBottom: 15,
  },
  selectLabel: {
    color: 'white',
    marginBottom: 5,
  },

  selectIcon: {
    marginRight: 10,
  },

  createButton: {
    backgroundColor: '#3B82F6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#1F2937',
    padding: 30,
    borderRadius: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modelPickerContainer: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  modelPickerItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modelPickerText: {
    color: 'white',
    fontSize: 16,
  },
  visibilityPickerContainer: {
    backgroundColor: "#1F2937",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  visibilityPickerItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  visibilityPickerText: {
    color: "white",
    fontSize: 16,
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 15,
    borderRadius: 8,
    justifyContent: 'space-between',
  },
  selectText: {
    color: 'white',
    flex: 1,
  },
});

export default CreateChatbot;
