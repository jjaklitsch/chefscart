#!/usr/bin/env node

/**
 * Test slug generation for non-English meal names
 * Verifies that accented characters are properly transliterated
 */

import { generateSlug } from './generate-meal-data.js';

// Test cases with expected results
const testCases = [
  // Vietnamese dishes
  { name: 'Bánh Xèo (Sizzling Crepes)', expected: 'banh-xeo-sizzling-crepes' },
  { name: 'Phở Bò (Beef Noodle Soup)', expected: 'pho-bo-beef-noodle-soup' },
  { name: 'Bánh Mì Thịt Nướng', expected: 'banh-mi-thit-nuong' },
  { name: 'Bún Bò Huế', expected: 'bun-bo-hue' },
  { name: 'Gỏi Cuốn (Spring Rolls)', expected: 'goi-cuon-spring-rolls' },
  { name: 'Cơm Tấm Sườn Nướng', expected: 'com-tam-suon-nuong' },
  
  // French dishes
  { name: 'Coq au Vin à la Française', expected: 'coq-au-vin-a-la-francaise' },
  { name: 'Crêpes Suzette', expected: 'crepes-suzette' },
  { name: 'Bouillabaisse Marseillaise', expected: 'bouillabaisse-marseillaise' },
  { name: 'Pâté de Campagne', expected: 'pate-de-campagne' },
  { name: 'Croque-Monsieur Délicieux', expected: 'croque-monsieur-delicieux' },
  { name: 'Soufflé au Gruyère', expected: 'souffle-au-gruyere' },
  
  // Spanish/Mexican dishes
  { name: 'Paella Española', expected: 'paella-espanola' },
  { name: 'Tacos al Pastor con Piña', expected: 'tacos-al-pastor-con-pina' },
  { name: 'Ceviche Peruano', expected: 'ceviche-peruano' },
  
  // Italian dishes
  { name: 'Risotto ai Funghi Porcini', expected: 'risotto-ai-funghi-porcini' },
  { name: 'Osso Buco alla Milanese', expected: 'osso-buco-alla-milanese' },
  { name: 'Tiramisù Tradizionale', expected: 'tiramisu-tradizionale' },
  
  // German dishes
  { name: 'Sauerbraten mit Knödel', expected: 'sauerbraten-mit-knoedel' },
  { name: 'Käsespätzle', expected: 'kaesespaetzle' },
  { name: 'Königsberger Klopse', expected: 'koenigsberger-klopse' },
  
  // Mixed characters and edge cases
  { name: 'Đậu Hũ Sốt Cà (Tofu in Tomato Sauce)', expected: 'dau-hu-sot-ca-tofu-in-tomato-sauce' },
  { name: 'Café Crème & Croissant', expected: 'cafe-creme-croissant' },
  { name: 'Wołowina po Polsku', expected: 'wolowina-po-polsku' }
];

console.log('🧪 Testing Slug Generation for Non-English Meal Names\n');
console.log('=' .repeat(60));

let passed = 0;
let failed = 0;

testCases.forEach(({ name, expected }) => {
  const generated = generateSlug(name);
  const isCorrect = generated === expected;
  
  if (isCorrect) {
    console.log(`✅ PASS: ${name}`);
    console.log(`   → ${generated}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Expected: ${expected}`);
    console.log(`   Got:      ${generated}`);
    failed++;
  }
  console.log();
});

console.log('=' .repeat(60));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All tests passed! Slug generation handles non-English characters correctly.');
} else {
  console.log('⚠️  Some tests failed. Please review the transliteration map.');
}

// Export for use in other scripts
export { testCases };