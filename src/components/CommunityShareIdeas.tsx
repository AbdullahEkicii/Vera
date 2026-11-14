import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { HOME_TAB, homeTabParams } from '../utils/homeTabRoute';
import { CommunitySheet } from './CommunitySheet';
import { GlassSheen, useGlass } from './CommunityGlass';
import { CommunityHatimRing } from './CommunityHatimRing';
import { DuaRequestsCard } from './DuaRequestsCard';
import { StoryCardShareModal } from './StoryCardShareModal';

type IconName = React.ComponentProps<typeof Feather>['name'];

interface Idea {
  key: string;
  icon: IconName;
  title: string;
  hint: string;
  go: () => void;
}

/**
 * "Neleri paylaşabilirim?": what the user can share from this screen. It is one compact row; the list opens
 * in a sheet so it does not push the feed down. Each item takes the user to the place where the thing is
 * done, and once it is completed the existing share sheet opens there.
 */
export function CommunityShareIdeas() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;
  const [open, setOpen] = useState(false);
  // The cüz the user just finished in the ring; opens its share card once this sheet has closed.
  const [shareJuz, setShareJuz] = useState<number | null>(null);
  const glass = useGlass();

  const ideas: Idea[] = [
    {
      key: 'prayer',
      icon: 'check-circle',
      title: t('community.ideas.prayer.title', '5 vakit namaz'),
      hint: t('community.ideas.prayer.hint', 'Bugünkü namazlarını işaretle. Beşini tamamlayınca paylaşabilirsin.'),
      go: () => router.replace({ pathname: '/(tabs)', params: homeTabParams(HOME_TAB.home) }),
    },
    {
      key: 'hatim',
      icon: 'book-open',
      title: t('community.ideas.hatim.title', 'Hatim'),
      hint: t('community.ideas.hatim.hint', 'Bir hatmi tamamladığında paylaşabilirsin.'),
      go: () => router.replace({ pathname: '/(tabs)', params: homeTabParams(HOME_TAB.quran) }),
    },
    {
      key: 'zikir',
      icon: 'repeat',
      title: t('community.ideas.zikir.title', 'Zikir'),
      hint: t('community.ideas.zikir.hint', 'Zikir hedefine ulaştığında paylaşabilirsin.'),
      go: () => router.replace({ pathname: '/(tabs)', params: homeTabParams(HOME_TAB.tasbih) }),
    },
    {
      key: 'basarim',
      icon: 'award',
      title: t('community.ideas.achievement.title', 'Başarım'),
      hint: t('community.ideas.achievement.hint', 'Yeni bir başarı açtığında paylaşabilirsin.'),
      go: () => router.push('/achievements'),
    },
  ];

  const heading = t('community.ideas.heading', 'Neleri paylaşabilirim?');

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={heading}
        style={({ pressed }) => [glass.style, styles.compact, { opacity: pressed ? 0.85 : 1 }]}
      >
        <GlassSheen />
        <View style={[styles.iconWrap, { backgroundColor: c.primaryLight }]}>
          <Feather name="share-2" size={16} color={c.primaryText} />
        </View>
        <View style={styles.compactText}>
          <Text style={[styles.compactTitle, { color: c.text }]}>{heading}</Text>
          <Text style={[styles.compactSub, { color: c.textSecondary }]} numberOfLines={1}>
            {t('community.ideas.compactSub', 'Ortak hatim, dua istekleri, namaz, zikir, başarım')}
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={c.textSecondary} />
      </Pressable>

      <CommunitySheet
        visible={open}
        onClose={() => setOpen(false)}
        title={heading}
        subtitle={t('community.ideas.hubSub', 'Ortak hatim, dua istekleri ve paylaşım fikirleri.')}
      >
        {/* The ring and the requests only load (and listen) while this sheet is open. */}
        <CommunityHatimRing
          onFinished={(juz) => {
            // The share card is its own modal: close this sheet first so two modals never stack.
            setOpen(false);
            setShareJuz(juz);
          }}
        />
        <DuaRequestsCard />

        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>
            {t('community.ideas.sectionTitle', 'Paylaşım fikirleri')}
          </Text>
          <Text style={[styles.sectionSub, { color: c.textSecondary }]}>
            {t('community.ideas.sub', 'Bir şeye dokun, oraya git, tamamla. Tamamlayınca paylaşım ekranı açılır.')}
          </Text>
        </View>

        {ideas.map((idea) => (
          <Pressable
            key={idea.key}
            onPress={() => {
              setOpen(false);
              idea.go();
            }}
            accessibilityRole="button"
            accessibilityLabel={`${idea.title}. ${idea.hint}`}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: c.primaryLight }]}>
              <Feather name={idea.icon} size={18} color={c.primaryText} />
            </View>

            <View style={styles.body}>
              <Text style={[styles.title, { color: c.text }]}>{idea.title}</Text>
              <Text style={[styles.hint, { color: c.textSecondary }]}>{idea.hint}</Text>
              <View style={styles.steps}>
                <Text style={[styles.step, { color: c.primaryText }]}>
                  {t('community.ideas.step1', 'Git ve tamamla')}
                </Text>
                <Feather name="arrow-right" size={13} color={c.textSecondary} />
                <Text style={[styles.step, { color: c.primaryText }]}>
                  {t('community.ideas.step2', 'Paylaş')}
                </Text>
              </View>
            </View>

            <Feather name="chevron-right" size={18} color={c.textSecondary} />
          </Pressable>
        ))}
      </CommunitySheet>

      {shareJuz !== null ? (
        <StoryCardShareModal
          visible
          onClose={() => setShareJuz(null)}
          title={t('community.ring.title', 'Ortak Hatim Halkası')}
          text={t('community.ring.shareText', '{{n}}. cüzü ortak hatimde tamamladım, elhamdülillah!', { n: shareJuz })}
          source="Vera"
          type="achievement"
          linkSource="community"
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  sectionHead: { gap: 2, marginTop: 6 },
  sectionTitle: { fontSize: 16, fontFamily: 'Outfit_700Bold' },
  sectionSub: { fontSize: 13, lineHeight: 18, fontFamily: 'Outfit_400Regular' },
  compactText: { flex: 1, gap: 1 },
  compactTitle: { fontSize: 15.5, fontFamily: 'Outfit_600SemiBold' },
  compactSub: { fontSize: 12.5, fontFamily: 'Outfit_400Regular' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 14,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 3 },
  title: { fontSize: 15.5, fontFamily: 'Outfit_600SemiBold' },
  hint: { fontSize: 13, lineHeight: 18, fontFamily: 'Outfit_400Regular' },
  steps: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  step: { fontSize: 12.5, fontFamily: 'Outfit_600SemiBold' },
});
