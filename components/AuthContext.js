import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create Auth Context
const AuthContext = createContext();

// Custom hook to use AuthContext
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('token');
    setIsAuthenticated(!!token);
    setLoading(false);
  };

  const signIn = async (token) => {
    await AsyncStorage.setItem('token', token);
    setIsAuthenticated(true);
  };

  const signOut = async () => {
    await AsyncStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, signIn, signOut }}>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#ff8200" />
        </View>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
