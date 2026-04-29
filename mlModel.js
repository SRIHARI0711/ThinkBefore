const CATEGORY_DOMAINS = {
  'consent-risk': 'relationship',
  'environment-risk': 'environment',
  violence: 'harmful',
  'health-risk': 'health',
  productivity: 'productivity',
  financial: 'financial',
  social: 'social',
  ethics: 'social',
  'self-care': 'health',
  relationship: 'relationship',
  'safety-risk': 'safety',
  'legal-risk': 'legal',
  career: 'career',
  travel: 'travel',
  education: 'education',
  family: 'family',
  leisure: 'leisure',
  investments: 'financial',
  other: 'other'
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
  violence: [
    '⚠️ Violence can cause physical injury and serious legal consequences.',
    '⚠️ It can destroy trust and harm both your relationships and your future.',
    '⚠️ Aggressive actions often escalate and can lead to regret or liability.'
  ],
  'health-risk': [
    '⚠️ Substance use can damage your health and wellbeing over time.',
    '⚠️ This behavior may increase stress, anxiety, or long-term illness.',
    '⚠️ Consider safer alternatives that support your health goals.'
  ],
  ethics: [
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
  default: [
    '⚠️ This decision has risk; consider the consequences before continuing.',
    '⚠️ Talk to someone you trust about the possible outcomes.',
    '⚠️ It may help to pause and think through the impact of your choice.'
  ]
};

const tokenize = (text) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\?\!\-']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
};

const countMatches = (tokens, set) => tokens.reduce((sum, token) => sum + (set.has(token) ? 1 : 0), 0);

const phraseCount = (text, phrases) => phrases.reduce((sum, phrase) => sum + (text.includes(phrase) ? 1 : 0), 0);

const questionWords = new Set(['should', 'could', 'would', 'can', 'may', 'is', 'are', 'am', 'do', 'does', 'did', 'will', 'might']);
const modalWords = new Set(['should', 'could', 'would', 'can', 'may', 'might', 'must', 'need', 'ought']);
const negationWords = new Set(['not', 'never', 'without', 'avoid', "don't", "cant", "can't", "cannot", "won't", "wouldn't"]);
const urgencyWords = new Set(['now', 'today', 'immediately', 'urgent', 'soon', 'quickly', 'asap', 'right', 'immediate']);
const riskIndicators = new Set(['risk', 'unsafe', 'dangerous', 'danger', 'harm', 'hurt', 'kill', 'steal', 'attack', 'drunk', 'illegal', 'crime', 'accident', 'threat']);
const positiveWords = new Set(['safe', 'healthy', 'good', 'help', 'support', 'honest', 'kind', 'respect', 'responsible', 'wise']);

const CATEGORY_PATTERNS = {
  'consent-risk': new Set(['kiss', 'touch', 'sexual', 'consent', 'assault', 'contact', 'intimate']),
  'environment-risk': new Set(['tree', 'forest', 'pollute', 'cut', 'earth', 'environment', 'wildlife', 'nature', 'trash', 'litter']),
  violence: new Set(['punch', 'hit', 'kick', 'fight', 'attack', 'violent', 'kill', 'murder', 'harm']),
  'health-risk': new Set(['smoke', 'drink', 'drugs', 'medication', 'health', 'sick', 'exercise', 'diet', 'sleep', 'alcohol', 'cancer', 'injury']),
  productivity: new Set(['project', 'deadline', 'work', 'study', 'focus', 'lazy', 'task', 'finish', 'start', 'productivity']),
  financial: new Set(['invest', 'savings', 'money', 'bank', 'loan', 'credit', 'debt', 'trade', 'crypto', 'budget', 'expense']),
  social: new Set(['date', 'friend', 'party', 'gossip', 'rumors', 'social', 'people', 'invite', 'tell', 'share', 'message']),
  ethics: new Set(['lie', 'cheat', 'steal', 'truth', 'honest', 'secret', 'ethical', 'immoral', 'wrong', 'steal', 'borrow']),
  'self-care': new Set(['sleep', 'rest', 'exercise', 'therapy', 'meditate', 'wellbeing', 'well-being', 'self-care', 'care']),
  relationship: new Set(['breakup', 'partner', 'spouse', 'boyfriend', 'girlfriend', 'relationship', 'trust', 'love', 'dating']),
  'safety-risk': new Set(['seatbelt', 'drive', 'drunk', 'crash', 'accident', 'helmet', 'unsafe', 'danger', 'shortcut', 'speed', 'traffic']),
  'legal-risk': new Set(['steal', 'break', 'illegal', 'police', 'law', 'crime', 'charge', 'court', 'sentence', 'judge']),
  career: new Set(['job', 'career', 'promotion', 'salary', 'boss', 'resign', 'resign', 'hire', 'interview', 'colleague', 'work', 'project', 'manager']),
  travel: new Set(['trip', 'travel', 'vacation', 'flight', 'drive', 'destination', 'abroad', 'holiday', 'tour', 'passport', 'tickets']),
  education: new Set(['school', 'college', 'university', 'degree', 'course', 'study', 'exam', 'major', 'graduation', 'learning', 'education']),
  family: new Set(['family', 'parent', 'sibling', 'child', 'relative', 'mother', 'father', 'brother', 'sister', 'kids', 'children']),
  leisure: new Set(['hobby', 'gaming', 'sport', 'movie', 'entertainment', 'relax', 'vacation', 'fun', 'recreation', 'hobbies', 'game']),
  investments: new Set(['invest', 'stock', 'crypto', 'bitcoin', 'market', 'trading', 'portfolio', 'broker', 'fund', 'profit', 'return'])
};

