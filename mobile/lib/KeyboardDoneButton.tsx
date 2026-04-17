import { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from './theme';

export function KeyboardDoneButton() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvt, (e) => {
      setKeyboardHeight(e?.endCoordinates?.height ?? 0);
    });
    const onHide = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  if (keyboardHeight === 0) return null;

  // iOS overlays the keyboard — lift the button above it.
  // Android resizes the window — sit near the new bottom.
  const bottomOffset = Platform.OS === 'ios' ? keyboardHeight + 8 : 12;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Pressable
        onPress={Keyboard.dismiss}
        style={({ pressed }) => [styles.btn, { bottom: bottomOffset }, pressed && styles.btnPressed]}
        hitSlop={10}
      >
        <Text style={styles.text}>Done</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    right: 16,
    backgroundColor: theme.color.text,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
    zIndex: 9999,
  },
  btnPressed: {
    opacity: 0.85,
  },
  text: {
    color: theme.color.gold,
    fontWeight: '700',
    fontSize: 14,
  },
});
