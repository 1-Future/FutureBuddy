import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useConnectionStore } from '../../src/stores/connection.store';
import { colors } from '../../src/theme/tokens';

export default function TabLayout() {
  const pendingBadgeCount = useConnectionStore((s) => s.pendingBadgeCount);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <Feather name="message-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="terminal"
        options={{
          title: 'Terminal',
          tabBarIcon: ({ color, size }) => (
            <Feather name="terminal" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="files"
        options={{
          title: 'Files',
          tabBarIcon: ({ color, size }) => (
            <Feather name="folder" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="actions"
        options={{
          title: 'Actions',
          tabBarIcon: ({ color, size }) => (
            <Feather name="zap" size={size} color={color} />
          ),
          tabBarBadge: pendingBadgeCount > 0 ? pendingBadgeCount : undefined,
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: 'Tools',
          tabBarIcon: ({ color, size }) => (
            <Feather name="package" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="models"
        options={{
          title: 'Models',
          tabBarIcon: ({ color, size }) => (
            <Feather name="cpu" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Feather name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
