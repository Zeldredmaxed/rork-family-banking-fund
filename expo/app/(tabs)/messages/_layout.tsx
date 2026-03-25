import { Stack } from "expo-router";
import React from "react";

export default function MessagesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0a0a0f' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="conversation" />
      <Stack.Screen name="contacts" />
    </Stack>
  );
}
