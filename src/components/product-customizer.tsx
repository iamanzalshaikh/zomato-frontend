import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CaseUi } from '@/constants/caseUi';
import { useThemeContext } from '@/context/ThemeContext';

export type ProductCustomizerProps = {
  businessType: string;
  basePrice: number;
  onPriceChange?: (additionalPrice: number) => void;
};

type FieldType = 'radio' | 'checkbox' | 'toggle' | 'stepper' | 'textarea' | 'upload' | 'dropdown' | 'currency';

interface Option {
  label: string;
  price?: number;
}

interface FieldDef {
  id: string;
  label: string;
  type: FieldType;
  options?: Option[];
  placeholder?: string;
}

const CATEGORY_CONFIGS: Record<string, FieldDef[]> = {
  RESTAURANT: [
    { id: 'portionSize', label: 'Portion Size', type: 'radio', options: [{ label: 'Regular', price: 0 }, { label: 'Medium', price: 150 }, { label: 'Large', price: 300 }] },
    { id: 'spiceLevel', label: 'Spice Level', type: 'radio', options: [{ label: 'Mild' }, { label: 'Medium' }, { label: 'Hot' }] },
    { id: 'removeIngredients', label: 'Remove Ingredients', type: 'checkbox', options: [{ label: 'No Onion' }, { label: 'No Tomato' }, { label: 'No Pickles' }, { label: 'No Lettuce' }] },
    { id: 'extraToppings', label: 'Extra Toppings', type: 'checkbox', options: [{ label: 'Cheese', price: 50 }, { label: 'Bacon', price: 120 }, { label: 'Sauce', price: 30 }, { label: 'Jalapeños', price: 40 }] },
    { id: 'sides', label: 'Add Sides', type: 'checkbox', options: [{ label: 'Fries', price: 150 }, { label: 'Nuggets', price: 200 }, { label: 'Salad', price: 120 }] },
    { id: 'drinks', label: 'Add Drinks', type: 'checkbox', options: [{ label: 'Coke', price: 100 }, { label: 'Sprite', price: 100 }, { label: 'Water', price: 50 }] },
    { id: 'instructions', label: 'Special Instructions', type: 'textarea', placeholder: 'E.g. Please make it extra crispy...' }
  ],
  PHARMACY: [
    { id: 'packSize', label: 'Pack Size', type: 'radio', options: [{ label: '10 Tablets', price: 0 }, { label: '20 Tablets', price: 400 }, { label: '50 Tablets', price: 900 }] },
    { id: 'qty', label: 'Quantity', type: 'stepper' },
    { id: 'prescription', label: 'Prescription Upload', type: 'upload' },
    { id: 'genericAlt', label: 'Generic Alternative', type: 'toggle', placeholder: 'Allow Generic Substitute' },
    { id: 'related', label: 'Add Related Products', type: 'checkbox', options: [{ label: 'Vitamin C', price: 350 }, { label: 'Face Mask', price: 50 }, { label: 'Sanitizer', price: 150 }] },
    { id: 'notes', label: 'Notes for Pharmacist', type: 'textarea', placeholder: 'E.g. Patient is allergic to...' }
  ],
  GROCERY: [
    { id: 'weight', label: 'Weight', type: 'radio', options: [{ label: '250g', price: 0 }, { label: '500g', price: 200 }, { label: '1kg', price: 400 }, { label: '2kg', price: 750 }] },
    { id: 'quality', label: 'Quality Preference', type: 'radio', options: [{ label: 'Standard', price: 0 }, { label: 'Premium', price: 100 }, { label: 'Organic', price: 250 }] },
    { id: 'ripeness', label: 'Ripeness', type: 'radio', options: [{ label: 'Raw' }, { label: 'Semi-ripe' }, { label: 'Ripe' }] },
    { id: 'replacement', label: 'Allow Replacement', type: 'toggle', placeholder: 'Allow Similar Product if out of stock' },
    { id: 'fbt', label: 'Frequently Bought Together', type: 'checkbox', options: [{ label: 'Bread', price: 150 }, { label: 'Butter', price: 250 }, { label: 'Milk', price: 180 }] },
    { id: 'notes', label: 'Delivery Notes', type: 'textarea', placeholder: 'E.g. Leave at the front door...' }
  ],
  STORE: [
    { id: 'packSize', label: 'Pack Size', type: 'radio', options: [{ label: 'Single', price: 0 }, { label: 'Pack of 6', price: 500 }, { label: 'Pack of 12', price: 950 }] },
    { id: 'flavor', label: 'Flavor / Variant', type: 'radio', options: [{ label: 'Original' }, { label: 'Spicy' }, { label: 'Cheese' }] },
    { id: 'replacement', label: 'Allow Replacement', type: 'toggle', placeholder: 'Allow Similar Replacement' },
    { id: 'bundle', label: 'Bundle Offer', type: 'checkbox', options: [{ label: 'Add Chips', price: 100 }, { label: 'Add Soft Drink', price: 80 }, { label: 'Add Chocolate', price: 120 }] },
    { id: 'notes', label: 'Special Instructions', type: 'textarea', placeholder: 'Any specific requests?' }
  ],
  ELECTRONICS: [
    { id: 'color', label: 'Color', type: 'radio', options: [{ label: 'Black' }, { label: 'Silver' }, { label: 'Blue' }] },
    { id: 'storage', label: 'Storage', type: 'radio', options: [{ label: '128GB', price: 0 }, { label: '256GB', price: 5000 }, { label: '512GB', price: 12000 }] },
    { id: 'ram', label: 'RAM', type: 'radio', options: [{ label: '8GB', price: 0 }, { label: '16GB', price: 4000 }] },
    { id: 'warranty', label: 'Warranty Plan', type: 'radio', options: [{ label: 'Standard (1 Yr)', price: 0 }, { label: 'Extended (2 Yrs)', price: 3500 }] },
    { id: 'accessories', label: 'Add Accessories', type: 'checkbox', options: [{ label: 'Charger', price: 1500 }, { label: 'Mouse', price: 800 }, { label: 'Keyboard', price: 2000 }, { label: 'Case', price: 1200 }] },
    { id: 'giftWrap', label: 'Gift Wrap', type: 'toggle', placeholder: 'Add premium gift wrapping (+JMD 200)' },
    { id: 'notes', label: 'Order Notes', type: 'textarea', placeholder: 'Delivery instructions...' }
  ],
  BEAUTY: [
    { id: 'shade', label: 'Shade / Color', type: 'radio', options: [{ label: 'Fair' }, { label: 'Medium' }, { label: 'Deep' }] },
    { id: 'size', label: 'Size', type: 'radio', options: [{ label: '30ml', price: 0 }, { label: '50ml', price: 800 }, { label: '100ml', price: 1500 }] },
    { id: 'fragrance', label: 'Fragrance', type: 'radio', options: [{ label: 'Floral' }, { label: 'Citrus' }, { label: 'Woody' }] },
    { id: 'skinType', label: 'Skin Type', type: 'radio', options: [{ label: 'Dry' }, { label: 'Oily' }, { label: 'Normal' }] },
    { id: 'recommended', label: 'Recommended Products', type: 'checkbox', options: [{ label: 'Cleanser', price: 1200 }, { label: 'Moisturizer', price: 1500 }, { label: 'Sunscreen', price: 1800 }] },
    { id: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Allergies or preferences...' }
  ],
  FLOWERS: [
    { id: 'size', label: 'Bouquet Size', type: 'radio', options: [{ label: 'Small', price: 0 }, { label: 'Medium', price: 800 }, { label: 'Large', price: 1600 }] },
    { id: 'color', label: 'Flower Color', type: 'radio', options: [{ label: 'Red' }, { label: 'Pink' }, { label: 'White' }, { label: 'Mixed' }] },
    { id: 'wrap', label: 'Wrapping Style', type: 'radio', options: [{ label: 'Classic', price: 0 }, { label: 'Premium', price: 250 }, { label: 'Luxury', price: 500 }] },
    { id: 'card', label: 'Greeting Card', type: 'toggle', placeholder: 'Include a greeting card (+JMD 100)' },
    { id: 'msg', label: 'Greeting Message', type: 'textarea', placeholder: 'Write your message here...' },
    { id: 'gifts', label: 'Add Gifts', type: 'checkbox', options: [{ label: 'Teddy Bear', price: 800 }, { label: 'Chocolates', price: 600 }] }
  ],
  GIFTS: [
    { id: 'wrap', label: 'Gift Wrap', type: 'toggle', placeholder: 'Premium Wrapping (+JMD 250)' },
    { id: 'occasion', label: 'Occasion', type: 'radio', options: [{ label: 'Birthday' }, { label: 'Anniversary' }, { label: 'Graduation' }] },
    { id: 'msg', label: 'Personalized Message', type: 'textarea', placeholder: 'To: ... From: ...' },
    { id: 'addons', label: 'Add-ons', type: 'checkbox', options: [{ label: 'Flowers', price: 1500 }, { label: 'Chocolate Box', price: 1200 }, { label: 'Balloon', price: 300 }] },
    { id: 'instructions', label: 'Gift Instructions', type: 'textarea', placeholder: 'Delivery instructions...' }
  ],
  PET_SUPPLIES: [
    { id: 'packSize', label: 'Pack Size', type: 'radio', options: [{ label: 'Small', price: 0 }, { label: 'Medium', price: 500 }, { label: 'Large', price: 1200 }] },
    { id: 'flavor', label: 'Flavor', type: 'radio', options: [{ label: 'Chicken' }, { label: 'Beef' }, { label: 'Fish' }] },
    { id: 'age', label: 'Pet Age', type: 'radio', options: [{ label: 'Puppy' }, { label: 'Adult' }, { label: 'Senior' }] },
    { id: 'size', label: 'Pet Size', type: 'radio', options: [{ label: 'Small' }, { label: 'Medium' }, { label: 'Large' }] },
    { id: 'recommended', label: 'Recommended', type: 'checkbox', options: [{ label: 'Treats', price: 350 }, { label: 'Toy', price: 450 }, { label: 'Shampoo', price: 600 }] },
    { id: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Special instructions...' }
  ],
  STATIONERY: [
    { id: 'color', label: 'Color', type: 'radio', options: [{ label: 'Black' }, { label: 'Blue' }, { label: 'Red' }] },
    { id: 'packSize', label: 'Quantity / Pack Size', type: 'radio', options: [{ label: 'Single', price: 0 }, { label: 'Pack of 3', price: 150 }, { label: 'Pack of 10', price: 400 }] },
    { id: 'paper', label: 'Notebook Type', type: 'radio', options: [{ label: 'Ruled' }, { label: 'Plain' }, { label: 'Grid' }] },
    { id: 'ink', label: 'Pen Ink Color', type: 'radio', options: [{ label: 'Blue' }, { label: 'Black' }, { label: 'Red' }] },
    { id: 'bundle', label: 'Bundle Essentials', type: 'checkbox', options: [{ label: 'Pencil', price: 50 }, { label: 'Eraser', price: 30 }, { label: 'Sharpener', price: 40 }] },
    { id: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Any specific requirements?' }
  ],
  HARDWARE: [
    { id: 'size', label: 'Size', type: 'radio', options: [{ label: 'Small', price: 0 }, { label: 'Medium', price: 100 }, { label: 'Large', price: 250 }] },
    { id: 'material', label: 'Material', type: 'radio', options: [{ label: 'Steel' }, { label: 'Aluminium' }, { label: 'Plastic' }] },
    { id: 'color', label: 'Color', type: 'radio', options: [{ label: 'Silver' }, { label: 'Black' }, { label: 'White' }] },
    { id: 'qty', label: 'Pack Quantity', type: 'stepper' },
    { id: 'related', label: 'Related Items', type: 'checkbox', options: [{ label: 'Screws', price: 150 }, { label: 'Drill Bits', price: 450 }, { label: 'Tape', price: 200 }] },
    { id: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Job requirements...' }
  ],
  GET_ANYTHING: [
    { id: 'photo', label: 'Product Photo (Optional)', type: 'upload' },
    { id: 'desc', label: 'Product Name / Description', type: 'textarea', placeholder: 'What exactly do you need?' },
    { id: 'store', label: 'Preferred Store (Optional)', type: 'dropdown', placeholder: 'Select or type a store name' },
    { id: 'budget', label: 'Estimated Budget', type: 'currency', placeholder: 'E.g. 5000' },
    { id: 'priority', label: 'Delivery Priority', type: 'radio', options: [{ label: 'Normal (Standard Fee)', price: 0 }, { label: 'Express (+JMD 500)', price: 500 }] },
    { id: 'notes', label: 'Additional Instructions', type: 'textarea', placeholder: 'Pickup location or special handling...' }
  ]
};

// Aliases for fallback
const RESOLVED_CATEGORY = (type: string) => {
  const t = type.toUpperCase();
  if (t.includes('RESTAURANT') || t.includes('FOOD')) return 'RESTAURANT';
  if (t.includes('PHARMACY')) return 'PHARMACY';
  if (t.includes('GROCERY')) return 'GROCERY';
  if (t.includes('STORE')) return 'STORE';
  if (t.includes('ELECTRONIC')) return 'ELECTRONICS';
  if (t.includes('BEAUTY') || t.includes('COSMETIC')) return 'BEAUTY';
  if (t.includes('FLOWER')) return 'FLOWERS';
  if (t.includes('GIFT')) return 'GIFTS';
  if (t.includes('PET')) return 'PET_SUPPLIES';
  if (t.includes('STATIONERY') || t.includes('BOOK')) return 'STATIONERY';
  if (t.includes('HARDWARE')) return 'HARDWARE';
  if (t.includes('GET_ANYTHING')) return 'GET_ANYTHING';
  return 'STORE'; // Fallback
};

export function ProductCustomizer({ businessType, basePrice, onPriceChange }: ProductCustomizerProps) {
  const { colors, activeScheme } = useThemeContext();
  const isDark = activeScheme === 'dark';
  
  const categoryKey = RESOLVED_CATEGORY(businessType);
  const fields = CATEGORY_CONFIGS[categoryKey] || CATEGORY_CONFIGS['STORE'];

  // State maps
  const [radioSelections, setRadioSelections] = useState<Record<string, string>>({});
  const [checkboxSelections, setCheckboxSelections] = useState<Record<string, Record<string, boolean>>>({});
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [steppers, setSteppers] = useState<Record<string, number>>({});

  // Initialize defaults
  useEffect(() => {
    const initRadio: Record<string, string> = {};
    fields.forEach(f => {
      if (f.type === 'radio' && f.options && f.options.length > 0) {
        initRadio[f.id] = f.options[0].label;
      }
      if (f.type === 'stepper') {
        setSteppers(prev => ({ ...prev, [f.id]: 1 }));
      }
    });
    setRadioSelections(initRadio);
  }, [categoryKey]);

  // Calculate live additional price
  useEffect(() => {
    let additional = 0;
    
    fields.forEach(f => {
      if (f.type === 'radio' && f.options) {
        const selectedLabel = radioSelections[f.id];
        const opt = f.options.find(o => o.label === selectedLabel);
        if (opt?.price) additional += opt.price;
      }
      if (f.type === 'checkbox' && f.options) {
        const group = checkboxSelections[f.id] || {};
        f.options.forEach(opt => {
          if (group[opt.label] && opt.price) additional += opt.price;
        });
      }
      // Special manual prices for toggles if we had them, currently only gift wrap has +200 logic in label, let's parse or hardcode:
      if (f.type === 'toggle' && toggles[f.id]) {
        if (f.id === 'giftWrap' && categoryKey === 'ELECTRONICS') additional += 200;
        if (f.id === 'card' && categoryKey === 'FLOWERS') additional += 100;
        if (f.id === 'wrap' && categoryKey === 'GIFTS') additional += 250;
      }
    });

    onPriceChange?.(additional);
  }, [radioSelections, checkboxSelections, toggles, steppers, categoryKey, fields, onPriceChange]);

  const handleRadio = (fieldId: string, label: string) => {
    setRadioSelections(prev => ({ ...prev, [fieldId]: label }));
  };

  const handleCheckbox = (fieldId: string, label: string) => {
    setCheckboxSelections(prev => {
      const group = prev[fieldId] || {};
      return { ...prev, [fieldId]: { ...group, [label]: !group[label] } };
    });
  };

  const handleToggle = (fieldId: string, val: boolean) => {
    setToggles(prev => ({ ...prev, [fieldId]: val }));
  };

  const handleStepper = (fieldId: string, delta: number) => {
    setSteppers(prev => {
      const curr = prev[fieldId] || 1;
      const next = Math.max(1, curr + delta);
      return { ...prev, [fieldId]: next };
    });
  };

  const renderField = (field: FieldDef) => {
    switch (field.type) {
      case 'radio':
        return (
          <View key={field.id} style={styles.fieldBlock}>
            <Text style={[styles.fieldTitle, { color: colors.text }]}>{field.label}</Text>
            <View style={styles.chipsRow}>
              {field.options?.map(opt => {
                const on = radioSelections[field.id] === opt.label;
                return (
                  <Pressable 
                    key={opt.label} 
                    onPress={() => handleRadio(field.id, opt.label)}
                    style={[
                      styles.chipBtn, 
                      { backgroundColor: isDark ? '#2D2D34' : '#F9F9FA', borderColor: isDark ? '#3A3A42' : '#E5E7EB' },
                      on && { backgroundColor: CaseUi.orangeSoft, borderColor: CaseUi.orange }
                    ]}
                  >
                    <Text style={[styles.chipText, { color: on ? CaseUi.orange : colors.text }]}>{opt.label}</Text>
                    {!!opt.price && <Text style={[styles.chipPrice, { color: on ? CaseUi.orange : colors.textSecondary }]}>+${opt.price}</Text>}
                  </Pressable>
                );
              })}
            </View>
          </View>
        );

      case 'checkbox':
        return (
          <View key={field.id} style={styles.fieldBlock}>
            <Text style={[styles.fieldTitle, { color: colors.text }]}>{field.label}</Text>
            <View style={styles.checkCol}>
              {field.options?.map(opt => {
                const on = checkboxSelections[field.id]?.[opt.label] || false;
                return (
                  <Pressable key={opt.label} onPress={() => handleCheckbox(field.id, opt.label)} style={styles.checkRow}>
                    <View style={[styles.checkboxSquare, { borderColor: on ? CaseUi.orange : '#D1D5DB', backgroundColor: on ? CaseUi.orange : 'transparent' }]}>
                      {on && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                    </View>
                    <Text style={[styles.checkLabel, { color: colors.text }]}>{opt.label}</Text>
                    {!!opt.price && <Text style={[styles.checkPrice, { color: colors.textSecondary }]}>+ JMD {opt.price}</Text>}
                  </Pressable>
                );
              })}
            </View>
          </View>
        );

      case 'toggle':
        const isOn = toggles[field.id] || false;
        return (
          <View key={field.id} style={[styles.fieldBlock, styles.toggleRow]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldTitle, { color: colors.text, marginBottom: 2 }]}>{field.label}</Text>
              {field.placeholder && <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>{field.placeholder}</Text>}
            </View>
            <Switch
              value={isOn}
              onValueChange={(val) => handleToggle(field.id, val)}
              trackColor={{ false: isDark ? '#3F3F46' : '#E4E4E7', true: CaseUi.orangeSoft }}
              thumbColor={isOn ? CaseUi.orange : '#FFFFFF'}
            />
          </View>
        );

      case 'stepper':
        const val = steppers[field.id] || 1;
        return (
          <View key={field.id} style={[styles.fieldBlock, styles.stepperRow]}>
            <Text style={[styles.fieldTitle, { color: colors.text, marginBottom: 0 }]}>{field.label}</Text>
            <View style={[styles.stepperControl, { borderColor: isDark ? '#3A3A42' : '#E5E7EB' }]}>
              <Pressable onPress={() => handleStepper(field.id, -1)} style={styles.stepBtn}>
                <Ionicons name="remove" size={16} color={colors.text} />
              </Pressable>
              <Text style={[styles.stepVal, { color: colors.text }]}>{val}</Text>
              <Pressable onPress={() => handleStepper(field.id, 1)} style={styles.stepBtn}>
                <Ionicons name="add" size={16} color={colors.text} />
              </Pressable>
            </View>
          </View>
        );

      case 'textarea':
        return (
          <View key={field.id} style={styles.fieldBlock}>
            <Text style={[styles.fieldTitle, { color: colors.text }]}>{field.label}</Text>
            <TextInput
              style={[styles.textarea, { backgroundColor: isDark ? '#1C1C1E' : '#F9F9FA', borderColor: isDark ? '#2D2D34' : '#E5E7EB', color: colors.text }]}
              placeholder={field.placeholder || 'Type here...'}
              placeholderTextColor={colors.textSecondary}
              multiline
              textAlignVertical="top"
            />
          </View>
        );

      case 'currency':
        return (
          <View key={field.id} style={styles.fieldBlock}>
            <Text style={[styles.fieldTitle, { color: colors.text }]}>{field.label}</Text>
            <View style={[styles.currencyInputWrap, { backgroundColor: isDark ? '#1C1C1E' : '#F9F9FA', borderColor: isDark ? '#2D2D34' : '#E5E7EB' }]}>
              <Text style={{ color: colors.textSecondary, fontFamily: 'PlusJakartaSans_600SemiBold', marginRight: 8 }}>JMD</Text>
              <TextInput
                style={{ flex: 1, color: colors.text, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16 }}
                placeholder={field.placeholder}
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>
        );

      case 'dropdown':
        return (
          <View key={field.id} style={styles.fieldBlock}>
            <Text style={[styles.fieldTitle, { color: colors.text }]}>{field.label}</Text>
            <View style={[styles.dropdownFake, { backgroundColor: isDark ? '#1C1C1E' : '#F9F9FA', borderColor: isDark ? '#2D2D34' : '#E5E7EB' }]}>
              <Text style={{ color: colors.textSecondary }}>{field.placeholder || 'Select option...'}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </View>
          </View>
        );

      case 'upload':
        return (
          <View key={field.id} style={styles.fieldBlock}>
            <Text style={[styles.fieldTitle, { color: colors.text }]}>{field.label}</Text>
            <Pressable style={[styles.uploadBox, { backgroundColor: isDark ? '#1C1C1E' : '#F9F9FA', borderColor: isDark ? '#3A3A42' : '#D1D5DB' }]}>
              <Ionicons name="cloud-upload-outline" size={28} color={CaseUi.orange} style={{ marginBottom: 8 }} />
              <Text style={[styles.uploadText, { color: colors.text }]}>Tap to Upload</Text>
              <Text style={[styles.uploadSub, { color: colors.textSecondary }]}>JPG, PNG, or PDF</Text>
            </Pressable>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.mainTitle, { color: colors.text }]}>
        {categoryKey === 'GET_ANYTHING' ? 'Custom Request' : 'Customize Options'}
      </Text>
      <View style={styles.fieldsContainer}>
        {fields.map(renderField)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 20 },
  mainTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, marginBottom: 20 },
  fieldsContainer: { gap: 24 },
  fieldBlock: {},
  fieldTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, marginBottom: 12 },
  
  // Chips
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chipBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, gap: 6 },
  chipText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13 },
  chipPrice: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11 },

  // Checkboxes
  checkCol: { gap: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  checkboxSquare: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  checkLabel: { flex: 1, fontFamily: 'PlusJakartaSans_500Medium', fontSize: 14 },
  checkPrice: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13 },

  // Toggle
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleSub: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12 },

  // Stepper
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepperControl: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, height: 38 },
  stepBtn: { paddingHorizontal: 12, height: '100%', justifyContent: 'center' },
  stepVal: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, minWidth: 20, textAlign: 'center' },

  // Textarea
  textarea: { borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 80, fontFamily: 'PlusJakartaSans_500Medium', fontSize: 14 },
  currencyInputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48 },
  dropdownFake: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48 },

  // Upload
  uploadBox: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 16, padding: 24, alignItems: 'center', justifyContent: 'center' },
  uploadText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, marginBottom: 4 },
  uploadSub: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12 },
});
