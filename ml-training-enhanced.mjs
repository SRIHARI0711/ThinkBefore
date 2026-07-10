#!/usr/bin/env node
/**
 * Enhanced ML Model Training
 * Uses TensorFlow.js with proper text vectorization and neural network
 * Generates a model that can predict: category, risk level, and scores
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import tf from '@tensorflow/tfjs-node';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Starting Enhanced ML Model Training...\n');

// ==================== DATA LOADING ====================

const loadTrainingData = () => {
  const dataPath = path.join(__dirname, 'ml-training-data.json');
  const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  return rawData.training_data;
};

// ==================== TEXT PREPROCESSING ====================

const tokenize = (text) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
};

const buildVocabulary = (data, minFreq = 2) => {
  const wordFreq = {};
  
  data.forEach(sample => {
    const tokens = tokenize(sample.text);
    tokens.forEach(token => {
      wordFreq[token] = (wordFreq[token] || 0) + 1;
    });
  });

  const vocabulary = Object.entries(wordFreq)
    .filter(([word, freq]) => freq >= minFreq)
    .map(([word]) => word);

  console.log(`✓ Vocabulary size: ${vocabulary.length} unique words (min frequency: ${minFreq})`);
  return vocabulary;
};

// ==================== FEATURE EXTRACTION ====================

const textToVector = (text, vocabulary) => {
  const vector = new Array(vocabulary.length).fill(0);
  const tokens = tokenize(text);
  
  tokens.forEach(token => {
    const idx = vocabulary.indexOf(token);
    if (idx !== -1) vector[idx]++;
  });

  // Normalize
  const sum = vector.reduce((a, b) => a + b, 0);
  if (sum > 0) {
    return vector.map(v => v / sum);
  }
  return vector;
};

const extractEnhancedFeatures = (text, vocabulary) => {
  const vector = textToVector(text, vocabulary);
  
  // Add additional features
  const tokens = tokenize(text);
  const features = [
    ...vector,
    tokens.length / 100,                    // text length (normalized)
    (text.match(/\?/g) || []).length / 10, // question marks
    (text.match(/!/g) || []).length / 10   // exclamation marks
  ];

  return features;
};

// ==================== LABEL ENCODING ====================

const encodeLabels = (data) => {
  const categories = [...new Set(data.map(d => d.label))];
  const riskLevels = [...new Set(data.map(d => d.risk_level))];

  const categoryToIdx = Object.fromEntries(categories.map((cat, i) => [cat, i]));
  const riskToIdx = Object.fromEntries(riskLevels.map((risk, i) => [risk, i]));

  console.log(`✓ Categories: ${categories.length} (${categories.join(', ')})`);
  console.log(`✓ Risk levels: ${riskLevels.length} (${riskLevels.join(', ')})`);

  return { categoryToIdx, riskToIdx, idxToCategory: categories, idxToRisk: riskLevels };
};

// ==================== DATA PREPARATION ====================

const prepareDatasets = (data, vocabulary, encodings) => {
  // Shuffle data
  const shuffled = [...data].sort(() => Math.random() - 0.5);

  // Split: 70% train, 15% validation, 15% test
  const trainSize = Math.floor(shuffled.length * 0.70);
  const valSize = Math.floor(shuffled.length * 0.15);

  const trainData = shuffled.slice(0, trainSize);
  const valData = shuffled.slice(trainSize, trainSize + valSize);
  const testData = shuffled.slice(trainSize + valSize);

  console.log(`\n✓ Data split:`);
  console.log(`  - Training: ${trainData.length} samples`);
  console.log(`  - Validation: ${valData.length} samples`);
  console.log(`  - Test: ${testData.length} samples`);

  // Convert to tensors
  const convertDataset = (dataset) => {
    const features = dataset.map(d => extractEnhancedFeatures(d.text, vocabulary));
    const categories = dataset.map(d => encodings.categoryToIdx[d.label]);
    const risks = dataset.map(d => encodings.riskToIdx[d.risk_level]);

    return {
      features: tf.tensor2d(features),
      categories: tf.tensor1d(categories, 'int32'),
      risks: tf.tensor1d(risks, 'int32'),
      raw: dataset
    };
  };

  const train = convertDataset(trainData);
  const val = convertDataset(valData);
  const test = convertDataset(testData);

  return { train, val, test };
};

// ==================== MODEL ARCHITECTURE ====================
const buildModel = (inputShape, numCategories, numRiskLevels) => {
  const model = tf.sequential({
    layers: [
      tf.layers.dense({ inputShape: [inputShape], units: 256, activation: 'relu' }),
      tf.layers.dropout({ rate: 0.3 }),
      tf.layers.dense({ units: 128, activation: 'relu' }),
      tf.layers.dropout({ rate: 0.2 }),
      tf.layers.dense({ units: 64, activation: 'relu' }),
      tf.layers.dense({ units: 32, activation: 'relu' })
    ]
  });

  // Output heads for both tasks
  const categoryOutput = tf.layers.dense({ units: numCategories, activation: 'softmax', name: 'category' })(model.output);
  const riskOutput = tf.layers.dense({ units: numRiskLevels, activation: 'softmax', name: 'risk' })(model.output);

  const multiTaskModel = tf.model({ inputs: model.input, outputs: [categoryOutput, riskOutput] });

  multiTaskModel.compile({
    optimizer: tf.train.adam(0.001),
    loss: ['sparseCategoricalCrossentropy', 'sparseCategoricalCrossentropy'],
    metrics: ['accuracy']
  });

  return multiTaskModel;
};

// ==================== TRAINING ====================

const trainModel = async (model, datasets) => {
  console.log('\n🔄 Training model...\n');

  const history = await model.fit(
    datasets.train.features,
    [datasets.train.categories, datasets.train.risks],
    {
      epochs: 50,
      batchSize: 16,
      validationData: [
        datasets.val.features,
        [datasets.val.categories, datasets.val.risks]
      ],
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if ((epoch + 1) % 10 === 0) {
            console.log(`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}, val_loss = ${logs.val_loss.toFixed(4)}`);
          }
        }
      },
      verbose: 0
    }
  );

  console.log('\n✓ Training completed!');
  return history;
};

// ==================== EVALUATION ====================

const evaluateModel = async (model, datasets, encodings) => {
  console.log('\n📊 Evaluating model...\n');

  const [categoryPreds, riskPreds] = model.predict(datasets.test.features);

  const categoryIndices = categoryPreds.argMax(-1).dataSync();
  const riskIndices = riskPreds.argMax(-1).dataSync();

  let categoryCorrect = 0;
  let riskCorrect = 0;

  for (let i = 0; i < categoryIndices.length; i++) {
    if (categoryIndices[i] === datasets.test.categories.dataSync()[i]) categoryCorrect++;
    if (riskIndices[i] === datasets.test.risks.dataSync()[i]) riskCorrect++;
  }

  const categoryAccuracy = (categoryCorrect / categoryIndices.length) * 100;
  const riskAccuracy = (riskCorrect / riskIndices.length) * 100;

  console.log(`Category Classification Accuracy: ${categoryAccuracy.toFixed(2)}%`);
  console.log(`Risk Level Prediction Accuracy: ${riskAccuracy.toFixed(2)}%`);

  categoryPreds.dispose();
  riskPreds.dispose();
};

// ==================== MODEL EXPORT ====================

const exportModel = async (model, vocabulary, encodings) => {
  console.log('\n💾 Exporting model...\n');

  // Export model weights
  const modelJson = await model.toJSON();

  // Create comprehensive model package
  const modelPackage = {
    version: '2.0-enhanced',
    timestamp: new Date().toISOString(),
    model: modelJson,
    vocabulary,
    encodings: {
      categoryToIdx: encodings.categoryToIdx,
      riskToIdx: encodings.riskToIdx,
      idxToCategory: encodings.idxToCategory,
      idxToRisk: encodings.idxToRisk
    },
    config: {
      featureSize: vocabulary.length + 3, // +3 for additional features
      numCategories: encodings.idxToCategory.length,
      numRiskLevels: encodings.idxToRisk.length,
      model: 'multi-task-neural-network'
    }
  };

  const outputPath = path.join(__dirname, 'ml-model-trained-enhanced.json');
  fs.writeFileSync(outputPath, JSON.stringify(modelPackage, null, 2));

  console.log(`✓ Model exported to: ${outputPath}`);
  console.log(`  - Vocabulary size: ${vocabulary.length}`);
  console.log(`  - Categories: ${encodings.idxToCategory.length}`);
  console.log(`  - Risk levels: ${encodings.idxToRisk.length}`);

  return modelPackage;
};

// ==================== MAIN EXECUTION ====================

const main = async () => {
  try {
    // Step 1: Load data
    console.log('📂 Loading training data...');
    const data = loadTrainingData();
    console.log(`✓ Loaded ${data.length} samples\n`);

    // Step 2: Build vocabulary
    console.log('📚 Building vocabulary...');
    const vocabulary = buildVocabulary(data, 2);

    // Step 3: Encode labels
    console.log('\n🏷️  Encoding labels...');
    const encodings = encodeLabels(data);

    // Step 4: Prepare datasets
    console.log('\n🔧 Preparing datasets...');
    const datasets = prepareDatasets(data, vocabulary, encodings);

    // Step 5: Build model
    console.log('\n🏗️  Building neural network model...');
    const featureSize = vocabulary.length + 3;
    const model = buildModel(featureSize, encodings.idxToCategory.length, encodings.idxToRisk.length);
    console.log(`✓ Model architecture created`);
    console.log(`  - Input features: ${featureSize}`);
    console.log(`  - Output tasks: 2 (category + risk)`);

    // Step 6: Train model
    await trainModel(model, datasets);

    // Step 7: Evaluate model
    await evaluateModel(model, datasets, encodings);

    // Step 8: Export model
    await exportModel(model, vocabulary, encodings);

    console.log('\n✅ Model training completed successfully!\n');

    // Cleanup
    datasets.train.features.dispose();
    datasets.train.categories.dispose();
    datasets.train.risks.dispose();
    datasets.val.features.dispose();
    datasets.val.categories.dispose();
    datasets.val.risks.dispose();
    datasets.test.features.dispose();
    datasets.test.categories.dispose();
    datasets.test.risks.dispose();

    model.dispose();

  } catch (error) {
    console.error('❌ Error during model training:', error);
    process.exit(1);
  }
};

main();
