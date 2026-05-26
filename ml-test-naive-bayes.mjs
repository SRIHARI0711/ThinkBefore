#!/usr/bin/env node
/**
 * Test the enhanced Naive Bayes ML model
 */

import { analyzeDecision } from './mlModel.js';

// Wait a bit for model to load
await new Promise(resolve => setTimeout(resolve, 500));

const testCases = [
  "Should I punch someone in anger?",
  "Should I drink alcohol every night?",
  "Should I lie on my resume to get the job?",
  "Should I drive while drunk?",
  "Should I steal this car?",
  "Got a $2000 bonus and thinking about buying an unnecessary laptop",
  "Thinking about texting my ex at 2 AM to tell them I made a mistake",
  "Should I cut down these old trees in the forest?",
  "Should I touch someone's personal space without consent?",
  "Should I help someone in need?",
  "Should I spend time with my family this weekend?",
  "I want to meditate and relax",
  "My coworker got promoted and I didn't. Should I resign?"
];

console.log('🧪 Testing Enhanced ML Model (Naive Bayes)\n');
console.log('=' .repeat(80) + '\n');

testCases.forEach((testText, idx) => {
  console.log(`Test ${idx + 1}: "${testText}"\n`);
  
  try {
    const result = analyzeDecision(testText);
    
    console.log('📊 RESULTS (All 8 Outputs):');
    console.log('-' .repeat(40));
    console.log(`1. Severity Score:      ${result.severityScore}/100`);
    console.log(`2. Harmfulness Score:   ${result.harmfulnessScore}/100`);
    console.log(`3. Negativity Score:    ${result.negativityScore}/100`);
    console.log(`4. Predicted Risk:      ${result.predictedRisk} (confidence: ${result.confidence.risk}%)`);
    console.log(`5. Behaviour:           ${result.behaviour} (confidence: ${result.confidence.category}%)`);
    console.log(`6. Domain:              ${result.domain}`);
    console.log(`7. Intervention:        ${result.intervention.substring(0, 100)}...`);
    console.log(`8. Consequences:        ${result.consequences.length} consequence(s)`);
    if (result.consequences.length > 0) {
      console.log(`                        → ${result.consequences[0]}`);
    }
    console.log(`\nModel Used:             ${result.modelUsed}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n' + '=' .repeat(80) + '\n');
});

console.log('✅ All tests completed!\n');
