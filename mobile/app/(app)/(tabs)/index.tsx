import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useFocusEffect } from 'expo-router';
import {
  listProducts,
  formatPrice,
  LOW_STOCK_THRESHOLD,
  ProductSummary,
  sortProducts,
  type SortMode,
} from '@/lib/products';
import { BarcodeScanner } from '@/lib/BarcodeScanner';
import { useOpenProduct } from '@/lib/useOpenProduct';
import { useAuth } from '@/lib/auth';
import { theme } from '@/lib/theme';

const SEARCH_DEBOUNCE_MS = 300;

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: 'priority', label: 'Priority' },
  { id: 'stock', label: 'Stock' },
  { id: 'alpha', label: 'A–Z' },
];

export default function ProductListScreen() {
  const { logout } = useAuth();
  const openProduct = useOpenProduct();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('priority');
  const [searching, setSearching] = useState(false);
  const [scanning, setScanning] = useState(false);

  const sorted = useMemo(() => sortProducts(items, sortMode), [items, sortMode]);

  // Every load gets a ticket number. Searches finish out of order — a broad
  // early query takes far longer than the narrow final one — so only the newest
  // ticket is allowed to write to the list. Without this, a stale response for
  // "g" lands after the response for "gem tang" and wipes out the right answer.
  const latestRequest = useRef(0);
  // Lets the focus refresh read the current query without re-subscribing on
  // every keystroke (see useFocusEffect below).
  const queryRef = useRef(query);
  queryRef.current = query;

  const load = useCallback(async (q?: string) => {
    const ticket = ++latestRequest.current;
    setSearching(true);
    setError(null);
    try {
      const products = await listProducts(q);
      if (ticket !== latestRequest.current) return;
      setItems(products);
    } catch (e: any) {
      if (ticket !== latestRequest.current) return;
      setError(e?.message || 'Could not load products.');
    } finally {
      if (ticket === latestRequest.current) setSearching(false);
    }
  }, []);

  // The only search trigger. Typing waits out the debounce; the first render
  // loads immediately so the catalog is not held back by it.
  useEffect(() => {
    const t = setTimeout(
      () => {
        load(query).finally(() => setLoading(false));
      },
      query ? SEARCH_DEBOUNCE_MS : 0,
    );
    return () => clearTimeout(t);
  }, [query, load]);

  // Refresh when coming back to this tab (e.g. after editing a product).
  // `query` is deliberately NOT a dependency: useFocusEffect re-runs whenever
  // its callback identity changes, so depending on `query` fired an immediate,
  // un-debounced full load on every single keystroke.
  const skipFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (skipFirstFocus.current) {
        skipFirstFocus.current = false;
        return;
      }
      load(queryRef.current);
    }, [load])
  );

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
        <View style={styles.searchBox}>
          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, barcode or SKU…"
            placeholderTextColor={theme.color.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searching ? (
            <ActivityIndicator
              style={styles.searchSpinner}
              color={theme.color.textDim}
              size="small"
            />
          ) : null}
        </View>
        <Pressable onPress={() => setScanning(true)} style={styles.scanBtn}>
          <Text style={styles.scanBtnText}>Scan</Text>
        </Pressable>
        <Pressable onPress={logout} style={styles.logout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </View>

      <BarcodeScanner
        visible={scanning}
        onClose={() => setScanning(false)}
        onScanned={(code) => {
          setQuery(code);
          setScanning(false);
        }}
      />

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort</Text>
        {SORT_OPTIONS.map((opt) => {
          const active = opt.id === sortMode;
          return (
            <Pressable
              key={opt.id}
              onPress={() => setSortMode(opt.id)}
              style={[styles.sortChip, active && styles.sortChipActive]}
            >
              <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.color.gold}
          />
        }
        contentContainerStyle={sorted.length ? undefined : styles.empty}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {searching
              ? 'Searching…'
              : query
              ? 'No products match that search.'
              : 'No products yet. Tap New to add one.'}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openProduct(item.id)}
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
                <Text style={styles.price}>
                  {item.priceIsFrom ? 'From ' : ''}
                  {formatPrice(item.price, item.currency)}
                  {item.variantCount > 1 ? `  ·  ${item.variantCount} sizes` : ''}
                </Text>
                <StatusBadge status={item.status} />
                <StockBadge stock={item.stock} manageInventory={item.manageInventory} />
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

function StockBadge({ stock, manageInventory }: { stock: number; manageInventory: boolean }) {
  if (!manageInventory) {
    return (
      <View style={[styles.badge, { backgroundColor: theme.color.success }]}>
        <Text style={styles.badgeText}>Unlimited</Text>
      </View>
    );
  }
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
  searchBox: { flex: 1, justifyContent: 'center' },
  search: {
    backgroundColor: theme.color.card,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    paddingLeft: theme.space.md,
    // Room for the in-progress spinner so it never sits on top of the text.
    paddingRight: theme.space.xl,
    paddingVertical: theme.space.sm,
    color: theme.color.text,
  },
  searchSpinner: {
    position: 'absolute',
    right: theme.space.sm,
  },
  scanBtn: {
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.gold,
  },
  scanBtnText: {
    color: theme.color.gold,
    fontSize: theme.font.sm,
    fontWeight: '600',
  },
  logout: {
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  logoutText: { color: theme.color.textMuted, fontSize: theme.font.sm },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    paddingHorizontal: theme.space.md,
    paddingBottom: theme.space.sm,
  },
  sortLabel: { color: theme.color.textDim, fontSize: theme.font.xs, marginRight: theme.space.xs },
  sortChip: {
    paddingHorizontal: theme.space.md,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.color.border,
    backgroundColor: theme.color.card,
  },
  sortChipActive: { backgroundColor: theme.color.gold, borderColor: theme.color.gold },
  sortChipText: { color: theme.color.text, fontSize: theme.font.xs, fontWeight: '600' },
  sortChipTextActive: { color: '#000', fontWeight: '700' },
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
