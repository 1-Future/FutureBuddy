// Copyright 2025 #1 Future — Apache 2.0 License

import { useEffect } from "react";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Text } from "react-native";
import { connectWebSocket, disconnectWebSocket } from "../src/services/websocket";

export default function Layout() {
  useEffect(() => {
    connectWebSocket();
    return () => disconnectWebSocket();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: "#0a0a0a" },
          headerTintColor: "#fff",
          tabBarStyle: { backgroundColor: "#0a0a0a", borderTopColor: "#222" },
          tabBarActiveTintColor: "#4fc3f7",
          tabBarInactiveTintColor: "#666",
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Chat",
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>💬</Text>,
          }}
        />
        <Tabs.Screen
          name="terminal"
          options={{
            title: "Terminal",
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⌨️</Text>,
          }}
        />
        <Tabs.Screen
          name="files"
          options={{
            title: "Files",
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📁</Text>,
          }}
        />
        <Tabs.Screen
          name="actions"
          options={{
            title: "Actions",
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⚡</Text>,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⚙️</Text>,
          }}
        />
      </Tabs>
    </>
  );
}
