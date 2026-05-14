import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * STEP 1: DATA LOADING AND EXPLORATION
 */
const loadTrainingData = () => {
  const dataPath = path.join(__dirname, 'ml-training-data.json');
  const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log('✓ Data loaded successfully');
  console.log(`  - Total samples: ${rawData.training_data.length}`);
  console.log(`  - Classes: ${rawData.metadata.classes}`);
  return rawData.training_data;
};

/**
 * STEP 2: DATA PREPROCESSING AND FEATURE ENGINEERING
 */
const tokenize = (text) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\?\!\-']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
};

const WORD_SETS = {
  questionWords: new Set(['should', 'could', 'would', 'can', 'may', 'is', 'are', 'am', 'do', 'does', 'did', 'will', 'might']),
  modalWords: new Set(['should', 'could', 'would', 'can', 'may', 'might', 'must', 'need', 'ought']),
  negationWords: new Set(['not', 'never', 'without', 'avoid', "don't", "cant", "can't", "cannot", "won't", "wouldn't"]),
  urgencyWords: new Set(['now', 'today', 'immediately', 'urgent', 'soon', 'quickly', 'asap', 'right', 'immediate']),
  riskIndicators: new Set(['risk', 'unsafe', 'dangerous', 'danger', 'harm', 'hurt', 'kill', 'steal', 'attack', 'drunk', 'illegal', 'crime', 'accident', 'threat']),
  positiveWords: new Set(['safe', 'healthy', 'good', 'help', 'support', 'honest', 'kind', 'respect', 'responsible', 'wise']),
};

const CATEGORY_PATTERNS = {
  'consent-risk': new Set(['kiss', 'touch', 'sexual', 'consent', 'assault', 'contact', 'intimate', 'private', 'personal', 'hug']),
  'environment-risk': new Set(['tree', 'forest', 'pollute', 'cut', 'earth', 'environment', 'wildlife', 'nature', 'trash', 'litter']),
  'violence': new Set(['punch', 'hit', 'kick', 'fight', 'attack', 'violent', 'kill', 'murder', 'harm', 'stab', 'hurt', 'weapon']),
  'health-risk': new Set(['smoke', 'drink', 'drugs', 'medication', 'health', 'sick', 'exercise', 'diet', 'sleep', 'alcohol', 'cancer', 'injury']),
  'productivity': new Set(['project', 'deadline', 'work', 'study', 'focus', 'lazy', 'task', 'finish', 'start', 'abandon']),
  'financial': new Set(['invest', 'savings', 'money', 'bank', 'loan', 'credit', 'debt', 'trade', 'crypto', 'budget', 'expense']),
  'social': new Set(['date', 'friend', 'party', 'gossip', 'rumors', 'social', 'people', 'invite', 'tell', 'share', 'message']),
  'ethics': new Set(['lie', 'cheat', 'steal', 'truth', 'honest', 'secret', 'ethical', 'immoral', 'wrong', 'borrow', 'deceive']),
  'self-care': new Set(['sleep', 'rest', 'exercise', 'therapy', 'meditate', 'wellbeing', 'well-being', 'self-care', 'care']),
  'relationship': new Set(['breakup', 'partner', 'spouse', 'boyfriend', 'girlfriend', 'relationship', 'trust', 'love', 'dating']),
  'safety-risk': new Set(['seatbelt', 'drive', 'drunk', 'crash', 'accident', 'helmet', 'unsafe', 'danger', 'shortcut', 'speed']),
  'legal-risk': new Set(['steal', 'break', 'illegal', 'police', 'law', 'crime', 'charge', 'court', 'sentence', 'judge']),
  'career': new Set(['job', 'career', 'promotion', 'salary', 'boss', 'resign', 'hire', 'interview', 'colleague', 'work', 'project']),
  'travel': new Set(['trip', 'travel', 'vacation', 'flight', 'drive', 'destination', 'abroad', 'holiday', 'tour', 'passport']),
  'education': new Set(['school', 'college', 'university', 'degree', 'course', 'study', 'exam', 'major', 'graduation', 'learning']),
  'family': new Set(['family', 'parent', 'sibling', 'child', 'relative', 'mother', 'father', 'brother', 'sister', 'kids']),
  'leisure': new Set(['hobby', 'gaming', 'sport', 'movie', 'entertainment', 'relax', 'vacation', 'fun', 'recreation', 'game']),
  'investments': new Set(['invest', 'stock', 'crypto', 'bitcoin', 'market', 'trading', 'portfolio', 'broker', 'fund', 'profit'])
};

const countMatches = (tokens, wordSet) => {
  return tokens.reduce((sum, token) => sum + (wordSet.has(token) ? 1 : 0), 0);
};

