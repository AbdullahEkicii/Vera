import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  Easing,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { BannerAdSlot } from './BannerAdSlot';
import { CommunitySettingsModal } from './CommunitySettingsModal';
import {
  CommunityPost,
  CommunitySettings,
  DEFAULT_COMMUNITY_SETTINGS,
  ensureSignedIn,
  listMyPosts,
  listPosts,
  loadCommunitySettings,
  loadMyReactions,
  onCommunityPosted,
  reportPost,
  saveCommunitySettings,
  toggleReaction,
} from '../services/communityService';
import {
  logCommunityFeedPage,
  logCommunityOpened,
  logCommunityPostReported,
  logCommunityReaction,
  logCommunityTabChanged,
  logCommunityUserBlocked,
} from '../services/analyticsService';
import {
  COMMUNITY_EMOJIS,
  COMMUNITY_TEMPLATES,
  CommunityEmoji,
  CommunityTemplateKey,
  filterBlockedAuthors,
} from '../utils/community';
import { countryDisplayName, countryFlag, templateText } from '../utils/communityText';
import { recentDayKeys } from '../utils/dayKey';
import i18n from '../localization/i18n';
import { DAY_MS, markTourShown, shouldShowTour } from '../services/tourService';
import { CommunityHowTo } from './CommunityHowTo';
import { CommunityPostSheet } from './CommunityPostSheet';

type FeedView = 'today' | 'week' | 'mine';
type Colors = ReturnType<typeof useTheme>['theme']['colors'];
type IconName = React.ComponentProps<typeof Feather>['name'];
type FeedItem = { kind: 'post'; post: CommunityPost } | { kind: 'ad'; key: string };

const FEED_VIEWS: FeedView[] = ['today', 'week', 'mine'];
const PAGE_SIZE = 20;
// An ad sits after every fourth post; a short list still gets one ad after its last post.
const AD_EVERY = 4;
// Memory caps: a long session stops paging at MAX_LOADED posts, and only MAX_FEED_ADS native ad views exist.
const MAX_LOADED = 200;
// Each ad slot runs its own request and retries, so fewer slots mean fewer failed requests per user.
const MAX_FEED_ADS = 4;
const SEGMENT_INSET = 3;
// The how-to sheet comes back once a week, at most three times (see tourService).
const HOWTO_TOUR_KEY = 'COMMUNITY_HOWTO_TOUR_V2';
const HOWTO_EVERY_MS = 7 * DAY_MS;
// The open feed polls for new posts this often; a post the user just made refreshes it at once.
const POLL_MS = 30000;

// "Today" is the device's current local day; "Last 7 days" adds the six days before it.
// "Mine" does not use day keys (it lists the user's own posts).
const dayKeysFor = (view: FeedView): string[] => recentDayKeys(view === 'today' ? 1 : 7);

// Soft tint of an accent token: the theme tokens are all 6-digit hex, so an alpha byte is appended.
const tint = (hex: string) => `${hex}1F`;

const SOFT_EASE = { damping: 14, stiffness: 260 };

// Index of today's Vera message: the day of the year, cycling through the seven fixed messages.
const VERA_MESSAGE_COUNT = 7;
const dailyVeraIndex = (now: Date = new Date()): number => {
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / DAY_MS);
  return dayOfYear % VERA_MESSAGE_COUNT;
};

