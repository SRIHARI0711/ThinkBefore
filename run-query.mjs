import { analyzeDecision } from './mlModel.js';

const text = "I want to cook the biryani in my house while I am alone, but I don't know even how to light the stove, but I am more excited and interested, shall I try?";
const result = analyzeDecision(text);
console.log(JSON.stringify(result, null, 2));
