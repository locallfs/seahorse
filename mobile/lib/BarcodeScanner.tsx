import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from 'expo-camera';
import { theme } from '@/lib/theme';

type Props = {
  visible: boolean;
  onScanned: (value: string) => void;
  onClose: () => void;
};

// Retail barcodes we care about for dry goods/supplies. UPC-A/E cover US
// registered UPCs; EAN covers the international equivalents.
const BARCODE_TYPES = ['upc_a', 'upc_e', 'ean13', 'ean8'] as const;

export function BarcodeScanner({ visible, onScanned, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  // A barcode in view fires onBarcodeScanned repeatedly; lock after the first
  // read so we only report a single value per open.
  const handled = useRef(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (visible) {
      handled.current = false;
      setLocked(false);
    }
  }, [visible]);

  const handleScan = (result: BarcodeScanningResult) => {
    if (handled.current) return;
    const value = result.data?.trim();
    if (!value) return;
    handled.current = true;
    setLocked(true);
    onScanned(value);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        {!permission ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.color.gold} />
          </View>
        ) : !permission.granted ? (
          <View style={styles.center}>
            <Text style={styles.message}>
              ReefNerds needs camera access to scan barcodes.
            </Text>
            <Pressable onPress={requestPermission} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Allow Camera</Text>
            </Pressable>
            <Pressable onPress={onClose} style={styles.linkBtn}>
              <Text style={styles.linkBtnText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
              onBarcodeScanned={locked ? undefined : handleScan}
            />
            <View style={styles.overlay} pointerEvents="none">
              <View style={styles.frame} />
              <Text style={styles.hint}>
                Point the camera at the product barcode
              </Text>
            </View>
            <View style={styles.footer}>
              <Pressable onPress={onClose} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.space.xl,
    gap: theme.space.md,
  },
  message: {
    color: theme.color.text,
    fontSize: theme.font.md,
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.lg,
  },
  frame: {
    width: '78%',
    aspectRatio: 1.6,
    borderWidth: 2,
    borderColor: theme.color.gold,
    borderRadius: theme.radius.lg,
    backgroundColor: 'transparent',
  },
  hint: {
    color: '#fff',
    fontSize: theme.font.sm,
    textAlign: 'center',
    paddingHorizontal: theme.space.xl,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.space.xl,
    alignItems: 'center',
  },
  cancelBtn: {
    paddingHorizontal: theme.space.xl,
    paddingVertical: theme.space.md,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  cancelBtnText: {
    color: '#fff',
    fontSize: theme.font.md,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: theme.color.gold,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.xl,
    paddingVertical: theme.space.md,
  },
  primaryBtnText: { color: '#000', fontSize: theme.font.md, fontWeight: '700' },
  linkBtn: { paddingVertical: theme.space.sm },
  linkBtnText: { color: theme.color.textMuted, fontSize: theme.font.sm },
});
