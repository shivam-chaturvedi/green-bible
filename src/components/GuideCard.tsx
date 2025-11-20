import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {GuideCardContent} from '../types';
import {colors} from '../theme/colors';

type Props = {
  card: GuideCardContent;
};

export function GuideCard({card}: Props) {
  return (
    <View style={styles.guideCard}>
      <Text style={styles.guideIcon}>{card.icon}</Text>
      <View style={styles.guideContent}>
        <Text style={styles.guideTitle}>{card.title}</Text>
        <Text style={styles.guideBody}>{card.body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  guideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  guideIcon: {
    fontSize: 28,
  },
  guideContent: {
    marginLeft: 12,
    flex: 1,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.greenPrimary,
  },
  guideBody: {
    color: colors.textDark,
    marginTop: 4,
  },
});
