// Enhanced ML Model with proper scoring
// Uses TensorFlow.js for context-aware analysis

let fs = null;
let path = null;
let __dirname = null;
let tf = null;

(async () => {
  if (typeof window === 'undefined') {
    try {
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      fs = require('fs');
      path = require('path');
      const { fileURLToPath } = await import('url');
      __dirname = path.dirname(fileURLToPath(import.meta.url));
      
      try {
        tf = require('@tensorflow/tfjs-node');
      } catch (e) {
        tf = (await import('@tensorflow/tfjs')).default;
      }
      
      loadTrainedModelNode();
    } catch (e) {
      console.warn('[ML] Could not set up Node.js modules');
    }
  }
})();

// ==================== MODEL STATE ====================

let trainedModel = null;
let modelPackage = null;
let modelLoadingPromise = null;

const loadTrainedModelBrowser = async () => {
  if (trainedModel) return trainedModel;
  if (modelLoadingPromise) return modelLoadingPromise;
  
  modelLoadingPromise = (async () => {
    try {
      const response = await fetch('./ml-model-trained-enhanced.json');
      if (response.ok) {
        modelPackage = await response.json();
        if (tf && modelPackage.model) {
          trainedModel = await tf.loadLayersModel(tf.io.browserFiles([
            new File([JSON.stringify(modelPackage.model)], 'model.json')
          ]));
        }
        console.log('[ML] Enhanced trained model loaded successfully');
        return modelPackage;
      }
    } catch (error) {
      console.warn('[ML] Could not load enhanced model', error);
    }
    return null;
  })();
  
  return modelLoadingPromise;
};

const loadTrainedModelNode = () => {
  if (modelPackage) return modelPackage;
  
  if (!fs || !path || !__dirname) {
    return null;
  }

  try {
    const modelPath = path.join(__dirname, 'ml-model-trained-enhanced.json');
    
    if (fs.existsSync(modelPath)) {
      modelPackage = JSON.parse(fs.readFileSync(modelPath, 'utf-8'));
      
      if (tf && modelPackage.model) {
        trainedModel = tf.models.modelFromJSON(modelPackage.model);
        console.log('[ML] Enhanced trained model loaded successfully');
      }
      
      return modelPackage;
    } else {
      console.warn('[ML] Enhanced model file not found, using fallback');
    }
  } catch (error) {
    console.warn('[ML] Could not load enhanced model:', error.message);
  }
  
  return null;
};

if (typeof window === 'undefined') {
  loadTrainedModelNode();
} else {
  loadTrainedModelBrowser().catch(err => console.warn('[ML] Model loading error:', err));
}

// ==================== FEATURE EXTRACTION ====================

const tokenize = (text) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
};

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
  
  const tokens = tokenize(text);
  const features = [
    ...vector,
    tokens.length / 100,                    // text length (normalized)
    (text.match(/\?/g) || []).length / 10, // question marks
    (text.match(/!/g) || []).length / 10   // exclamation marks
  ];

  return features;
};

// ==================== DOMAIN MAPPING ====================

const CATEGORY_DOMAINS = {
  'consent-risk': 'Relationship & Consent',
  'environment-risk': 'Environment',
  'violence': 'Harmful Behavior',
  'health-risk': 'Health & Wellness',
  'productivity': 'Productivity',
  'financial': 'Financial',
  'social': 'Social',
  'ethics': 'Ethics & Integrity',
  'self-care': 'Health & Wellness',
  'relationship': 'Relationship',
  'safety-risk': 'Safety',
  'legal-risk': 'Legal',
  'career': 'Career',
  'travel': 'Travel',
  'education': 'Education',
  'family': 'Family',
  'leisure': 'Leisure',
  'investments': 'Financial'
};

// ==================== CONSEQUENCE TEMPLATES ====================

