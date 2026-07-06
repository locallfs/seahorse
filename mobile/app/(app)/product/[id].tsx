import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { sdk } from '@/lib/medusa';
import { uploadImage } from '@/lib/uploads';
import {
  COUNTRY_OF_ORIGIN,
  deriveTypeKeyFromCategories,
  EMPTY_PADS,
  getStoreDefaults,
  hasNewArrivalCategory,
  isLiveType,
  listOrganizeOptions,
  padsFromMetadata,
  requestDeleteProduct,
  updateProductCategorization,
  type OrganizeOptions,
  type ProductAttributes,
  type ProductOrganize,
  type ProductTypeKey,
  type SpeciesPads,
} from '@/lib/products';
import { useAuth } from '@/lib/auth';
import { theme } from '@/lib/theme';
import {
  AttributeFields,
  OrganizeFields,
  PadFields,
  TypeCategoryFields,
  UpcField,
} from '@/lib/ProductFormFields';

type VariantShape = {
  id: string;
  manage_inventory?: boolean;
  upc?: string | null;
  prices?: { id?: string; amount: number; currency_code: string }[];
  inventory_items?: {
    inventory?: {
      id: string;
      location_levels?: {
        id: string;
        location_id: string;
        stocked_quantity: number;
        reserved_quantity: number;
      }[];
    };
  }[];
};

