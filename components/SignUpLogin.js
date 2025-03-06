import React, {useState, useEffect} from 'react';
import {useNavigation} from '@react-navigation/native';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, useColorScheme, Modal, Button, Linking, Image, Dimensions} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import Profile from '../Assets/profile.jpeg';
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';

const SignUpAndLogin = () => {
  const { signIn } = useAuth();
  const colorScheme = useColorScheme();
  const navigation = useNavigation();

  useEffect(() => {
    const handleDeepLink = async event => {
      const url = event.url;
      const queryString = url.split('?')[1];
      const params = {};

      if (queryString) {
        queryString.split('&').forEach(param => {
          const [key, value] = param.split('=');
          params[key] = decodeURIComponent(value);
        });
      }
      const token = params.token;
      if (token) {
        // Store token in async storage
        AsyncStorage.setItem('token', token)
        await signIn(token);
        console.log(token);
      }
    };
    const subscription = Linking.addListener('url', handleDeepLink);
    // Add event listener for URLs
    Linking.getInitialURL()
      .then(url => {
        if (url) handleDeepLink({url});
      })
      .catch(err => console.error('Failed to get initial URL:', err));

    // Cleanup listener on unmount
    return () => subscription.remove();
  }, []);

  const handleLogin = () => {
    const backendLoginUrl =
      'https://smartchat.tech/api/passport/auth/google?platform=android';
    Linking.openURL(backendLoginUrl); // Opens the Google login flow
  };

  const isDarkMode = colorScheme === 'dark';

  const theme = {
    backgroundColor: isDarkMode ? '#121212' : '#121212',
    textColor: isDarkMode ? '#fd5901' : '#fd5901',
    cardColor: isDarkMode ? '#1E1E1E' : '#F0F0F0',
    accentColor: isDarkMode ? '#BB86FC' : '#6200EE',
    timeColor: isDarkMode ? '#fd5901' : '#6200EE',
    dateColor: isDarkMode ? '#1DCED1' : '#12D8DB',
  };

  return (
    <LinearGradient
      colors={['#4c669f', '#3b5998', '#192f6a']}
      style={styles.container}
    >
      <View style={styles.contentContainer}>
        <View style={styles.logoContainer}>
          <Image source={Profile} style={styles.profileImage} />
          <Text style={styles.welcomeText}>welcome to Smartchat</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.googleButton} 
          onPress={handleLogin}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons 
            name="google" 
            size={24} 
            color="#ff0400" 
            style={styles.googleIcon} 
          />
          <Text style={styles.buttonText}>Continue with Google</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#ffffff50',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "700",
    color: '#fff',
    marginBottom: 10,
  },
  subText: {
    fontSize: 16,
    color: '#ffffff90',
    marginBottom: 30,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 15,
    paddingVertical: 16,
    paddingHorizontal: 30,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
    width: Dimensions.get('window').width * 0.85,
    justifyContent: 'center',
  },
  googleIcon: {
    marginRight: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
});

export default SignUpAndLogin;
