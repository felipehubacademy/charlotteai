// app/(app)/(tabs)/_layout.tsx
// New bottom tab navigator — beta users only (beta_features includes 'new_layout').
// Stack screens (grammar, chat, pronunciation, learn-session, etc.) are defined
// in (app)/_layout.tsx and push on top of these tabs without the tab bar.

import { Tabs } from 'expo-router';
import { Platform, View, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { House, Lightning, Notepad, Rocket, UserCircle, Phone } from 'phosphor-react-native';
import { useAuth } from '@/hooks/useAuth';
import { UserLevel } from '@/lib/levelConfig';
import { LEVEL_ACCENT } from '@/lib/levelColors';

// LEVEL_ACCENT vem de @/lib/levelColors

export default function TabLayout() {
  const { profile } = useAuth();
  const level  = (profile?.charlotte_level ?? 'Inter') as UserLevel;
  const accent = LEVEL_ACCENT[level];
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: '#8A8494',
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
          tabBarIcon: ({ color, size }) => (
            <House size={size ?? 24} color={color} weight="fill" />
          ),
        }}
      />
      <Tabs.Screen
        name="livevoice"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Phone size={size ?? 24} color={color} weight="fill" />
          ),
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Lightning size={size ?? 24} color={color} weight="fill" />
          ),
        }}
      />
      <Tabs.Screen
        name="vocabulary"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Notepad size={size ?? 24} color={color} weight="fill" />
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Rocket size={size ?? 24} color={color} weight="fill" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused, size }) => {
            const sz = size ?? 24;
            return profile?.avatar_url ? (
              <View style={{
                width: sz, height: sz, borderRadius: sz / 2,
                borderWidth: focused ? 2 : 1.5,
                borderColor: focused ? accent : '#8A8494',
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
            );
          },
        }}
      />
    </Tabs>
  );
}