const FEATURE_NAMES = [
  'tokenCount',
  'questionWordCount',
  'modalWordCount',
  'negationCount',
  'urgencyCount',
  'riskIndicatorCount',
  'positiveWordCount',
  'exclamationCount',
  'questionMarkCount',
  'uniqueTokenCount',
  'consentRiskCount',
  'environmentRiskCount',
  'violenceCount',
  'healthRiskCount',
  'productivityCount',
  'financialCount',
  'socialCount',
  'ethicsCount',
  'selfCareCount',
  'relationshipCount',
  'safetyRiskCount',
  'legalRiskCount',
  'careerCount',
  'travelCount',
  'educationCount',
  'familyCount',
  'leisureCount',
  'investmentsCount'
];

const vectorize = (text) => {
  const normalized = text.toLowerCase();
  const tokens = tokenize(normalized);
  const tokenSet = new Set(tokens);
  const counts = [];

  counts.push(tokens.length);
  counts.push(countMatches(tokens, questionWords));
  counts.push(countMatches(tokens, modalWords));
  counts.push(countMatches(tokens, negationWords));
  counts.push(countMatches(tokens, urgencyWords));
  counts.push(countMatches(tokens, riskIndicators));
  counts.push(countMatches(tokens, positiveWords));
  counts.push((normalized.match(/!/g) || []).length);
  counts.push((normalized.match(/\?/g) || []).length);
  counts.push(tokenSet.size);

  Object.values(CATEGORY_PATTERNS).forEach((patternSet) => {
    counts.push(countMatches(tokens, patternSet));
  });

  return counts;
};

const normalize = (vector) => {
  const sum = Math.sqrt(vector.reduce((acc, value) => acc + value * value, 0));
  if (!sum) return vector.map(() => 0);
  return vector.map((value) => value / sum);
};

const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);

const MODEL_WEIGHTS = {
  severity: [
    0.1, 4.0, 2.0, -1.0, 6.0, 10.0, -4.0, 2.0, 1.0, 0.05,
    6.0, 3.0, 9.0, 7.0, 4.0, 5.0, 2.0, 4.0, -3.0, 3.0,
    8.0, 9.0, 3.0, 2.0, 2.0, 2.0, 1.0, 4.0
  ],
  harmfulness: [
    0.05, 1.0, 0.5, 0.0, 2.0, 10.0, -3.0, 1.0, 0.5, 0.02,
    4.0, 2.0, 8.0, 6.0, 3.0, 4.0, 1.0, 3.0, -2.0, 2.0,
    7.0, 8.0, 2.0, 1.5, 1.5, 1.5, 0.5, 3.0
  ],
  negativity: [
    0.1, 1.0, 0.5, 1.0, 5.0, 7.0, -2.0, 1.0, 0.5, 0.02,
    3.0, 2.0, 6.0, 5.0, 2.0, 3.0, 1.0, 2.0, -1.0, 1.0,
    5.0, 6.0, 2.0, 1.0, 1.0, 1.0, 0.5, 2.5
  ]
};

const MODEL_BIAS = {
  severity: 20,
  harmfulness: 8,
  negativity: 12
};

const standardize = (value) => Math.max(5, Math.min(98, Math.round(value)));

