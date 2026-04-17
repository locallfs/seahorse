import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '@/lib/theme';
import {
  COUNTRY_OF_ORIGIN_LABEL,
  type OrganizeOption,
  type OrganizeOptions,
  type ProductAttributes,
  type ProductOrganize,
} from '@/lib/products';

type OrganizeProps = {
  options: OrganizeOptions | null;
  value: ProductOrganize;
  onChange: (next: ProductOrganize) => void;
};

export function OrganizeFields({ options, value, onChange }: OrganizeProps) {
  const toggleTag = (id: string) => {
    const has = value.tagIds.includes(id);
    onChange({
      ...value,
      tagIds: has ? value.tagIds.filter((x) => x !== id) : [...value.tagIds, id],
    });
  };
  const toggleCategory = (id: string) => {
    const has = value.categoryIds.includes(id);
    onChange({
      ...value,
      categoryIds: has ? value.categoryIds.filter((x) => x !== id) : [...value.categoryIds, id],
    });
  };
  const setType = (id: string) => {
    onChange({ ...value, typeId: value.typeId === id ? null : id });
  };
  const setCollection = (id: string) => {
    onChange({ ...value, collectionId: value.collectionId === id ? null : id });
  };

  return (
    <View>
      <Text style={styles.sectionHeader}>Organize</Text>

      <ChipGroup
        label="Tags"
        options={options?.tags || []}
        isSelected={(id) => value.tagIds.includes(id)}
        onToggle={toggleTag}
        emptyHint="No tags exist yet. Create them in Medusa admin."
      />

      <ChipGroup
        label="Type"
        options={options?.types || []}
        isSelected={(id) => value.typeId === id}
        onToggle={setType}
        emptyHint="No types exist yet."
      />

      <ChipGroup
        label="Collection"
        options={options?.collections || []}
        isSelected={(id) => value.collectionId === id}
        onToggle={setCollection}
        emptyHint="No collections exist yet."
      />

      <ChipGroup
        label="Categories"
        options={options?.categories || []}
        isSelected={(id) => value.categoryIds.includes(id)}
        onToggle={toggleCategory}
        emptyHint="No categories exist yet."
      />
    </View>
  );
}

type AttributesProps = {
  value: ProductAttributes;
  onChange: (next: ProductAttributes) => void;
};

export function AttributeFields({ value, onChange }: AttributesProps) {
  const update = (key: keyof ProductAttributes) => (text: string) => {
    const trimmed = text.trim();
    if (trimmed === '') {
      onChange({ ...value, [key]: null });
      return;
    }
    const n = Number(trimmed);
    onChange({ ...value, [key]: Number.isFinite(n) ? n : null });
  };

  return (
    <View>
      <Text style={styles.sectionHeader}>Attributes</Text>

      <View style={styles.grid}>
        <NumberField label="Height" value={value.height} onChangeText={update('height')} />
        <NumberField label="Width" value={value.width} onChangeText={update('width')} />
      </View>
      <View style={styles.grid}>
        <NumberField label="Length" value={value.length} onChangeText={update('length')} />
        <NumberField label="Weight" value={value.weight} onChangeText={update('weight')} />
      </View>

      <Text style={styles.label}>Country of Origin</Text>
      <View style={[styles.input, styles.lockedField]}>
        <Text style={styles.lockedText}>{COUNTRY_OF_ORIGIN_LABEL}</Text>
        <Text style={styles.lockedHint}>Locked</Text>
      </View>
    </View>
  );
}

function NumberField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: number | null;
  onChangeText: (text: string) => void;
}) {
  return (
    <View style={styles.gridItem}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value == null ? '' : String(value)}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        style={styles.input}
        placeholder="0"
        placeholderTextColor={theme.color.textDim}
      />
    </View>
  );
}

function ChipGroup({
  label,
  options,
  isSelected,
  onToggle,
  emptyHint,
}: {
  label: string;
  options: OrganizeOption[];
  isSelected: (id: string) => boolean;
  onToggle: (id: string) => void;
  emptyHint: string;
}) {
  return (
    <View style={styles.chipGroup}>
      <Text style={styles.label}>{label}</Text>
      {options.length === 0 ? (
        <Text style={styles.chipEmpty}>{emptyHint}</Text>
      ) : (
        <View style={styles.chipRow}>
          {options.map((opt) => {
            const active = isSelected(opt.id);
            return (
              <Pressable
                key={opt.id}
                onPress={() => onToggle(opt.id)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    color: theme.color.gold,
    fontSize: theme.font.md,
    fontWeight: '700',
    marginTop: theme.space.xl,
    marginBottom: theme.space.sm,
    letterSpacing: 0.5,
  },
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
  grid: { flexDirection: 'row', gap: theme.space.md },
  gridItem: { flex: 1 },
  lockedField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lockedText: { color: theme.color.text, fontSize: theme.font.md, fontWeight: '600' },
  lockedHint: { color: theme.color.textDim, fontSize: theme.font.xs },
  chipGroup: { marginBottom: theme.space.xs },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
  chip: {
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.color.border,
    backgroundColor: theme.color.card,
  },
  chipActive: {
    backgroundColor: theme.color.gold,
    borderColor: theme.color.gold,
  },
  chipText: { color: theme.color.text, fontSize: theme.font.sm },
  chipTextActive: { color: '#000', fontWeight: '700' },
  chipEmpty: {
    color: theme.color.textDim,
    fontSize: theme.font.xs,
    fontStyle: 'italic',
  },
});
