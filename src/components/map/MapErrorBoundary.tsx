import { Component, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type Props = {
  children: ReactNode;
  height?: number;
};

type State = { hasError: boolean };

export class MapErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={[styles.fallback, { height: this.props.height ?? 260 }]}>
          <ThemedText themeColor="textSecondary" style={styles.text}>
            Map could not load. Rebuild the app with{' '}
            <ThemedText type="code">npx expo run:android</ThemedText> so Google Maps is linked.
          </ThemedText>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  fallback: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: 'rgba(228,190,177,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  text: { textAlign: 'center', fontSize: 13, lineHeight: 18 },
});
