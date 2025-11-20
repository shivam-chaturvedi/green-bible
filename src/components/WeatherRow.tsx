import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors} from '../theme/colors';

export function WeatherRow({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.weatherRow}>
      <Text style={styles.weatherRowLabel}>{label}:</Text>
      <Text style={styles.weatherRowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  weatherRowLabel: {
    flex: 1,
    color: colors.textDark,
  },
  weatherRowValue: {
    fontWeight: 'bold',
    color: colors.greenPrimary,
  },
});
