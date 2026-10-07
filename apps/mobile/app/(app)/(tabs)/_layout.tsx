// app/(app)/(tabs)/_layout.tsx
// New bottom tab navigator — beta users only (beta_features includes 'new_layout').
// Stack screens (grammar, chat, pronunciation, learn-session, etc.) are defined
// in (app)/_layout.tsx and push on top of these tabs without the tab bar.

import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, View, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { House, Lightning, Notepad, Rocket, UserCircle, Phone } from 'phosphor-react-native';
import { useAuth } from '@/hooks/useAuth';

// Aba ativa = cor de destaque da marca, igual em todos os níveis: pílula Volt
// atrás do ícone, ícone em Tinta (Volt puro sobre branco não tem contraste).
const INK      = '#16131F';
const VOLT     = '#DCFF4A';
const INACTIVE = '#8A8494';

function TabIcon({ focused, children }: { focused: boolean; children: React.ReactNode }) {
  return (
    <View style={{
      width: 52, height: 32, borderRadius: 16,
      backgroundColor: focused ? VOLT : 'transparent',
      alignItems: 'center', justifyContent: 'center',
    }}>
      {children}
    </View>
  );
}

export default function TabLayout() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: INK,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: 'rgba(22,19,31,0.08)',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 80 : 44 + insets.bottom,
          paddingTop: Platform.OS === 'ios' ? 8 : 2,
          paddingBottom: Platform.OS === 'android' ? insets.bottom : 0,
          paddingHorizontal: 4,
        },
        tabBarItemStyle: {
          paddingHorizontal: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}><House size={22} color={color} weight="fill" /></TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="livevoice"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}><Phone size={22} color={color} weight="fill" /></TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}><Lightning size={22} color={color} weight="fill" /></TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="vocabulary"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}><Notepad size={22} color={color} weight="fill" /></TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}><Rocket size={22} color={color} weight="fill" /></TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => {
            const sz = 24;
            return (
              <TabIcon focused={focused}>
                {profile?.avatar_url ? (
                  <View style={{
                    width: sz, height: sz, borderRadius: sz / 2,
                    borderWidth: focused ? 2 : 1.5,
                    borderColor: focused ? INK : INACTIVE,
                    overflow: 'hidden',
                  }}>
                    <Image
                      source={{ uri: profile.avatar_url }}
                      style={{ width: sz, height: sz }}
                      resizeMode="cover"
                    />
                  </View>
                ) : (
                  <UserCircle size={sz} color={color} weight="fill" />
                )}
              </TabIcon>
            );
          },
        }}
      />
    </Tabs>
  );
}
