import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, TYPOGRAPHY, SPACING } from "../../src/constants";

export default function ModalPlaceholder() {
  return (
    <View style={styles.c}>
      <TouchableOpacity style={styles.close} onPress={() => router.back()}>
        <Ionicons name="close" size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.t}>Formulario</Text>
      <Text style={styles.s}>Implementación completa en Bloque 3/4</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: COLORS.modalBg, alignItems: "center", justifyContent: "center", gap: SPACING.sm },
  close: { position: "absolute", top: 50, right: SPACING.base, padding: SPACING.sm },
  t: { fontSize: TYPOGRAPHY.lg, fontWeight: "700", color: COLORS.textPrimary },
  s: { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted },
});
