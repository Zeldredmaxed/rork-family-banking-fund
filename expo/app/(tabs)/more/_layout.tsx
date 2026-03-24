import { Stack } from "expo-router";
import React from "react";

export default function MoreLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0a0a0f' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="fund-rules" />
      <Stack.Screen name="documents" />
      <Stack.Screen name="help" />
    </Stack>
  );
}
