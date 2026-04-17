import { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text } from 'react-native';
import { theme } from './theme';

export function KeyboardDoneButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvt, () => setVisible(true));
    const onHide = Keyboard.addListener(hideEvt, () => setVisible(false));
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  if (!visible) return null;

  return (
    <Pressable
      onPress={Keyboard.dismiss}
      style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
    >
      <Text style={styles.text}>Done</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: theme.color.text,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    zIndex: 1000,
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
