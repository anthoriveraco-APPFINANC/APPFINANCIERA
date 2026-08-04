// ============================================================
// SwipeableRow.tsx — Swipe para eliminar
// Cuantos Dolitas
// ============================================================

import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../app/_layout';

interface SwipeableRowProps {
  children: React.ReactNode;
  onEliminar: () => void;
  labelEliminar?: string;
  disabled?: boolean;
}

export function SwipeableRow({ children, onEliminar, labelEliminar = 'Eliminar', disabled = false }: SwipeableRowProps) {
  const swipeRef = useRef<Swipeable>(null);
  const { colors } = useTheme();

  const cerrar = useCallback(() => swipeRef.current?.close(), []);

  const handleEliminar = useCallback(() => {
    cerrar();
    setTimeout(() => onEliminar(), 150);
  }, [cerrar, onEliminar]);

  const renderDerecha = useCallback(
    (progress: Animated.AnimatedInterpolation<number>) => {
      const tx = progress.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });
      const op = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.8, 1] });
      return (
        <Animated.View style={[s.accionCont, { transform: [{ translateX: tx }], opacity: op }]}>
          <TouchableOpacity style={[s.accionBtn, { backgroundColor: colors.expense }]} onPress={handleEliminar} activeOpacity={0.8}>
            <Ionicons name="trash" size={20} color="#fff" />
            <Text style={s.accionLabel}>{labelEliminar}</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [colors, handleEliminar, labelEliminar],
  );

  if (disabled) return <>{children}</>;

  return (
    <Swipeable ref={swipeRef} friction={2} rightThreshold={40} renderRightActions={renderDerecha} overshootRight={false}>
      {children}
    </Swipeable>
  );
}

const s = StyleSheet.create({
  accionCont: { width: 80, justifyContent: 'center', alignItems: 'center' },
  accionBtn: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', gap: 4 },
  accionLabel: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
