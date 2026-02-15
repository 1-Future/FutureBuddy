import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Btn from './Btn';
import { colors } from '../theme/tokens';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </Text>
          <Btn
            backgroundColor={colors.accent}
            color="white"
            onPress={this.handleReset}
          >
            Try Again
          </Btn>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  title: {
    color: colors.error,
    fontSize: 20,
    fontWeight: '700',
  },
  message: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
});
