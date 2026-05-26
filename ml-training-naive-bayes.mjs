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
  
  const categoryToIdx = Object.fromEntries(categories.map((cat, i) => [cat, i]));
  const riskToIdx = Object.fromEntries(riskLevels.map((risk, i) => [risk, i]));
  
  console.log(`✓ Categories: ${categories.length} (${categories.join(', ')})`);
  console.log(`✓ Risk levels: ${riskLevels.length} (${riskLevels.join(', ')})`);
  
  return {
    categoryToIdx,
    riskToIdx,
    idxToCategory: categories,
    idxToRisk: riskLevels
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

const trainNaiveBayes = (data, vocabulary, encodings, idf) => {
  const numCategories = encodings.idxToCategory.length;
  const numRisks = encodings.idxToRisk.length;
  const vocabSize = vocabulary.length;
  
  // Calculate class priors
  const categoryPriors = new Array(numCategories).fill(0);
  const riskPriors = new Array(numRisks).fill(0);
  
  data.forEach(sample => {
    categoryPriors[encodings.categoryToIdx[sample.label]]++;
    riskPriors[encodings.riskToIdx[sample.risk_level]]++;
  });
  
  categoryPriors.forEach((_, i) => {
    categoryPriors[i] = Math.log(categoryPriors[i] / data.length);
  });
  
  riskPriors.forEach((_, i) => {
    riskPriors[i] = Math.log(riskPriors[i] / data.length);
  });
  
  // Calculate feature probabilities for each class
  const categoryFeatureProbs = Array(numCategories).fill(null).map(() => 
    new Array(vocabSize).fill(0)
  );
  
  const riskFeatureProbs = Array(numRisks).fill(null).map(() => 
    new Array(vocabSize).fill(0)
  );
  
  const categoryTermCounts = new Array(numCategories).fill(0);
  const riskTermCounts = new Array(numRisks).fill(0);
  
  // Count term frequencies per class
  data.forEach(sample => {
    const tokens = tokenizeWithFiltering(sample.text);
    const catIdx = encodings.categoryToIdx[sample.label];
    const riskIdx = encodings.riskToIdx[sample.risk_level];
    
    tokens.forEach(token => {
      const termIdx = vocabulary.indexOf(token);
      if (termIdx !== -1) {
        categoryFeatureProbs[catIdx][termIdx]++;
        riskFeatureProbs[riskIdx][termIdx]++;
        categoryTermCounts[catIdx]++;
        riskTermCounts[riskIdx]++;
      }
    });
  });
  
  // Convert counts to probabilities with Laplace smoothing
  const smoothing = 1;
  
  categoryFeatureProbs.forEach((probs, catIdx) => {
    const total = categoryTermCounts[catIdx];
    probs.forEach((count, termIdx) => {
      categoryFeatureProbs[catIdx][termIdx] = Math.log((count + smoothing) / (total + vocabSize * smoothing));
    });
  });
  
  riskFeatureProbs.forEach((probs, riskIdx) => {
    const total = riskTermCounts[riskIdx];
    probs.forEach((count, termIdx) => {
      riskFeatureProbs[riskIdx][termIdx] = Math.log((count + smoothing) / (total + vocabSize * smoothing));
    });
  });
  
  return {
    categoryPriors,
    riskPriors,
    categoryFeatureProbs,
    riskFeatureProbs,
    vocabSize
  };
};

// ==================== PREDICTION ====================

const predictWithNaiveBayes = (text, vocabulary, idf, model, encodings) => {
  const tokens = tokenizeWithFiltering(text);
  
  // Category prediction
  let categoryScores = [...model.categoryPriors];
  tokens.forEach(token => {
    const termIdx = vocabulary.indexOf(token);
    if (termIdx !== -1) {
      model.categoryFeatureProbs.forEach((probs, catIdx) => {
        categoryScores[catIdx] += probs[termIdx];
      });
    }
  });
  
  const categoryIdx = categoryScores.indexOf(Math.max(...categoryScores));
  const categoryConfidence = Math.exp(categoryScores[categoryIdx]) / 
    categoryScores.reduce((sum, score) => sum + Math.exp(score), 0);
  
  // Risk prediction
  let riskScores = [...model.riskPriors];
  tokens.forEach(token => {
    const termIdx = vocabulary.indexOf(token);
    if (termIdx !== -1) {
      model.riskFeatureProbs.forEach((probs, riskIdx) => {
        riskScores[riskIdx] += probs[termIdx];
      });
    }
  });
  
  const riskIdx = riskScores.indexOf(Math.max(...riskScores));
  const riskConfidence = Math.exp(riskScores[riskIdx]) / 
    riskScores.reduce((sum, score) => sum + Math.exp(score), 0);
  
  return {
    categoryIdx,
    category: encodings.idxToCategory[categoryIdx],
    categoryConfidence,
    riskIdx,
    riskLevel: encodings.idxToRisk[riskIdx],
    riskConfidence
  };
};

// ==================== EVALUATION ====================

const evaluateModel = (data, vocabulary, idf, model, encodings) => {
  let categoryCorrect = 0;
  let riskCorrect = 0;
  
  data.forEach(sample => {
    const prediction = predictWithNaiveBayes(sample.text, vocabulary, idf, model, encodings);
    if (prediction.category === sample.label) categoryCorrect++;
    if (prediction.riskLevel === sample.risk_level) riskCorrect++;
  });
  
  const categoryAccuracy = (categoryCorrect / data.length) * 100;
  const riskAccuracy = (riskCorrect / data.length) * 100;
  
  return { categoryAccuracy, riskAccuracy };
};

// ==================== MODEL EXPORT ====================

const exportModel = (vocabulary, encodings, model, idf, data) => {
  const modelPackage = {
    version: '2.0-naive-bayes',
    timestamp: new Date().toISOString(),
    type: 'naive-bayes-classifier',
    vocabulary,
    encodings: {
      categoryToIdx: encodings.categoryToIdx,
      riskToIdx: encodings.riskToIdx,
      idxToCategory: encodings.idxToCategory,
      idxToRisk: encodings.idxToRisk
    },
    model: {
      categoryPriors: model.categoryPriors,
      riskPriors: model.riskPriors,
      categoryFeatureProbs: model.categoryFeatureProbs,
      riskFeatureProbs: model.riskFeatureProbs,
      vocabSize: model.vocabSize
    },
    idf,
    config: {
      numCategories: encodings.idxToCategory.length,
      numRiskLevels: encodings.idxToRisk.length,
      vocabSize: vocabulary.length,
      classifier: 'naive-bayes',
      totalSamples: data.length
    }
  };
  
  const outputPath = path.join(__dirname, 'ml-model-trained.json');
  fs.writeFileSync(outputPath, JSON.stringify(modelPackage, null, 2));
  
  console.log(`✓ Model exported to: ${outputPath}`);
  console.log(`  - Vocabulary: ${vocabulary.length} terms`);
  console.log(`  - Categories: ${encodings.idxToCategory.length}`);
  console.log(`  - Risk levels: ${encodings.idxToRisk.length}`);
  
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
    
    // Step 2: Build vocabulary
    console.log('📚 Building vocabulary...');
    const vocabulary = buildVocabulary(data);
    
    // Step 3: Get encodings
    console.log('\n🏷️  Setting up encodings...');
    const encodings = getEncodings(data);
    
    // Step 4: Calculate IDF
    console.log('\n📊 Calculating TF-IDF weights...');
    const idf = calculateIDF(data, vocabulary);
    console.log(`✓ IDF calculated for ${vocabulary.length} terms`);
    
    // Step 5: Train Naive Bayes model
    console.log('\n🏗️  Training Naive Bayes classifier...');
    const model = trainNaiveBayes(data, vocabulary, encodings, idf);
    console.log('✓ Model training completed');
    
    // Step 6: Evaluate on training data
    console.log('\n📈 Evaluating model...');
    const [trainData, testData] = [data.slice(0, Math.floor(data.length * 0.85)), data.slice(Math.floor(data.length * 0.85))];
    const trainEval = evaluateModel(trainData, vocabulary, idf, model, encodings);
    const testEval = evaluateModel(testData, vocabulary, idf, model, encodings);
    
    console.log(`Training Accuracy:`);
    console.log(`  - Category: ${trainEval.categoryAccuracy.toFixed(2)}%`);
    console.log(`  - Risk Level: ${trainEval.riskAccuracy.toFixed(2)}%`);
    console.log(`\nTest Accuracy:`);
    console.log(`  - Category: ${testEval.categoryAccuracy.toFixed(2)}%`);
    console.log(`  - Risk Level: ${testEval.riskAccuracy.toFixed(2)}%`);
    
    // Step 7: Export model
    console.log('\n💾 Exporting trained model...');
    exportModel(vocabulary, encodings, model, idf, data);
    
    console.log('\n✅ Model training completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Error during training:', error.message);
    process.exit(1);
  }
};

main();
