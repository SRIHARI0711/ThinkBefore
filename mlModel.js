// Dynamic module setup for Node.js
let fs = null;
let path = null;
let __dirname = null;

(async () => {
  if (typeof window === 'undefined') {
    try {
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      fs = require('fs');
      path = require('path');
      const { fileURLToPath } = await import('url');
      __dirname = path.dirname(fileURLToPath(import.meta.url));
      // Immediately try to load the model
      loadTrainedModelNode();
    } catch (e) {
      console.warn('[ML] Could not set up Node.js modules');
    }
  }
})();

/**
 * TRAINED MODEL WEIGHTS AND INFERENCE
 * Browser-compatible model loading
 */
let trainedModel = null;
let modelLoadingPromise = null;

const loadTrainedModelBrowser = async () => {
  if (trainedModel) return trainedModel;
  if (modelLoadingPromise) return modelLoadingPromise;
  
  modelLoadingPromise = (async () => {
    try {
      const response = await fetch('./ml-model-trained.json');
      if (response.ok) {
        trainedModel = await response.json();
        console.log('[ML] Trained model loaded successfully');
        return trainedModel;
      }
    } catch (error) {
      console.warn('[ML] Could not load trained model, falling back to heuristics', error);
    }
    return null;
  })();
  
  return modelLoadingPromise;
};

const loadTrainedModelNode = () => {
  if (trainedModel) return trainedModel;
  
  if (!fs || !path || !__dirname) {
    return null;
  }
  
  try {
    const modelPath = path.join(__dirname, 'ml-model-trained.json');
    
    if (fs.existsSync(modelPath)) {
      trainedModel = JSON.parse(fs.readFileSync(modelPath, 'utf-8'));
      console.log('[ML] Trained model loaded successfully');
      return trainedModel;
    }
  } catch (error) {
    console.warn('[ML] Could not load trained model, falling back to heuristics:', error.message);
  }
  
  return null;
};

// Load model on startup based on environment
if (typeof window === 'undefined') {
  // Node.js environment (training/testing)
  loadTrainedModelNode();
} else {
  // Browser environment (React app) - load asynchronously
  loadTrainedModelBrowser().catch(err => console.warn('[ML] Model loading error:', err));
}

// ==================== FEATURE EXTRACTION ====================

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

const CATEGORY_DOMAINS = {
  'consent-risk': 'relationship',
  'environment-risk': 'environment',
  'violence': 'harmful',
  'health-risk': 'health',
  'productivity': 'productivity',
  'financial': 'financial',
  'social': 'social',
  'ethics': 'social',
  'self-care': 'health',
  'relationship': 'relationship',
  'safety-risk': 'safety',
  'legal-risk': 'legal',
  'career': 'career',
  'travel': 'travel',
  'education': 'education',
  'family': 'family',
  'leisure': 'leisure',
  'investments': 'financial'
};

