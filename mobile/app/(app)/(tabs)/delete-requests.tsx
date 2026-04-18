import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { theme } from '@/lib/theme';
import {
  approveDeleteProduct,
  listDeleteRequests,
  rejectDeleteProduct,
  type DeleteRequest,
} from '@/lib/products';

export default function DeleteRequestsScreen() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<DeleteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/(app)/(tabs)/index');
    }
  }, [authLoading, isAdmin, router]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await listDeleteRequests();
      setRows(list);
    } catch (e: any) {
      setError(e?.message || 'Could not load delete requests.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const confirmApprove = (row: DeleteRequest) => {
    Alert.alert(
      'Approve deletion?',
      `"${row.title}" will be permanently removed from the site. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => approve(row) },
      ],
    );
  };

  const approve = async (row: DeleteRequest) => {
    setBusyId(row.productId);
    try {
      await approveDeleteProduct(row.productId);
      await load();
    } catch (e: any) {
      Alert.alert('Delete failed', e?.message || 'Could not delete product.');
    } finally {
      setBusyId(null);
    }
  };

  const confirmReject = (row: DeleteRequest) => {
    Alert.alert(
      'Reject request?',
      `"${row.title}" will stay on the site. The delete request will be cleared.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', onPress: () => reject(row) },
      ],
    );
  };

  const reject = async (row: DeleteRequest) => {
    setBusyId(row.productId);
    try {
      await rejectDeleteProduct(row.productId);
      await load();
    } catch (e: any) {
      Alert.alert('Reject failed', e?.message || 'Could not reject request.');
    } finally {
      setBusyId(null);
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
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={rows}
        keyExtractor={(r) => r.productId}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.color.gold}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No pending delete requests.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const busy = busyId === item.productId;
          return (
            <View style={styles.row}>
              <Pressable
                style={styles.rowMain}
                onPress={() => router.push(`/(app)/product/${item.productId}`)}
              >
                <View style={styles.thumbWrap}>
                  {item.thumbnail ? (
                    <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbEmpty]} />
                  )}
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.rowSub}>
                    Requested by {item.requestedByName || item.requestedByEmail}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {new Date(item.requestedAt).toLocaleString()}
                  </Text>
                </View>
              </Pressable>
              <View style={styles.actions}>
                <Pressable
                  onPress={() => confirmApprove(item)}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.approveBtn,
                    (busy || pressed) && styles.btnPressed,
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color={theme.color.danger} />
                  ) : (
                    <Text style={styles.approveBtnText}>Approve Delete</Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => confirmReject(item)}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.rejectBtn,
                    (busy || pressed) && styles.btnPressed,
                  ]}
                >
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
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
  error: { color: theme.color.danger, padding: theme.space.md },
  empty: { padding: theme.space.xl, alignItems: 'center' },
  emptyText: { color: theme.color.textMuted, fontSize: theme.font.sm },
  row: {
    padding: theme.space.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
    gap: theme.space.md,
  },
  rowMain: { flexDirection: 'row', gap: theme.space.md, alignItems: 'center' },
  thumbWrap: { width: 64, height: 64 },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.card,
  },
  thumbEmpty: { borderWidth: 1, borderColor: theme.color.border },
  rowBody: { flex: 1 },
  rowTitle: { color: theme.color.text, fontSize: theme.font.md, fontWeight: '600' },
  rowSub: { color: theme.color.textMuted, fontSize: theme.font.sm, marginTop: 2 },
  rowMeta: { color: theme.color.textDim, fontSize: theme.font.xs, marginTop: 2 },
  actions: { flexDirection: 'row', gap: theme.space.sm },
  approveBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.color.danger,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space.sm,
    alignItems: 'center',
  },
  approveBtnText: { color: theme.color.danger, fontSize: theme.font.sm, fontWeight: '600' },
  rejectBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space.sm,
    alignItems: 'center',
  },
  rejectBtnText: { color: theme.color.textMuted, fontSize: theme.font.sm, fontWeight: '600' },
  btnPressed: { opacity: 0.85 },
});
