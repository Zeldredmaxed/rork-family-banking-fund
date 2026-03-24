import { Stack } from "expo-router";
import React from "react";

export default function DashboardLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0a0a0f' },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