const CONSEQUENCE_TEMPLATES = {
  'consent-risk': [
    '⚠️ Non-consensual contact may be considered assault and can lead to legal trouble.',
    '⚠️ Emotionally harming another person can damage your reputation and relationships.',
    '⚠️ This behavior violates boundaries and could result in social consequences.',
    '⚠️ It is important to respect consent and seek healthy, mutual interactions.'
  ],
  'environment-risk': [
    '⚠️ Cutting down trees harms local wildlife and reduces oxygen production.',
    '⚠️ Tree loss increases soil erosion and damages the ecosystem.',
    '⚠️ Many places protect trees legally, so this may carry fines or penalties.',
    '⚠️ This choice is harmful to the environment and future generations.'
  ],
  'violence': [
    '⚠️ Violence can cause physical injury and serious legal consequences.',
    '⚠️ It can destroy trust and harm both your relationships and your future.',
    '⚠️ Aggressive actions often escalate and can lead to regret or liability.'
  ],
  'health-risk': [
    '⚠️ Substance use can damage your health and wellbeing over time.',
    '⚠️ This behavior may increase stress, anxiety, or long-term illness.',
    '⚠️ Consider safer alternatives that support your health goals.'
  ],
  'ethics': [
    '⚠️ Dishonest choices can damage reputation and trust.',
    '⚠️ Avoiding responsibility may create bigger problems later.',
    '⚠️ Choose honesty and accountability whenever possible.'
  ],
  'relationship': [
    '⚠️ Relationship decisions can affect trust and long-term wellbeing.',
    '⚠️ Be mindful of consent, respect, and honest communication.',
    '⚠️ Small wrong choices can cause lasting emotional damage.'
  ],
  'safety-risk': [
    '⚠️ Risking safety can cause serious injury and legal consequences.',
    '⚠️ When in doubt, choose the safer option and avoid reckless behavior.',
    '⚠️ Safety should be your priority for yourself and others.'
  ],
  'legal-risk': [
    '⚠️ Illegal actions may expose you to criminal charges and penalties.',
    '⚠️ Breaking the law can affect your future freedom and opportunities.',
    '⚠️ Choose lawful alternatives to avoid long-term consequences.'
  ],
  'career': [
    '⚠️ Career decisions can have long-term impacts on your professional growth.',
    '⚠️ Consider consequences before making major career changes.',
    '⚠️ Think about your goals and the potential outcomes of this action.'
  ],
  'productivity': [
    '⚠️ Procrastination and abandoning tasks can lead to missed opportunities.',
    '⚠️ Your future self will thank you for staying focused and responsible.',
    '⚠️ Breaking commitments damages trust and your reputation.'
  ],
  'financial': [
    '⚠️ Financial decisions can have lasting impacts on your stability.',
    '⚠️ Avoid impulsive spending or risky investments.',
    '⚠️ Take time to think through the financial consequences.'
  ],
  'travel': [
    '⚠️ Travel decisions should be planned carefully.',
    '⚠️ Consider your budget and safety before traveling.',
    '⚠️ Impulsive travel can lead to regret or financial strain.'
  ],
  'education': [
    '⚠️ Educational decisions can shape your future opportunities.',
    '⚠️ Think carefully before making major academic changes.',
    '⚠️ Consider the long-term impact on your goals and career.'
  ],
  'family': [
    '⚠️ Family decisions can have lasting emotional impacts.',
    '⚠️ Consider how your choices affect your relationships.',
    '⚠️ Family bonds are important - think before acting in anger.'
  ],
  'social': [
    '⚠️ Social decisions can affect your relationships and reputation.',
    '⚠️ Be mindful of how your actions impact others.',
    '⚠️ Gossip and rumors can cause lasting harm.'
  ],
  'self-care': [
    '✓ Taking care of yourself is important and positive.',
    '✓ This decision shows responsibility toward your wellbeing.',
    '✓ Continue prioritizing your health and happiness.'
  ],
  'leisure': [
    '✓ Taking time to relax and enjoy hobbies is healthy.',
    '✓ Recreation and leisure are important for wellbeing.',
    '✓ This is a positive way to spend your time.'
  ],
  'default': [
    '⚠️ This decision has risk; consider the consequences before continuing.',
    '⚠️ Talk to someone you trust about the possible outcomes.',
    '⚠️ It may help to pause and think through the impact of your choice.'
  ]
};

const countMatches = (tokens, set) => tokens.reduce((sum, token) => sum + (set.has(token) ? 1 : 0), 0);

const extractFeatures = (text) => {
  const normalized = text.toLowerCase();
  const tokens = tokenize(normalized);
  const tokenSet = new Set(tokens);
  
  const features = {
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
  };

  Object.keys(CATEGORY_PATTERNS).forEach((category) => {
    features[`${category}Count`] = countMatches(tokens, CATEGORY_PATTERNS[category]);
  });

  return features;
};

// ==================== ML MODEL INFERENCE ====================

