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

const CreateChatbot = ({navigation}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [fileTexts, setFileTexts] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [newChatbot, setNewChatbot] = useState({
    name: '',
    description: '',
    botImagePrompt: '',
    botPrompt: '',
    containsMaterial: false,
    creatorId: '',
    modelType: 'gemini-2.0-flash',
    visible: 'public',
  });

  // Add constants for file size limits
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
  const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total

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

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        multiple: true,
        copyToCacheDirectory: true // This might help with file access
      });
      
      if (result.canceled === false && result.assets && result.assets.length > 0) {
        const newFiles = result.assets;
        
        // Log file details
        console.log('Selected files:', newFiles.map(f => ({
          name: f.name,
          size: f.size,
          uri: f.uri
        })));
        
        // Validate files before adding them
        if (!validateFiles(newFiles)) {
          return;
        }

        // Calculate new total size including existing files
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
        setNewChatbot((prev) => ({ ...prev, containsMaterial: true }));
      }
    } catch (err) {
      console.error('Document picker error:', err);
      Alert.alert('Error', 'Failed to pick documents');
    }
  };

  const handleCreateChatbot = async () => {
    if (!newChatbot.name || !newChatbot.description || !newChatbot.botPrompt) {
      Alert.alert('Please fill in all required fields');
      return;
    }
    setIsLoading(true);
    
    try {
      // First, upload PDF files if any exist
      if (files.length > 0) {
        setIsUploading(true);
        
        // Single file upload approach instead of batches
        const formData = new FormData();
        formData.append('creatorId', newChatbot.creatorId);
        
        // Add files one by one
        files.forEach((file) => {
          formData.append('pdfs', {
            uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
            type: 'application/pdf',
            name: file.name || 'document.pdf'
          });
        });

        console.log('Uploading files:', files.map(f => ({ name: f.name, size: f.size })));

        try {
          const uploadResponse = await axios.post(
            'https://smartchat.tech/api/bot/mobile/knowledgeBase',
            formData,
            {
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'multipart/form-data',
              },
              onUploadProgress: (progressEvent) => {
                const progress = (progressEvent.loaded / progressEvent.total) * 100;
                setUploadProgress(Math.round(progress));
                console.log('Upload progress:', progress);
              },
              timeout: 30000, // 30 second timeout
            }
          );

          console.log('Upload response:', uploadResponse.data);

          if (!uploadResponse.data.success) {
            throw new Error(uploadResponse.data.error || 'Failed to upload PDFs');
          }
        } catch (uploadError) {
          console.error('Upload error details:', uploadError.response?.data || uploadError.message);
          throw new Error(
            uploadError.response?.data?.error || 
            uploadError.message || 
            'Failed to upload PDFs'
          );
        }
      }

      // Create chatbot
      const chatbotData = {
        ...newChatbot,
        containsMaterial: files.length > 0,
      };

      const response = await axios.post(
        'https://smartchat.tech/api/bot/create',
        chatbotData
      );

      if (response.data.success) {
        Alert.alert(
          'Success',
          files.length > 0 
            ? 'Bot created successfully! PDF processing has started and may take a few minutes to complete.'
            : 'Bot created successfully!'
        );
        goToProfilePage();
        setNewChatbot(prev => ({
          ...prev,
          name: "",
          description: "",
          botImagePrompt: "",
          botPrompt: ""
        }));
        setFiles([]);
      } else {
        throw new Error(response.data.error || 'Failed to create bot');
      }
    } catch (err) {
      console.error('Full error object:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      let errorMessage = 'Failed to create chatbot';
      
      if (err.response?.status === 413) {
        errorMessage = 'File size too large. Please try with smaller files or fewer files.';
      } else if (err.message === 'Network Error') {
        errorMessage = 'Upload failed. Please check your internet connection and try again.';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
      setIsUploading(false);
      setUploadProgress(0);
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

          {isUploading && (
            <View style={styles.uploadProgressContainer}>
              <ActivityIndicator size="small" color="#3B82F6" />
              <Text style={styles.uploadProgressText}>
                Uploading files: {uploadProgress}%
              </Text>
            </View>
          )}

          <TouchableOpacity 
            style={[
              styles.uploadButton,
              files.length > 0 && styles.uploadButtonWithFiles
            ]} 
            onPress={pickDocument}
          >
            <Feather name="paperclip" size={20} color="#3B82F6" />
            <Text style={styles.uploadText}>
              Upload PDF files ({files.length} selected)
            </Text>
          </TouchableOpacity>

          {files.length > 0 && (
            <Text style={styles.noteText}>
              Note: PDF processing may take a few minutes after bot creation
            </Text>
          )}

          <View style={styles.filePreviewContainer}>
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
            {isUploading ? (
              <Text style={styles.modalText}>
                Uploading PDFs... {uploadProgress}%
              </Text>
            ) : (
              <Text style={styles.modalText}>
                Creating chatbot...
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Darker, richer background
  },
  scrollContainer: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 12,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 12,
    borderRadius: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F3F4F6',
    marginLeft: 12,
    letterSpacing: 0.5,
  },
  formContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    color: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textArea: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    color: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    textAlignVertical: 'top',
    height: 120,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderStyle: 'dashed',
  },
  uploadButtonWithFiles: {
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  uploadText: {
    color: '#60A5FA',
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  filePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 12,
  },
  filePreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    padding: 12,
    borderRadius: 10,
    marginRight: 12,
    marginBottom: 12,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  filePreviewText: {
    color: '#F3F4F6',
    marginLeft: 8,
    marginRight: 24,
    maxWidth: 120,
    fontSize: 14,
  },
  removeFileButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  selectContainer: {
    marginBottom: 20,
  },
  selectLabel: {
    color: '#F3F4F6',
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectIcon: {
    marginRight: 12,
  },
  selectText: {
    color: '#F3F4F6',
    flex: 1,
    fontSize: 16,
  },
  createButton: {
    backgroundColor: '#3B82F6',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 18,
    letterSpacing: 0.5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: '#1F2937',
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modelPickerContainer: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modelPickerItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modelPickerText: {
    color: '#F3F4F6',
    fontSize: 16,
  },
  visibilityPickerContainer: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  visibilityPickerItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  visibilityPickerText: {
    color: '#F3F4F6',
    fontSize: 16,
  },
  uploadProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  uploadProgressText: {
    color: '#F3F4F6',
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  modalText: {
    color: '#F3F4F6',
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  noteText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 20,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
});

export default CreateChatbot;
