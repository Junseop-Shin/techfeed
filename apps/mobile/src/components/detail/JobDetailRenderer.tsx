import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/theme.store';

interface JobDetail {
  description?: string;
  requirements?: string[];
  preferred?: string[];
  benefits?: string[];
}

interface Props {
  location?: string;
  jobDetail?: JobDetail;
  contentBody?: string;
}

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={[styles.section, { backgroundColor: colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
      {children}
    </View>
  );
}

export function JobDetailRenderer({ location, jobDetail, contentBody }: Props) {
  const colors = useThemeStore((s) => s.colors);

  const hasStructuredDetail =
    jobDetail?.description ||
    (jobDetail?.requirements && jobDetail.requirements.length > 0);

  return (
    <View style={styles.content}>
      {location && (
        <View style={[styles.locationRow, { backgroundColor: colors.surface }]}>
          <Text style={[styles.locationText, { color: colors.textSecondary }]}>📍 {location}</Text>
        </View>
      )}

      {hasStructuredDetail ? (
        <>
          {jobDetail?.description && (
            <Section title="주요 업무" colors={colors}>
              <Text style={[styles.bodyText, { color: colors.textPrimary }]}>
                {jobDetail.description}
              </Text>
            </Section>
          )}
          {jobDetail?.requirements && jobDetail.requirements.length > 0 && (
            <Section title="자격 요건" colors={colors}>
              {jobDetail.requirements.map((item, i) => (
                <Text key={i} style={[styles.bulletItem, { color: colors.textPrimary }]}>
                  • {item}
                </Text>
              ))}
            </Section>
          )}
          {jobDetail?.preferred && jobDetail.preferred.length > 0 && (
            <Section title="우대 사항" colors={colors}>
              {jobDetail.preferred.map((item, i) => (
                <Text key={i} style={[styles.bulletItem, { color: colors.textSecondary }]}>
                  • {item}
                </Text>
              ))}
            </Section>
          )}
          {jobDetail?.benefits && jobDetail.benefits.length > 0 && (
            <Section title="복리후생" colors={colors}>
              {jobDetail.benefits.map((item, i) => (
                <Text key={i} style={[styles.bulletItem, { color: colors.textSecondary }]}>
                  • {item}
                </Text>
              ))}
            </Section>
          )}
        </>
      ) : contentBody ? (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.bodyText, { color: colors.textPrimary }]}>{contentBody}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  locationRow: { borderRadius: 8, padding: 12 },
  locationText: { fontSize: 14 },
  section: { borderRadius: 8, padding: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  bodyText: { fontSize: 14, lineHeight: 22 },
  bulletItem: { fontSize: 14, lineHeight: 22, marginBottom: 4 },
});
