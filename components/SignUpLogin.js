import React, {useState, useEffect} from 'react';
import {useNavigation} from '@react-navigation/native';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, useColorScheme, Modal, Button, Linking, Image} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import Profile from '../Assets/profile.jpeg';
import { MaterialCommunityIcons } from "@expo/vector-icons";

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
    <View style={styles.container}>
      <Image source={Profile} style={styles.profileImage} />
      <TouchableOpacity style={styles.googleButton} onPress={handleLogin}>
        <MaterialCommunityIcons name="google" size={30} color="#ff0400" style={styles.googleIcon} />
        <Text style={styles.buttonText}>Sign in with Google</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#2cbf53",
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  googleIcon: {
    marginRight: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fff",
  },
  
});

export default SignUpAndLogin;
