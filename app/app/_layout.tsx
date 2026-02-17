import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ErrorBoundary from '../src/components/ErrorBoundary';
import ConnectionBanner from '../src/components/ConnectionBanner';
import VoiceAccessGrid from '../src/components/VoiceAccessGrid';
import { useConnection } from '../src/hooks/useConnection';
import { colors } from '../src/theme/tokens';

function RootInner() {
  useConnection();

  return (
    <>
      <StatusBar style="light" />
      <ConnectionBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
      <VoiceAccessGrid />
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <RootInner />
    </ErrorBoundary>
  );
}