const CONSEQUENCE_TEMPLATES = {
  'consent-risk': {
    critical: [
      '⚠️ Could result in serious legal consequences including criminal charges.',
      '⚠️ May cause lasting psychological harm to others.',
      '⚠️ Could result in restraining orders or lawsuits.'
    ],
    high: [
      '⚠️ Violates personal boundaries and could damage trust.',
      '⚠️ May have legal implications.',
      '⚠️ Could harm your reputation and relationships.'
    ],
    medium: [
      '⚠️ Could make others uncomfortable.',
      '⚠️ May affect your personal relationships.',
      '⚠️ Consider asking for consent first.'
    ],
    low: [
      '✓ This action respects others\' boundaries.',
      '✓ Demonstrates healthy communication.',
      '✓ Strengthens trust in relationships.'
    ]
  },
  'environment-risk': {
    critical: [
      '🌍 Could cause irreversible environmental damage.',
      '🌍 May be illegal under environmental protection laws.',
      '🌍 Will harm ecosystems and future generations.'
    ],
    high: [
      '⚠️ Significantly harms the environment.',
      '⚠️ May violate environmental regulations.',
      '⚠️ Contributes to ecological degradation.'
    ],
    medium: [
      '⚠️ Has environmental impact.',
      '⚠️ Consider more sustainable alternatives.',
      '⚠️ Small actions add up over time.'
    ],
    low: [
      '✓ Supports environmental sustainability.',
      '✓ Positive contribution to ecology.',
      '✓ Demonstrates environmental responsibility.'
    ]
  },
  'violence': {
    critical: [
      '🚨 Could result in severe injury or death.',
      '🚨 Will result in criminal charges.',
      '🚨 Could destroy your future and freedom.'
    ],
    high: [
      '⚠️ Could cause significant physical harm.',
      '⚠️ Likely to have serious legal consequences.',
      '⚠️ Will damage relationships and reputation.'
    ],
    medium: [
      '⚠️ Could harm someone.',
      '⚠️ May face legal action.',
      '⚠️ Consider non-violent alternatives.'
    ],
    low: [
      '✓ Safe and constructive.',
      '✓ Respects physical boundaries.',
      '✓ Positive way to address feelings.'
    ]
  },
  'health-risk': {
    critical: [
      '⚠️ Could cause serious illness or death.',
      '⚠️ May result in hospitalization.',
      '⚠️ Irreversible health damage possible.'
    ],
    high: [
      '⚠️ Poses significant health risks.',
      '⚠️ Could develop into chronic condition.',
      '⚠️ May require medical intervention.'
    ],
    medium: [
      '⚠️ Has health implications.',
      '⚠️ Consider healthier alternatives.',
      '⚠️ May affect your wellbeing over time.'
    ],
    low: [
      '✓ Supports good health.',
      '✓ Promotes wellbeing.',
      '✓ Contributes to healthy lifestyle.'
    ]
  },
  'ethics': {
    critical: [
      '⚠️ Illegal and could result in criminal charges.',
      '⚠️ Violates fundamental ethical principles.',
      '⚠️ Will damage your integrity and reputation permanently.'
    ],
    high: [
      '⚠️ Dishonest and could have serious consequences.',
      '⚠️ Violates ethical standards.',
      '⚠️ May result in legal or professional repercussions.'
    ],
    medium: [
      '⚠️ Ethically questionable.',
      '⚠️ Consider the honest alternative.',
      '⚠️ May affect your credibility.'
    ],
    low: [
      '✓ Demonstrates integrity.',
      '✓ Builds trust with others.',
      '✓ Ethical and responsible choice.'
    ]
  },
  'financial': {
    critical: [
      '💸 Could result in financial ruin.',
      '💸 May lead to homelessness or debt.',
      '💸 Could affect your financial security for years.'
    ],
    high: [
      '⚠️ Significant financial risk.',
      '⚠️ Could impact your financial stability.',
      '⚠️ Consider consulting a financial advisor.'
    ],
    medium: [
      '⚠️ Some financial risk involved.',
      '⚠️ Plan carefully before committing.',
      '⚠️ Consider your financial goals.'
    ],
    low: [
      '✓ Financially sound decision.',
      '✓ Contributes to financial health.',
      '✓ Smart financial planning.'
    ]
  },
  'relationship': {
    critical: [
      '❤️ Could end your relationship permanently.',
      '❤️ May cause lasting emotional trauma.',
      '❤️ Could destroy trust irreversibly.'
    ],
    high: [
      '⚠️ Could seriously damage your relationship.',
      '⚠️ May create lasting resentment.',
      '⚠️ Consider the long-term impact.'
    ],
    medium: [
      '⚠️ Could affect your relationship.',
      '⚠️ Communicate openly about this.',
      '⚠️ Think about your partner\'s perspective.'
    ],
    low: [
      '✓ Strengthens your relationship.',
      '✓ Shows care and respect.',
      '✓ Builds trust and intimacy.'
    ]
  },
  'safety-risk': {
    critical: [
      '🚨 Extreme safety risk - could cause death or serious injury.',
      '🚨 Will likely result in emergency intervention.',
      '🚨 Avoid at all costs.'
    ],
    high: [
      '⚠️ Serious safety risk.',
      '⚠️ Could result in significant injury.',
      '⚠️ Always prioritize safety.'
    ],
    medium: [
      '⚠️ Some safety concerns.',
      '⚠️ Take precautions.',
      '⚠️ Consider safer alternatives.'
    ],
    low: [
      '✓ Safe action.',
      '✓ Proper safety measures in place.',
      '✓ Minimizes risk.'
    ]
  },
  'legal-risk': {
    critical: [
      '⚖️ Serious criminal offense.',
      '⚖️ Could result in imprisonment.',
      '⚖️ Will have permanent consequences on your record.'
    ],
    high: [
      '⚠️ Illegal and could result in charges.',
      '⚠️ May face significant fines or penalties.',
      '⚠️ Could affect your future employment.'
    ],
    medium: [
      '⚠️ Legal gray area.',
      '⚠️ Consider legal advice.',
      '⚠️ May have legal implications.'
    ],
    low: [
      '✓ Legal and compliant.',
      '✓ Follows laws and regulations.',
      '✓ No legal concerns.'
    ]
  },
  'career': {
    critical: [
      '💼 Could end your career.',
      '💼 May result in termination.',
      '💼 Could affect future employment prospects permanently.'
    ],
    high: [
      '⚠️ Could seriously impact your career.',
      '⚠️ May result in disciplinary action.',
      '⚠️ Could damage your professional reputation.'
    ],
    medium: [
      '⚠️ Career implications to consider.',
      '⚠️ Think about long-term career goals.',
      '⚠️ May affect your professional growth.'
    ],
    low: [
      '✓ Supports career growth.',
      '✓ Professional and appropriate.',
      '✓ Contributes to career success.'
    ]
  },
  'default': {
    critical: [
      '🚨 Critical risk - serious negative consequences likely.',
      '🚨 Seek advice before proceeding.',
      '🚨 Consider all alternatives.'
    ],
    high: [
      '⚠️ High risk decision.',
      '⚠️ Could have serious consequences.',
      '⚠️ Think carefully before acting.'
    ],
    medium: [
      '⚠️ Moderate risk involved.',
      '⚠️ Weigh pros and cons.',
      '⚠️ Consider impact on yourself and others.'
    ],
    low: [
      '✓ Low risk.',
      '✓ Appears to be a good choice.',
      '✓ Minimal negative consequences.'
    ]
  }
};

