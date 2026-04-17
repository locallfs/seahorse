import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { sdk } from '@/lib/medusa';
import { useAuth } from '@/lib/auth';
import { theme } from '@/lib/theme';

type Row =
  | { kind: 'user'; id: string; email: string; name: string }
  | { kind: 'invite'; id: string; email: string; expires: string };

export default function TeamScreen() {
  const { user: me } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [usersRes, invitesRes] = await Promise.all([
        sdk.admin.user.list({ limit: 100 } as any),
        sdk.admin.invite.list({ limit: 100 } as any).catch(() => ({ invites: [] })),
      ]);
      const users: Row[] = (usersRes.users || []).map((u: any) => ({
        kind: 'user' as const,
        id: u.id,
        email: u.email,
        name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email,
      }));
      const invites: Row[] = ((invitesRes as any).invites || [])
        .filter((i: any) => i.status !== 'accepted')
        .map((i: any) => ({
          kind: 'invite' as const,
          id: i.id,
          email: i.email,
          expires: i.expires_at,
        }));
      setRows([...users, ...invites]);
    } catch (e: any) {
      setError(e?.message || 'Could not load team.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const invite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid email', 'Enter a valid email address.');
      return;
    }
    setInviting(true);
    try {
      await sdk.admin.invite.create({ email } as any);
      setInviteEmail('');
      await load();
      Alert.alert('Invite sent', `${email} will receive a link to create their password.`);
    } catch (e: any) {
      Alert.alert('Invite failed', e?.message || 'Could not create invite.');
    } finally {
      setInviting(false);
    }
  };

  const confirmRemove = (row: Row) => {
    const title = row.kind === 'user' ? 'Remove user?' : 'Revoke invite?';
    const message =
      row.kind === 'user'
        ? `${row.email} will be signed out and unable to log in.`
        : `${row.email} will no longer be able to accept the invite.`;
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove(row) },
    ]);
  };

  const remove = async (row: Row) => {
    try {
      if (row.kind === 'user') {
        await sdk.admin.user.delete(row.id);
      } else {
        await sdk.admin.invite.delete(row.id);
      }
      await load();
    } catch (e: any) {
      Alert.alert('Remove failed', e?.message || 'Could not remove.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={theme.color.gold} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.inviteBox}>
        <Text style={styles.label}>Invite new employee by email</Text>
        <View style={styles.inviteRow}>
          <TextInput
            value={inviteEmail}
            onChangeText={setInviteEmail}
            placeholder="employee@example.com"
            placeholderTextColor={theme.color.textDim}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
          <Pressable
            onPress={invite}
            disabled={inviting}
            style={({ pressed }) => [styles.inviteBtn, (inviting || pressed) && styles.btnPressed]}
          >
            {inviting ? (
              <ActivityIndicator color={theme.color.gold} />
            ) : (
              <Text style={styles.inviteBtnText}>Send Invite</Text>
            )}
          </Pressable>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={rows}
        keyExtractor={(r) => `${r.kind}:${r.id}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.color.gold} />
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>
                {item.kind === 'user' ? item.name : item.email}
              </Text>
              <Text style={styles.rowSub}>
                {item.kind === 'user'
                  ? item.email
                  : `Pending invite · expires ${new Date(item.expires).toLocaleDateString()}`}
              </Text>
            </View>
            {item.kind === 'user' && me?.id === item.id ? (
              <Text style={styles.youBadge}>You</Text>
            ) : (
              <Pressable onPress={() => confirmRemove(item)} style={styles.removeBtn}>
                <Text style={styles.removeBtnText}>
                  {item.kind === 'user' ? 'Remove' : 'Revoke'}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  loader: {
    flex: 1,
    backgroundColor: theme.color.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteBox: {
    padding: theme.space.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  label: { color: theme.color.text, fontSize: theme.font.sm, marginBottom: theme.space.xs },
  inviteRow: { flexDirection: 'row', gap: theme.space.sm, alignItems: 'stretch' },
  input: {
    flex: 1,
    backgroundColor: theme.color.card,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    color: theme.color.text,
  },
  inviteBtn: {
    backgroundColor: theme.color.text,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.md,
    justifyContent: 'center',
    minWidth: 120,
    alignItems: 'center',
  },
  btnPressed: { opacity: 0.85 },
  inviteBtnText: { color: theme.color.gold, fontWeight: '700' },
  error: { color: theme.color.danger, padding: theme.space.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.space.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
    gap: theme.space.md,
  },
  rowBody: { flex: 1 },
  rowTitle: { color: theme.color.text, fontSize: theme.font.md, fontWeight: '600' },
  rowSub: { color: theme.color.textMuted, fontSize: theme.font.xs, marginTop: 2 },
  removeBtn: {
    borderWidth: 1,
    borderColor: theme.color.danger,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
  },
  removeBtnText: { color: theme.color.danger, fontSize: theme.font.sm, fontWeight: '600' },
  youBadge: { color: theme.color.gold, fontSize: theme.font.xs, fontWeight: '700' },
});
