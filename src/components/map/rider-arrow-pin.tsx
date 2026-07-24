import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/** Navigation-style cyan arrow (Zomato / Google Maps turn arrow look). */
export function RiderArrowPin({ heading = 0 }: { heading?: number }) {
  const deg = (Number.isFinite(heading) ? heading! : 0) - 45;

  return (
    <View style={styles.wrap}>
      <View style={styles.pulse} />
      <View style={[styles.rotator, { transform: [{ rotate: `${deg}deg` }] }]}>
        <View style={styles.core}>
          <Ionicons name="navigate" size={22} color="#ffffff" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,188,212,0.22)',
  },
  rotator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  core: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#00BCD4',
    borderWidth: 2.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
});
