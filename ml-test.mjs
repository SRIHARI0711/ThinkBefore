import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeDecision } from './mlModel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Test Suite for ML Model
 * Validates:
 * - Model loading
 * - Feature extraction
 * - Category prediction
 * - Risk classification
 */

console.log('\n=== ML MODEL TEST SUITE ===\n');

// Test Dataset
const testCases = [
  {
    text: "Should I punch someone in anger?",
    expectedCategory: "violence",
    expectedRisk: "critical",
    name: "Violence Detection"
  },
  {
    text: "Got a $2K bonus, thinking about buying an unnecessary laptop",
    expectedCategory: "financial",
    expectedRisk: "high",
    name: "Financial Risk"
  },
  {
    text: "I want to send an angry email to my boss",
    expectedCategory: "career",
    expectedRisk: "high",
    name: "Career Risk"
  },
  {
    text: "Should I go to a party this Friday?",
    expectedCategory: "social",
    expectedRisk: "low",
    name: "Social Activity"
  },
  {
    text: "Should I sleep 8 hours tonight?",
    expectedCategory: "self-care",
    expectedRisk: "low",
    name: "Self-Care"
  },
  {
    text: "I want to steal money from my employer",
    expectedCategory: "ethics",
    expectedRisk: "high",
    name: "Ethics Violation"
  },
  {
    text: "Should I drive while drunk?",
    expectedCategory: "safety-risk",
    expectedRisk: "critical",
    name: "Safety Risk"
  },
  {
    text: "I want to cut down trees in the forest",
    expectedCategory: "environment-risk",
    expectedRisk: "critical",
    name: "Environment Risk"
  },
  {
    text: "Should I kiss someone without asking?",
    expectedCategory: "consent-risk",
    expectedRisk: "high",
    name: "Consent Risk"
  },
  {
    text: "Should I volunteer at the community center?",
    expectedCategory: "social",
    expectedRisk: "low",
    name: "Volunteering"
  }
];

// Test Results Tracking
let passed = 0;
let failed = 0;
const results = [];

// Run Tests
console.log('Running ML model predictions...\n');

testCases.forEach((test, idx) => {
  const result = analyzeDecision(test.text);
  
  const categoryMatch = result.category === test.expectedCategory;
  const riskMatch = result.riskLevel === test.expectedRisk;
  const passed_test = categoryMatch && riskMatch;
  
  const status = passed_test ? '✓ PASS' : '✗ FAIL';
  console.log(`${status} - ${test.name}`);
  console.log(`  Input: "${test.text.substring(0, 50)}..."`);
  console.log(`  Expected: ${test.expectedCategory} (${test.expectedRisk})`);
  console.log(`  Got:      ${result.category} (${result.riskLevel})`);
  
  if (!categoryMatch) {
    console.log(`  ⚠ Category mismatch`);
  }
  if (!riskMatch) {
    console.log(`  ⚠ Risk level mismatch`);
  }
  
  console.log();
  
  results.push({
    name: test.name,
    passed: passed_test,
    categoryCorrect: categoryMatch,
    riskCorrect: riskMatch,
    result
  });
  
  if (passed_test) {
    passed++;
  } else {
    failed++;
  }
});

//Test Summary
console.log('=== TEST SUMMARY ===\n');
console.log(`Total Tests: ${testCases.length}`);
console.log(`Passed: ${passed} (${(passed / testCases.length * 100).toFixed(1)}%)`);
console.log(`Failed: ${failed} (${(failed / testCases.length * 100).toFixed(1)}%)`);
console.log();

if (failed > 0) {
  console.log('Failed Tests:');
  results.filter(r => !r.passed).forEach(r => {
    console.log(`  - ${r.name}`);
  });
  console.log();
}

// Test Model Properties
console.log('=== MODEL PROPERTIES ===\n');
console.log(`Model loaded: Yes`);
console.log(`Model type: Naive Bayes Classifier`);
console.log(`Categories: 18`);

// Load and check model file
const modelPath = path.join(__dirname, 'ml-model-trained.json');
if (fs.existsSync(modelPath)) {
  const modelFile = JSON.parse(fs.readFileSync(modelPath, 'utf-8'));
  console.log(`Model version: ${modelFile.version}`);
  console.log(`Training samples: ${modelFile.datasetInfo.trainSamples}`);
  console.log(`Test accuracy: ${(modelFile.metrics.test.accuracy * 100).toFixed(2)}%`);
  console.log(`Test F1-score: ${(modelFile.metrics.test.macroF1 * 100).toFixed(2)}%`);
} else {
  console.log('⚠ Trained model file not found. Run ml-training.mjs first.');
}

console.log();

// Test Output Format
console.log('=== SAMPLE OUTPUT FORMAT ===\n');
const sampleResult = analyzeDecision("Should I send an angry message to my boss right now?");
console.log(JSON.stringify(sampleResult, null, 2));

console.log();

// Recommendations
if (failed === 0) {
  console.log('✅ All tests passed! Model is ready for production.');
} else {
  console.log('⚠ Some tests failed. Consider:');
  console.log('  1. Checking if training data is representative');
  console.log('  2. Adding more examples for underperforming categories');
  console.log('  3. Retraining the model with updated data');
}

console.log();
