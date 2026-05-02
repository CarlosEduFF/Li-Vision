import {
  LEVEL_META,
} from "@/services/learningService";
import { MaterialIcons } from "@expo/vector-icons";
import React, {  } from "react";
import { TouchableOpacity, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


export default function TranscriptionTabScreen() {
  

  return (
   
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          
        </View>
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  header: {
    marginBottom: 16,
    marginTop: 8,
  },
 
});
