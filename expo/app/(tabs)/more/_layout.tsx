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
      <Stack.Screen name="board-dashboard" />
      <Stack.Screen name="board-proposals" />
      <Stack.Screen name="board-history" />
      <Stack.Screen name="board-members" />
      <Stack.Screen name="board-member-detail" />
      <Stack.Screen name="board-meetings" />
      <Stack.Screen name="admin-dashboard" />
      <Stack.Screen name="admin-members" />
      <Stack.Screen name="admin-announcements" />
      <Stack.Screen name="admin-meetings" />
      <Stack.Screen name="admin-loans" />
    </Stack>
  );
}