export function CommunityScreen({
  isActive,
  bottomInset,
  source = 'tab',
}: {
  isActive: boolean;
  bottomInset: number;
  source?: 'tab' | 'banner' | 'notification' | 'share_success';
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const reduceMotion = useReducedMotion();
  const c = theme.colors;
  const lang = (i18n.language || 'en').split('-')[0];
  const blurTint = isDark ? 'dark' : 'light';

  const [view, setView] = useState<FeedView>('today');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [failed, setFailed] = useState(false);
  const [settings, setSettings] = useState<CommunitySettings>(DEFAULT_COMMUNITY_SETTINGS);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [howToVisible, setHowToVisible] = useState(false);
  // The post whose "..." sheet is open; null when closed.
  const [sheetPost, setSheetPost] = useState<CommunityPost | null>(null);
  // The selected-segment capsule slides to its tab instead of jumping.
  const [segWidth, setSegWidth] = useState(0);
  const indicatorX = useSharedValue(0);
  const segItemWidth = segWidth > 0 ? (segWidth - SEGMENT_INSET * 2) / FEED_VIEWS.length : 0;
  const selectedIndex = FEED_VIEWS.indexOf(view);
  useEffect(() => {
    if (!segItemWidth) return;
    const target = selectedIndex * segItemWidth;
    // A short ease-out: no overshoot, so the capsule lands cleanly instead of bouncing.
    indicatorX.value = reduceMotion ? target : withTiming(target, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [selectedIndex, segItemWidth, reduceMotion, indicatorX]);
  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: indicatorX.value }] }));
  // Guards against a slow response from a previous view overwriting the current one.
  const requestId = useRef(0);
  // Each view keeps its last list, so switching back shows it at once while a refresh runs.
  const feedCache = useRef<Partial<Record<FeedView, CommunityPost[]>>>({});
  const viewRef = useRef(view);
  viewRef.current = view;
  useEffect(() => {
    if (posts.length) feedCache.current[viewRef.current] = posts;
  }, [posts]);

  // Each async start-up read checks `alive`, so a late answer after unmount sets no state.
  useEffect(() => {
    let alive = true;
    loadCommunitySettings().then((s) => alive && setSettings(s));
    return () => {
      alive = false;
    };
  }, []);

  const [myUid, setMyUid] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    ensureSignedIn()
      .then((uid) => alive && setMyUid(uid))
      .catch(() => { });
    return () => {
      alive = false;
    };
  }, []);

  // Explain how to share on the first visit, then again once a week (three times at most).
  useEffect(() => {
    if (!isActive) return;
    let alive = true;
    const now = Date.now();
    shouldShowTour(HOWTO_TOUR_KEY, now, { every: HOWTO_EVERY_MS, max: 3 })
      .then((due) => {
        if (!alive || !due) return;
        setHowToVisible(true);
        return markTourShown(HOWTO_TOUR_KEY, now);
      })
      .catch(() => { });
    return () => {
      alive = false;
    };
  }, [isActive]);

  const closeHowTo = () => setHowToVisible(false);

  const load = useCallback(
    async (reset: boolean, currentPosts: CommunityPost[], currentView: FeedView) => {
      const id = ++requestId.current;
      setLoading(true);
      setFailed(false);
      try {
        if (currentView === 'mine') {
          // The user's own posts come in one list (capped by listMyPosts); there is no next page.
          const uid = await ensureSignedIn();
          const page = await listMyPosts(uid);
          if (id !== requestId.current) return;
          setPosts(page);
          setHasMore(false);
          return;
        }
        const cursor = reset ? null : currentPosts[currentPosts.length - 1] ?? null;
        const page = await listPosts(dayKeysFor(currentView), cursor);
        if (id !== requestId.current) return;
        setPosts((prev) => (reset ? page : [...prev, ...page]));
        setHasMore(page.length === PAGE_SIZE);
        logCommunityFeedPage(currentView, reset ? 1 : currentPosts.length / PAGE_SIZE + 1, page.length);
        if (page.length) {
          const uid = await ensureSignedIn();
          const mine = await loadMyReactions(uid);
          // A fresh list resets the set, so reactions from an earlier view do not pile up.
          if (id === requestId.current) setMyReactions((prev) => (reset ? new Set(mine) : new Set([...prev, ...mine])));
        }
      } catch {
        if (id === requestId.current) setFailed(true);
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    []
  );

  // Fetches the newest page and puts only the unseen posts on top. The scroll position and the
  // posts already loaded stay as they are, so a poll never makes the list jump.
  const refreshTop = useCallback(async (currentView: FeedView) => {
    if (currentView === 'mine') return;
    try {
      const page = await listPosts(dayKeysFor(currentView), null);
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const fresh = page.filter((p) => !seen.has(p.id));
        return fresh.length ? [...fresh, ...prev].slice(0, MAX_LOADED) : prev;
      });
    } catch {
      // A failed poll is silent; the next one retries.
    }
  }, []);

  // One open per activation. Changing the view inside the screen is not a new open.
  useEffect(() => {
    if (isActive) logCommunityOpened(source);
  }, [isActive, source]);

  // Reload when the screen becomes active or the view changes.
  useEffect(() => {
    if (!isActive) return;
    setPosts(feedCache.current[view] ?? []);
    setHasMore(true);
    load(true, [], view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, isActive]);

  // While the tab is open and the app is in the foreground: poll every 30 s, and refresh at once
  // when this user posts.
  useEffect(() => {
    if (!isActive) return;
    const poll = () => {
      if (AppState.currentState === 'active') refreshTop(view);
    };
    const timer = setInterval(poll, POLL_MS);
    const unsubscribe = onCommunityPosted(() => {
      if (view === 'mine') load(true, [], 'mine');
      else refreshTop(view);
    });
    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, [isActive, view, refreshTop, load]);

  const visiblePosts = useMemo(
    () => filterBlockedAuthors(posts, settings.blockedUids),
    [posts, settings.blockedUids]
  );

  // Real counts from the loaded posts only; the hero is hidden when there are none.
  const summary = useMemo(() => {
    const byType: Record<CommunityTemplateKey, number> = {
      'hatim.completed': 0,
      achievement: 0,
      'dhikr.milestone': 0,
      'prayer.fullday': 0,
    };
    for (const p of visiblePosts) {
      byType[p.templateKey] = (byType[p.templateKey] ?? 0) + 1;
    }
    return { total: visiblePosts.length, byType };
  }, [visiblePosts]);

  // The post list with an ad slot after every fourth post, once there are more than five posts.
  // Ad keys follow the post they come after, so a poll does not remount them.
  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];
    let ads = 0;
    visiblePosts.forEach((post, i) => {
      items.push({ kind: 'post', post });
      const isAdSpot = (i + 1) % AD_EVERY === 0 && i < visiblePosts.length - 1;
      if (isAdSpot && ads < MAX_FEED_ADS) {
        items.push({ kind: 'ad', key: `ad-${post.id}` });
        ads++;
      }
    });
    if (ads === 0 && visiblePosts.length > 0) items.push({ kind: 'ad', key: 'ad-end' });
    return items;
  }, [visiblePosts]);

  const changeView = (next: FeedView) => {
    if (next === view) return;
    logCommunityTabChanged(next);
    setView(next);
  };

  const onReact = async (post: CommunityPost, emoji: CommunityEmoji) => {
    const key = `${post.id}:${emoji}`;
    const wasOn = myReactions.has(key);

    // Optimistic update: the user sees the change at once, and it is rolled back if the write fails.
    setMyReactions((prev) => {
      const next = new Set(prev);
      if (wasOn) next.delete(key);
      else next.add(key);
      return next;
    });
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== post.id) return p;
        const current = p.reactionCounts[emoji] ?? 0;
        return { ...p, reactionCounts: { ...p.reactionCounts, [emoji]: Math.max(0, current + (wasOn ? -1 : 1)) } };
      })
    );

    try {
      await toggleReaction(post.id, emoji);
      logCommunityReaction(emoji, wasOn ? 'remove' : 'add');
    } catch {
      setMyReactions((prev) => {
        const next = new Set(prev);
        if (wasOn) next.add(key);
        else next.delete(key);
        return next;
      });
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== post.id) return p;
          const current = p.reactionCounts[emoji] ?? 0;
          return { ...p, reactionCounts: { ...p.reactionCounts, [emoji]: Math.max(0, current + (wasOn ? 1 : -1)) } };
        })
      );
    }
  };

  const onReport = async (post: CommunityPost) => {
    try {
      await reportPost(post.id, 'user_report');
      logCommunityPostReported(post.templateKey);
      Alert.alert(t('community.report.thanksTitle', 'Teşekkürler'), t('community.report.thanksBody', 'Bildirimin incelenecek.'));
    } catch {
      Alert.alert(t('common.error', 'Hata'), t('community.report.failed', 'Bildirim gönderilemedi.'));
    }
  };

  const onBlock = async (post: CommunityPost) => {
    const next = {
      ...settings,
      blockedUids: settings.blockedUids.includes(post.authorUid)
        ? settings.blockedUids
        : [...settings.blockedUids, post.authorUid],
    };
    setSettings(next);
    await saveCommunitySettings(next);
    logCommunityUserBlocked();
  };

  const onMore = (post: CommunityPost) => setSheetPost(post);

  // Per-template accent and icon. Accents come only from existing theme tokens.
  const metaFor = (key: CommunityTemplateKey): { accent: string; icon: IconName; label: string } => {
    switch (key) {
      case 'hatim.completed':
        return { accent: c.primary, icon: 'book-open', label: t('community.summary.hatim', 'Hatim') };
      case 'achievement':
        return { accent: c.success, icon: 'award', label: t('community.summary.achievement', 'Başarım') };
      case 'dhikr.milestone':
        return { accent: c.textSecondary, icon: 'activity', label: t('community.summary.dhikr', 'Zikir') };
      case 'prayer.fullday':
      default:
        return { accent: c.text, icon: 'check-circle', label: t('community.summary.prayer', 'Namaz') };
    }
  };

  const renderPost = (item: CommunityPost) => {
    const country = item.params.country ?? '';
    const countryLabel = countryDisplayName(country, lang);
    const flag = countryFlag(country);
    const time = item.createdAt.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
    const anonymous = t('community.anonymous', 'Anonim kardeş');
    const meta = metaFor(item.templateKey);
    // The user's own post: a primary border and a "You" badge, so it is never mistaken for someone else's.
    const own = !!myUid && item.authorUid === myUid;
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: own ? c.primaryLight : c.surface, borderColor: own ? c.primary : c.border },
          own && styles.cardOwn,
        ]}
      >
        <View style={styles.cardHead}>
          <View style={styles.haloWrap}>
            <LinearGradient
              colors={[c.primary, c.success]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.halo}
            />
            <View style={[styles.avatar, { backgroundColor: c.primaryLight }]}>
              {flag ? <Text style={styles.flag}>{flag}</Text> : <Feather name="globe" size={18} color={c.primary} />}
            </View>
          </View>
          <View style={styles.headText}>
            <View style={styles.nameRow}>
              <Text style={[styles.country, { color: c.textSecondary }]} numberOfLines={1}>
                {countryLabel || anonymous}
              </Text>
              {own && (
                <View style={[styles.youBadge, { backgroundColor: c.primary }]}>
                  <Text style={[styles.youText, { color: c.primaryText === c.primary ? '#FFFFFF' : c.primaryText }]}>
                    {t('community.you', 'Sen')}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.meta, { color: c.textSecondary }]} numberOfLines={1}>
              {countryLabel ? `${anonymous} · ${time}` : time}
            </Text>
          </View>
          <Pressable
            onPress={() => onMore(item)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('community.more.title', 'Seçenekler')}
            style={[styles.moreBtn, { backgroundColor: c.surfaceStrong }]}
          >
            <Feather name="more-horizontal" size={18} color={c.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.bodyRow}>
          <View style={[styles.typeIcon, { backgroundColor: tint(meta.accent) }]}>
            <Feather name={meta.icon} size={16} color={meta.accent} />
          </View>
          <Text style={[styles.body, { color: c.text }]}>{templateText(t, item.templateKey, item.params, lang)}</Text>
        </View>

        <View style={styles.reactionRow}>
          {COMMUNITY_EMOJIS.map((emoji) => {
            const on = myReactions.has(`${item.id}:${emoji}`);
            const count = item.reactionCounts[emoji] ?? 0;
            return (
              <ReactionPill
                key={emoji}
                emoji={emoji}
                count={count}
                on={on}
                reduceMotion={!!reduceMotion}
                colors={c}
                onPress={() => onReact(item, emoji)}
              />
            );
          })}
        </View>
      </View>
    );
  };

  const emptyText = view === 'today'
    ? t('community.emptyToday', 'Bugün henüz paylaşım yok. Bir olay tamamlayınca ilk paylaşımı sen yapabilirsin.')
    : view === 'week'
      ? t('community.emptyWeek', 'Son 7 günde henüz paylaşım yok.')
      : t('community.emptyMine', 'Henüz paylaşımın yok. Bir ibadetini tamamlayınca paylaşabilirsin.');

  const periodLabel = view === 'today'
    ? t('community.tabToday', 'Bugün')
    : view === 'week'
      ? t('community.tabWeek', 'Son 7 gün')
      : t('community.tabMine', 'Paylaşımlarım');

  const header = useMemo(
    () => (
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: c.text }]}>{t('community.title', 'Topluluk')}</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={() => setHowToVisible(true)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('community.howTo.helpLabel', 'Nasıl paylaşılır')}
              style={[styles.glassCircle, { borderColor: c.border, backgroundColor: c.surface }]}
            >
              <Feather name="help-circle" size={18} color={c.text} />
            </Pressable>
            <Pressable
              onPress={() => setSettingsVisible(true)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('community.settings.title', 'Topluluk ayarları')}
              style={[styles.glassCircle, { borderColor: c.border, backgroundColor: c.surface }]}
            >
              <Feather name="settings" size={18} color={c.text} />
            </Pressable>
          </View>
        </View>

        <View
          style={[styles.segment, { borderColor: c.border, backgroundColor: c.surface }]}
          onLayout={(e) => setSegWidth(e.nativeEvent.layout.width)}
        >
          <BlurView intensity={30} tint={blurTint} style={StyleSheet.absoluteFill} />
          {segItemWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.segmentIndicator,
                { width: segItemWidth, backgroundColor: c.primaryLight, borderColor: tint(c.primary), borderWidth: StyleSheet.hairlineWidth },
                indicatorStyle,
              ]}
            />
          )}
          {FEED_VIEWS.map((v) => {
            const selected = view === v;
            const label =
              v === 'today'
                ? t('community.tabToday', 'Bugün')
                : v === 'week'
                  ? t('community.tabWeek', 'Son 7 gün')
                  : t('community.tabMine', 'Paylaşımlarım');
            return (
              <Pressable
                key={v}
                onPress={() => changeView(v)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={styles.segmentItem}
              >
                <Text
                  style={[styles.segmentText, { color: selected ? c.primaryText : c.textSecondary }]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Vera's own daily invitation: one of a few fixed messages, changing each day. It never reports what
            a real person did. */}
        <View style={[styles.vera, { borderColor: c.border, backgroundColor: c.surface }]}>
          <View style={[styles.veraBadge, { backgroundColor: c.primaryLight }]}>
            <Feather name="star" size={16} color={c.primaryText} />
          </View>
          <View style={styles.veraText}>
            <Text style={[styles.veraLabel, { color: c.primaryText }]}>{t('community.vera.label', 'Vera')}</Text>
            <Text style={[styles.veraBody, { color: c.text }]}>
              {t(`community.vera.m${dailyVeraIndex()}`, 'Bugünün hedefi: 1 hatim.')}
            </Text>
          </View>
        </View>

        {summary.total > 0 && (
          <View style={[styles.hero, { borderColor: c.border, backgroundColor: c.surface }]}>
            <View style={styles.heroTop}>
              <View style={[styles.heroBadge, { backgroundColor: c.primaryLight }]}>
                <Feather name="users" size={18} color={c.primaryText} />
              </View>
              <View style={styles.heroText}>
                <Text style={[styles.heroNumber, { color: c.text }]}>{summary.total}</Text>
                <Text style={[styles.heroLabel, { color: c.textSecondary }]}>
                  {`${t('community.summary.posts', 'paylaşım')} · ${periodLabel}`}
                </Text>
              </View>
            </View>
            <View style={[styles.distBar, { backgroundColor: c.surfaceStrong }]}>
              {COMMUNITY_TEMPLATES.filter((k) => summary.byType[k] > 0).map((k) => (
                <View key={k} style={{ flex: summary.byType[k], backgroundColor: metaFor(k).accent }} />
              ))}
            </View>
            <View style={styles.chipRow}>
              {COMMUNITY_TEMPLATES.filter((k) => summary.byType[k] > 0).map((k) => {
                const meta = metaFor(k);
                return (
                  <View key={k} style={[styles.chip, { backgroundColor: tint(meta.accent) }]}>
                    <Feather name={meta.icon} size={13} color={meta.accent} />
                    <Text style={[styles.chipText, { color: c.text }]}>{`${summary.byType[k]} ${meta.label}`}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>
    ),
    // changeView only reads `view` and stable setters; keep the header tied to what it renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [c, t, view, insets.top, blurTint, summary, periodLabel, segItemWidth]
  );

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <Animated.View style={styles.root} entering={reduceMotion ? undefined : FadeIn.duration(400)}>
        <FlatList
          data={feed}
          keyExtractor={(item) => (item.kind === 'ad' ? item.key : item.post.id)}
          renderItem={({ item }) => (item.kind === 'ad' ? <FeedAd isVisible={isActive} /> : renderPost(item.post))}
          ListHeaderComponent={header}
          // Clears the floating tab bar, which sits over the bottom of the list.
          contentContainerStyle={[styles.list, { paddingBottom: bottomInset + 24 }]}
          // Memory: keep only a few screens of cards mounted; older ones unmount as the user scrolls,
          // and newer pages load on demand through onEndReached instead of all at once.
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          windowSize={7}
          removeClippedSubviews
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(true, [], view);
              }}
            />
          }
          onEndReached={() => {
            if (hasMore && !loading && posts.length && posts.length < MAX_LOADED) load(false, posts, view);
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            loading ? null : (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyArt}>
                  {failed ? (
                    <View style={[styles.emptyCircle, { borderColor: c.border, backgroundColor: c.surface }]}>
                      <Feather name="wifi-off" size={26} color={c.primaryText} />
                    </View>
                  ) : (
                    <CommunityIllustration colors={c} />
                  )}
                </View>
                <Text style={[styles.emptyTitle, { color: c.text }]}>{t('community.title', 'Topluluk')}</Text>
                <Text style={[styles.empty, { color: c.textSecondary }]}>
                  {failed ? t('community.loadFailed', 'Akış yüklenemedi. Yenilemek için aşağı çek.') : emptyText}
                </Text>
              </View>
            )
          }
        />
      </Animated.View>
      <CommunityHowTo visible={howToVisible} onClose={closeHowTo} />

      <CommunityPostSheet
        visible={sheetPost !== null}
        onClose={() => setSheetPost(null)}
        onReport={() => {
          const post = sheetPost;
          setSheetPost(null);
          if (post) onReport(post);
        }}
        onBlock={() => {
          const post = sheetPost;
          setSheetPost(null);
          if (post) onBlock(post);
        }}
      />

      <CommunitySettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        onChanged={setSettings}
      />
    </View>
  );
}

// Ad slot in the feed. The label appears only once an ad has filled, so an empty slot shows no text.
const FeedAd = memo(function FeedAd({ isVisible }: { isVisible: boolean }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [loaded, setLoaded] = useState(false);
  return (
    <View style={styles.adWrap}>
      {loaded && (
        <Text style={[styles.adLabel, { color: theme.colors.textSecondary }]}>{t('community.adLabel', 'Reklam')}</Text>
      )}
      <BannerAdSlot placement="community_feed" isVisible={isVisible} size="banner" onAdLoaded={() => setLoaded(true)} />
    </View>
  );
});

// Empty-feed illustration: three people under a crescent moon, drawn in the theme colors.
function CommunityIllustration({ colors: c }: { colors: Colors }) {
  return (
    <Svg width={180} height={120} viewBox="0 0 180 120">
      <Circle cx={90} cy={60} r={56} fill={c.primaryLight} />
      <Path d="M42 96 Q62 64 82 96 Z" fill={c.border} />
      <Circle cx={62} cy={48} r={11} fill={c.border} />
      <Path d="M66 100 Q90 60 114 100 Z" fill={c.primary} />
      <Circle cx={90} cy={42} r={13} fill={c.primary} />
      <Path d="M98 96 Q118 64 138 96 Z" fill={c.success} />
      <Circle cx={118} cy={48} r={11} fill={c.success} />
      <Circle cx={146} cy={22} r={9} fill={c.success} />
      <Circle cx={150} cy={19} r={8} fill={c.primaryLight} />
      <Circle cx={34} cy={26} r={2.5} fill={c.primary} />
      <Circle cx={158} cy={64} r={2} fill={c.primary} />
    </Svg>
  );
}

// One glass capsule per reaction. The tapped pill springs up briefly; reduced motion skips the spring.
const ReactionPill = memo(function ReactionPill({
  emoji,
  count,
  on,
  reduceMotion,
  colors: c,
  onPress,
}: {
  emoji: CommunityEmoji;
  count: number;
  on: boolean;
  reduceMotion: boolean;
  colors: Colors;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        if (!reduceMotion) scale.value = withSpring(1.12, SOFT_EASE);
      }}
      onPressOut={() => {
        if (!reduceMotion) scale.value = withSpring(1, SOFT_EASE);
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
    >
      <Animated.View
        style={[
          styles.reaction,
          {
            borderColor: on ? c.primary : c.border,
            backgroundColor: on ? c.primaryLight : c.surface,
          },
          animated,
        ]}
      >
        <Text style={styles.reactionEmoji}>{emoji}</Text>
        {count > 0 && (
          <Text style={[styles.reactionCount, { color: on ? c.primaryText : c.textSecondary }]}>{count}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 14 },
  header: { paddingBottom: 14, gap: 18 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // Large title, Apple-style.
  title: { fontSize: 34, lineHeight: 40, fontFamily: 'Outfit_700Bold' },
  glassCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
    overflow: 'hidden',
  },
  segmentItem: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 13 },
  // Sliding capsule behind the selected segment; it moves on a spring.
  segmentIndicator: {
    position: 'absolute',
    top: SEGMENT_INSET,
    bottom: SEGMENT_INSET,
    left: SEGMENT_INSET,
    borderRadius: 13,
    overflow: 'hidden',
  },
  segmentText: { fontSize: 15, fontFamily: 'Outfit_600SemiBold' },

  // Vera's daily invitation: standard surface, no glass.
  vera: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, padding: 16 },
  veraBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  veraText: { flex: 1, gap: 2 },
  veraLabel: { fontSize: 12, fontFamily: 'Outfit_700Bold', letterSpacing: 0.4, textTransform: 'uppercase' },
  veraBody: { fontSize: 14, lineHeight: 20, fontFamily: 'Outfit_400Regular' },

  // Hero summary card.
  hero: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    padding: 18,
    gap: 14,
    overflow: 'hidden',
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  heroText: { flex: 1 },
  heroNumber: { fontSize: 34, lineHeight: 40, fontFamily: 'Outfit_700Bold' },
  heroLabel: { fontSize: 13, fontFamily: 'Outfit_400Regular' },
  // Proportional bar of post types, one segment per type in its accent color.
  distBar: { height: 8, borderRadius: 4, flexDirection: 'row', overflow: 'hidden' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    borderRadius: 999,
    paddingHorizontal: 10,
  },
  chipText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },

  // Outer radius 20; the inner avatar and buttons sit inside the 16px padding.
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, padding: 16, gap: 14, overflow: 'hidden' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  // 46px halo with a 3px gradient ring around the 40px flag circle.
  haloWrap: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  halo: { ...StyleSheet.absoluteFillObject, borderRadius: 23, opacity: 0.55 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  flag: { fontSize: 20 },
  headText: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  youBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  youText: { fontSize: 11, fontFamily: 'Outfit_700Bold' },
  cardOwn: { borderWidth: 1.5 },
  country: { fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  meta: { fontSize: 12, fontFamily: 'Outfit_400Regular' },
  moreBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bodyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  typeIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  body: { flex: 1, fontSize: 18, lineHeight: 26, fontFamily: 'Outfit_600SemiBold' },
  reactionRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  // Glass capsule; the selected one takes a light primary tint, not a solid fill.
  reaction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
  },
  reactionEmoji: { fontSize: 16 },
  reactionCount: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },

  // Empty state.
  emptyWrap: { alignItems: 'center', marginTop: 40, gap: 10, paddingHorizontal: 24 },
  emptyArt: { alignItems: 'center', justifyContent: 'center', height: 120 },
  emptyCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', marginTop: 6 },
  empty: { textAlign: 'center', fontSize: 15, lineHeight: 22, fontFamily: 'Outfit_400Regular' },
  adWrap: { gap: 4 },
  adLabel: { fontSize: 11, fontFamily: 'Outfit_600SemiBold', letterSpacing: 0.6, textTransform: 'uppercase' },
});