// ==================== ML INFERENCE ====================

const predictWithModel = (text) => {
  if (!modelPackage || !trainedModel) {
    return null;
  }

  try {
    const features = extractEnhancedFeatures(text, modelPackage.vocabulary);
    const input = tf.tensor2d([features]);
    const predictions = trainedModel.predict(input);
    
    const categoryProbs = predictions[0].dataSync();
    const riskProbs = predictions[1].dataSync();
    
    const categoryIdx = categoryProbs.argMax(-1).get(0);
    const riskIdx = riskProbs.argMax(-1).get(0);
    
    const category = modelPackage.encodings.idxToCategory[categoryIdx];
    const riskLevel = modelPackage.encodings.idxToRisk[riskIdx];
    
    const categoryConfidence = categoryProbs[categoryIdx];
    const riskConfidence = riskProbs[riskIdx];
    
    input.dispose();
    predictions[0].dispose();
    predictions[1].dispose();
    
    return {
      category,
      riskLevel,
      categoryConfidence,
      riskConfidence
    };
  } catch (error) {
    console.warn('[ML] Prediction error:', error);
    return null;
  }
};

// ==================== SCORE CALCULATION ====================

const calculateScores = (text, prediction) => {
  const tokens = tokenize(text.toLowerCase());

  // Base severity score from risk level
  const riskLevelScores = {
    'critical': 85,
    'high': 65,
    'medium': 45,
    'low': 20
  };

  let severityScore = riskLevelScores[prediction.riskLevel] || 50;

  // Apply confidence boost
  severityScore = Math.round(severityScore * prediction.riskConfidence);

  // Calculate harmfulness based on content indicators
  const harmfulKeywords = ['harm', 'hurt', 'dangerous', 'risk', 'death', 'injury', 'illegal', 'steal', 'lie', 'cheat', 'violence', 'attack'];
  const positiveKeywords = ['help', 'good', 'safe', 'healthy', 'honest', 'kind', 'respect', 'love', 'care'];
  
  const harmfulCount = tokens.filter(t => harmfulKeywords.includes(t)).length;
  const positiveCount = tokens.filter(t => positiveKeywords.includes(t)).length;
  
  let harmfulnessScore = Math.min(100, (harmfulCount * 20) - (positiveCount * 10) + (prediction.riskConfidence * 20));
  harmfulnessScore = Math.max(0, harmfulnessScore);

  // Calculate negativity score
  const negativeWords = ['not', 'never', 'don\'t', 'won\'t', 'shouldn\'t', 'can\'t', 'hate', 'angry', 'upset'];
  const negativeCount = tokens.filter(t => negativeWords.includes(t)).length;
  
  let negativityScore = Math.min(100, negativeCount * 15 + (prediction.categoryConfidence * 30));
  negativityScore = Math.max(0, negativityScore);

  return {
    severityScore: Math.round(severityScore),
    harmfulnessScore: Math.round(harmfulnessScore),
    negativityScore: Math.round(negativityScore),
    predictedRisk: prediction.riskLevel
  };
};