const extractFeatures = (text) => {
  const normalized = text.toLowerCase();
  const tokens = tokenize(normalized);
  const tokenSet = new Set(tokens);
  
  const features = {
    // Linguistic features
    tokenCount: tokens.length,
    questionWordCount: countMatches(tokens, WORD_SETS.questionWords),
    modalWordCount: countMatches(tokens, WORD_SETS.modalWords),
    negationCount: countMatches(tokens, WORD_SETS.negationWords),
    urgencyCount: countMatches(tokens, WORD_SETS.urgencyWords),
    riskIndicatorCount: countMatches(tokens, WORD_SETS.riskIndicators),
    positiveWordCount: countMatches(tokens, WORD_SETS.positiveWords),
    exclamationCount: (normalized.match(/!/g) || []).length,
    questionMarkCount: (normalized.match(/\?/g) || []).length,
    uniqueTokenCount: tokenSet.size,
    textLength: text.length,
    
    // Category patterns
    ...Object.keys(CATEGORY_PATTERNS).reduce((acc, category) => {
      acc[`${category}Count`] = countMatches(tokens, CATEGORY_PATTERNS[category]);
      return acc;
    }, {})
  };
  
  return features;
};

/**
 * STEP 3: DATA SPLITTING AND VECTORIZATION
 */
const splitData = (data, trainRatio = 0.70, valRatio = 0.15) => {
  // Shuffle data
  const shuffled = [...data].sort(() => Math.random() - 0.5);
  
  const trainSize = Math.floor(shuffled.length * trainRatio);
  const valSize = Math.floor(shuffled.length * valRatio);
  
  const train = shuffled.slice(0, trainSize);
  const validation = shuffled.slice(trainSize, trainSize + valSize);
  const test = shuffled.slice(trainSize + valSize);
  
  console.log(`✓ Data split into:
  - Training: ${train.length} samples (${(trainRatio * 100).toFixed(0)}%)
  - Validation: ${validation.length} samples (${(valRatio * 100).toFixed(0)}%)
  - Test: ${test.length} samples (${((1 - trainRatio - valRatio) * 100).toFixed(0)}%)`);
  
  return { train, validation, test };
};

/**
 * STEP 4: BUILD BASELINE MODEL (Naive Bayes with Gaussian distribution)
 */
class NaiveBayesModel {
  constructor(categories) {
    this.categories = categories;
    this.classPriors = {};
    this.featureStats = {};  // mean and std for each feature per category
  }

  train(data) {
    const totalSamples = data.length;
    const categoryCounts = {};
    const categoryFeatures = {};

    // Initialize
    this.categories.forEach(cat => {
      categoryCounts[cat] = 0;
      categoryFeatures[cat] = [];
    });

    // Collect features per category
    data.forEach(sample => {
      const category = sample.label;
      categoryCounts[category]++;
      
      const features = extractFeatures(sample.text);
      categoryFeatures[category].push(features);
    });

    // Calculate statistics
    this.categories.forEach(cat => {
      this.classPriors[cat] = categoryCounts[cat] / totalSamples;
      this.featureStats[cat] = {};
      
      const categoryFeatureList = categoryFeatures[cat];
      if (categoryFeatureList.length === 0) {
        return;
      }
      
      const featureKeys = Object.keys(categoryFeatureList[0]);
      featureKeys.forEach(feature => {
        const values = categoryFeatureList.map(f => f[feature]);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        const std = Math.sqrt(variance + 1e-9);  // Add small value to prevent division by zero
        
        this.featureStats[cat][feature] = { mean, std };
      });
    });

    console.log('✓ Baseline model (Gaussian Naive Bayes) trained on training set');
  }

  gaussianProbability(mean, std, value) {
    const exponent = -Math.pow(value - mean, 2) / (2 * Math.pow(std, 2));
    return (1 / Math.sqrt(2 * Math.PI * Math.pow(std, 2))) * Math.exp(exponent);
  }

  predict(text) {
    const features = extractFeatures(text);
    let scores = {};

    this.categories.forEach(cat => {
      scores[cat] = Math.log(this.classPriors[cat] + 1e-9);
      
      Object.entries(features).forEach(([feature, value]) => {
        const stats = this.featureStats[cat][feature];
        if (stats) {
          const prob = this.gaussianProbability(stats.mean, stats.std, value);
          scores[cat] += Math.log(prob + 1e-9);
        }
      });
    });

    const predicted = Object.keys(scores).reduce((a, b) => 
      scores[a] > scores[b] ? a : b
    );
    
    return predicted;
  }
}

/**
 * STEP 5: EVALUATION METRICS
 */
