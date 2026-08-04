// ============================================================
// TABS/_LAYOUT.TSX — Cuantos Dolitas
// ============================================================
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../_layout';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../src/constants';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; icon: IoniconName; iconFocused: IoniconName }[] = [
  { name: 'index',        title: 'Inicio',   icon: 'grid-outline',       iconFocused: 'grid' },
  { name: 'deudas',       title: 'Deudas',   icon: 'people-outline',     iconFocused: 'people' },
  { name: 'flujo',        title: 'Flujo',    icon: 'swap-vertical-outline', iconFocused: 'swap-vertical' },
  { name: 'inversiones',  title: 'Activos',  icon: 'trending-up-outline', iconFocused: 'trending-up' },
  { name: 'herramientas', title: 'Tools',    icon: 'construct-outline',   iconFocused: 'construct' },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: SPACING.sm,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: TYPOGRAPHY.xs,
          fontWeight: '600',
          letterSpacing: 0.3,
          marginBottom: 2,
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? tab.iconFocused : tab.icon} size={size ?? 22} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
