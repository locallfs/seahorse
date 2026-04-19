import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { theme } from '@/lib/theme';
import {
  COUNTRY_OF_ORIGIN_LABEL,
  FLOW_OPTIONS,
  LIGHTING_OPTIONS,
  PLACEMENT_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  type OrganizeOption,
  type OrganizeOptions,
  type ProductAttributes,
  type ProductOrganize,
  type ProductTypeKey,
  type SpeciesPads,
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

type TypeCategoryProps = {
  value: ProductTypeKey | null;
  onChange: (next: ProductTypeKey | null) => void;
  newArrival: boolean;
  onNewArrivalChange: (next: boolean) => void;
};

export function TypeCategoryFields({
  value,
  onChange,
  newArrival,
  onNewArrivalChange,
}: TypeCategoryProps) {
  return (
    <View>
      <Text style={styles.sectionHeader}>Category</Text>
      <Text style={styles.helpText}>
        Pick one — controls shipping rules, live-animal detection, and which info pads show.
      </Text>
      <View style={styles.chipRow}>
        {PRODUCT_TYPE_OPTIONS.map((opt) => {
          const active = value === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => onChange(active ? null : opt.key)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Mark as New Arrival</Text>
          <Text style={styles.helpText}>
            Adds to the New Arrivals page in addition to its category.
          </Text>
        </View>
        <Switch
          value={newArrival}
          onValueChange={onNewArrivalChange}
          trackColor={{ false: theme.color.border, true: theme.color.gold }}
          thumbColor="#fff"
        />
      </View>
    </View>
  );
}

type PadsProps = {
  value: SpeciesPads;
  onChange: (next: SpeciesPads) => void;
};

const CARE_LEVELS = ['Easy', 'Moderate', 'Difficult', 'Expert'];
const REEF_SAFE = ['Yes', 'With Caution', 'No'];
const TEMPERAMENTS = ['Peaceful', 'Semi-Aggressive', 'Aggressive'];

type MultiKey = 'flow' | 'placement' | 'lighting';

export function PadFields({ value, onChange }: PadsProps) {
  const set = (
    key: Exclude<keyof SpeciesPads, MultiKey>,
    next: string,
  ) => {
    onChange({ ...value, [key]: next });
  };
  const toggleMulti = (key: MultiKey, option: string) => {
    const current = value[key];
    const next = current.includes(option)
      ? current.filter((v) => v !== option)
      : [...current, option];
    onChange({ ...value, [key]: next });
  };

  return (
    <View>
      <Text style={styles.sectionHeader}>Species Info</Text>
      <Text style={styles.helpText}>
        Leave a field blank to hide it on the storefront. Only filled fields render.
      </Text>

      <Text style={styles.label}>Care Level</Text>
      <PillChoice
        options={CARE_LEVELS}
        value={value.care_level}
        onChange={(v) => set('care_level', v)}
      />

      <Text style={styles.label}>Reef Safe</Text>
      <PillChoice
        options={REEF_SAFE}
        value={value.reef_safe}
        onChange={(v) => set('reef_safe', v)}
      />

      <Text style={styles.label}>Min Tank Size</Text>
      <TextInput
        value={value.min_tank_size}
        onChangeText={(v) => set('min_tank_size', v)}
        style={styles.input}
        placeholder="e.g. 75 gallons"
        placeholderTextColor={theme.color.textDim}
      />

      <Text style={styles.label}>Max Size</Text>
      <TextInput
        value={value.max_size}
        onChangeText={(v) => set('max_size', v)}
        style={styles.input}
        placeholder={'e.g. 8"'}
        placeholderTextColor={theme.color.textDim}
      />

      <Text style={styles.label}>Diet</Text>
      <TextInput
        value={value.diet}
        onChangeText={(v) => set('diet', v)}
        style={styles.input}
        placeholder="e.g. Carnivore"
        placeholderTextColor={theme.color.textDim}
      />

      <Text style={styles.label}>Temperament</Text>
      <PillChoice
        options={TEMPERAMENTS}
        value={value.temperament}
        onChange={(v) => set('temperament', v)}
      />

      <Text style={styles.label}>Range</Text>
      <TextInput
        value={value.range}
        onChangeText={(v) => set('range', v)}
        style={styles.input}
        placeholder="e.g. Indo-Pacific"
        placeholderTextColor={theme.color.textDim}
      />

      <Text style={styles.label}>Water Conditions</Text>
      <TextInput
        value={value.water_conditions}
        onChangeText={(v) => set('water_conditions', v)}
        multiline
        style={[styles.input, styles.textarea]}
        placeholder="e.g. 72-78°F, dKH 8-12, pH 8.1-8.4, sg 1.020-1.025"
        placeholderTextColor={theme.color.textDim}
      />

      <Text style={styles.label}>Flow (multi-select)</Text>
      <MultiPillChoice
        options={FLOW_OPTIONS}
        selected={value.flow}
        onToggle={(v) => toggleMulti('flow', v)}
      />

      <Text style={styles.label}>Placement (multi-select)</Text>
      <MultiPillChoice
        options={PLACEMENT_OPTIONS}
        selected={value.placement}
        onToggle={(v) => toggleMulti('placement', v)}
      />

      <Text style={styles.label}>Lighting (multi-select)</Text>
      <MultiPillChoice
        options={LIGHTING_OPTIONS}
        selected={value.lighting}
        onToggle={(v) => toggleMulti('lighting', v)}
      />
    </View>
  );
}

function MultiPillChoice({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (next: string) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <Pressable
            key={opt}
            onPress={() => onToggle(opt)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PillChoice({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(active ? '' : opt)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {opt}
            </Text>
          </Pressable>
        );
      })}
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
  helpText: {
    color: theme.color.textDim,
    fontSize: theme.font.xs,
    marginBottom: theme.space.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    marginTop: theme.space.md,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
});