export default function ProductEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    requestedByEmail: string;
    requestedByName: string | null;
    requestedAt: string;
  } | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [published, setPublished] = useState(false);
  const [manageInventory, setManageInventory] = useState(true);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [upc, setUpc] = useState('');
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [newThumbnailFile, setNewThumbnailFile] = useState<{ uri: string; name: string; type: string } | null>(null);

  const [variant, setVariant] = useState<VariantShape | null>(null);
  const [reservedQty, setReservedQty] = useState<number>(0);
  const [releasingReservations, setReleasingReservations] = useState(false);

  const [organizeOptions, setOrganizeOptions] = useState<OrganizeOptions | null>(null);
  const [organize, setOrganize] = useState<ProductOrganize>({
    tagIds: [],
    typeId: null,
    collectionId: null,
    categoryIds: [],
  });
  const [attributes, setAttributes] = useState<ProductAttributes>({
    height: null,
    width: null,
    length: null,
    weight: null,
  });
  const [typeKey, setTypeKey] = useState<ProductTypeKey | null>(null);
  const [newArrival, setNewArrival] = useState(false);
  const [pads, setPads] = useState<SpeciesPads>(EMPTY_PADS);
  const [currentCategoryHandles, setCurrentCategoryHandles] = useState<
    Array<string | null>
  >([]);
  const [currentMetadata, setCurrentMetadata] = useState<
    Record<string, unknown>
  >({});

  useEffect(() => {
    listOrganizeOptions().then(setOrganizeOptions).catch(() => setOrganizeOptions(null));
  }, []);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const { product } = await sdk.admin.product.retrieve(id, {
        fields:
          'id,title,description,status,thumbnail,height,width,length,weight,origin_country,metadata,*tags,*type,*collection,categories.id,categories.name,categories.handle,*variants,*variants.prices,*variants.inventory_items.inventory.location_levels',
      } as any);
      const p: any = product;
      const categories = (p.categories || []) as Array<{
        id: string;
        name?: string;
        handle?: string | null;
      }>;
      setCurrentCategoryHandles(categories.map((c) => c.handle ?? null));
      setCurrentMetadata((p.metadata as Record<string, unknown>) || {});
      setTypeKey(deriveTypeKeyFromCategories(categories));
      setNewArrival(hasNewArrivalCategory(categories));
      setPads(padsFromMetadata(p.metadata as Record<string, unknown> | null));
      const dr = p.metadata?.delete_request;
      if (dr && dr.requested_by_email && dr.requested_at) {
        setPendingDelete({
          requestedByEmail: String(dr.requested_by_email),
          requestedByName: dr.requested_by_name ? String(dr.requested_by_name) : null,
          requestedAt: String(dr.requested_at),
        });
      } else {
        setPendingDelete(null);
      }
      setTitle(p.title || '');
      setDescription(p.description || '');
      setPublished(p.status === 'published');
      setThumbnail(p.thumbnail || null);
      const v: VariantShape | null = p.variants?.[0] || null;
      setVariant(v);
      setManageInventory(v?.manage_inventory ?? true);
      setUpc(v?.upc || '');
      const usd = v?.prices?.find((x) => x.currency_code === 'usd') || v?.prices?.[0];
      setPrice(usd ? usd.amount.toString() : '');
      const qty = (v?.inventory_items || []).reduce((sum, link) => {
        for (const lvl of link.inventory?.location_levels || []) {
          sum += Number(lvl.stocked_quantity ?? 0);
        }
        return sum;
      }, 0);
      setStock(String(qty));
      const reserved = (v?.inventory_items || []).reduce((sum, link) => {
        for (const lvl of link.inventory?.location_levels || []) {
          sum += Number(lvl.reserved_quantity ?? 0);
        }
        return sum;
      }, 0);
      setReservedQty(reserved);
      setOrganize({
        tagIds: (p.tags || []).map((t: any) => t.id),
        typeId: p.type?.id || null,
        collectionId: p.collection?.id || null,
        categoryIds: categories.map((c) => c.id),
      });
      setAttributes({
        height: p.height ?? null,
        width: p.width ?? null,
        length: p.length ?? null,
        weight: p.weight ?? null,
      });
    } catch (e: any) {
      setError(e?.message || 'Could not load product.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to change the image.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    const name = asset.fileName || `thumb-${Date.now()}.jpg`;
    const type = asset.mimeType || 'image/jpeg';
    setNewThumbnailFile({ uri: asset.uri, name, type });
    setThumbnail(asset.uri);
  };

  const uploadNewThumbnailIfAny = async (): Promise<string | null> => {
    if (!newThumbnailFile) return null;
    return uploadImage(newThumbnailFile);
  };

  const save = async () => {
    if (!id) return;
    if (!typeKey) {
      setError('Pick a category (Fish, Corals, Inverts, or Supplies).');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const uploadedUrl = await uploadNewThumbnailIfAny();
      const payload: any = {
        title,
        description,
        status: published ? 'published' : 'draft',
        origin_country: COUNTRY_OF_ORIGIN,
        tags: organize.tagIds.map((tid) => ({ id: tid })),
        type_id: organize.typeId,
        collection_id: organize.collectionId,
        categories: organize.categoryIds.map((cid) => ({ id: cid })),
        height: attributes.height,
        width: attributes.width,
        length: attributes.length,
        weight: attributes.weight,
      };
      if (uploadedUrl) payload.thumbnail = uploadedUrl;

      if (variant) {
        const amount = Number(price);
        const variantPayload: any = {
          id: variant.id,
          manage_inventory: manageInventory,
          upc: upc.trim() || null,
        };
        if (!Number.isNaN(amount)) {
          variantPayload.prices = [{ amount, currency_code: 'usd' }];
        }
        payload.variants = [variantPayload];
      }

      await sdk.admin.product.update(id, payload);

      await updateProductCategorization({
        productId: id,
        currentCategoryIds: organize.categoryIds,
        currentCategoryHandles,
        currentMetadata,
        typeKey,
        newArrival,
        pads: isLiveType(typeKey) ? pads : undefined,
        organizeOptions,
      });

      const nextStock = Math.max(0, Math.floor(Number(stock)));

      if (manageInventory && !Number.isNaN(nextStock) && variant) {
        const link = variant.inventory_items?.[0];
        const inventoryId = link?.inventory?.id;
        const existingLevel = link?.inventory?.location_levels?.[0];
        if (inventoryId) {
          if (existingLevel?.location_id) {
            await sdk.admin.inventoryItem.updateLevel(inventoryId, existingLevel.location_id, {
              stocked_quantity: nextStock,
            });
          } else {
            const defaults = await getStoreDefaults();
            if (!defaults.stockLocationId) {
              throw new Error(
                'No stock location exists. Open Medusa admin → Settings → Locations and add one.'
              );
            }
            await sdk.admin.inventoryItem.batchUpdateLevels(inventoryId, {
              create: [
                {
                  location_id: defaults.stockLocationId,
                  stocked_quantity: nextStock,
                },
              ],
            });
          }
        }
      }

      setNewThumbnailFile(null);
      router.navigate('/');
    } catch (e: any) {
      setError(e?.message || 'Could not save product.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (isAdmin) {
      Alert.alert(
        'Delete product?',
        `"${title}" will be removed from the site. This can't be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doAdminDelete },
        ]
      );
    } else {
      Alert.alert(
        'Request deletion?',
        `"${title}" will be flagged for an admin to review. The product stays visible until approved.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Request Delete', style: 'destructive', onPress: doRequestDelete },
        ]
      );
    }
  };

  const doAdminDelete = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await sdk.admin.product.delete(id);
      router.navigate('/');
    } catch (e: any) {
      setError(e?.message || 'Could not delete product.');
      setSaving(false);
    }
  };

  const doRequestDelete = async () => {
    if (!id || !user) return;
    setSaving(true);
    try {
      await requestDeleteProduct(id, {
        id: user.id,
        email: user.email,
        first_name: user.first_name ?? null,
        last_name: user.last_name ?? null,
      });
      Alert.alert('Requested', 'An admin will review this deletion.');
      router.navigate('/');
    } catch (e: any) {
      setError(e?.message || 'Could not submit delete request.');
      setSaving(false);
    }
  };

  const adjustStock = (delta: number) => {
    const n = Math.max(0, Math.floor(Number(stock) || 0) + delta);
    setStock(String(n));
  };

  const releaseReservations = async () => {
    if (!variant) return;
    const inventoryIds = (variant.inventory_items || [])
      .map((link) => link.inventory?.id)
      .filter((id): id is string => Boolean(id));
    if (inventoryIds.length === 0) {
      Alert.alert('Nothing to release', 'No inventory item is linked to this variant.');
      return;
    }
    Alert.alert(
      'Release reservations?',
      `This will clear ${reservedQty} unit(s) currently reserved by carts. Use this to recover stock that's stuck after abandoned checkouts.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release',
          style: 'destructive',
          onPress: async () => {
            setReleasingReservations(true);
            try {
              for (const invId of inventoryIds) {
                const { reservations } = (await sdk.admin.reservation.list({
                  inventory_item_id: [invId],
                  limit: 1000,
                } as any)) as { reservations: Array<{ id: string }> };
                for (const r of reservations) {
                  await sdk.admin.reservation.delete(r.id);
                }
              }
              await load();
              Alert.alert('Done', 'Reservations cleared.');
            } catch (e: any) {
              Alert.alert('Failed', e?.message || 'Could not release reservations.');
            } finally {
              setReleasingReservations(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={theme.color.gold} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {pendingDelete ? (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingTitle}>Delete Pending</Text>
            <Text style={styles.pendingSub}>
              Requested by {pendingDelete.requestedByName || pendingDelete.requestedByEmail} on{' '}
              {new Date(pendingDelete.requestedAt).toLocaleDateString()}
            </Text>
          </View>
        ) : null}

        <Pressable onPress={pickImage} style={styles.imageWrap}>
          {thumbnail ? (
            <Image source={{ uri: thumbnail }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Text style={styles.imagePlaceholderText}>Tap to add photo</Text>
            </View>
          )}
          <Text style={styles.imageHint}>Tap image to change</Text>
        </Pressable>

        <Text style={styles.label}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          placeholderTextColor={theme.color.textDim}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          style={[styles.input, styles.textarea]}
          placeholderTextColor={theme.color.textDim}
        />

        <Text style={styles.label}>Price (USD)</Text>
        <TextInput
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          style={styles.input}
          placeholder="0.00"
          placeholderTextColor={theme.color.textDim}
        />

        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.label}>Manage Inventory</Text>
            <Text style={styles.switchHint}>
              {manageInventory ? 'Track stock; can sell out.' : 'Always in stock.'}
            </Text>
          </View>
          <Switch
            value={manageInventory}
            onValueChange={setManageInventory}
            trackColor={{ false: theme.color.border, true: theme.color.gold }}
            thumbColor="#fff"
          />
        </View>

        {manageInventory ? (
          <>
            <Text style={styles.label}>Inventory</Text>
            <View style={styles.stepperRow}>
              <Pressable onPress={() => adjustStock(-1)} style={styles.stepBtn}>
                <Text style={styles.stepBtnText}>−</Text>
              </Pressable>
              <TextInput
                value={stock}
                onChangeText={setStock}
                keyboardType="number-pad"
                style={[styles.input, styles.stockInput]}
              />
              <Pressable onPress={() => adjustStock(1)} style={styles.stepBtn}>
                <Text style={styles.stepBtnText}>+</Text>
              </Pressable>
            </View>
            {reservedQty > 0 ? (
              <View style={styles.reservedRow}>
                <Text style={styles.reservedText}>
                  {reservedQty} unit{reservedQty === 1 ? '' : 's'} reserved by carts
                </Text>
                <Pressable
                  onPress={releaseReservations}
                  disabled={releasingReservations}
                  style={({ pressed }) => [
                    styles.releaseBtn,
                    (releasingReservations || pressed) && styles.releaseBtnPressed,
                  ]}
                >
                  {releasingReservations ? (
                    <ActivityIndicator color={theme.color.gold} size="small" />
                  ) : (
                    <Text style={styles.releaseBtnText}>Release</Text>
                  )}
                </Pressable>
              </View>
            ) : null}
          </>
        ) : null}

        <View style={styles.switchRow}>
          <Text style={styles.label}>Published (visible on website)</Text>
          <Switch
            value={published}
            onValueChange={setPublished}
            trackColor={{ false: theme.color.border, true: theme.color.gold }}
            thumbColor="#fff"
          />
        </View>

        <UpcField value={upc} onChange={setUpc} />

        <TypeCategoryFields
          value={typeKey}
          onChange={setTypeKey}
          newArrival={newArrival}
          onNewArrivalChange={setNewArrival}
        />

        {isLiveType(typeKey) && <PadFields value={pads} onChange={setPads} />}

        <OrganizeFields options={organizeOptions} value={organize} onChange={setOrganize} />
        <AttributeFields value={attributes} onChange={setAttributes} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={save}
          disabled={saving}
          style={({ pressed }) => [styles.saveBtn, (saving || pressed) && styles.saveBtnPressed]}
        >
          {saving ? (
            <ActivityIndicator color={theme.color.gold} />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </Pressable>

        <Pressable
          onPress={confirmDelete}
          disabled={saving || (!isAdmin && !!pendingDelete)}
          style={({ pressed }) => [
            styles.deleteBtn,
            pressed && styles.saveBtnPressed,
            !isAdmin && !!pendingDelete && styles.deleteBtnDisabled,
          ]}
        >
          <Text style={styles.deleteBtnText}>
            {isAdmin
              ? 'Delete Product'
              : pendingDelete
                ? 'Delete Already Requested'
                : 'Request Delete'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.bg,
  },
  content: { padding: theme.space.lg, paddingBottom: theme.space.xxl },
  imageWrap: { alignItems: 'center', marginBottom: theme.space.lg },
  image: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 360,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.card,
  },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  imagePlaceholderText: { color: theme.color.textMuted },
  imageHint: { color: theme.color.textDim, fontSize: theme.font.xs, marginTop: theme.space.xs },
  label: {
    color: theme.color.text,
    fontSize: theme.font.sm,
    marginTop: theme.space.md,
    marginBottom: theme.space.xs,
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
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.card,
    borderWidth: 1,
    borderColor: theme.color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { color: theme.color.gold, fontSize: theme.font.xl, fontWeight: '700' },
  stockInput: { flex: 1, textAlign: 'center', fontSize: theme.font.lg },
  reservedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.space.sm,
    paddingHorizontal: theme.space.sm,
    paddingVertical: theme.space.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.color.border,
    backgroundColor: 'rgba(255,215,0,0.05)',
    gap: theme.space.md,
  },
  reservedText: {
    color: theme.color.textDim,
    fontSize: theme.font.sm,
    flex: 1,
  },
  releaseBtn: {
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.color.gold,
  },
  releaseBtnPressed: { opacity: 0.6 },
  releaseBtnText: {
    color: theme.color.gold,
    fontSize: theme.font.sm,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.space.lg,
    gap: theme.space.md,
  },
  switchText: { flex: 1 },
  switchHint: { color: theme.color.textDim, fontSize: theme.font.xs, marginBottom: theme.space.xs },
  error: { color: theme.color.danger, marginTop: theme.space.md },
  saveBtn: {
    marginTop: theme.space.xl,
    backgroundColor: theme.color.text,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    alignItems: 'center',
  },
  saveBtnPressed: { opacity: 0.85 },
  saveBtnText: { color: theme.color.gold, fontSize: theme.font.md, fontWeight: '700' },
  deleteBtn: {
    marginTop: theme.space.md,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.color.danger,
  },
  deleteBtnText: { color: theme.color.danger, fontSize: theme.font.md, fontWeight: '600' },
  deleteBtnDisabled: { opacity: 0.5 },
  pendingBanner: {
    borderWidth: 1,
    borderColor: theme.color.gold,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    marginBottom: theme.space.lg,
    backgroundColor: 'rgba(212,175,55,0.08)',
  },
  pendingTitle: {
    color: theme.color.gold,
    fontWeight: '700',
    fontSize: theme.font.md,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  pendingSub: { color: theme.color.textMuted, fontSize: theme.font.xs },
});