// ==================== INTERVENTION GENERATION ====================

const getIntervention = (riskLevel, category) => {
  const interventions = {
    'critical': `🚨 CRITICAL RISK: This decision could cause serious harm or long-term negative consequences. This is a high-stakes situation in the "${category}" domain. Do NOT proceed without careful reconsideration and seeking advice from trusted mentors or professionals.`,
    'high': `⚠️ HIGH RISK: This decision in the "${category}" domain could lead to significant negative outcomes. Pause, think about consequences, and seek perspective from people you trust before acting.`,
    'medium': `⚡ MODERATE RISK: There are meaningful tradeoffs in this "${category}" decision. Take time to weigh the pros and cons, understand potential impacts, and ensure you're making an informed choice.`,
    'low': `✓ LOW RISK: This "${category}" decision appears reasonable and low-risk. Stay mindful of context and remain aware of how it may affect you and others around you.`
  };

  return interventions[riskLevel] || interventions.medium;
};

// ==================== MAIN ANALYSIS FUNCTION ====================

const analyzeDecision = (text) => {
  const timestamp = new Date().toLocaleString();
  
  // Get model prediction
  let prediction = null;
  let modelUsed = 'fallback';

  if (modelPackage && trainedModel) {
    prediction = predictWithModel(text);
    if (prediction) {
      modelUsed = 'enhanced-ml';
    }
  }

  // Fallback if model unavailable
  if (!prediction) {
    prediction = {
      category: 'other',
      riskLevel: 'medium',
      categoryConfidence: 0.5,
      riskConfidence: 0.5
    };
  }

  // Calculate scores
  const scores = calculateScores(text, prediction);

  // Get domain
  const domain = CATEGORY_DOMAINS[prediction.category] || 'General';

  // Get intervention
  const intervention = getIntervention(prediction.riskLevel, prediction.category);

  // Get consequences
  const consequenceKey = CONSEQUENCE_TEMPLATES[prediction.category] || CONSEQUENCE_TEMPLATES.default;
  const consequences = consequenceKey[prediction.riskLevel] || consequenceKey.medium;

  return {
    // Scores (required outputs)
    severityScore: scores.severityScore,
    harmfulnessScore: scores.harmfulnessScore,
    negativityScore: scores.negativityScore,
    predictedRisk: scores.predictedRisk,

    // Descriptions (required outputs)
    behaviour: prediction.category,
    domain: domain,
    intervention: intervention,
    consequences: consequences,

    // Metadata
    text,
    modelUsed,
    timestamp,
    confidence: {
      category: Math.round(prediction.categoryConfidence * 100),
      risk: Math.round(prediction.riskConfidence * 100)
    }
  };
};

// ==================== EXPORTS ====================

export { analyzeDecision };

export const loadModel = () => {
  if (typeof window === 'undefined') {
    return loadTrainedModelNode();
  } else {
    return loadTrainedModelBrowser();
  }
};

export const modelInfo = {
  version: '2.0-enhanced',
  description: 'Context-aware ML model using neural networks for decision analysis',
  outputs: ['severityScore', 'harmfulnessScore', 'negativityScore', 'predictedRisk', 'behaviour', 'domain', 'intervention', 'consequences']
};