const calculateMetrics = (predictions, actual, categories) => {
  const confusion = {};
  categories.forEach(cat => {
    confusion[cat] = { tp: 0, fp: 0, fn: 0, tn: 0 };
  });

  predictions.forEach((pred, idx) => {
    const actual_label = actual[idx];
    
    categories.forEach(cat => {
      if (pred === cat && actual_label === cat) confusion[cat].tp++;
      else if (pred === cat && actual_label !== cat) confusion[cat].fp++;
      else if (pred !== cat && actual_label === cat) confusion[cat].fn++;
      else confusion[cat].tn++;
    });
  });

  const metrics = {};
  categories.forEach(cat => {
    const { tp, fp, fn } = confusion[cat];
    metrics[cat] = {
      precision: tp / (tp + fp || 1),
      recall: tp / (tp + fn || 1),
      f1: 2 * tp / (2 * tp + fp + fn || 1)
    };
  });

  const accuracy = predictions.reduce((sum, pred, idx) => 
    sum + (pred === actual[idx] ? 1 : 0), 0) / predictions.length;

  const macroF1 = Object.values(metrics).reduce((sum, m) => sum + m.f1, 0) / categories.length;

  return { accuracy, macroF1, metrics, confusion };
};

/**
 * MAIN TRAINING PIPELINE
 */
const main = async () => {
  console.log('\n=== COGNIGUARD ML MODEL TRAINING PIPELINE ===\n');

  // STEP 1: Load data
  console.log('STEP 1: Loading data...');
  const rawData = loadTrainingData();
  const categories = [...new Set(rawData.map(d => d.label))].sort();
  console.log(`  - Categories: ${categories.join(', ')}\n`);

  // STEP 2: Split data
  console.log('STEP 2: Splitting data...');
  const { train, validation, test } = splitData(rawData);
  console.log();

  // STEP 3: Train baseline model
  console.log('STEP 3: Training baseline model (Naive Bayes)...');
  const model = new NaiveBayesModel(categories);
  model.train(train);
  console.log();

  // STEP 4: Validate on validation set
  console.log('STEP 4: Evaluating on validation set...');
  const valPredictions = validation.map(s => model.predict(s.text));
  const valActual = validation.map(s => s.label);
  const valMetrics = calculateMetrics(valPredictions, valActual, categories);
  console.log(`  - Accuracy: ${(valMetrics.accuracy * 100).toFixed(2)}%`);
  console.log(`  - Macro F1: ${(valMetrics.macroF1 * 100).toFixed(2)}%`);
  console.log(`  - Per-class metrics:`);
  Object.entries(valMetrics.metrics).forEach(([cat, m]) => {
    console.log(`    ${cat}: P=${(m.precision * 100).toFixed(0)}% R=${(m.recall * 100).toFixed(0)}% F1=${(m.f1 * 100).toFixed(0)}%`);
  });
  console.log();

  // STEP 5: Evaluate on test set
  console.log('STEP 5: Evaluating on test set (final evaluation)...');
  const testPredictions = test.map(s => model.predict(s.text));
  const testActual = test.map(s => s.label);
  const testMetrics = calculateMetrics(testPredictions, testActual, categories);
  console.log(`  - Accuracy: ${(testMetrics.accuracy * 100).toFixed(2)}%`);
  console.log(`  - Macro F1: ${(testMetrics.macroF1 * 100).toFixed(2)}%`);
  console.log();

  // STEP 6: Save trained model
  console.log('STEP 6: Saving trained model...');
  const modelData = {
    type: 'gaussian-naive-bayes',
    version: '1.0',
    timestamp: new Date().toISOString(),
    categories,
    classPriors: model.classPriors,
    featureStats: model.featureStats,
    metrics: {
      validation: {
        accuracy: valMetrics.accuracy,
        macroF1: valMetrics.macroF1,
        perClass: valMetrics.metrics
      },
      test: {
        accuracy: testMetrics.accuracy,
        macroF1: testMetrics.macroF1,
        perClass: testMetrics.metrics
      }
    },
    datasetInfo: {
      totalSamples: rawData.length,
      trainSamples: train.length,
      validationSamples: validation.length,
      testSamples: test.length
    }
  };

  const modelPath = path.join(__dirname, 'ml-model-trained.json');
  fs.writeFileSync(modelPath, JSON.stringify(modelData, null, 2));
  console.log(`  ✓ Model saved to ml-model-trained.json`);
  console.log();

  // Summary
  console.log('=== TRAINING SUMMARY ===');
  console.log(`Baseline model (Gaussian Naive Bayes):`);
  console.log(`  - Test Accuracy: ${(testMetrics.accuracy * 100).toFixed(2)}%`);
  console.log(`  - Test Macro F1: ${(testMetrics.macroF1 * 100).toFixed(2)}%`);
  console.log(`  - Categories: ${categories.length}`);
  console.log(`  - Dataset: ${rawData.length} samples (train: ${train.length}, val: ${validation.length}, test: ${test.length})`);
  console.log('\nNext step: Run `npm run dev` to deploy the model with the inference pipeline.\n');
};

main().catch(console.error);
