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
      loadTrainedModelNode();
    } catch (e) {
      console.warn('[ML] Could not set up Node.js modules');
    }
  }
})();

/**
 * TRAINED NAIVE BAYES MODEL
 * Context-aware classification with proper scoring
 */
let trainedModel = null;
let modelLoadingPromise = null;

const loadTrainedModelBrowser = async () => {
  if (trainedModel) return trainedModel;
  if (modelLoadingPromise) return modelLoadingPromise;
  
  modelLoadingPromise = (async () => {
    try {
      // Try multiple paths for the model file
      const paths = [
        './ml-model-trained.json',
        '/ml-model-trained.json',
        new URL('../ml-model-trained.json', import.meta.url).href
      ];
      
      for (const path of paths) {
        try {
          const response = await fetch(path);
          if (response.ok) {
            trainedModel = await response.json();
            console.log('[ML] Naive Bayes model loaded successfully from', path);
            return trainedModel;
          }
        } catch (e) {
          // Continue to next path
        }
      }
      
      console.warn('[ML] Could not load trained model from any path');
    } catch (error) {
      console.warn('[ML] Error attempting to load trained model', error);
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
      console.log('[ML] Naive Bayes model loaded successfully');
      return trainedModel;
    }
  } catch (error) {
    console.warn('[ML] Could not load model:', error.message);
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

const WORD_SETS = {
  questionWords: new Set(['should', 'could', 'would', 'can', 'may', 'is', 'are', 'am', 'do', 'does', 'did', 'will', 'might']),
  modalWords: new Set(['should', 'could', 'would', 'can', 'may', 'might', 'must', 'need', 'ought']),
  negationWords: new Set(['not', 'never', 'without', 'avoid', "don't", "cant", "can't", "cannot", "won't", "wouldn't"]),
  urgencyWords: new Set(['now', 'today', 'immediately', 'urgent', 'soon', 'quickly', 'asap', 'right', 'immediate']),
  riskIndicators: new Set(['risk', 'unsafe', 'dangerous', 'danger', 'harm', 'hurt', 'kill', 'steal', 'attack', 'drunk', 'illegal', 'crime', 'accident', 'threat']),
  positiveWords: new Set(['safe', 'healthy', 'good', 'help', 'support', 'honest', 'kind', 'respect', 'responsible', 'wise']),
};

const countMatches = (tokens, set) => tokens.reduce((sum, token) => sum + (set.has(token) ? 1 : 0), 0);
const clampScore = (value) => Math.max(0, Math.min(100, Math.round(value)));

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
  'consent-risk': {
    critical: ['⚠️ Could result in serious legal consequences including criminal charges.', '⚠️ May cause lasting psychological harm to others.', '⚠️ Could result in restraining orders or lawsuits.'],
    high: ['⚠️ Violates personal boundaries and could damage trust.', '⚠️ May have legal implications.', '⚠️ Could harm your reputation and relationships.'],
    medium: ['⚠️ Could make others uncomfortable.', '⚠️ May affect your personal relationships.'],
    low: ['✓ This action respects others\' boundaries.', '✓ Demonstrates healthy communication.']
  },
  'environment-risk': {
    critical: ['🌍 Could cause irreversible environmental damage.', '🌍 May be illegal under environmental protection laws.', '🌍 Will harm ecosystems and future generations.'],
    high: ['⚠️ Significantly harms the environment.', '⚠️ May violate environmental regulations.'],
    medium: ['⚠️ Has environmental impact.', '⚠️ Consider more sustainable alternatives.'],
    low: ['✓ Supports environmental sustainability.', '✓ Positive contribution to ecology.']
  },
  'violence': {
    critical: ['🚨 Could result in severe injury or death.', '🚨 Will result in criminal charges.', '🚨 Could destroy your future and freedom.'],
    high: ['⚠️ Could cause significant physical harm.', '⚠️ Likely to have serious legal consequences.'],
    medium: ['⚠️ Could harm someone.', '⚠️ May face legal action.'],
    low: ['✓ Safe and constructive.', '✓ Respects physical boundaries.']
  },
  'health-risk': {
    critical: ['⚠️ Could cause serious illness or death.', '⚠️ May result in hospitalization.', '⚠️ Irreversible health damage possible.'],
    high: ['⚠️ Poses significant health risks.', '⚠️ Could develop into chronic condition.'],
    medium: ['⚠️ Has health implications.', '⚠️ Consider healthier alternatives.'],
    low: ['✓ Supports good health.', '✓ Promotes wellbeing.']
  },
  'ethics': {
    critical: ['⚠️ Illegal and could result in criminal charges.', '⚠️ Violates fundamental ethical principles.', '⚠️ Will damage your integrity and reputation permanently.'],
    high: ['⚠️ Dishonest and could have serious consequences.', '⚠️ Violates ethical standards.'],
    medium: ['⚠️ Ethically questionable.', '⚠️ Consider the honest alternative.'],
    low: ['✓ Demonstrates integrity.', '✓ Builds trust with others.']
  },
  'financial': {
    critical: ['💸 Could result in financial ruin.', '💸 May lead to homelessness or debt.', '💸 Could affect your financial security for years.'],
    high: ['⚠️ Significant financial risk.', '⚠️ Could impact your financial stability.'],
    medium: ['⚠️ Some financial risk involved.', '⚠️ Plan carefully before committing.'],
    low: ['✓ Financially sound decision.', '✓ Contributes to financial health.']
  },
  'relationship': {
    critical: ['❤️ Could end your relationship permanently.', '❤️ May cause lasting emotional trauma.', '❤️ Could destroy trust irreversibly.'],
    high: ['⚠️ Could seriously damage your relationship.', '⚠️ May create lasting resentment.'],
    medium: ['⚠️ Could affect your relationship.', '⚠️ Communicate openly about this.'],
    low: ['✓ Strengthens your relationship.', '✓ Shows care and respect.']
  },
  'safety-risk': {
    critical: ['🚨 Extreme safety risk - could cause death or serious injury.', '🚨 Will likely result in emergency intervention.', '🚨 Avoid at all costs.'],
    high: ['⚠️ Serious safety risk.', '⚠️ Could result in significant injury.'],
    medium: ['⚠️ Some safety concerns.', '⚠️ Take precautions.'],
    low: ['✓ Safe action.', '✓ Proper safety measures in place.']
  },
  'legal-risk': {
    critical: ['⚖️ Serious criminal offense.', '⚖️ Could result in imprisonment.', '⚖️ Will have permanent consequences on your record.'],
    high: ['⚠️ Illegal and could result in charges.', '⚠️ May face significant fines or penalties.'],
    medium: ['⚠️ Legal gray area.', '⚠️ Consider legal advice.'],
    low: ['✓ Legal and compliant.', '✓ Follows laws and regulations.']
  },
  'career': {
    critical: ['💼 Could end your career.', '💼 May result in termination.', '💼 Could affect future employment prospects permanently.'],
    high: ['⚠️ Could seriously impact your career.', '⚠️ May result in disciplinary action.'],
    medium: ['⚠️ Career implications to consider.', '⚠️ Think about long-term career goals.'],
    low: ['✓ Supports career growth.', '✓ Professional and appropriate.']
  },
  'productivity': {
    critical: ['⚠️ Could result in complete project failure.', '⚠️ May cause significant consequences for others.', '⚠️ Could affect your professional reputation.'],
    high: ['⚠️ Serious impact on project outcomes.', '⚠️ Could miss important deadlines.'],
    medium: ['⚠️ Could delay progress.', '⚠️ May affect team or personal goals.'],
    low: ['✓ Supports productivity goals.', '✓ Helps accomplish objectives.']
  },
  'travel': {
    critical: ['⚠️ Extreme travel risks.', '⚠️ Could endanger your safety.', '⚠️ Avoid in current circumstances.'],
    high: ['⚠️ Significant travel risks.', '⚠️ Could be dangerous or problematic.'],
    medium: ['⚠️ Travel considerations needed.', '⚠️ Plan carefully.'],
    low: ['✓ Safe travel plans.', '✓ Well-planned and reasonable.']
  },
  'education': {
    critical: ['⚠️ Could derail your education.', '⚠️ May have permanent academic consequences.', '⚠️ Could affect future opportunities.'],
    high: ['⚠️ Serious educational impact.', '⚠️ Could hurt academic progress.'],
    medium: ['⚠️ Educational implications.', '⚠️ Think about learning goals.'],
    low: ['✓ Supports educational goals.', '✓ Contributes to learning.']
  },
  'family': {
    critical: ['❤️ Could permanently damage family relationships.', '❤️ May cause lasting family conflict.', '❤️ Could have serious family consequences.'],
    high: ['⚠️ Could seriously affect family relationships.', '⚠️ May cause family conflict.'],
    medium: ['⚠️ Family considerations needed.', '⚠️ Consider impact on family.'],
    low: ['✓ Strengthens family bonds.', '✓ Shows care for family.']
  },
  'leisure': {
    critical: ['⚠️ Could lead to unhealthy leisure patterns.', '⚠️ May negatively impact wellbeing.'],
    high: ['⚠️ Could affect balance and wellbeing.'],
    medium: ['⚠️ Consider moderation.'],
    low: ['✓ Healthy leisure activity.', '✓ Good for wellbeing.']
  },
  'social': {
    critical: ['⚠️ Could seriously damage social relationships.', '⚠️ May result in social consequences.', '⚠️ Could harm your social reputation.'],
    high: ['⚠️ Could damage social relationships.', '⚠️ May affect your social standing.'],
    medium: ['⚠️ Social considerations.', '⚠️ Think about impact on others.'],
    low: ['✓ Supports social connections.', '✓ Builds relationships.']
  },
  'self-care': {
    critical: ['⚠️ Could seriously harm your wellbeing.'],
    high: ['⚠️ Could negatively impact health.'],
    medium: ['⚠️ Consider your wellbeing.'],
    low: ['✓ Supports your wellbeing.', '✓ Demonstrates self-care.']
  },
  'default': {
    critical: ['🚨 Critical risk - serious negative consequences likely.', '🚨 Seek advice before proceeding.', '🚨 Consider all alternatives.'],
    high: ['⚠️ High risk decision.', '⚠️ Could have serious consequences.'],
    medium: ['⚠️ Moderate risk involved.', '⚠️ Weigh pros and cons.'],
    low: ['✓ Low risk.', '✓ Appears to be a good choice.']
  }
};

// ==================== ML MODEL INFERENCE (NAIVE BAYES) ====================

const predictWithTrainedModel = (text) => {
  if (!trainedModel || !trainedModel.model || !trainedModel.vocabulary) {
    return null;
  }

  try {
    const tokens = tokenizeWithFiltering(text);
    
    if (tokens.length === 0) {
      return null;
    }

    const vocabulary = trainedModel.vocabulary;
    const model = trainedModel.model;
    const encodings = trainedModel.encodings;
    
    // Calculate scores for each category
    const categoryScores = [...model.categoryPriors];
    const numCategories = categoryScores.length;
    
    tokens.forEach(token => {
      const termIdx = vocabulary.indexOf(token);
      if (termIdx !== -1) {
        for (let catIdx = 0; catIdx < numCategories; catIdx++) {
          if (model.categoryFeatureProbs[catIdx] && model.categoryFeatureProbs[catIdx][termIdx] !== undefined) {
            categoryScores[catIdx] += model.categoryFeatureProbs[catIdx][termIdx];
          }
        }
      }
    });

    // Get best category
    let bestCategoryIdx = 0;
    let bestCategoryScore = categoryScores[0];
    for (let i = 1; i < categoryScores.length; i++) {
      if (categoryScores[i] > bestCategoryScore) {
        bestCategoryScore = categoryScores[i];
        bestCategoryIdx = i;
      }
    }

    // Calculate risk scores
    const riskScores = [...model.riskPriors];
    const numRisks = riskScores.length;
    
    tokens.forEach(token => {
      const termIdx = vocabulary.indexOf(token);
      if (termIdx !== -1) {
        for (let riskIdx = 0; riskIdx < numRisks; riskIdx++) {
          if (model.riskFeatureProbs[riskIdx] && model.riskFeatureProbs[riskIdx][termIdx] !== undefined) {
            riskScores[riskIdx] += model.riskFeatureProbs[riskIdx][termIdx];
          }
        }
      }
    });

    // Get best risk level
    let bestRiskIdx = 0;
    let bestRiskScore = riskScores[0];
    for (let i = 1; i < riskScores.length; i++) {
      if (riskScores[i] > bestRiskScore) {
        bestRiskScore = riskScores[i];
        bestRiskIdx = i;
      }
    }

    // Calculate confidence scores using softmax
    const softmax = (scores) => {
      const maxScore = Math.max(...scores);
      const exp = scores.map(s => Math.exp(s - maxScore));
      const sum = exp.reduce((a, b) => a + b, 0);
      return exp.map(e => e / sum);
    };

    const categoryProbs = softmax(categoryScores);
    const riskProbs = softmax(riskScores);
    
    const category = encodings.idxToCategory[bestCategoryIdx];
    const riskLevel = encodings.idxToRisk[bestRiskIdx];
    const categoryConfidence = categoryProbs[bestCategoryIdx];
    const riskConfidence = riskProbs[bestRiskIdx];

    return {
      category,
      riskLevel,
      categoryConfidence,
      riskConfidence,
      modelUsed: 'naive-bayes'
    };
  } catch (error) {
    console.warn('[ML] Prediction error:', error);
    return null;
  }
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

const getIntervention = (riskLevel, category = '') => {
  const interventions = {
    'critical': `🚨 CRITICAL RISK: This decision in the "${category}" domain could cause serious harm or long-term negative consequences. Do NOT proceed without careful reconsideration and seeking advice from trusted mentors or professionals.`,
    'high': `⚠️ HIGH RISK: This decision in the "${category}" domain could lead to significant negative outcomes. Pause, think about consequences, and seek perspective from people you trust before acting.`,
    'medium': `⚡ MODERATE RISK: There are meaningful tradeoffs in this "${category}" decision. Take time to weigh the pros and cons, understand potential impacts, and ensure you're making an informed choice.`,
    'low': `✓ LOW RISK: This "${category}" decision appears reasonable and low-risk. Stay mindful of context and remain aware of how it may affect you and others around you.`
  };
  
  return interventions[riskLevel] || interventions.medium;
};

// ==================== SCORE CALCULATION ====================

const calculateScores = (text, prediction) => {
  const normalizedText = text.toLowerCase();
  const tokens = tokenize(normalizedText);

  const categorySeverityWeights = {
    'violence': 36,
    'consent-risk': 34,
    'legal-risk': 32,
    'safety-risk': 30,
    'health-risk': 28,
    'environment-risk': 24,
    'ethics': 22,
    'career': 18,
    'financial': 17,
    'relationship': 16,
    'productivity': 13,
    'social': 12,
    'travel': 12,
    'education': 10,
    'family': 10,
    'self-care': 8,
    'leisure': 6,
    'investments': 18,
    'other': 10
  };

  const categoryHarmWeights = {
    'violence': 40,
    'consent-risk': 38,
    'legal-risk': 34,
    'safety-risk': 32,
    'health-risk': 30,
    'environment-risk': 25,
    'ethics': 22,
    'relationship': 18,
    'financial': 16,
    'career': 14,
    'social': 12,
    'productivity': 10,
    'travel': 10,
    'education': 8,
    'family': 8,
    'self-care': 7,
    'leisure': 5,
    'investments': 16,
    'other': 8
  };

  const riskLevelSeverityBase = {
    'critical': 72,
    'high': 54,
    'medium': 35,
    'low': 16
  };

  const harmfulKeywords = new Set([
    'harm', 'hurt', 'dangerous', 'risk', 'death', 'injury', 'illegal', 'steal', 'lie', 'cheat',
    'violence', 'attack', 'kill', 'punch', 'kick', 'stab', 'drunk', 'drugs', 'assault', 'crime',
    'unsafe', 'threat', 'weapon', 'abuse', 'crash', 'overdose'
  ]);
  const protectiveKeywords = new Set([
    'help', 'good', 'safe', 'healthy', 'honest', 'kind', 'respect', 'love', 'care', 'support',
    'responsible', 'protect', 'calm', 'legal', 'consent', 'apologize', 'repair'
  ]);
  const emotionalNegativeWords = new Set([
    'angry', 'hate', 'upset', 'furious', 'mad', 'rage', 'annoyed', 'sad', 'depressed', 'stressed',
    'overwhelmed', 'lonely', 'afraid', 'scared', 'ashamed', 'guilty', 'jealous', 'revenge'
  ]);

  const phraseSignals = {
    urgency: ['right now', 'asap', 'as soon as possible', 'immediately', 'this second', 'tonight'],
    severeConsequences: ['go to jail', 'lose my job', 'ruin my life', 'hurt someone', 'kill someone', 'overdose', 'financial ruin', 'serious injury'],
    hostileIntent: ['get back at', 'teach them a lesson', 'make them pay', 'hurt them', 'beat them up'],
    hesitation: ['not sure', 'should i', 'i wonder', 'thinking about', 'maybe i should']
  };

  const countPhraseMatches = (phrases) => phrases.reduce((sum, phrase) => sum + (normalizedText.includes(phrase) ? 1 : 0), 0);

  const harmfulCount = countMatches(tokens, harmfulKeywords);
  const protectiveCount = countMatches(tokens, protectiveKeywords);
  const negationCount = countMatches(tokens, WORD_SETS.negationWords);
  const riskIndicatorCount = countMatches(tokens, WORD_SETS.riskIndicators);
  const urgencyCount = countMatches(tokens, WORD_SETS.urgencyWords) + countPhraseMatches(phraseSignals.urgency);
  const negativeEmotionCount = countMatches(tokens, emotionalNegativeWords);
  const severeConsequenceCount = countPhraseMatches(phraseSignals.severeConsequences);
  const hostileIntentCount = countPhraseMatches(phraseSignals.hostileIntent);
  const hesitationCount = countPhraseMatches(phraseSignals.hesitation);
  const exclamationCount = (text.match(/[!?]/g) || []).length;

  const confidenceBoost = ((prediction.riskConfidence || 0.5) + (prediction.categoryConfidence || 0.5)) / 2;
  const severityBase = riskLevelSeverityBase[prediction.riskLevel] || 35;
  const categorySeverity = categorySeverityWeights[prediction.category] || categorySeverityWeights.other;
  const categoryHarm = categoryHarmWeights[prediction.category] || categoryHarmWeights.other;

  // Severity = seriousness of likely consequences if the action happens.
  const severityScore = clampScore(
    severityBase +
    categorySeverity +
    (riskIndicatorCount * 5) +
    (urgencyCount * 4) +
    (severeConsequenceCount * 12) +
    (hostileIntentCount * 10) -
    (protectiveCount * 4) +
    ((confidenceBoost - 0.5) * 18)
  );

  // Harmfulness = how much harm the action itself appears likely to cause to self/others.
  const harmfulnessScore = clampScore(
    categoryHarm +
    (harmfulCount * 7) +
    (hostileIntentCount * 18) +
    (severeConsequenceCount * 10) +
    (riskIndicatorCount * 3) -
    (protectiveCount * 8) +
    ((prediction.riskLevel === 'critical' || prediction.riskLevel === 'high') ? 8 : 0)
  );

  // Negativity = negative emotional tone and discouraging phrasing in the text.
  const negativityScore = clampScore(
    6 +
    (negativeEmotionCount * 10) +
    (negationCount * 7) +
    (hostileIntentCount * 10) +
    (urgencyCount * 3) +
    Math.min(exclamationCount * 2, 10) -
    (protectiveCount * 5) -
    (hesitationCount * 2)
  );

  return {
    severityScore,
    harmfulnessScore,
    negativityScore,
    predictedRisk: prediction.riskLevel
  };
};

const buildHeuristicPrediction = (text) => {
  const normalizedText = text.toLowerCase();
  const tokens = tokenizeWithFiltering(text);

  if (tokens.length === 0) {
    return {
      category: 'other',
      riskLevel: 'low',
      categoryConfidence: 0.35,
      riskConfidence: 0.35,
      modelUsed: 'heuristic'
    };
  }

  let bestCategory = 'other';
  let bestCategoryScore = 0;

  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    const score = tokens.reduce((sum, token) => sum + (patterns.has(token) ? 1 : 0), 0);
    if (score > bestCategoryScore) {
      bestCategoryScore = score;
      bestCategory = category;
    }
  }

  const riskSignalCount = countMatches(tokens, WORD_SETS.riskIndicators);
  const positiveSignalCount = countMatches(tokens, WORD_SETS.positiveWords);
  const urgencySignalCount = countMatches(tokens, WORD_SETS.urgencyWords);
  const negationSignalCount = countMatches(tokens, WORD_SETS.negationWords);
  const questionSignalCount = countMatches(tokens, WORD_SETS.questionWords);
  const dangerousCategories = new Set(['violence', 'consent-risk', 'legal-risk', 'safety-risk', 'health-risk', 'environment-risk']);

  let riskScore = 8;
  riskScore += riskSignalCount * 18;
  riskScore += urgencySignalCount * 7;
  riskScore += negationSignalCount * 4;
  riskScore += dangerousCategories.has(bestCategory) ? 20 : 0;
  riskScore += bestCategoryScore > 0 ? Math.min(bestCategoryScore * 6, 18) : 0;
  riskScore -= positiveSignalCount * 8;

  // General-information requests should stay low risk.
  if (bestCategoryScore === 0 && riskSignalCount === 0 && urgencySignalCount === 0) {
    riskScore -= questionSignalCount > 0 ? 6 : 0;
    if (normalizedText.includes('weather') || normalizedText.includes('joke')) {
      riskScore -= 8;
    }
  }

  let riskLevel = 'low';
  if (riskScore >= 75) riskLevel = 'critical';
  else if (riskScore >= 52) riskLevel = 'high';
  else if (riskScore >= 28) riskLevel = 'medium';

  return {
    category: bestCategory,
    riskLevel,
    categoryConfidence: Math.min(0.92, 0.4 + (bestCategoryScore * 0.12)),
    riskConfidence: Math.min(0.9, 0.38 + (Math.max(riskScore, 0) / 100) * 0.5),
    modelUsed: 'heuristic'
  };
};

// ==================== MAIN PREDICTION FUNCTION ====================

const analyzeDecision = (text) => {
  const timestamp = new Date().toLocaleString();
  
  // Try trained model first
  let prediction = null;
  let modelUsed = 'trained';
  
  if (trainedModel) {
    prediction = predictWithTrainedModel(text);
  }
  
  // Fallback: simple heuristic if model unavailable
  if (!prediction) {
    prediction = buildHeuristicPrediction(text);
    modelUsed = 'heuristic-fallback';
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
    // 8 Required outputs:
    // Scores (1-4)
    severityScore: scores.severityScore,
    harmfulnessScore: scores.harmfulnessScore,
    negativityScore: scores.negativityScore,
    predictedRisk: scores.predictedRisk,

    // Descriptions (5-8)
    behaviour: prediction.category,
    behavior: prediction.category,
    domain: domain,
    intervention: intervention,
    consequences: consequences,

    // Metadata
    text,
    category: prediction.category,
    riskLevel: prediction.riskLevel,
    modelUsed,
    timestamp,
    confidence: {
      category: Math.round(prediction.categoryConfidence * 100),
      risk: Math.round(prediction.riskConfidence * 100)
    },
    // Backward compatibility
    consequenceSeverity: prediction.riskLevel.toUpperCase()
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
