import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import RenderHtml, { MixedStyleDeclaration } from 'react-native-render-html';
import { useThemeStore } from '../../store/theme.store';

interface Props {
  html: string;
  onLinkPress?: (url: string) => void;
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/ on\w+="[^"]*"/gi, '')
    .replace(/ on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, 'blocked:');
}

export function BlogDetailRenderer({ html, onLinkPress }: Props) {
  const { width } = useWindowDimensions();
  const colors = useThemeStore((s) => s.colors);

  const tagsStyles: Record<string, MixedStyleDeclaration> = {
    body: { color: colors.textPrimary, fontSize: 15, lineHeight: 24 } as MixedStyleDeclaration,
    p: { marginBottom: 12 } as MixedStyleDeclaration,
    h1: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: 12, marginTop: 20 } as MixedStyleDeclaration,
    h2: { fontSize: 19, fontWeight: '700', color: colors.textPrimary, marginBottom: 10, marginTop: 18 } as MixedStyleDeclaration,
    h3: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 8, marginTop: 14 } as MixedStyleDeclaration,
    code: { fontFamily: 'monospace', backgroundColor: colors.surface, color: colors.primary, fontSize: 13 } as MixedStyleDeclaration,
    pre: { backgroundColor: colors.surface, borderRadius: 8, padding: 12, marginBottom: 12 } as MixedStyleDeclaration,
    blockquote: { borderLeftColor: colors.primary, paddingLeft: 12, color: colors.textSecondary } as MixedStyleDeclaration,
    a: { color: colors.primary } as MixedStyleDeclaration,
    img: { borderRadius: 8 } as MixedStyleDeclaration,
    ul: { marginBottom: 12 } as MixedStyleDeclaration,
    ol: { marginBottom: 12 } as MixedStyleDeclaration,
    li: { marginBottom: 4 } as MixedStyleDeclaration,
  };

  const sanitized = sanitizeHtml(html);

  return (
    <View>
      <RenderHtml
        contentWidth={width - 40}
        source={{ html: sanitized }}
        tagsStyles={tagsStyles}
        ignoredDomTags={['script', 'iframe', 'form', 'input', 'button', 'style', 'svg', 'math']}
        renderersProps={{
          img: { enableExperimentalPercentWidth: true },
          a: {
            onPress: (_evt: any, href: string) => onLinkPress?.(href),
          },
        }}
        defaultTextProps={{ selectable: true }}
      />
    </View>
  );
}
