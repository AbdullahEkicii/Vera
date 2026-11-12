import React from 'react';
import { Appearance, ColorSchemeName, View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { reportError } from '../services/crashReportingService';
import { AppStorage } from '../services/storageService';
import i18n from '../localization/i18n';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
  /** Bumped on every retry so the children subtree is remounted, not just re-rendered. */
  resetKey: number;
  /** Consecutive retries that crashed again. */
  failedRetries: number;
  scheme: ColorSchemeName;
}

const devError = (...args: any[]) => { if (__DEV__) console.error(...args); };

// A retry that survives this long without crashing again counts as success.
const RETRY_SETTLE_MS = 8000;
const PRAYER_TIMES_CACHE_KEY = 'PRAYER_TIMES_CACHE';

// Rendered outside ThemeProvider, so it follows the system scheme directly.
const palettes = {
  dark: { bg: '#1A1207', title: '#FFFFFF', body: '#C9BBA8', accent: '#D4A574', onAccent: '#1A1207', icon: '#D4A574' },
  light: { bg: '#FFF8EC', title: '#1A1207', body: '#5C4A36', accent: '#8A5A1F', onAccent: '#FFFFFF', icon: '#8A5A1F' },
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = {
    error: null,
    resetKey: 0,
    failedRetries: 0,
    scheme: Appearance.getColorScheme(),
  };

  private schemeSub: { remove: () => void } | null = null;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;
  private retried = false;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidMount() {
    this.schemeSub = Appearance.addChangeListener(({ colorScheme }) => this.setState({ scheme: colorScheme }));
  }

  componentWillUnmount() {
    this.schemeSub?.remove();
    if (this.settleTimer) clearTimeout(this.settleTimer);
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    devError('[ERROR BOUNDARY] Uncaught render error:', error, info.componentStack);
    reportError(error, `ErrorBoundary render crash: ${info.componentStack?.slice(0, 500)}`);
    if (this.settleTimer) {
      clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
    // Crashing right after a retry means that retry failed.
    if (this.retried) {
      this.retried = false;
      this.setState((s) => ({ failedRetries: s.failedRetries + 1 }));
    }
  }

  private retry = () => {
    this.retried = true;
    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => {
      this.retried = false;
      this.settleTimer = null;
      this.setState({ failedRetries: 0 });
    }, RETRY_SETTLE_MS);
    this.setState((s) => ({ error: null, resetKey: s.resetKey + 1 }));
  };

  handleReset = () => this.retry();

  handleClearAndRetry = async () => {
    try {
      await AppStorage.removeItem(PRAYER_TIMES_CACHE_KEY);
    } catch {}
    this.setState({ failedRetries: 0 });
    this.retry();
  };

  render() {
    if (this.state.error) {
      const c = this.state.scheme === 'light' ? palettes.light : palettes.dark;
      const offerClear = this.state.failedRetries >= 2;
      const label = offerClear
        ? i18n.t('errorBoundary.clearAndRetry', { defaultValue: 'Clear cached data and retry' })
        : i18n.t('errorBoundary.retry', { defaultValue: 'Try again' });
      return (
        <View style={[styles.container, { backgroundColor: c.bg }]}>
          <Feather name="alert-triangle" size={40} color={c.icon} />
          <Text style={[styles.title, { color: c.title }]} accessibilityRole="header">
            {i18n.t('errorBoundary.title', { defaultValue: 'Something went wrong' })}
          </Text>
          <Text style={[styles.subtitle, { color: c.body }]}>
            {i18n.t('errorBoundary.subtitle', {
              defaultValue: 'The app ran into an unexpected error. Tap the button below to try again.',
            })}
          </Text>
          <Pressable
            style={[styles.button, { backgroundColor: c.accent }]}
            onPress={offerClear ? this.handleClearAndRetry : this.handleReset}
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            <Text style={[styles.buttonText, { color: c.onAccent }]}>{label}</Text>
          </Pressable>
        </View>
      );
    }

    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: 12,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: {
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
  },
});
