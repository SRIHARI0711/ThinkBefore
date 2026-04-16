import { analyzeDecision } from './mlModel.js';

const tests = [
  "I want to cook the biryani in my house while I am alone, but I don't know even how to light the stove. But I am more excited and interested, shall I try?",
  'Should I text my ex after drinking?',
  'Is it safe to jump from this wall?',
  'Can I invest all my savings in a new startup?',
  'Tell me a joke about cats.',
  'What is the weather going to be like tomorrow?'
];

for (const text of tests) {
  console.log('---');
  console.log(text);
  console.log(JSON.stringify(analyzeDecision(text), null, 2));
}