const DECISION_TRIGGERS = [
  'should i',
  'shall i',
  'can i',
  'could i',
  'may i',
  'do i',
  'am i',
  'will i',
  'would i',
  'would it be okay',
  'is it okay to',
  'is it okay if',
  'should we',
  'can we',
  'what if',
  'what should i',
  'is it safe to',
  'is it dangerous to',
  'i want to',
  'i am thinking about',
  'shall we'
];

const RISK_CATEGORIES = [
  'consent-risk',
  'environment-risk',
  'violence',
  'health-risk',
  'financial',
  'ethics',
  'safety-risk',
  'legal-risk',
  'relationship'
];

const isRiskRelevant = (normalized, tokens) => {
  const phraseScore = phraseCount(normalized, DECISION_TRIGGERS);
  const categoryCount = RISK_CATEGORIES.reduce(
    (sum, category) => sum + countMatches(tokens, CATEGORY_PATTERNS[category]),
    0
  );
  const riskCount = countMatches(tokens, riskIndicators);
  return phraseScore > 0 || categoryCount > 0 || riskCount > 0;
};

const getBehavior = (text) => {
  const tokens = tokenize(text.toLowerCase());
  let best = { category: 'other', score: 0 };

  Object.keys(CATEGORY_PATTERNS).forEach((category) => {
    const score = countMatches(tokens, CATEGORY_PATTERNS[category]);
    if (score > best.score) {
      best = { category, score };
    }
  });

  return best.category;
};

const getRiskLabel = (score) => {
  if (score > 85) return 'critical';
  if (score > 65) return 'high';
  if (score > 35) return 'medium';
  return 'low';
};

const getConsequences = (category, severity) => {
  const template = CONSEQUENCE_TEMPLATES[category] || CONSEQUENCE_TEMPLATES.default;
  if (severity > 80) return template;
  if (severity > 55) return template.slice(0, 2).concat('⚠️ Even if the risk is not extreme, think carefully about potential fallout.');
  if (severity > 30) return ['⚠️ This choice has some downsides. Consider the consequences carefully.'];
  return ['✓ This appears low risk, but stay mindful of others and your environment.'];
};

const getIntervention = (risk) => {
  if (risk === 'critical') {
    return '🚨 CRITICAL RISK: This action could cause serious harm or long-term negative consequences. Do not proceed without reconsidering your motives and context.';
  }
  if (risk === 'high') {
    return '⚠️ HIGH RISK: This decision could lead to negative outcomes. Slow down, think about the consequences, and seek trusted perspective.';
  }
  if (risk === 'medium') {
    return '⚡ MODERATE RISK: There are meaningful tradeoffs. Review your goals and possible impact before moving forward.';
  }
  return '✓ LOW RISK: This seems reasonable, but remain aware of how it may affect you and others.';
};

const predict = (text) => {
  const normalized = text.toLowerCase();
  const tokens = tokenize(normalized);
  const vector = normalize(vectorize(text));

  if (!isRiskRelevant(normalized, tokens)) {
    return {
      text,
      behavior: 'other',
      domain: 'other',
      severityScore: 8,
      harmfulnessScore: 5,
      negativityScore: 8,
      predictedRisk: 'low',
      intervention: '✓ LOW RISK: This looks like a normal question or harmless request.',
      consequences: ['✓ This appears safe and not clearly risky.'],
      consequenceSeverity: 'LOW',
      timestamp: new Date().toLocaleString()
    };
  }

  const severity = standardize(dot(MODEL_WEIGHTS.severity, vector) + MODEL_BIAS.severity);
  const harmfulness = standardize(dot(MODEL_WEIGHTS.harmfulness, vector) + MODEL_BIAS.harmfulness);
  const negativity = standardize(dot(MODEL_WEIGHTS.negativity, vector) + MODEL_BIAS.negativity);
  const behavior = getBehavior(text);
  const riskLevel = getRiskLabel(severity);
  const consequences = getConsequences(behavior, severity);

  return {
    text,
    behavior,
    domain: CATEGORY_DOMAINS[behavior] || 'other',
    severityScore: severity,
    harmfulnessScore: harmfulness,
    negativityScore: negativity,
    predictedRisk: riskLevel,
    intervention: getIntervention(riskLevel),
    consequences,
    consequenceSeverity: riskLevel.toUpperCase(),
    timestamp: new Date().toLocaleString()
  };
};

export const analyzeDecision = predict;
export const modelInfo = {
  featureNames: FEATURE_NAMES,
  categories: Object.keys(CATEGORY_DOMAINS)
};
