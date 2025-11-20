import React from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {bottomNavItems} from '../constants/bottomNavItems';
import {AppTab} from '../types';
import {colors} from '../theme/colors';

type Props = {
  activeTab: AppTab;
  onSelect: (tab: AppTab) => void;
};

export function BottomNavigation({activeTab, onSelect}: Props) {
  const supportedTabs: AppTab[] = ['home', 'health', 'calendar', 'sustain', 'ai', 'about'];

  return (
    <View style={styles.bottomNav}>
      {bottomNavItems.map(item => {
        const isActive = item.id === activeTab;
        const isKnownTab = supportedTabs.includes(item.id as AppTab);
        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.navItem, isActive && styles.navItemActive]}
            onPress={() => {
              if (isKnownTab) {
                onSelect(item.id as AppTab);
              } else {
                Alert.alert(
                  'Navigation',
                  `${item.label} screen is not yet available in React Native.`,
                );
              }
            }}>
            <Text style={[styles.navIcon, isActive && styles.navIconActive]}>
              {item.icon}
            </Text>
            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.navBorder,
    backgroundColor: '#FFFFFF',
  },
  navItem: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  navItemActive: {
    borderRadius: 12,
    backgroundColor: colors.chipActive,
  },
  navIcon: {
    fontSize: 18,
    color: colors.textGray,
  },
  navIconActive: {
    color: colors.greenPrimary,
  },
  navLabel: {
    fontSize: 12,
    color: colors.textGray,
    marginTop: 2,
  },
  navLabelActive: {
    color: colors.greenPrimary,
    fontWeight: 'bold',
  },
});
