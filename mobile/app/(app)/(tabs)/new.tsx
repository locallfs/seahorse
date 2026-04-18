import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  createProduct,
  EMPTY_PADS,
  isLiveType,
  listOrganizeOptions,
  type OrganizeOptions,
  type ProductAttributes,
  type ProductOrganize,
  type ProductTypeKey,
  type SpeciesPads,
} from '@/lib/products';
import { theme } from '@/lib/theme';
import {
  AttributeFields,
  OrganizeFields,
  PadFields,
  TypeCategoryFields,
} from '@/lib/ProductFormFields';

export default function NewProductScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [published, setPublished] = useState(true);
  const [manageInventory, setManageInventory] = useState(true);
  const [file, setFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    listOrganizeOptions().then(setOrganizeOptions).catch(() => setOrganizeOptions(null));
  }, []);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Allow photo library access to upload an image.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setFile({
      uri: asset.uri,
      name: asset.fileName || `photo-${Date.now()}.jpg`,
      type: asset.mimeType || 'image/jpeg',
    });
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError('Allow camera access to take a photo.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setFile({
      uri: asset.uri,
      name: asset.fileName || `photo-${Date.now()}.jpg`,
      type: asset.mimeType || 'image/jpeg',
    });
  };

  const reset = () => {
    setTitle('');
    setDescription('');
    setPrice('');
    setStock('0');
    setPublished(true);
    setManageInventory(true);
    setFile(null);
    setError(null);
    setOrganize({ tagIds: [], typeId: null, collectionId: null, categoryIds: [] });
    setAttributes({ height: null, width: null, length: null, weight: null });
    setTypeKey(null);
    setNewArrival(false);
    setPads(EMPTY_PADS);
  };

  const submit = async () => {
    setError(null);
    if (!title.trim()) return setError('Title is required.');
    if (!typeKey) return setError('Pick a category (Fish, Corals, Inverts, or Supplies).');
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0) return setError('Enter a valid price.');
    const stockNum = Math.max(0, Math.floor(Number(stock)));
    if (Number.isNaN(stockNum)) return setError('Enter a valid stock count.');

    setSaving(true);
    try {
      await createProduct({
        title: title.trim(),
        description: description.trim(),
        priceUsd: priceNum,
        stock: stockNum,
        published,
        manageInventory,
        thumbnail: file,
        organize,
        attributes,
        typeKey,
        newArrival,
        pads: isLiveType(typeKey) ? pads : undefined,
        organizeOptions,
      });
      reset();
      router.replace('/(app)/(tabs)');
    } catch (e: any) {
      setError(e?.message || 'Could not create product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>New Product</Text>

        <Text style={styles.label}>Thumbnail</Text>
        <View style={styles.imageRow}>
          {file ? (
            <Image source={{ uri: file.uri }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbEmpty]}>
              <Text style={styles.thumbEmptyText}>No photo</Text>
            </View>
          )}
          <View style={styles.imageBtns}>
            <Pressable onPress={takePhoto} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>Take Photo</Text>
            </Pressable>
            <Pressable onPress={pickImage} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>Choose Photo</Text>
            </Pressable>
            {file ? (
              <Pressable onPress={() => setFile(null)} style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <Text style={styles.label}>Status</Text>
        <View style={styles.segment}>
          <Pressable
            onPress={() => setPublished(false)}
            style={[styles.segmentBtn, !published && styles.segmentBtnActive]}
          >
            <Text style={[styles.segmentText, !published && styles.segmentTextActive]}>
              Draft
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setPublished(true)}
            style={[styles.segmentBtn, published && styles.segmentBtnActive]}
          >
            <Text style={[styles.segmentText, published && styles.segmentTextActive]}>
              Published
            </Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          placeholder="e.g. Banggai Cardinalfish"
          placeholderTextColor={theme.color.textDim}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          style={[styles.input, styles.textarea]}
          placeholder="Details, size, care notes…"
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
            <Text style={styles.label}>Starting Stock</Text>
            <TextInput
              value={stock}
              onChangeText={setStock}
              keyboardType="number-pad"
              style={styles.input}
              placeholder="0"
              placeholderTextColor={theme.color.textDim}
            />
          </>
        ) : null}

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
          onPress={submit}
          disabled={saving}
          style={({ pressed }) => [styles.saveBtn, (saving || pressed) && styles.saveBtnPressed]}
        >
          {saving ? (
            <ActivityIndicator color={theme.color.gold} />
          ) : (
            <Text style={styles.saveBtnText}>Create Product</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  content: { padding: theme.space.lg, paddingBottom: theme.space.xxl },
  heading: { color: theme.color.gold, fontSize: theme.font.xl, fontWeight: '700', marginBottom: theme.space.md },
  imageRow: { flexDirection: 'row', gap: theme.space.md, alignItems: 'center', marginBottom: theme.space.md },
  thumb: { width: 96, height: 96, borderRadius: theme.radius.md, backgroundColor: theme.color.card },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.color.border },
  thumbEmptyText: { color: theme.color.textDim, fontSize: theme.font.xs },
  imageBtns: { flex: 1, gap: theme.space.sm },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space.sm,
    alignItems: 'center',
  },
  secondaryBtnText: { color: theme.color.text, fontSize: theme.font.sm },
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
  segment: {
    flexDirection: 'row',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.border,
    overflow: 'hidden',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: theme.space.md,
    alignItems: 'center',
    backgroundColor: theme.color.card,
  },
  segmentBtnActive: {
    backgroundColor: theme.color.gold,
  },
  segmentText: {
    color: theme.color.textMuted,
    fontSize: theme.font.sm,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#000',
    fontWeight: '700',
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
});
