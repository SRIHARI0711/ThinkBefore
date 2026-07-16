#!/usr/bin/env node
/**
 * ML Model Training - Naive Bayes Classifier
 * Pure JavaScript implementation with TF-IDF vectorization
 * No native dependencies required!
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Starting ML Model Training (Naive Bayes)...\n');

// ==================== TOKENIZATION ====================

const tokenize = (text) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
};

const stopWords = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'is', 'are', 'am', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'should', 'could', 'may', 'might', 'can', 'this', 'that', 'these',
  'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'why',
  'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very'
]);

const tokenizeWithFiltering = (text) => {
  return tokenize(text).filter(word => !stopWords.has(word) && word.length > 1);
};

// ==================== VOCABULARY & ENCODING ====================

const buildVocabulary = (data) => {
  const vocabulary = new Set();
  
  data.forEach(sample => {
    const tokens = tokenizeWithFiltering(sample.text);
    tokens.forEach(token => vocabulary.add(token));
  });

  const vocabArray = Array.from(vocabulary).sort();
  console.log(`✓ Vocabulary built: ${vocabArray.length} unique terms (after stopword removal)`);
  
  return vocabArray;
};

const getEncodings = (data) => {
  const categories = [...new Set(data.map(d => d.label))];
  const riskLevels = [...new Set(data.map(d => d.risk_level))];
  const tones = [...new Set(data.map(d => d.emotional_tone))];
  const reversibilities = [...new Set(data.map(d => d.reversibility))];

  const toIdx = (arr) => Object.fromEntries(arr.map((v, i) => [v, i]));

  console.log(`✓ Categories: ${categories.length} (${categories.join(', ')})`);
  console.log(`✓ Risk levels: ${riskLevels.length} (${riskLevels.join(', ')})`);
  console.log(`✓ Emotional tones: ${tones.length} (${tones.join(', ')})`);
  console.log(`✓ Reversibility: ${reversibilities.length} (${reversibilities.join(', ')})`);

  return {
    categoryToIdx: toIdx(categories),
    riskToIdx: toIdx(riskLevels),
    toneToIdx: toIdx(tones),
    reversibilityToIdx: toIdx(reversibilities),
    idxToCategory: categories,
    idxToRisk: riskLevels,
    idxToTone: tones,
    idxToReversibility: reversibilities,
  };
};

// ==================== TF-IDF VECTORIZATION ====================

const calculateIDF = (data, vocabulary) => {
  const docCount = data.length;
  const idf = {};
  
  vocabulary.forEach(term => {
    let docFreq = 0;
    data.forEach(sample => {
      const tokens = tokenizeWithFiltering(sample.text);
      if (tokens.includes(term)) docFreq++;
    });
    idf[term] = Math.log(docCount / (1 + docFreq));
  });
  
  return idf;
};

const textToTFIDFVector = (text, vocabulary, idf) => {
  const tokens = tokenizeWithFiltering(text);
  const termFreq = {};
  
  tokens.forEach(token => {
    termFreq[token] = (termFreq[token] || 0) + 1;
  });
  
  const vector = vocabulary.map(term => {
    const tf = termFreq[term] ? termFreq[term] / tokens.length : 0;
    const idfVal = idf[term] || 0;
    return tf * idfVal;
  });
  
  return vector;
};

// ==================== NAIVE BAYES CLASSIFIER ====================

// Train ONE multinomial Naive Bayes classifier for a given target field
// (e.g. 'label', 'risk_level', 'emotional_tone', 'reversibility'). Returns
// log-space priors + per-class feature log-probabilities with Laplace smoothing.
const trainField = (data, vocabulary, fieldKey, valueToIdx) => {
  const numClasses = Object.keys(valueToIdx).length;
  const vocabSize = vocabulary.length;
  const termIndex = new Map(vocabulary.map((t, i) => [t, i])); // O(1) lookups

  const priors = new Array(numClasses).fill(0);
  data.forEach((s) => { priors[valueToIdx[s[fieldKey]]]++; });
  for (let i = 0; i < numClasses; i++) priors[i] = Math.log((priors[i] || 1e-9) / data.length);

  const featureProbs = Array(numClasses).fill(null).map(() => new Array(vocabSize).fill(0));
  const termCounts = new Array(numClasses).fill(0);

  data.forEach((sample) => {
    const idx = valueToIdx[sample[fieldKey]];
    tokenizeWithFiltering(sample.text).forEach((token) => {
      const termIdx = termIndex.get(token);
      if (termIdx !== undefined) { featureProbs[idx][termIdx]++; termCounts[idx]++; }
    });
  });

  const smoothing = 1; // Laplace
  featureProbs.forEach((probs, idx) => {
    const total = termCounts[idx];
    for (let t = 0; t < vocabSize; t++) {
      probs[t] = Math.log((probs[t] + smoothing) / (total + vocabSize * smoothing));
    }
  });

  return { priors, featureProbs };
};

const trainNaiveBayes = (data, vocabulary, encodings) => {
  const category = trainField(data, vocabulary, 'label', encodings.categoryToIdx);
  const risk = trainField(data, vocabulary, 'risk_level', encodings.riskToIdx);
  const tone = trainField(data, vocabulary, 'emotional_tone', encodings.toneToIdx);
  const reversibility = trainField(data, vocabulary, 'reversibility', encodings.reversibilityToIdx);

  return {
    // Backward-compatible names consumed by mlModel.js inference:
    categoryPriors: category.priors,
    categoryFeatureProbs: category.featureProbs,
    riskPriors: risk.priors,
    riskFeatureProbs: risk.featureProbs,
    // New ML-predicted targets:
    tonePriors: tone.priors,
    toneFeatureProbs: tone.featureProbs,
    reversibilityPriors: reversibility.priors,
    reversibilityFeatureProbs: reversibility.featureProbs,
    vocabSize: vocabulary.length,
  };
};

// ==================== PREDICTION ====================

const scoreField = (tokens, termIndex, priors, featureProbs) => {
  const scores = [...priors];
  tokens.forEach((token) => {
    const termIdx = termIndex.get(token);
    if (termIdx !== undefined) {
      for (let c = 0; c < featureProbs.length; c++) scores[c] += featureProbs[c][termIdx];
    }
  });
  let bestIdx = 0;
  for (let i = 1; i < scores.length; i++) if (scores[i] > scores[bestIdx]) bestIdx = i;
  const denom = scores.reduce((sum, s) => sum + Math.exp(s - scores[bestIdx]), 0);
  return { idx: bestIdx, confidence: 1 / denom };
};

const predictWithNaiveBayes = (text, vocabulary, model, encodings) => {
  const tokens = tokenizeWithFiltering(text);
  const termIndex = model.__termIndex || (model.__termIndex = new Map(vocabulary.map((t, i) => [t, i])));

  const cat = scoreField(tokens, termIndex, model.categoryPriors, model.categoryFeatureProbs);
  const risk = scoreField(tokens, termIndex, model.riskPriors, model.riskFeatureProbs);
  const tone = scoreField(tokens, termIndex, model.tonePriors, model.toneFeatureProbs);
  const rev = scoreField(tokens, termIndex, model.reversibilityPriors, model.reversibilityFeatureProbs);

  return {
    category: encodings.idxToCategory[cat.idx], categoryConfidence: cat.confidence,
    riskLevel: encodings.idxToRisk[risk.idx], riskConfidence: risk.confidence,
    emotionalTone: encodings.idxToTone[tone.idx], toneConfidence: tone.confidence,
    reversibility: encodings.idxToReversibility[rev.idx], reversibilityConfidence: rev.confidence,
  };
};

// ==================== TRAIN / TEST SPLIT ====================

// Deterministic PRNG (mulberry32) so the split — and therefore the reported
// metrics — are reproducible across runs given the same seed.
const mulberry32 = (seed) => () => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const shuffleInPlace = (arr, rng) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Stratified split: hold out `testRatio` of EACH category
// So every class is represented in both train and test (plain slice-off-the-end would not be).
const stratifiedSplit = (data, testRatio, seed) => {
  const rng = mulberry32(seed);
  const byLabel = {};
  data.forEach((s) => { (byLabel[s.label] ||= []).push(s); });

  const train = [], test = [];
  Object.keys(byLabel).sort().forEach((label) => {
    const group = shuffleInPlace([...byLabel[label]], rng);
    const nTest = Math.max(1, Math.round(group.length * testRatio));
    test.push(...group.slice(0, nTest));
    train.push(...group.slice(nTest));
  });
  return { train: shuffleInPlace(train, rng), test: shuffleInPlace(test, rng) };
};

// ==================== EVALUATION ====================

const collectPredictions = (data, vocabulary, model, encodings) => {
  const out = {
    catTrue: [], catPred: [], riskTrue: [], riskPred: [],
    toneTrue: [], tonePred: [], revTrue: [], revPred: [],
  };
  data.forEach((sample) => {
    const p = predictWithNaiveBayes(sample.text, vocabulary, model, encodings);
    out.catTrue.push(sample.label); out.catPred.push(p.category);
    out.riskTrue.push(sample.risk_level); out.riskPred.push(p.riskLevel);
    out.toneTrue.push(sample.emotional_tone); out.tonePred.push(p.emotionalTone);
    out.revTrue.push(sample.reversibility); out.revPred.push(p.reversibility);
  });
  return out;
};

const accuracyOf = (trueLabels, predLabels) => {
  let correct = 0;
  trueLabels.forEach((t, i) => { if (t === predLabels[i]) correct++; });
  return (correct / (trueLabels.length || 1)) * 100;
};

// Per-class precision / recall / F1 + macro & weighted averages — the metrics
// developers actually report (accuracy alone hides per-class and imbalance issues).
const classificationReport = (trueLabels, predLabels, classOrder = null) => {
  const classes = classOrder || [...new Set([...trueLabels, ...predLabels])].sort();
  const rows = classes.map((c) => {
    let tp = 0, fp = 0, fn = 0, support = 0;
    trueLabels.forEach((t, i) => {
      const p = predLabels[i];
      if (t === c) support++;
      if (p === c && t === c) tp++;
      else if (p === c && t !== c) fp++;
      else if (p !== c && t === c) fn++;
    });
    const precision = tp + fp ? tp / (tp + fp) : 0;
    const recall = tp + fn ? tp / (tp + fn) : 0;
    const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
    return { c, precision, recall, f1, support };
  });

  const total = trueLabels.length || 1;
  const macro = { precision: 0, recall: 0, f1: 0 };
  const weighted = { precision: 0, recall: 0, f1: 0 };
  rows.forEach((r) => {
    macro.precision += r.precision; macro.recall += r.recall; macro.f1 += r.f1;
    weighted.precision += r.precision * r.support;
    weighted.recall += r.recall * r.support;
    weighted.f1 += r.f1 * r.support;
  });
  const n = rows.length || 1;
  macro.precision /= n; macro.recall /= n; macro.f1 /= n;
  weighted.precision /= total; weighted.recall /= total; weighted.f1 /= total;

  return { rows, macro, weighted, accuracy: accuracyOf(trueLabels, predLabels), support: total };
};

const printReport = (title, report) => {
  const pad = (s, w) => String(s).padEnd(w);
  const num = (x) => x.toFixed(3);
  console.log(`\n  ${title}`);
  console.log(`  ${pad('class', 18)}${pad('precision', 11)}${pad('recall', 10)}${pad('f1', 9)}support`);
  report.rows.forEach((r) =>
    console.log(`  ${pad(r.c, 18)}${pad(num(r.precision), 11)}${pad(num(r.recall), 10)}${pad(num(r.f1), 9)}${r.support}`)
  );
  console.log(`  ${pad('macro avg', 18)}${pad(num(report.macro.precision), 11)}${pad(num(report.macro.recall), 10)}${pad(num(report.macro.f1), 9)}${report.support}`);
  console.log(`  ${pad('weighted avg', 18)}${pad(num(report.weighted.precision), 11)}${pad(num(report.weighted.recall), 10)}${pad(num(report.weighted.f1), 9)}${report.support}`);
  console.log(`  accuracy: ${report.accuracy.toFixed(2)}%`);
};

// Confusion matrix (rows = actual, cols = predicted) for a small, ordered class set.
const printConfusionMatrix = (title, trueLabels, predLabels, classOrder) => {
  const idx = Object.fromEntries(classOrder.map((c, i) => [c, i]));
  const m = classOrder.map(() => classOrder.map(() => 0));
  trueLabels.forEach((t, i) => {
    const r = idx[t], c = idx[predLabels[i]];
    if (r !== undefined && c !== undefined) m[r][c]++;
  });
  const w = Math.max(8, ...classOrder.map((c) => c.length + 1));
  const pad = (s) => String(s).padStart(w);
  console.log(`\n  ${title}  (rows = actual, cols = predicted)`);
  console.log(`  ${pad('')}${classOrder.map(pad).join('')}`);
  classOrder.forEach((c, r) => console.log(`  ${pad(c)}${m[r].map(pad).join('')}`));
};

// ==================== MODEL EXPORT ====================

const exportModel = (vocabulary, encodings, model, idf, data) => {
  const modelPackage = {
    version: '3.0-naive-bayes-multitarget',
    timestamp: new Date().toISOString(),
    type: 'naive-bayes-classifier',
    vocabulary,
    encodings: {
      categoryToIdx: encodings.categoryToIdx,
      riskToIdx: encodings.riskToIdx,
      toneToIdx: encodings.toneToIdx,
      reversibilityToIdx: encodings.reversibilityToIdx,
      idxToCategory: encodings.idxToCategory,
      idxToRisk: encodings.idxToRisk,
      idxToTone: encodings.idxToTone,
      idxToReversibility: encodings.idxToReversibility,
    },
    model: {
      categoryPriors: model.categoryPriors,
      riskPriors: model.riskPriors,
      tonePriors: model.tonePriors,
      reversibilityPriors: model.reversibilityPriors,
      categoryFeatureProbs: model.categoryFeatureProbs,
      riskFeatureProbs: model.riskFeatureProbs,
      toneFeatureProbs: model.toneFeatureProbs,
      reversibilityFeatureProbs: model.reversibilityFeatureProbs,
      vocabSize: model.vocabSize,
    },
    idf,
    config: {
      numCategories: encodings.idxToCategory.length,
      numRiskLevels: encodings.idxToRisk.length,
      numTones: encodings.idxToTone.length,
      numReversibility: encodings.idxToReversibility.length,
      vocabSize: vocabulary.length,
      classifier: 'naive-bayes',
      targets: ['category', 'risk_level', 'emotional_tone', 'reversibility'],
      totalSamples: data.length,
    },
  };

  const outputPath = path.join(__dirname, 'ml-model-trained.json');
  fs.writeFileSync(outputPath, JSON.stringify(modelPackage, null, 2));

  console.log(`✓ Model exported to: ${outputPath}`);
  console.log(`  - Vocabulary: ${vocabulary.length} terms`);
  console.log(`  - Targets: category(${encodings.idxToCategory.length}), risk(${encodings.idxToRisk.length}), tone(${encodings.idxToTone.length}), reversibility(${encodings.idxToReversibility.length})`);

  return modelPackage;
};

// ==================== MAIN EXECUTION ====================

const main = () => {
  try {
    // Step 1: Load data
    console.log('📂 Loading training data...');
    const dataPath = path.join(__dirname, 'ml-training-data.json');
    const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    const data = rawData.training_data;
    console.log(`✓ Loaded ${data.length} samples\n`);

    // Step 2: Stratified train/test split BEFORE any training.
    // This is the fix for the previous data leakage: the model must never see
    // the test set during training, or the reported accuracy is meaningless.
    const SEED = 42;
    const TEST_RATIO = 0.2;
    const { train: trainData, test: testData } = stratifiedSplit(data, TEST_RATIO, SEED);
    console.log('✂️  Stratified split (seed=' + SEED + '):');
    console.log(`✓ Train: ${trainData.length} samples · Test (held-out): ${testData.length} samples\n`);

    // Step 3: Build vocabulary + encodings + IDF from the TRAINING SET ONLY.
    // The model may only know what it saw in training; test-only words are
    // simply unseen at inference time, exactly as in real deployment.
    console.log('📚 Building vocabulary (train only)...');
    const vocabulary = buildVocabulary(trainData);
    console.log('\n🏷️  Setting up encodings (train only)...');
    const encodings = getEncodings(trainData);
    console.log('\n📊 Calculating TF-IDF weights...');
    const idf = calculateIDF(trainData, vocabulary);
    console.log(`✓ IDF calculated for ${vocabulary.length} terms`);

    // Step 4: Train Naive Bayes on the training split only
    console.log('\n🏗️  Training Naive Bayes classifier (train split)...');
    const model = trainNaiveBayes(trainData, vocabulary, encodings, idf);
    console.log('✓ Model training completed');

    // Step 5: Honest evaluation on the held-out test set (never seen in training)
    console.log('\n📈 Evaluating on HELD-OUT test set (no leakage)...');
    const trainPreds = collectPredictions(trainData, vocabulary, idf, model, encodings);
    const testPreds = collectPredictions(testData, vocabulary, idf, model, encodings);

    const riskOrder = ['low', 'medium', 'high', 'critical'];
    console.log('\n──────── CATEGORY (17 classes) ────────');
    console.log(`  train accuracy: ${accuracyOf(trainPreds.catTrue, trainPreds.catPred).toFixed(2)}%   (reference — expect higher than test)`);
    printReport('Held-out test — category', classificationReport(testPreds.catTrue, testPreds.catPred));

    console.log('\n──────── RISK LEVEL (4 classes) ────────');
    console.log(`  train accuracy: ${accuracyOf(trainPreds.riskTrue, trainPreds.riskPred).toFixed(2)}%   (reference — expect higher than test)`);
    printReport('Held-out test — risk level', classificationReport(testPreds.riskTrue, testPreds.riskPred, riskOrder));
    printConfusionMatrix('Held-out test — risk confusion matrix', testPreds.riskTrue, testPreds.riskPred, riskOrder);

    console.log('\n⚠️  NOTE: with ~10 samples/class and ' + testData.length + ' held-out samples, these numbers');
    console.log('   are a rough estimate. More data (or k-fold CV) is needed for a stable metric.');

    // Step 6: Retrain the FINAL deployed model on ALL data, then export.
    // Standard practice: use the held-out split only to *estimate* quality;
    // ship a model trained on every available sample.
    console.log('\n💾 Retraining final model on ALL data for deployment...');
    const fullVocab = buildVocabulary(data);
    const fullEncodings = getEncodings(data);
    const fullIdf = calculateIDF(data, fullVocab);
    const fullModel = trainNaiveBayes(data, fullVocab, fullEncodings, fullIdf);
    exportModel(fullVocab, fullEncodings, fullModel, fullIdf, data);

    console.log('\n✅ Model training completed successfully!\n');

  } catch (error) {
    console.error('❌ Error during training:', error.message);
    process.exit(1);
  }
};

main();
