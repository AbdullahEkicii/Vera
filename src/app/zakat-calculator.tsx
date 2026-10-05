import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useTheme } from '../context/ThemeContext';
import { AppBackground } from '../components/ProgressRing';
import { logScreenView } from '../services/analyticsService';
import { BannerAdSlot } from '../components/BannerAdSlot';
import { useIsFocused } from '@react-navigation/native';

const ZAKAT_RATE = 0.025; // 1/40

function parseAmount(v: string): number {
  const n = parseFloat(v.replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

export default function ZakatCalculatorScreen() {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const isFocused = useIsFocused();

  const [cash, setCash] = useState('');
  const [gold, setGold] = useState('');
  const [tradeGoods, setTradeGoods] = useState('');
  const [investments, setInvestments] = useState('');
  const [debts, setDebts] = useState('');
  const [nisab, setNisab] = useState('');

  React.useEffect(() => {
    logScreenView('ZakatCalculatorScreen');
  }, []);

  const totals = useMemo(() => {
    const totalAssets =
      parseAmount(cash) + parseAmount(gold) + parseAmount(tradeGoods) + parseAmount(investments);
    const netWealth = Math.max(0, totalAssets - parseAmount(debts));
    const nisabValue = parseAmount(nisab);
    const isEligible = nisabValue > 0 && netWealth >= nisabValue;
    const zakatDue = isEligible ? netWealth * ZAKAT_RATE : 0;
    return { totalAssets, netWealth, nisabValue, isEligible, zakatDue };
  }, [cash, gold, tradeGoods, investments, debts, nisab]);

  const fields = [
    { key: 'cash', label: t('zakat.cash', 'Nakit & Banka Mevduatı'), value: cash, setter: setCash, icon: 'dollar-sign' },
    { key: 'gold', label: t('zakat.gold', 'Altın / Gümüş Değeri'), value: gold, setter: setGold, icon: 'circle' },
    { key: 'tradeGoods', label: t('zakat.tradeGoods', 'Ticaret Malı Değeri'), value: tradeGoods, setter: setTradeGoods, icon: 'shopping-bag' },
    { key: 'investments', label: t('zakat.investments', 'Hisse Senedi / Yatırım'), value: investments, setter: setInvestments, icon: 'trending-up' },
    { key: 'debts', label: t('zakat.debts', 'Borçlar (Düşülecek)'), value: debts, setter: setDebts, icon: 'minus-circle' },
  ];

  return (
    <AppBackground isDark={isDark}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

          <View style={styles.header}>
            <Pressable
              style={[styles.backBtn, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}
              onPress={() => router.back()}
            >
              <Feather name="arrow-left" size={20} color={theme.colors.text} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {t('zakat.title', 'Zekat Hesaplama')}
            </Text>
            <View style={{ width: 38 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Animated.View
              entering={FadeInDown.duration(400)}
              style={[styles.infoCard, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}
            >
              <Feather name="info" size={16} color={theme.colors.primary} />
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                {t(
                  'zakat.info',
                  'Zekat, bir yıl elde tutulan ve nisap miktarına ulaşan mal varlığının %2,5\'idir (1/40). Nisap tutarını güncel altın/gümüş fiyatından hesaplayıp aşağıya girin.'
                )}
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(60).duration(400)} style={{ gap: 12, marginTop: 16 }}>
              {fields.map((f, idx) => (
                <View key={f.key} style={[styles.fieldCard, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}>
                  <View style={[styles.fieldIcon, { backgroundColor: theme.colors.primary + '18' }]}>
                    <Feather name={f.icon as any} size={16} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>{f.label}</Text>
                    <TextInput
                      style={[styles.fieldInput, { color: theme.colors.text }]}
                      value={f.value}
                      onChangeText={f.setter}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={theme.colors.textSecondary + '80'}
                    />
                  </View>
                </View>
              ))}

              <View style={[styles.fieldCard, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary + '40' }]}>
                <View style={[styles.fieldIcon, { backgroundColor: theme.colors.primary + '25' }]}>
                  <Feather name="target" size={16} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.primary }]}>
                    {t('zakat.nisab', 'Nisap Tutarı (Güncel Altın/Gümüş Değeri)')}
                  </Text>
                  <TextInput
                    style={[styles.fieldInput, { color: theme.colors.text }]}
                    value={nisab}
                    onChangeText={setNisab}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={theme.colors.textSecondary + '80'}
                  />
                </View>
              </View>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(120).duration(400)}
              style={[styles.resultCard, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}
            >
              <Text style={[styles.resultLabel, { color: theme.colors.textSecondary }]}>
                {t('zakat.netWealth', 'Net Mal Varlığı')}
              </Text>
              <Text style={[styles.resultValue, { color: theme.colors.text }]}>{totals.netWealth.toLocaleString()}</Text>

              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

              {totals.isEligible ? (
                <>
                  <Text style={[styles.resultLabel, { color: theme.colors.textSecondary }]}>
                    {t('zakat.zakatDue', 'Ödemeniz Gereken Zekat')}
                  </Text>
                  <Text style={[styles.zakatDueValue, { color: theme.colors.primary }]}>{totals.zakatDue.toLocaleString()}</Text>
                </>
              ) : (
                <Text style={[styles.notEligibleText, { color: theme.colors.textSecondary }]}>
                  {totals.nisabValue > 0
                    ? t('zakat.notEligible', 'Mal varlığınız nisap miktarına ulaşmadığı için zekat vermeniz gerekmiyor.')
                    : t('zakat.enterNisab', 'Hesaplama için lütfen nisap tutarını girin.')}
                </Text>
              )}
            </Animated.View>

            {/* Below the result, away from the inputs to avoid accidental taps while typing */}
            <View style={{ marginTop: 16 }}>
              <BannerAdSlot placement="zakat" isVisible={isFocused} />
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight ?? 24) + 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  infoCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  fieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  fieldIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  fieldInput: {
    fontSize: 16,
    fontWeight: '700',
    padding: 0,
  },
  resultCard: {
    marginTop: 20,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  resultValue: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    marginVertical: 14,
  },
  zakatDueValue: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: 4,
  },
  notEligibleText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
});