const predictWithTrainedModel = (text) => {
  if (!trainedModel) return null;

  const features = extractFeatures(text);
  let scores = {};

  trainedModel.categories.forEach(cat => {
    scores[cat] = Math.log(trainedModel.classPriors[cat] || 0.001);
    
    Object.entries(features).forEach(([feature, value]) => {
      const stats = trainedModel.featureStats?.[cat]?.[feature];
      if (stats) {
        // Gaussian probability
        const { mean, std } = stats;
        const exponent = -Math.pow(value - mean, 2) / (2 * Math.pow(std, 2));
        const prob = (1 / Math.sqrt(2 * Math.PI * Math.pow(std, 2))) * Math.exp(exponent);
        scores[cat] += Math.log(prob + 1e-9);
      }
    });
  });

  const predicted = Object.keys(scores).reduce((a, b) => 
    scores[a] > scores[b] ? a : b
  );
  
  return predicted;
};

// ==================== RISK CLASSIFICATION ====================

const getRiskLevel = (category, trainedModelUsed = false) => {
  // High-risk categories
  const criticalRisk = ['violence', 'legal-risk', 'environment-risk', 'health-risk'];
  const highRisk = ['consent-risk', 'safety-risk', 'ethics', 'career'];
  const mediumRisk = ['financial', 'productivity', 'relationship'];
  
  if (criticalRisk.includes(category)) return 'critical';
  if (highRisk.includes(category)) return 'high';
  if (mediumRisk.includes(category)) return 'medium';
  return 'low';
};

const getConsequences = (category, riskLevel) => {
  const template = CONSEQUENCE_TEMPLATES[category] || CONSEQUENCE_TEMPLATES.default;
  
  if (riskLevel === 'critical') return template;
  if (riskLevel === 'high') return template.slice(0, 2);
  if (riskLevel === 'medium') return template.slice(0, 1);
  return ['✓ This appears low risk, but stay mindful of others and your environment.'];
};

const getIntervention = (riskLevel) => {
  const interventions = {
    'critical': '🚨 CRITICAL RISK: This action could cause serious harm or long-term negative consequences. Do not proceed without reconsidering your motives and context.',
    'high': '⚠️ HIGH RISK: This decision could lead to negative outcomes. Slow down, think about the consequences, and seek trusted perspective.',
    'medium': '⚡ MODERATE RISK: There are meaningful tradeoffs. Review your goals and possible impact before moving forward.',
    'low': '✓ LOW RISK: This seems reasonable, but remain aware of how it may affect you and others.'
  };
  
  return interventions[riskLevel] || interventions.low;
};

// ==================== MAIN PREDICTION FUNCTION ====================

const analyzeDecision = (text) => {
  const timestamp = new Date().toLocaleString();
  
  // Try trained model first
  let predictedCategory = null;
  let modelUsed = 'trained';
  
  if (trainedModel) {
    predictedCategory = predictWithTrainedModel(text);
  } else {
    // Fallback: use heuristic-based approach
    const tokens = tokenize(text.toLowerCase());
    let bestMatch = { category: 'other', score: 0 };
    
    Object.keys(CATEGORY_PATTERNS).forEach((category) => {
      const score = countMatches(tokens, CATEGORY_PATTERNS[category]);
      if (score > bestMatch.score) {
        bestMatch = { category, score };
      }
    });
    
    predictedCategory = bestMatch.category;
    modelUsed = 'heuristic';
  }

  const riskLevel = getRiskLevel(predictedCategory);
  const consequences = getConsequences(predictedCategory, riskLevel);
  const domain = CATEGORY_DOMAINS[predictedCategory] || 'other';

  return {
    text,
    category: predictedCategory,
    domain,
    riskLevel,
    intervention: getIntervention(riskLevel),
    consequences,
    modelUsed,
    timestamp,
    // Backward compatibility
    behavior: predictedCategory,
    predictedRisk: riskLevel,
    consequenceSeverity: riskLevel.toUpperCase()
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
  categories: Object.keys(CATEGORY_DOMAINS),
  version: '2.0-with-ml',
  description: 'Decision analysis with trained ML model + fallback heuristics'
};
