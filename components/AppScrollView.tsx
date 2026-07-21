import React, { ReactNode } from "react";
import { ScrollView, StyleSheet } from "react-native";

interface AppScrollViewProps {
  children: ReactNode;
}

export default function AppScrollView({
  children,
}: AppScrollViewProps) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      automaticallyAdjustContentInsets={false}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={styles.content}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingBottom: 120,
  },
});