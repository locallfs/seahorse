import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { listProducts, formatPrice, LOW_STOCK_THRESHOLD, ProductSummary } from '@/lib/products';
import { useAuth } from '@/lib/auth';
import { theme } from '@/lib/theme';

export default function ProductListScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (q?: string) => {
    setError(null);
    try {
      const products = await listProducts(q);
      setItems(products);
    } catch (e: any) {
      setError(e?.message || 'Could not load products.');
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
      load(query);
    }, [load, query])
  );

  useEffect(() => {
    const t = setTimeout(() => load(query), 300);
    return () => clearTimeout(t);
  }, [query, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(query);
    setRefreshing(false);
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
      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search products…"
          placeholderTextColor={theme.color.textDim}
          autoCapitalize="none"
        />
        <Pressable onPress={logout} style={styles.logout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.color.gold}
          />
        }
        contentContainerStyle={items.length ? undefined : styles.empty}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {query ? 'No products match that search.' : 'No products yet. Tap New to add one.'}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/(app)/product/[id]', params: { id: item.id } })}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            {item.thumbnail ? (
              <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]}>
                <Text style={styles.thumbPlaceholderText}>—</Text>
              </View>
            )}
            <View style={styles.rowBody}>
              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.price}>{formatPrice(item.price, item.currency)}</Text>
                <StatusBadge status={item.status} />
                <StockBadge stock={item.stock} />
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const published = status === 'published';
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: published ? theme.color.gold : theme.color.border },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          { color: published ? '#000' : theme.color.text },
        ]}
      >
        {published ? 'Published' : 'Draft'}
      </Text>
    </View>
  );
}

function StockBadge({ stock }: { stock: number }) {
  const isOut = stock <= 0;
  const isLow = stock > 0 && stock <= LOW_STOCK_THRESHOLD;
  const label = isOut ? 'Out of Stock' : isLow ? `Low · ${stock}` : `Stock · ${stock}`;
  const bg = isOut
    ? theme.color.danger
    : isLow
    ? theme.color.warning
    : theme.color.success;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={styles.badgeText}>{label}</Text>
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
  searchRow: {
    flexDirection: 'row',
    padding: theme.space.md,
    gap: theme.space.sm,
    alignItems: 'center',
  },
  search: {
    flex: 1,
    backgroundColor: theme.color.card,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    color: theme.color.text,
  },
  logout: {
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  logoutText: { color: theme.color.textMuted, fontSize: theme.font.sm },
  error: {
    color: theme.color.danger,
    textAlign: 'center',
    paddingHorizontal: theme.space.md,
    paddingBottom: theme.space.sm,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: theme.color.textMuted, textAlign: 'center', padding: theme.space.xl },
  row: {
    flexDirection: 'row',
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    alignItems: 'center',
    gap: theme.space.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  rowPressed: { backgroundColor: theme.color.bgElevated },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.card,
  },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  thumbPlaceholderText: { color: theme.color.textDim, fontSize: theme.font.xl },
  rowBody: { flex: 1, gap: theme.space.xs },
  title: { color: theme.color.text, fontSize: theme.font.md, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm, flexWrap: 'wrap' },
  price: { color: theme.color.gold, fontSize: theme.font.sm, fontWeight: '600' },
  badge: {
    paddingHorizontal: theme.space.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
  },
  badgeText: { color: '#000', fontSize: theme.font.xs, fontWeight: '700' },
});
