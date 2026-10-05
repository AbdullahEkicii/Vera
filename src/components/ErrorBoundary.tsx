import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { reportError } from '../services/crashReportingService';
import i18n from '../localization/i18n';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

const devError = (...args: any[]) => { if (__DEV__) console.error(...args); };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    devError('🔴 [ERROR BOUNDARY] Uncaught render error:', error, info.componentStack);
    reportError(error, `ErrorBoundary render crash: ${info.componentStack?.slice(0, 500)}`);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Feather name="alert-triangle" size={40} color="#D4A574" />
          <Text style={styles.title}>{i18n.t('errorBoundary.title', { defaultValue: 'Bir şeyler ters gitti' })}</Text>
          <Text style={styles.subtitle}>
            {i18n.t('errorBoundary.subtitle', {
              defaultValue: 'Uygulama beklenmedik bir hatayla karşılaştı. Tekrar denemek için aşağıdaki butona dokunun.',
            })}
          </Text>
          <Pressable style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>{i18n.t('errorBoundary.retry', { defaultValue: 'Tekrar Dene' })}</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1207',
    padding: 24,
    gap: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#C9BBA8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: 12,
    backgroundColor: '#D4A574',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: {
    color: '#1A1207',
    fontWeight: '700',
    fontSize: 15,
  },
});
