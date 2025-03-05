import React, {createContext, useState, useEffect, useContext} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {View, ActivityIndicator} from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import SignUpAndLogin from './components/SignUpLogin';
import Home from './components/Home';
import Profile from './components/Profile';
import Conversation from './components/Conversation';
import CreateChatbot from './components/CreateChatbot';
import { AuthProvider, useAuth } from './components/AuthContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="SignUpAndLogin"
      component={SignUpAndLogin}
      options={{headerShown: false}}
    />
  </Stack.Navigator>
);

const HomeStack = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="Home" component={Home} />
    <Stack.Screen name="Conversation" component={Conversation} />
    <Stack.Screen name="Profile" component={Profile} />
  </Stack.Navigator>
);

const AppNavigator = () => {
  const { isAuthenticated } = useAuth();

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#FFFFFF',
            tabBarInactiveTintColor: '#858585',
            tabBarStyle: { backgroundColor: '#121212' },
          }}
        >
          <Tab.Screen
            name="HomeStack"
            component={HomeStack}
            options={{
              title: 'Home',
              tabBarIcon: ({ color, size, focused }) => (
                <MaterialCommunityIcons name={focused ? 'home-variant' : 'home-variant-outline'} color={color} size={size} />
              ),
            }}
          />
          <Tab.Screen
            name="CreateChatbot"
            component={CreateChatbot}
            options={{
              title: 'Create',
              tabBarIcon: ({ color, size, focused }) => (
                <MaterialCommunityIcons name={focused ? 'plus-circle' : 'plus-circle-outline'} color={color} size={size} />
              ),
            }}
          />
          <Tab.Screen
            name="Profile"
            component={Profile}
            options={{
              title: 'Profile',
              tabBarIcon: ({ color, size, focused }) => (
                <MaterialIcons name={focused ? 'person' : 'person-outline'} color={color} size={size} />
              ),
            }}
          />
        </Tab.Navigator>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
};

export default App;
