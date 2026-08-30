import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CHANGELOG, getChangelogSections } from '../changelog';
import { colors } from '../theme/colors';
import { GAP } from '../theme/layout';
import { APP_VERSION, formatLastCommit, LAST_COMMIT_AT } from '../version';

interface ChangelogScreenProps {
  onClose: () => void;
}

export function ChangelogScreen({ onClose }: ChangelogScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>История изменений</Text>
        <Text style={styles.meta}>
          v{APP_VERSION} · {formatLastCommit(LAST_COMMIT_AT)}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {CHANGELOG.map((entry) => (
          <View key={entry.version} style={styles.entry}>
            <Text style={styles.version}>
              {entry.version}
              <Text style={styles.date}> · {entry.date}</Text>
            </Text>
            {getChangelogSections(entry).map((section) => (
              <View key={section.label || 'items'} style={styles.section}>
                {section.label ? (
                  <Text style={styles.sectionTitle}>{section.label}</Text>
                ) : null}
                {section.items.map((item) => (
                  <Text key={item} style={styles.item}>
                    · {item}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      <Pressable style={styles.closeBtn} onPress={onClose}>
        <Text style={styles.closeText}>← Назад</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: GAP,
    paddingTop: GAP,
    paddingBottom: GAP * 0.5,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.exercise.primary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: GAP,
    gap: GAP,
  },
  entry: {
    gap: 6,
  },
  section: {
    gap: 4,
  },
  sectionTitle: {
    color: colors.intro.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  version: {
    color: colors.food.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  date: {
    color: colors.textMuted,
    fontWeight: '500',
  },
  item: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 20,
    paddingLeft: 4,
  },
  closeBtn: {
    padding: GAP,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  closeText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
