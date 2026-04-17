import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/lib/auth';
import { theme } from '@/lib/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      setError(e?.message || 'Login failed. Check your email and password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <View style={styles.card}>
        <Text style={styles.brand}>ReefNerds</Text>
        <Text style={styles.subtitle}>Woody's Seahorse staff login</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={theme.color.textDim}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={theme.color.textDim}
          secureTextEntry
          style={styles.input}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={onSubmit}
          disabled={submitting}
          style={({ pressed }) => [
            styles.button,
            (submitting || pressed) && styles.buttonPressed,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color={theme.color.gold} />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.color.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.space.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: theme.color.bgElevated,
    borderRadius: theme.radius.lg,
    padding: theme.space.xl,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  brand: {
    color: theme.color.gold,
    fontSize: theme.font.xxl,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    color: theme.color.textMuted,
    fontSize: theme.font.sm,
    textAlign: 'center',
    marginTop: theme.space.xs,
    marginBottom: theme.space.xl,
  },
  label: {
    color: theme.color.text,
    fontSize: theme.font.sm,
    marginBottom: theme.space.xs,
    marginTop: theme.space.md,
  },
  input: {
    backgroundColor: theme.color.card,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    color: theme.color.text,
    fontSize: theme.font.md,
  },
  error: {
    color: theme.color.danger,
    fontSize: theme.font.sm,
    marginTop: theme.space.md,
  },
  button: {
    marginTop: theme.space.xl,
    backgroundColor: theme.color.text,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: theme.color.gold,
    fontSize: theme.font.md,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
