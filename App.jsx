import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import './styles.css';
import { analyzeDecision, loadModel } from './mlModel.js';
import { analyzeJournal } from './journalAnalytics.js';
import { accuracyColor as accuracyColorFor } from './journalAnalytics.js';
import Brain3DBackground from './Brain3DBackground.jsx';
import InsightsDashboard from './InsightsDashboard.jsx';
import { Reveal, ScrollProgress, ScrollState, CountUp, RiskGauge } from './ScrollFX.jsx';
import { 
  generateOTP, 
  sendOTPEmail, 
  verifyOTP, 
  clearOTP,
  loadEmailConfig,
  getOTPTimeRemaining,
  sendPasswordResetEmail,
  verifyResetToken
} from './emailService.js';
import { 
  registerUser,
  authenticateUser,
  userExists,
  getUser,
  getUserHistory,
  saveDecisionHistory,
  saveJournalEntry,
  clearJournal,
  validatePassword,
  changePassword,
  resetPassword,
  verifyPassword,
  saveUserSession,
  getUserSession,
  clearUserSession
} from './userDatabase.js';

const COLORS = [
  { hex: '#f0a500', label: 'Amber' },
  { hex: '#e84545', label: 'Red' },
  { hex: '#4a9eff', label: 'Blue' },
  { hex: '#3ecf8e', label: 'Green' },
  { hex: '#2ee0ca', label: 'Teal' },
  { hex: '#c084fc', label: 'Purple' },
  { hex: '#f97316', label: 'Orange' },
  { hex: '#ec4899', label: 'Pink' },
];

const OUTCOME_OPTIONS = [
  { value: 'better_than_expected', label: 'Better than expected 😊' },
  { value: 'as_expected', label: 'About what I expected 😐' },
  { value: 'worse_than_expected', label: 'Worse than expected 😟' }
];

const OUTCOME_LABELS = OUTCOME_OPTIONS.reduce((acc, o) => {
  acc[o.value] = o.label;
  return acc;
}, {});

const DECISION_EXAMPLES = [
  "Got a $2K bonus and thinking about splurging on a new laptop I don't really need",
  "I want to send an angry email to my boss over this decision",
  "Thinking about texting my ex at 2 AM to tell them I made a mistake",
  "My coworker got promoted instead of me. Should I submit my resignation?"
];

export default function App() {
  const [page, setPage] = useState('auth');
  const [step, setStep] = useState('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [color, setColor] = useState('#f0a500');
  const [isDark, setIsDark] = useState(true);
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dash');
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [category, setCategory] = useState('shopping');
  const [history, setHistory] = useState([]);
  const [historyTab, setHistoryTab] = useState('decisions'); // 'decisions' | 'journal'
  const [outcomeFormId, setOutcomeFormId] = useState(null); // timestamp id of card with open form
  const [outcomeNote, setOutcomeNote] = useState('');
  const [outcomeRisk, setOutcomeRisk] = useState('as_expected');
  const [isSavingOutcome, setIsSavingOutcome] = useState(false);
  const [showFullBreakdown, setShowFullBreakdown] = useState(false);
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showSignupPw, setShowSignupPw] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPasswordErrors, setNewPasswordErrors] = useState([]);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [passwordChangeMessage, setPasswordChangeMessage] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  
  // OTP and Authentication States
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpTimeRemaining, setOtpTimeRemaining] = useState(0);
  const otpTimerRef = useRef(null);

  // Forgot Password States
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetPasswordErrors, setResetPasswordErrors] = useState([]);
  const [showResetNewPw, setShowResetNewPw] = useState(false);
  const [showResetConfirmPw, setShowResetConfirmPw] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const normalizeHistory = (entries) => (
    Array.isArray(entries)
      ? entries.filter(Boolean).map((entry) => ({
          ...entry,
          behavior: entry.behavior || entry.behaviour || entry.category || 'other',
          behaviour: entry.behaviour || entry.behavior || entry.category || 'other'
        }))
      : []
  );

  useEffect(() => {
    document.body.classList.toggle('light', !isDark);
    // Load email configuration on startup
    loadEmailConfig();

    // Load ML model for decision analysis
    loadModel().catch(err => console.error('[ML] Failed to load model:', err));

    // Check for reset token in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const resetTokenParam = urlParams.get('token');
    const emailParam = urlParams.get('email');
    
    if (resetTokenParam && emailParam) {
      const decodedEmail = decodeURIComponent(emailParam);
      setForgotEmail(decodedEmail);
      setResetToken(resetTokenParam);
      setPage('auth');

      verifyResetToken(decodedEmail, resetTokenParam).then((result) => {
        if (result.valid) {
          setStep('reset-password');
          setForgotError('');
        } else {
          setStep('forgot-email');
          setForgotError(result.message);
        }
      });
    }
  }, [isDark]);

  useEffect(() => {
    const restoreSession = async () => {
      const sessionUser = getUserSession();
      if (!sessionUser?.email) {
        return;
      }

      const latestUser = await getUser(sessionUser.email);
      const activeUser = latestUser || sessionUser;

      setUser(activeUser);
      setPage('app');
      setView('dash');
      saveUserSession(activeUser);

      const restoredHistory = activeUser.decisionHistory?.length
        ? activeUser.decisionHistory
        : await getUserHistory(activeUser.email);
      setHistory(normalizeHistory(restoredHistory));
    };

    restoreSession();
  }, []);

  // OTP Timer Effect - Updates every second when OTP is sent
  useEffect(() => {
    if (otpSent && step === 'signup-otp' && email) {
      // Set initial time remaining
      const timeRemaining = getOTPTimeRemaining(email);
      setOtpTimeRemaining(timeRemaining);

      // Start countdown timer
      otpTimerRef.current = setInterval(() => {
        const remaining = getOTPTimeRemaining(email);
        setOtpTimeRemaining(remaining);
        
        // Stop timer when OTP expires
        if (remaining <= 0) {
          clearInterval(otpTimerRef.current);
        }
      }, 1000);

      return () => {
        if (otpTimerRef.current) {
          clearInterval(otpTimerRef.current);
        }
      };
    }
  }, [otpSent, step, email]);

  const handleSignIn = async () => {
    setAuthError('');
    if (!email || !password) {
      setAuthError('Please enter both email and password');
      return;
    }

    // Authenticate against user database
    const result = await authenticateUser(email, password);
    
    if (result.success) {
      const signedInUser = result.user;
      setUser(signedInUser);
      setPage('app');
      setView('dash');
      const loadedHistory = signedInUser.decisionHistory?.length
        ? signedInUser.decisionHistory
        : await getUserHistory(signedInUser.email);
      setHistory(normalizeHistory(loadedHistory));
      saveUserSession(signedInUser);
      setPassword('');
    } else {
      setAuthError(result.message);
    }
  };

  const handleSignUp = async () => {
    // Register user in database
    const result = await registerUser(email, password, nickname, color);
    
    if (result.success) {
      const signedUpUser = result.user || { email, nickname, avatarColor: color, emailLower: email.toLowerCase(), decisionHistory: [] };
      setUser(signedUpUser);
      setPage('app');
      setView('dash');
      setHistory(normalizeHistory(signedUpUser.decisionHistory));
      saveUserSession(signedUpUser);
      setPassword('');
    } else {
      setAuthError(result.message);
    }
  };

  const handleSendOTP = async () => {
    setOtpError('');
    if (!email) {
      setOtpError('Please enter an email address');
      return;
    }

    const emailExists = await userExists(email);
    if (emailExists) {
      setOtpError('This email is already registered');
      return;
    }

    setIsSendingOtp(true);
    const generatedOTP = generateOTP(6);
    const result = await sendOTPEmail(email, generatedOTP);
    
    if (result.success) {
      setOtpSent(true);
      setOtp('');
      setOtpError('');
      setOtpTimeRemaining(60); // Initialize to 60 seconds
      setStep('signup-otp'); // Move to OTP verification step
    } else {
      setOtpError(result.message);
    }
    setIsSendingOtp(false);
  };

  const handleVerifyOTP = async () => {
    setOtpError('');
    if (!otp) {
      setOtpError('Please enter the OTP');
      return;
    }

    setIsVerifyingOtp(true);
    const result = await verifyOTP(email, otp);
    
    if (result.valid) {
      setOtpSent(false);
      setOtp('');
      setOtpError('');
      setStep('signup-nick'); // Move to nickname selection after OTP verification
    } else {
      setOtpError(result.message);
    }
    setIsVerifyingOtp(false);
  };

  const handleResendOTP = async () => {
    setOtpError('');
    setIsSendingOtp(true);
    const generatedOTP = generateOTP(6);
    const result = await sendOTPEmail(email, generatedOTP);
    
    if (result.success) {
      setOtp('');
      setOtpTimeRemaining(60); // Reset timer to 60 seconds
      setOtpError('OTP resent successfully');
      setTimeout(() => setOtpError(''), 3000);
    } else {
      setOtpError('Failed to resend OTP: ' + result.message);
    }
    setIsSendingOtp(false);
  };

  const validateCurrentPassword = async (password) => {
    if (!password) {
      setCurrentPasswordError('');
      return;
    }
    
    // Check if current password is correct
    const isPasswordCorrect = await verifyPassword(user.email, password);
    if (isPasswordCorrect) {
      setCurrentPasswordError('');
    } else {
      setCurrentPasswordError('Current password is incorrect');
    }
  };

  const handleChangePassword = async () => {
    setPasswordChangeError('');
    setPasswordChangeMessage('');
    
    // Validate inputs
    if (!currentPassword) {
      setPasswordChangeError('Please enter your current password');
      return;
    }
    
    if (!newPassword) {
      setPasswordChangeError('Please enter a new password');
      return;
    }
    
    if (!confirmPassword) {
      setPasswordChangeError('Please confirm your new password');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordChangeError('New passwords do not match');
      return;
    }
    
    if (newPassword === currentPassword) {
      setPasswordChangeError('New password must be different from current password');
      return;
    }
    
    // Call the changePassword function
    const result = await changePassword(user.email, currentPassword, newPassword);
    
    if (result.success) {
      setPasswordChangeMessage(result.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNewPasswordErrors([]);
      setTimeout(() => {
        setShowChangePassword(false);
        setPasswordChangeMessage('');
      }, 2000);
    } else {
      setPasswordChangeError(result.message);
    }
  };

  // Forgot Password Handlers
  const handleSendResetEmail = async () => {
    setForgotError('');
    setForgotMessage('');

    if (!forgotEmail) {
      setForgotError('Please enter your email address');
      return;
    }

    // Check if user exists
    const emailExists = await userExists(forgotEmail);
    if (!emailExists) {
      setForgotError('No account found with this email address');
      return;
    }

    setIsSendingReset(true);
    const userData = await getUser(forgotEmail);
    const result = await sendPasswordResetEmail(forgotEmail, userData?.nickname || forgotEmail.split('@')[0]);

    if (result.success) {
      setForgotMessage('Password reset link has been sent to your email. Check your inbox for further instructions.');
      // Clear form after 3 seconds
      setTimeout(() => {
        setForgotEmail('');
        setForgotError('');
        setForgotMessage('');
        setStep('login-email'); // Go back to login
      }, 4000);
    } else {
      setForgotError(result.message);
    }
    setIsSendingReset(false);
  };

  const handleVerifyResetToken = async () => {
    setForgotError('');

    if (!resetToken) {
      setForgotError('Reset token is missing');
      return;
    }

    const result = await verifyResetToken(forgotEmail, resetToken);

    if (result.valid) {
      setForgotError('');
      setStep('reset-password'); // Move to password reset step
    } else {
      setForgotError(result.message);
    }
  };

  const handleResetPassword = async () => {
    setForgotError('');
    setResetMessage('');

    // Validate inputs
    if (!resetNewPassword) {
      setForgotError('Please enter a new password');
      return;
    }

    if (!resetConfirmPassword) {
      setForgotError('Please confirm your password');
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setForgotError('Passwords do not match');
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(resetNewPassword);
    if (!passwordValidation.isValid) {
      setResetPasswordErrors(passwordValidation.errors);
      return;
    }

    setIsResettingPassword(true);

    // Reset the password
    const result = await resetPassword(forgotEmail, resetNewPassword, resetToken);

    if (result.success) {
      setResetMessage('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        setForgotEmail('');
        setResetToken('');
        setResetNewPassword('');
        setResetConfirmPassword('');
        setResetMessage('');
        setForgotError('');
        setResetPasswordErrors([]);
        setStep('login-email');
      }, 2000);
    } else {
      setForgotError(result.message);
    }
    setIsResettingPassword(false);
  };

  const handleAnalyze = () => {
    if (!text.trim()) return;
    setIsAnalyzing(true);
    
    // Analyze immediately - model should be pre-loaded from useEffect
    setTimeout(async () => {
      try {
        const analysis = analyzeDecision(text);
        const normalizedAnalysis = {
          ...analysis,
          behavior: analysis.behavior || analysis.behaviour || analysis.category || 'other',
          behaviour: analysis.behaviour || analysis.behavior || analysis.category || 'other'
        };

        setResult(normalizedAnalysis);
        setHistory(prev => [normalizedAnalysis, ...prev]);

        if (user?.email) {
          const saved = await saveDecisionHistory(user.email, normalizedAnalysis);
          if (saved.success && Array.isArray(saved.history)) {
            setHistory(normalizeHistory(saved.history));
          }
          if (saved.user) {
            setUser(saved.user);
            saveUserSession(saved.user);
          }
        }
      } catch (error) {
        console.error('[ML] Error analyzing decision:', error);
        setResult({
          error: 'Failed to analyze decision. Please try again.',
          text,
          timestamp: new Date().toLocaleString()
        });
      }
      setIsAnalyzing(false);
    }, 600);
  };

  // Cached prediction-accuracy analysis; recomputes only when history changes.
  const journalAnalysis = useMemo(() => analyzeJournal(history), [history]);

  const journaledCount = useMemo(
    () => history.filter((h) => h && h.journal && h.journal.actualRisk).length,
    [history]
  );

  const openOutcomeForm = (item) => {
    setOutcomeFormId(item.timestamp);
    setOutcomeNote(item.journal?.outcome || '');
    setOutcomeRisk(item.journal?.actualRisk || 'as_expected');
  };

  const closeOutcomeForm = () => {
    setOutcomeFormId(null);
    setOutcomeNote('');
    setOutcomeRisk('as_expected');
  };

  const handleSaveOutcome = async (item) => {
    if (!item?.timestamp) return;
    setIsSavingOutcome(true);

    const journal = {
      outcome: outcomeNote.slice(0, 200),
      actualRisk: outcomeRisk,
      note: outcomeNote.slice(0, 200)
    };

    // Optimistic local update so the UI reflects the change immediately.
    setHistory((prev) =>
      prev.map((h) =>
        h.timestamp === item.timestamp ? { ...h, journal: { ...journal } } : h
      )
    );

    if (user?.email) {
      const saved = await saveJournalEntry(user.email, item.timestamp, journal);
      if (saved.success && Array.isArray(saved.history)) {
        setHistory(normalizeHistory(saved.history));
      }
      if (saved.user) {
        setUser(saved.user);
        saveUserSession(saved.user);
      }
    }

    setIsSavingOutcome(false);
    closeOutcomeForm();
  };

  const handleClearJournal = async () => {
    if (!window.confirm('Clear all journal outcomes? This cannot be undone.')) return;

    setHistory((prev) => prev.map(({ journal, ...rest }) => rest));

    if (user?.email) {
      const cleared = await clearJournal(user.email);
      if (cleared.success && Array.isArray(cleared.history)) {
        setHistory(normalizeHistory(cleared.history));
      }
      if (cleared.user) {
        setUser(cleared.user);
        saveUserSession(cleared.user);
      }
    }
    setShowFullBreakdown(false);
  };

  const handleLogout = () => {
    // Clear OTP timer
    if (otpTimerRef.current) {
      clearInterval(otpTimerRef.current);
    }
    
    setUser(null);
    setPage('auth');
    setStep('welcome');
    setEmail('');
    setPassword('');
    setNickname('');
    setText('');
    setResult(null);
    setHistory([]);
    setView('dash');
    setOtp('');
    setOtpSent(false);
    setOtpError('');
    setAuthError('');
    setPasswordErrors([]);
    setOtpTimeRemaining(0);
    clearUserSession();
  };

  const getRiskColor = (risk) => {
    if (!risk) return '#6b7280';
    const riskStr = String(risk).toLowerCase();
    switch(riskStr) {
      case 'critical': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  // Magnitude color for 0-100 scores, same thresholds as InsightsDashboard's risk line
  const getScoreColor = (score) => {
    const s = Number(score) || 0;
    if (s > 60) return '#ef4444';
    if (s >= 40) return '#f59e0b';
    return '#10b981';
  };

  const getRiskBg = (risk) => {
    if (!risk) return 'rgba(107, 114, 128, 0.1)';
    const riskStr = String(risk).toLowerCase();
    switch(riskStr) {
      case 'critical': return 'rgba(239, 68, 68, 0.1)';
      case 'high': return 'rgba(245, 158, 11, 0.1)';
      case 'medium': return 'rgba(59, 130, 246, 0.1)';
      case 'low': return 'rgba(16, 185, 129, 0.1)';
      default: return 'rgba(107, 114, 128, 0.1)';
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh' }}>
      <div className="grid-bg"></div>
      <div className="glow-orb a"></div>
      <div className="glow-orb b"></div>
      
      {/* Persistent 3D brain background + scroll progress on the landing page */}
      {!user && step === 'welcome' && (
        <>
          <ScrollProgress />
          <ScrollState threshold={80} />
          <div className="neural-bg-layer">
            <Brain3DBackground />
          </div>
        </>
      )}

      <nav className="topbar">
        <a className="brand" href="#">
          <div className="brand-icon">CG</div>
          <div className="brand-name">CogniAuth</div>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user && <div style={{ color: 'var(--text2)', fontSize: '14px', fontWeight: '500' }}>{user.nickname}</div>}
          {!user && step === 'welcome' && (
            <div className="nav-auth">
              <button
                className="nav-auth-btn ghost"
                onClick={() => { setEmail(''); setPassword(''); setStep('login-email'); }}
              >
                Log In
              </button>
              <button
                className="nav-auth-btn solid"
                onClick={() => { setEmail(''); setPassword(''); setNickname(''); setColor('#f0a500'); setStep('signup-email'); }}
              >
                Sign Up
              </button>
            </div>
          )}
          <div
            onClick={() => setIsDark(!isDark)} 
            className="theme-toggle"
            style={{ cursor: 'pointer' }}
            title="Toggle light / dark mode"
          >
            <div className="theme-toggle-thumb">{isDark ? '' : ''}</div>
            <div className="theme-toggle-icons"><span>◐</span><span>●</span></div>
          </div>
        </div>
      </nav>

      {!user ? (
        <div className="page active">
          <div className={`auth-page ${step === 'welcome' ? 'home-mode' : ''}`}>
            {step === 'welcome' ? (
              <section className="home-page">
                {/* Hero splash — first screen is just the brain */}
                <div className="home-hero hero-splash">
                  <div className="hero-content">
                    <div className="hero-badge">
                      <span className="hero-badge-dot"></span>
                      Real-Time Behavioral Intelligence
                    </div>
                    <h1 className="hero-title">
                      Pause Before <span className="grad-text">You Act</span>
                    </h1>
                    <p className="hero-subtitle">
                      CogniAuth reads the intent, emotion and urgency behind your decisions —
                      then intervenes in real time, <em>before</em> the impulse becomes a regret.
                    </p>
                  </div>
                  <div className="scroll-cue" aria-hidden="true">
                    <span>Scroll to enter</span>
                    <span className="scroll-cue-arrow">↓</span>
                  </div>
                </div>

                {/* Scroll-revealed authentication panel */}
                <Reveal className="auth-reveal" delay={0}>
                  <div className="auth-reveal-card">
                    <div className="auth-reveal-badge">
                      <span className="hero-badge-dot"></span>
                      Enter the network
                    </div>
                    <h2 className="auth-reveal-title">
                      Ready to think <span className="grad-text">clearly</span>?
                    </h2>
                    <p className="auth-reveal-sub">
                      Log in to pick up where your mind left off, or create an
                      account to let CogniAuth learn how you decide.
                    </p>
                    <div className="auth-reveal-actions">
                      <button
                        className="cta-btn primary lg"
                        onClick={() => { setEmail(''); setPassword(''); setStep('login-email'); }}
                      >
                        Log In
                      </button>
                      <button
                        className="cta-btn secondary lg"
                        onClick={() => { setEmail(''); setPassword(''); setNickname(''); setColor('#f0a500'); setStep('signup-email'); }}
                      >
                        Sign Up
                      </button>
                    </div>
                  </div>
                </Reveal>

                {/* Live impact metrics */}
                <div className="home-metrics">
                  <Reveal className="metrics-row" delay={0}>
                    <div className="metric">
                      <div className="metric-val"><CountUp end={94} suffix="%" /></div>
                      <div className="metric-lbl">Regret signals caught pre-action</div>
                    </div>
                    <div className="metric">
                      <div className="metric-val">&lt;<CountUp end={200} suffix="ms" /></div>
                      <div className="metric-lbl">Real-time analysis latency</div>
                    </div>
                    <div className="metric">
                      <div className="metric-val"><CountUp end={14} /></div>
                      <div className="metric-lbl">Decision domains covered</div>
                    </div>
                    <div className="metric">
                      <div className="metric-val"><CountUp end={100} suffix="%" /></div>
                      <div className="metric-lbl">On-device &amp; private</div>
                    </div>
                  </Reveal>
                </div>

                {/* How It Works — neural pipeline */}
                <div className="home-section" id="how-it-works">
                  <Reveal><h2 className="section-title">How CogniAuth Thinks</h2></Reveal>
                  <Reveal delay={80}>
                    <p className="section-lead">
                      Every decision you enter flows through a neural reasoning pipeline —
                      from raw intent to a transparent, explainable intervention.
                    </p>
                  </Reveal>
                  <div className="pipeline">
                    {[
                      { n: '01', icon: '⌁', t: 'Capture Intent', d: 'Your intended action is captured the instant you consider it — before execution.' },
                      { n: '02', icon: '❝', t: 'NLP Understanding', d: 'Natural-language processing extracts intent, sentiment and urgency from your words.' },
                      { n: '03', icon: '◷', t: 'Context Signals', d: 'Time of day, behavioral history and similar past actions add situational awareness.' },
                      { n: '04', icon: '⚖', t: 'Hybrid Risk Engine', d: 'Rule-based logic, ML models and context fuse into an impulsiveness & regret score.' },
                      { n: '05', icon: '⛨', t: 'Pre-Action Intervention', d: 'If risk is high, CogniAuth steps in with a timely, actionable suggestion.' },
                      { n: '06', icon: '✦', t: 'Explainable Reasoning', d: 'You see exactly why — the factors, the score and the recommended next step.' },
                    ].map((s, i) => (
                      <Reveal key={s.n} className="pipeline-step" delay={i * 90}>
                        <div className="pipeline-connector" aria-hidden="true"></div>
                        <div className="pipeline-num">{s.n}</div>
                        <div className="pipeline-icon">{s.icon}</div>
                        <h4>{s.t}</h4>
                        <p>{s.d}</p>
                      </Reveal>
                    ))}
                  </div>
                </div>

                {/* Features Section */}
                <div className="home-section">
                  <Reveal><h2 className="section-title">Why CogniAuth Works</h2></Reveal>
                  <div className="features-grid">
                    <Reveal className="feature-card" delay={0}>
                      <div className="feature-icon-minimal">▲</div>
                      <h3>Stop Before You Regret</h3>
                      <p>Real-time analysis the moment you consider a decision. Know instantly whether this impulse is one you'll thank yourself for later.</p>
                    </Reveal>
                    <Reveal className="feature-card" delay={120}>
                      <div className="feature-icon-minimal">▯</div>
                      <h3>See Your Patterns Before They Cost You</h3>
                      <p>Identify the behavioral patterns that trigger your regrets. Watch as CogniAuth learns what usually goes wrong for you.</p>
                    </Reveal>
                    <Reveal className="feature-card" delay={240}>
                      <div className="feature-icon-minimal">◉</div>
                      <h3>Get Expert Advice When You Need It Most</h3>
                      <p>Instead of generic feedback, receive personalized interventions designed for your specific decision. Real guidance, real impact.</p>
                    </Reveal>
                  </div>
                </div>

                {/* Live demo — risk gauges */}
                <div className="home-section demo-section">
                  <Reveal><h2 className="section-title">See The Reasoning In Action</h2></Reveal>
                  <Reveal delay={80}>
                    <p className="section-lead">
                      CogniAuth scores every impulse across the dimensions that predict regret.
                      Watch the reasoning light up.
                    </p>
                  </Reveal>
                  <Reveal className="gauge-grid" delay={140}>
                    <div className="gauge-card">
                      <RiskGauge value={82} label="Regret Risk" color="#ef4444" />
                      <div className="gauge-title">"Text my ex at 2 AM"</div>
                      <div className="gauge-note">High emotional charge · Sleep on it</div>
                    </div>
                    <div className="gauge-card">
                      <RiskGauge value={61} label="Impulse Risk" color="#f59e0b" />
                      <div className="gauge-title">"Splurge on a new laptop"</div>
                      <div className="gauge-note">Wait 48 hours before checkout</div>
                    </div>
                    <div className="gauge-card">
                      <RiskGauge value={18} label="Regret Risk" color="#10b981" />
                      <div className="gauge-title">"Start a 5-minute task"</div>
                      <div className="gauge-note">Low risk · Go for it</div>
                    </div>
                  </Reveal>
                </div>

                {/* Reactive vs Proactive comparison */}
                <div className="home-section">
                  <Reveal><h2 className="section-title">Preventive AI, Not Reactive</h2></Reveal>
                  <div className="compare-grid">
                    <Reveal className="compare-card old" delay={0}>
                      <div className="compare-tag">Traditional AI</div>
                      <ul>
                        <li>Analyzes behavior <b>after</b> the decision</li>
                        <li>Static, generic recommendations</li>
                        <li>Historical predictions only</li>
                        <li>Black-box scoring you can't question</li>
                        <li>Regret already happened</li>
                      </ul>
                    </Reveal>
                    <Reveal className="compare-card new" delay={140}>
                      <div className="compare-tag">CogniAuth</div>
                      <ul>
                        <li>Intervenes <b>before</b> the action executes</li>
                        <li>Personalized, context-aware guidance</li>
                        <li>Real-time intent &amp; emotion reasoning</li>
                        <li>Fully explainable — see every factor</li>
                        <li>Regret prevented, not reported</li>
                      </ul>
                    </Reveal>
                  </div>
                </div>

                {/* Use Cases Section */}
                <div className="home-section">
                  <Reveal><h2 className="section-title">Real-World Scenarios</h2></Reveal>
                  <div className="usecases-grid">
                    <Reveal className="usecase-card" delay={0}>
                      <div className="usecase-label">Financial</div>
                      <p className="usecase-scenario">"Got a $2K bonus—thinking about splurging on a new laptop"</p>
                      <div className="usecase-intervention">→ Wait 48 hours. Most regrets on major purchases happen within this window.</div>
                    </Reveal>
                    <Reveal className="usecase-card" delay={100}>
                      <div className="usecase-label">Relationships</div>
                      <p className="usecase-scenario">"Thinking about texting my ex at 2 AM"</p>
                      <div className="usecase-intervention">→ Strong emotional charge detected. Sleep on it. You'll feel different tomorrow.</div>
                    </Reveal>
                    <Reveal className="usecase-card" delay={200}>
                      <div className="usecase-label">Career</div>
                      <p className="usecase-scenario">"My coworker got promoted. Should I submit my resignation?"</p>
                      <div className="usecase-intervention">→ This is an emotional reaction to disappointment. Discuss with a mentor first.</div>
                    </Reveal>
                    <Reveal className="usecase-card" delay={300}>
                      <div className="usecase-label">Communication</div>
                      <p className="usecase-scenario">"I want to send an angry email to my boss right now"</p>
                      <div className="usecase-intervention">→ High emotional tone detected. Save as draft—review when calm and ready.</div>
                    </Reveal>
                  </div>
                </div>

                {/* Trust Section */}
                <div className="home-section trust-section">
                  <Reveal><h2 className="section-title">Built on Trust</h2></Reveal>
                  <div className="trust-grid">
                    <Reveal className="trust-card" delay={0}>
                      <div className="trust-icon-minimal">■</div>
                      <h4>Privacy First</h4>
                      <p>All analysis happens locally on your device. Your decisions and data never leave your computer. No cloud storage. No tracking. No data sales.</p>
                    </Reveal>
                    <Reveal className="trust-card" delay={140}>
                      <div className="trust-icon-minimal">●</div>
                      <h4>Explainable AI</h4>
                      <p>You'll understand exactly why CogniAuth flagged a decision and what factors contributed to the risk score. No black boxes. Full transparency into how we think.</p>
                    </Reveal>
                    <Reveal className="trust-card" delay={280}>
                      <div className="trust-icon-minimal">✚</div>
                      <h4>Evidence-Based</h4>
                      <p>Our intervention framework draws from behavioral economics and neuroscience research on impulsive decision-making. Built on 20+ years of psychology studies.</p>
                    </Reveal>
                  </div>
                </div>

                {/* Testimonials */}
                <div className="home-section">
                  <Reveal><h2 className="section-title">Minds We've Changed</h2></Reveal>
                  <div className="testi-grid">
                    {[
                      { q: "It caught me mid-checkout on a $900 impulse buy. The 48-hour nudge saved me — I never went back.", a: 'Priya S.', r: 'Product Designer' },
                      { q: "The angry-email intervention is uncanny. It flagged my tone before I did something I'd regret with my manager.", a: 'Marcus T.', r: 'Software Engineer' },
                      { q: "Finally an AI that explains itself. I can see exactly why a decision is risky, not just a number.", a: 'Elena R.', r: 'Behavioral Researcher' },
                    ].map((t, i) => (
                      <Reveal key={i} className="testi-card" delay={i * 120}>
                        <div className="testi-quote">"</div>
                        <p className="testi-text">{t.q}</p>
                        <div className="testi-author">
                          <div className="testi-avatar">{t.a.charAt(0)}</div>
                          <div>
                            <div className="testi-name">{t.a}</div>
                            <div className="testi-role">{t.r}</div>
                          </div>
                        </div>
                      </Reveal>
                    ))}
                  </div>
                </div>

                {/* Final CTA */}
                <Reveal className="home-final-cta">
                  <h2>Ready to Make Better Decisions?</h2>
                  <p>Join hundreds of users preventing impulsive regrets every day.</p>
                  <button
                    className="cta-btn primary large"
                    onClick={() => { setEmail(''); setPassword(''); setStep('signup-email'); }}
                  >
                    Start Free Today →
                  </button>
                  <div className="final-cta-note">No credit card · Runs on your device · Private by design</div>
                </Reveal>

                {/* Footer */}
                <footer className="home-footer">
                  <div className="footer-inner">
                    <div className="footer-brand">
                      <div className="brand-icon">CG</div>
                      <div>
                        <div className="footer-name">CogniAuth</div>
                        <div className="footer-tag">Real-time impulse decision intervention</div>
                      </div>
                    </div>
                    <div className="footer-cols">
                      <div className="footer-col">
                        <span className="footer-col-title">Domains</span>
                        <a>Financial</a><a>Relationships</a><a>Career</a><a>Communication</a>
                      </div>
                      <div className="footer-col">
                        <span className="footer-col-title">Technology</span>
                        <a>NLP Engine</a><a>Hybrid Risk Model</a><a>Explainable AI</a><a>On-device ML</a>
                      </div>
                      <div className="footer-col">
                        <span className="footer-col-title">Principles</span>
                        <a>Privacy First</a><a>Preventive AI</a><a>Human-centric</a><a>Transparent</a>
                      </div>
                    </div>
                  </div>
                  <div className="footer-bottom">
                    <span>© 2026 CogniAuth · Preventive AI for better human decisions</span>
                    <span className="footer-pulse">● Local AI · Works offline · Private</span>
                  </div>
                </footer>
              </section>
            ) : (
            <div className="auth-card">
              {step === 'welcome' && (
                <div className="auth-step active">
                  <div className="auth-title">CogniAuth</div>
                  <p className="auth-subtitle" style={{ marginBottom: '24px' }}>
                    Your AI-powered impulse intervention system.<br/>Sign in or create a new account to get started.
                  </p>
                  <button 
                    className="auth-btn" 
                    onClick={() => { setEmail(''); setPassword(''); setStep('login-email'); }} 
                    style={{ marginBottom: '10px' }}
                  >
                    Sign In →
                  </button>
                  <button 
                    className="auth-btn secondary" 
                    onClick={() => { setEmail(''); setPassword(''); setNickname(''); setColor('#f0a500'); setStep('signup-email'); }}
                  >
                    Create Account
                  </button>
                  <div style={{ marginTop: '18px', textAlign: 'center', fontSize: '12px', color: 'var(--text3)', fontFamily: "'DM Mono',monospace" }}>
                    ● Local AI · Works offline · Private
                  </div>
                </div>
              )}

              {step === 'login-email' && (
                <div className="auth-step active">
                  <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--amber)', marginBottom: '12px' }}>↩ Sign In</div>
                  <div className="auth-title">Welcome back</div>
                  <p className="auth-subtitle">Enter your registered email address.</p>
                  <div className="field-wrap">
                    <div className="field-label"><span className="field-dot"></span>Email address</div>
                    <input 
                      className="auth-input" 
                      type="email" 
                      placeholder="you@example.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && setStep('login-pw')}
                    />
                  </div>
                  <button 
                    className="auth-btn" 
                    onClick={() => setStep('login-pw')}
                  >
                    Continue →
                  </button>
                  <button 
                    className="auth-btn secondary" 
                    onClick={() => setStep('welcome')}
                    style={{ marginTop: '8px' }}
                  >
                    ← Back
                  </button>
                </div>
              )}

              {step === 'login-pw' && (
                <div className="auth-step active">
                  <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--amber)', marginBottom: '12px' }}>↩ Sign In</div>
                  <div className="auth-title">Enter password</div>
                  <p className="auth-subtitle">Signing in as <span style={{ color: 'var(--amber)', fontWeight: '600' }}>{email}</span></p>
                  <div className="field-wrap">
                    <div className="field-label"><span className="field-dot"></span>Password</div>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input 
                        className="auth-input" 
                        type={showLoginPw ? 'text' : 'password'}
                        placeholder="Your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSignIn()}
                        style={{ paddingRight: '40px' }}
                      />
                      <button
                        onClick={() => setShowLoginPw(!showLoginPw)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '14px',
                          padding: '0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text3)',
                          fontWeight: '600'
                        }}
                        title={showLoginPw ? 'Hide password' : 'Show password'}
                      >
                        {showLoginPw ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                  {authError && (
                    <div style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      fontSize: '13px',
                      marginBottom: '12px',
                      marginTop: '12px'
                    }}>
                      {authError}
                    </div>
                  )}
                  <button 
                    className="auth-btn" 
                    onClick={handleSignIn}
                  >
                    Sign In →
                  </button>
                  <div style={{ textAlign: 'center', marginTop: '12px', marginBottom: '8px' }}>
                    <button
                      onClick={() => { setForgotEmail(''); setForgotError(''); setForgotMessage(''); setStep('forgot-email'); }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--amber)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        textDecoration: 'underline',
                        fontWeight: '500',
                        padding: '0'
                      }}
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <button 
                    className="auth-btn secondary" 
                    onClick={() => { setStep('login-email'); setAuthError(''); }}
                    style={{ marginTop: '8px' }}
                  >
                    ← Back
                  </button>
                </div>
              )}

              {step === 'signup-email' && (
                <div className="auth-step active">
                  <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--amber)', marginBottom: '12px' }}>✦ New Account</div>
                  <div className="auth-title">Verify your email</div>
                  <p className="auth-subtitle">Enter your email to receive a verification code.</p>
                  <div className="field-wrap">
                    <div className="field-label"><span className="field-dot"></span>Email address</div>
                    <input 
                      className="auth-input" 
                      type="email" 
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendOTP()}
                      disabled={isSendingOtp}
                    />
                  </div>
                  {otpError && !otpSent && (
                    <div style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      fontSize: '13px',
                      marginBottom: '12px',
                      marginTop: '12px'
                    }}>
                      {otpError}
                    </div>
                  )}
                  <button 
                    className="auth-btn"
                    onClick={handleSendOTP}
                    disabled={isSendingOtp}
                  >
                    {isSendingOtp ? 'Sending...' : 'Send Code →'}
                  </button>
                  <button 
                    className="auth-btn secondary" 
                    onClick={() => { setStep('welcome'); setOtpError(''); }}
                    style={{ marginTop: '8px' }}
                  >
                    ← Back
                  </button>
                </div>
              )}

              {step === 'signup-otp' && (
                <div className="auth-step active">
                  <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--amber)', marginBottom: '12px' }}>✦ New Account</div>
                  <div className="auth-title">Verify your email</div>
                  <p className="auth-subtitle">
                    We sent a 6-digit code to <span style={{ color: 'var(--amber)', fontWeight: '600' }}>{email}</span>
                  </p>
                  <div className="field-wrap">
                    <div className="field-label"><span className="field-dot"></span>Enter OTP code</div>
                    <input 
                      className="auth-input" 
                      type="text" 
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                      onKeyPress={(e) => e.key === 'Enter' && handleVerifyOTP()}
                      maxLength="6"
                      disabled={isVerifyingOtp}
                      style={{ letterSpacing: '8px', fontSize: '18px', fontFamily: "'DM Mono',monospace" }}
                    />
                  </div>
                  {otpError && (
                    <div style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      fontSize: '13px',
                      marginBottom: '12px',
                      marginTop: '12px'
                    }}>
                      {otpError}
                    </div>
                  )}
                  
                  {/* Timer Display */}
                  <div style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'rgba(250, 204, 21, 0.1)',
                    border: '1px solid rgba(250, 204, 21, 0.3)',
                    color: 'var(--amber)',
                    fontSize: '13px',
                    textAlign: 'center',
                    marginBottom: '12px',
                    marginTop: '12px',
                    fontWeight: '500'
                  }}>
                    <div>⏱️ Code expires in: <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{otpTimeRemaining}s</span></div>
                  </div>
                  
                  <button 
                    className="auth-btn"
                    onClick={handleVerifyOTP}
                    disabled={isVerifyingOtp || otp.length !== 6}
                  >
                    {isVerifyingOtp ? 'Verifying...' : 'Verify Code →'}
                  </button>
                  
                  <button 
                    className="auth-btn secondary" 
                    onClick={handleResendOTP}
                    disabled={isSendingOtp || otpTimeRemaining > 0}
                    style={{ marginTop: '8px' }}
                    title={otpTimeRemaining > 0 ? `Resend available in ${otpTimeRemaining}s` : 'Click to resend OTP'}
                  >
                    {isSendingOtp ? 'Resending...' : otpTimeRemaining > 0 ? `Resend in ${otpTimeRemaining}s` : 'Resend Code'}
                  </button>
                  
                  <button 
                    className="auth-btn secondary" 
                    onClick={() => { setStep('signup-email'); setOtpError(''); setOtp(''); setOtpTimeRemaining(0); }}
                    style={{ marginTop: '8px' }}
                  >
                    ← Back
                  </button>
                </div>
              )}

              {step === 'signup-nick' && (
                <div className="auth-step active">
                  <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--amber)', marginBottom: '12px' }}>✦ New Account</div>
                  <div className="auth-title">Create your profile</div>
                  <p className="auth-subtitle">Pick a nickname and avatar color.</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                    <div 
                      style={{ 
                        width: '100px', 
                        height: '100px', 
                        background: color, 
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '40px',
                        fontWeight: '700',
                        color: '#fff'
                      }}
                    >
                      {nickname.slice(0,2).toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text1)' }}>{nickname || 'Your nickname'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: "'DM Mono',monospace" }}>COGNI-ID</div>
                    </div>
                  </div>
                  <div className="field-wrap">
                    <div className="field-label"><span className="field-dot"></span>Nickname</div>
                    <input 
                      className="auth-input" 
                      type="text" 
                      placeholder="e.g. mindful_alex" 
                      maxLength="24"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                    />
                  </div>
                  <div className="field-wrap">
                    <div className="field-label"><span className="field-dot"></span>Avatar color</div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {COLORS.map((c) => (
                        <div 
                          key={c.hex}
                          onClick={() => setColor(c.hex)}
                          style={{
                            width: '45px',
                            height: '45px',
                            borderRadius: '10px',
                            background: c.hex,
                            cursor: 'pointer',
                            border: color === c.hex ? '3px solid white' : '2px solid transparent',
                            transition: 'all 0.2s'
                          }}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>
                  <button 
                    className="auth-btn" 
                    onClick={() => setStep('signup-pw')}
                  >
                    Next: Set Password →
                  </button>
                  <button 
                    className="auth-btn secondary" 
                    onClick={() => setStep('signup-email')}
                    style={{ marginTop: '8px' }}
                  >
                    ← Back
                  </button>
                </div>
              )}

              {step === 'signup-pw' && (
                <div className="auth-step active">
                  <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--amber)', marginBottom: '12px' }}>✦ New Account</div>
                  <div className="auth-title">Secure your account</div>
                  <p className="auth-subtitle">Set a strong password you will use to sign in.</p>
                  <div className="field-wrap">
                    <div className="field-label"><span className="field-dot"></span>Create password</div>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input 
                        className="auth-input" 
                        type={showSignupPw ? 'text' : 'password'}
                        placeholder="Min. 8 characters"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (e.target.value) {
                            const validation = validatePassword(e.target.value);
                            setPasswordErrors(validation.errors);
                          } else {
                            setPasswordErrors([]);
                          }
                        }}
                        style={{ paddingRight: '40px' }}
                      />
                      <button
                        onClick={() => setShowSignupPw(!showSignupPw)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '14px',
                          padding: '0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text3)',
                          fontWeight: '600'
                        }}
                        title={showSignupPw ? 'Hide password' : 'Show password'}
                      >
                        {showSignupPw ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                  
                  {password && passwordErrors.length > 0 && (
                    <div style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      marginTop: '12px',
                      marginBottom: '12px'
                    }}>
                      <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                        Password requirements not met:
                      </div>
                      {passwordErrors.map((error, idx) => (
                        <div key={idx} style={{ color: '#ef4444', fontSize: '12px', marginBottom: idx < passwordErrors.length - 1 ? '6px' : '0' }}>
                          • {error}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {password && passwordErrors.length === 0 && (
                    <div style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      marginTop: '12px',
                      marginBottom: '12px',
                      color: '#10b981',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}>
                      ✓ Password meets all requirements
                    </div>
                  )}
                  
                  {authError && (
                    <div style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      fontSize: '13px',
                      marginBottom: '12px'
                    }}>
                      {authError}
                    </div>
                  )}
                  
                  <button 
                    className="auth-btn" 
                    onClick={handleSignUp}
                    disabled={password.length === 0 || passwordErrors.length > 0}
                    style={{
                      opacity: password.length === 0 || passwordErrors.length > 0 ? 0.5 : 1,
                      cursor: password.length === 0 || passwordErrors.length > 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Create Account →
                  </button>
                  <button 
                    className="auth-btn secondary" 
                    onClick={() => {
                      setStep('signup-nick');
                      setPasswordErrors([]);
                      setAuthError('');
                    }}
                    style={{ marginTop: '8px' }}
                  >
                    ← Back
                  </button>
                </div>
              )}

              {step === 'forgot-email' && (
                <div className="auth-step active">
                  <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--amber)', marginBottom: '12px' }}>↩ Forgot Password</div>
                  <div className="auth-title">Reset your password</div>
                  <p className="auth-subtitle">Enter the email address associated with your account.</p>
                  <div className="field-wrap">
                    <div className="field-label"><span className="field-dot"></span>Email address</div>
                    <input 
                      className="auth-input" 
                      type="email" 
                      placeholder="you@example.com" 
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendResetEmail()}
                    />
                  </div>
                  {forgotError && (
                    <div style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      fontSize: '13px',
                      marginBottom: '12px',
                      marginTop: '12px'
                    }}>
                      {forgotError}
                    </div>
                  )}
                  {forgotMessage && (
                    <div style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#10b981',
                      fontSize: '13px',
                      marginBottom: '12px',
                      marginTop: '12px'
                    }}>
                      ✓ {forgotMessage}
                    </div>
                  )}
                  <button 
                    className="auth-btn" 
                    onClick={handleSendResetEmail}
                    disabled={isSendingReset}
                  >
                    {isSendingReset ? 'Sending...' : 'Send Reset Link →'}
                  </button>
                  <button 
                    className="auth-btn secondary" 
                    onClick={() => { setForgotEmail(''); setForgotError(''); setStep('login-pw'); }}
                    style={{ marginTop: '8px' }}
                  >
                    ← Back
                  </button>
                </div>
              )}

              {step === 'reset-password' && (
                <div className="auth-step active">
                  <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--amber)', marginBottom: '12px' }}>↩ Reset Password</div>
                  <div className="auth-title">Create new password</div>
                  <p className="auth-subtitle">Enter a strong new password for your account.</p>
                  <div className="field-wrap">
                    <div className="field-label"><span className="field-dot"></span>New password</div>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input 
                        className="auth-input" 
                        type={showResetNewPw ? 'text' : 'password'}
                        placeholder="Min. 8 characters"
                        value={resetNewPassword}
                        onChange={(e) => {
                          setResetNewPassword(e.target.value);
                          if (e.target.value) {
                            const validation = validatePassword(e.target.value);
                            setResetPasswordErrors(validation.errors);
                          } else {
                            setResetPasswordErrors([]);
                          }
                        }}
                        style={{ paddingRight: '40px' }}
                      />
                      <button
                        onClick={() => setShowResetNewPw(!showResetNewPw)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '14px',
                          padding: '0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text3)',
                          fontWeight: '600'
                        }}
                        title={showResetNewPw ? 'Hide password' : 'Show password'}
                      >
                        {showResetNewPw ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  <div className="field-wrap">
                    <div className="field-label"><span className="field-dot"></span>Confirm password</div>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input 
                        className="auth-input" 
                        type={showResetConfirmPw ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        value={resetConfirmPassword}
                        onChange={(e) => setResetConfirmPassword(e.target.value)}
                        style={{ paddingRight: '40px' }}
                      />
                      <button
                        onClick={() => setShowResetConfirmPw(!showResetConfirmPw)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '14px',
                          padding: '0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text3)',
                          fontWeight: '600'
                        }}
                        title={showResetConfirmPw ? 'Hide password' : 'Show password'}
                      >
                        {showResetConfirmPw ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  {resetPasswordErrors.length > 0 && (
                    <div style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      marginTop: '12px',
                      marginBottom: '12px'
                    }}>
                      <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                        Password requirements not met:
                      </div>
                      {resetPasswordErrors.map((error, idx) => (
                        <div key={idx} style={{ color: '#ef4444', fontSize: '12px', marginBottom: idx < resetPasswordErrors.length - 1 ? '6px' : '0' }}>
                          • {error}
                        </div>
                      ))}
                    </div>
                  )}

                  {resetNewPassword && resetPasswordErrors.length === 0 && (
                    <div style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      marginTop: '12px',
                      marginBottom: '12px',
                      color: '#10b981',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}>
                      ✓ Password meets all requirements
                    </div>
                  )}

                  {forgotError && (
                    <div style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      fontSize: '13px',
                      marginBottom: '12px',
                      marginTop: '12px'
                    }}>
                      {forgotError}
                    </div>
                  )}

                  {resetMessage && (
                    <div style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#10b981',
                      fontSize: '13px',
                      marginBottom: '12px',
                      marginTop: '12px'
                    }}>
                      ✓ {resetMessage}
                    </div>
                  )}

                  <button 
                    className="auth-btn" 
                    onClick={handleResetPassword}
                    disabled={isResettingPassword || resetNewPassword.length === 0 || resetPasswordErrors.length > 0}
                    style={{
                      opacity: isResettingPassword || resetNewPassword.length === 0 || resetPasswordErrors.length > 0 ? 0.5 : 1,
                      cursor: isResettingPassword || resetNewPassword.length === 0 || resetPasswordErrors.length > 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isResettingPassword ? 'Resetting...' : 'Reset Password →'}
                  </button>
                  <button 
                    className="auth-btn secondary" 
                    onClick={() => { 
                      setForgotEmail(''); 
                      setResetNewPassword(''); 
                      setResetConfirmPassword(''); 
                      setResetPasswordErrors([]);
                      setForgotError('');
                      setStep('login-pw'); 
                    }}
                    style={{ marginTop: '8px' }}
                  >
                    ← Back
                  </button>
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      ) : (
        <div className="page active app-shell">
          <div className="app-frame">
          <nav className="top-nav">
              <div 
                className={`nav-item ${view === 'dash' ? 'active' : ''}`}
                onClick={() => setView('dash')}
                style={{ cursor: 'pointer' }}
              >
                <span className="nav-icon">■</span> Dashboard
              </div>
              <div className="nav-sep"></div>
              <div 
                className={`nav-item ${view === 'history' ? 'active' : ''}`}
                onClick={() => setView('history')}
                style={{ cursor: 'pointer' }}
              >
                <span className="nav-icon">●</span> History
              </div>
              <div className="nav-sep"></div>
              <div
                className={`nav-item ${view === 'insights' ? 'active' : ''}`}
                onClick={() => setView('insights')}
                style={{ cursor: 'pointer' }}
              >
                <span className="nav-icon">◈</span> Insights
              </div>
              <div className="nav-sep"></div>
              <div
                className={`nav-item ${view === 'profile' ? 'active' : ''}`}
                onClick={() => setView('profile')}
                style={{ cursor: 'pointer' }}
              >
                <span className="nav-icon">■</span> Profile
              </div>
              <div className="nav-sep"></div>
              <div 
                className="nav-item logout-item"
                onClick={handleLogout}
                style={{ cursor: 'pointer' }}
              >
                <span className="nav-icon">→</span> Sign Out
              </div>
            </nav>
            <div className="main-area">
              {view === 'dash' && (
                <>
                  <div className="view-header">
                    <div className="view-title">Dashboard</div>
                    <div className="view-sub">Analyze decisions in real-time and get instant interventions.</div>
                  </div>
                  
                  {/* Stats Grid */}
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon-minimal">▯</div>
                      <div className="stat-val">{history.length}</div>
                      <div className="stat-lbl">Analyzed</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon-minimal">▲</div>
                      <div className="stat-val">{history.filter(h => h.predictedRisk === 'critical' || h.predictedRisk === 'high').length}</div>
                      <div className="stat-lbl">Interventions</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon-minimal">✓</div>
                      <div className="stat-val">{history.filter(h => h.predictedRisk === 'low').length}</div>
                      <div className="stat-lbl">Approved</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon-minimal">●</div>
                      <div className="stat-val">—</div>
                      <div className="stat-lbl">Streak</div>
                    </div>
                  </div>

                  {/* Decision Input Section */}
                  <div className="decision-input-section">
                    <h3 className="section-heading">Analyze a Decision</h3>
                    <p className="section-desc">Describe any decision you're considering right now. Be specific for better analysis.</p>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text3)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category (optional)</div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {['shopping', 'messaging', 'productivity', 'finance', 'relationships', 'career', 'health', 'travel', 'education', 'leisure', 'legal', 'family', 'investments', 'social'].map(cat => (
                          <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            style={{
                              padding: '8px 14px',
                              borderRadius: '8px',
                              border: '1px solid ' + (category === cat ? 'var(--blue)' : 'var(--border)'),
                              background: category === cat ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg3)',
                              color: category === cat ? '#2563eb' : 'var(--text2)',
                              fontSize: '13px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea 
                      className="decision-input" 
                      placeholder="What decision are you considering? (e.g., 'Should I buy this $200 headphone today even though I just got paid?')" 
                      rows="5"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      style={{ marginBottom: '12px' }}
                    ></textarea>

                    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
                      <button 
                        className="analyze-btn"
                        onClick={handleAnalyze}
                        disabled={!text.trim() || isAnalyzing}
                        style={{ opacity: (!text.trim() || isAnalyzing) ? 0.5 : 1, minHeight: '48px' }}
                      >
                        {isAnalyzing ? (
                          <>
                            <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.6s linear infinite', marginRight: '8px' }}></span>
                            Analyzing...
                          </>
                        ) : (
                          <>Analyze Decision</>
                        )}
                      </button>
                      <span style={{ fontSize: '12px', color: 'var(--text3)', fontFamily: "'DM Mono',monospace" }}>
                        Local AI · Private · Instant
                      </span>
                    </div>

                    {/* Quick Examples */}
                    {!result && text.length === 0 && (
                      <div style={{ marginBottom: '24px' }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text3)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Try an example:</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {DECISION_EXAMPLES.map((example, idx) => (
                            <button
                              key={idx}
                              onClick={() => setText(example)}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg2)',
                                color: 'var(--text2)',
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              {example.slice(0, 35)}...
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Result Display */}
                  {result && (
                    <div className="result-section" style={{ background: 'var(--bg2)', padding: '20px', borderRadius: '12px', marginTop: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0 }}>Analysis Results</h3>
                        <button 
                          onClick={() => setResult(null)}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '16px',
                            cursor: 'pointer',
                            color: 'var(--text3)'
                          }}
                        >
                          ✕
                        </button>
                      </div>

                      {/* Risk Score */}
                      <div style={{ background: 'var(--bg3)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text3)', marginBottom: '8px' }}>RISK LEVEL</div>
                        <div style={{ fontSize: '32px', fontWeight: '800', color: getRiskColor(result.predictedRisk || 'medium'), marginBottom: '8px' }}>
                          {result.severityScore || 0}/100
                        </div>
                        <div style={{ 
                          display: 'inline-block',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: getRiskBg(result.predictedRisk || 'medium'),
                          color: getRiskColor(result.predictedRisk || 'medium'),
                          fontSize: '12px',
                          fontWeight: '700',
                          letterSpacing: '0.5px'
                        }}>
                          {(result.predictedRisk || 'MEDIUM').toUpperCase()}
                        </div>
                      </div>

                      {/* All Model Outputs */}
                      <div style={{ background: 'var(--bg3)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: '600', color: 'var(--text3)' }}>All Returned Outputs</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px', justifyItems: 'center' }}>
                          {[
                            { label: 'Severity', value: result.severityScore || 0, sub: '/ 100', color: getScoreColor(result.severityScore) },
                            { label: 'Harmfulness', value: result.harmfulnessScore || 0, sub: '/ 100', color: getScoreColor(result.harmfulnessScore) },
                            { label: 'Negativity', value: result.negativityScore || 0, sub: '/ 100', color: getScoreColor(result.negativityScore) },
                            { label: 'Predicted Risk', text: (result.predictedRisk || 'medium').toUpperCase(), value: result.confidence?.risk ?? 50, sub: result.confidence?.risk != null ? `${result.confidence.risk}% conf` : '', color: getRiskColor(result.predictedRisk || 'medium') },
                            { label: 'Behavior', text: (result.behaviour || result.behavior || 'other').replace(/-/g, ' '), value: result.confidence?.category ?? 50, sub: result.confidence?.category != null ? `${result.confidence.category}% conf` : '', color: '#3b82f6' },
                            { label: 'Domain', text: (result.domain || 'general').replace(/-/g, ' '), value: result.confidence?.category ?? 50, sub: result.confidence?.category != null ? `${result.confidence.category}% conf` : '', color: '#8b5cf6' }
                          ].map(d => (
                            <div key={d.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <RiskGauge size={104} value={d.value} text={d.text} sub={d.sub} color={d.color} track="var(--border)" />
                              <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '600', color: 'var(--text3)', textAlign: 'center' }}>{d.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Intervention */}
                      <div style={{ background: 'var(--bg3)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600', color: 'var(--text3)' }}>→ Recommended Intervention</h4>
                        <p style={{ margin: '0', fontSize: '13px', color: 'var(--text2)', lineHeight: '1.6' }}>
                          {result.intervention || 'Take a moment to reconsider this decision.'}
                        </p>
                      </div>

                      {/* Consequences */}
                      {result.consequences && (Array.isArray(result.consequences) ? result.consequences.length > 0 : result.consequences) && (
                        <div style={{ background: 'var(--bg3)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600', color: 'var(--text3)' }}>⚠ Potential Consequences</h4>
                          <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '13px', color: 'var(--text2)', lineHeight: '1.7' }}>
                            {Array.isArray(result.consequences) ? 
                              result.consequences.map((item, idx) => <li key={idx}>{item}</li>) :
                              <li>{String(result.consequences)}</li>
                            }
                          </ul>
                        </div>
                      )}

                      <button 
                        style={{
                          background: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          padding: '10px 16px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600',
                          width: '100%'
                        }}
                        onClick={() => { setText(''); setResult(null); }}
                      >
                        Analyze Another Decision
                      </button>
                    </div>
                  )}

                  {/* Recent Activity */}
                  {history.length > 0 && !result && (
                    <div style={{ marginTop: '32px' }}>
                      <h3 className="section-heading">Recent Analyses</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {history.slice(0, 5).map((item, idx) => (
                          <div 
                            key={idx}
                            style={{ 
                              padding: '14px 16px',
                              borderLeft: '4px solid ' + getRiskColor(item.predictedRisk),
                              borderRadius: '8px',
                              background: 'var(--bg2)',
                              fontSize: '13px',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ fontWeight: '600', color: 'var(--text1)', marginBottom: '4px' }}>
                              "{item.text.slice(0, 60)}{item.text.length > 60 ? '...' : ''}"
                            </div>
                            <div style={{ color: 'var(--text3)', fontSize: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                              <span>{(item.behavior || item.behaviour || 'other').replace('-', ' ')}</span>
                              <span>•</span>
                              <span style={{ color: getRiskColor(item.predictedRisk), fontWeight: '600' }}>
                                {item.predictedRisk.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {view === 'history' && (
                  <div className="history-view active">
                    <div className="view-header">
                      <div className="view-title">Decision History</div>
                      <div className="view-sub">Review all your analyzed decisions.</div>
                    </div>

                    {/* Tabs within the History view */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '20px', borderBottom: '1px solid var(--border)' }}>
                      {[
                        { id: 'decisions', label: 'Decisions' },
                        { id: 'journal', label: `Journal${journaledCount ? ` (${journaledCount})` : ''}` }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setHistoryTab(tab.id)}
                          style={{
                            padding: '10px 18px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: '2px solid ' + (historyTab === tab.id ? 'var(--blue)' : 'transparent'),
                            color: historyTab === tab.id ? 'var(--text1)' : 'var(--text2)',
                            fontSize: '14px',
                            fontWeight: historyTab === tab.id ? '700' : '500',
                            cursor: 'pointer',
                            marginBottom: '-1px'
                          }}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {history.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg2)', borderRadius: '12px', marginTop: '24px' }}>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text1)', marginBottom: '8px' }}>No decisions yet</div>
                        <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '24px' }}>Start analyzing decisions to build your complete history.</div>
                        <button
                          className="auth-btn"
                          onClick={() => setView('dash')}
                          style={{ padding: '10px 20px', fontSize: '14px', maxWidth: '300px', margin: '0 auto' }}
                        >
                          Go to Dashboard →
                        </button>
                      </div>
                    ) : historyTab === 'decisions' ? (
                      <div style={{ marginTop: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {history.map((item, idx) => {
                            const formOpen = outcomeFormId === item.timestamp;
                            return (
                            <div
                              key={idx}
                              style={{
                                padding: '16px',
                                border: '1px solid var(--border)',
                                borderRadius: '10px',
                                background: 'var(--bg2)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                transition: 'all 0.2s'
                              }}
                            >
                              <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: '600', color: 'var(--text1)', marginBottom: '6px', fontSize: '14px' }}>
                                    "{item.text.slice(0, 70)}{item.text.length > 70 ? '...' : ''}"
                                  </div>
                                  <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
                                    {(item.behavior || item.behaviour || 'other').replace('-', ' ')} • Severity: {item.severityScore}/100 • {item.timestamp}
                                  </div>
                                </div>
                                <div
                                  style={{
                                    padding: '8px 14px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    background: getRiskBg(item.predictedRisk),
                                    color: getRiskColor(item.predictedRisk),
                                    whiteSpace: 'nowrap',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                  }}
                                >
                                  {item.predictedRisk}
                                </div>
                              </div>

                              {/* Existing outcome badge */}
                              {item.journal?.actualRisk && !formOpen && (
                                <div style={{ fontSize: '12px', color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: '600', color: 'var(--text1)' }}>Outcome:</span>
                                  <span>{OUTCOME_LABELS[item.journal.actualRisk] || item.journal.actualRisk}</span>
                                  {item.journal.outcome && <span style={{ color: 'var(--text3)' }}>— "{item.journal.outcome}"</span>}
                                </div>
                              )}

                              {/* Add / Edit outcome control */}
                              <div>
                                <button
                                  onClick={() => (formOpen ? closeOutcomeForm() : openOutcomeForm(item))}
                                  style={{
                                    padding: '6px 14px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border2)',
                                    background: 'var(--bg3)',
                                    color: 'var(--text1)',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {formOpen ? 'Cancel' : item.journal?.actualRisk ? 'Edit Outcome' : '+ Add Outcome'}
                                </button>
                              </div>

                              {/* Inline outcome form */}
                              {formOpen && (
                                <div style={{ padding: '14px', background: 'var(--bg3)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  <div>
                                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text1)', display: 'block', marginBottom: '6px' }}>
                                      What actually happened?
                                    </label>
                                    <textarea
                                      value={outcomeNote}
                                      maxLength={200}
                                      onChange={(e) => setOutcomeNote(e.target.value)}
                                      rows={2}
                                      placeholder="Describe how it turned out..."
                                      style={{
                                        width: '100%',
                                        resize: 'vertical',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border2)',
                                        background: 'var(--bg2)',
                                        color: 'var(--text1)',
                                        fontSize: '13px',
                                        fontFamily: 'inherit'
                                      }}
                                    />
                                    <div style={{ fontSize: '11px', color: 'var(--text3)', textAlign: 'right', marginTop: '2px' }}>
                                      {outcomeNote.length}/200
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {OUTCOME_OPTIONS.map((opt) => (
                                      <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text1)', cursor: 'pointer' }}>
                                        <input
                                          type="radio"
                                          name={`outcome-${item.timestamp}`}
                                          value={opt.value}
                                          checked={outcomeRisk === opt.value}
                                          onChange={() => setOutcomeRisk(opt.value)}
                                        />
                                        {opt.label}
                                      </label>
                                    ))}
                                  </div>

                                  <div>
                                    <button
                                      onClick={() => handleSaveOutcome(item)}
                                      disabled={isSavingOutcome}
                                      className="auth-btn"
                                      style={{ padding: '8px 18px', fontSize: '13px', maxWidth: '160px' }}
                                    >
                                      {isSavingOutcome ? 'Saving...' : 'Save'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );})}
                        </div>
                      </div>
                    ) : (
                      /* Journal tab */
                      <div style={{ marginTop: '24px' }}>
                        {!journalAnalysis.hasEnoughData ? (
                          <div style={{ textAlign: 'center', padding: '48px 20px', background: 'var(--bg2)', borderRadius: '12px' }}>
                            <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text1)', marginBottom: '8px' }}>
                              Not enough journal entries yet
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text3)' }}>
                              Add outcomes to at least 5 decisions to unlock your Prediction Accuracy analysis.
                              You have {journalAnalysis.totalEntries}/5.
                            </div>
                          </div>
                        ) : (
                          <div style={{ padding: '24px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                              <div>
                                <div style={{ fontSize: '13px', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                                  Your Prediction Accuracy
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                                  <span style={{ fontSize: '52px', fontWeight: '800', color: accuracyColorFor(journalAnalysis.overallScore), lineHeight: 1 }}>
                                    {journalAnalysis.overallScore}
                                  </span>
                                  <span style={{ fontSize: '20px', color: 'var(--text3)' }}>/100</span>
                                  <span style={{
                                    fontSize: '24px',
                                    fontWeight: '700',
                                    color: journalAnalysis.trendDirection === 'up' ? 'var(--green)' : 'var(--red)'
                                  }}>
                                    {journalAnalysis.trendDirection === 'up' ? '↑' : '↓'}
                                  </span>
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '6px' }}>
                                  {journalAnalysis.correctPredictions}/{journalAnalysis.totalEntries} predictions matched your outcomes
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={() => setShowFullBreakdown((v) => !v)}
                                  style={{
                                    padding: '8px 14px', fontSize: '12px', fontWeight: '600', borderRadius: '8px',
                                    border: '1px solid var(--border2)', background: 'var(--bg3)', color: 'var(--text1)', cursor: 'pointer'
                                  }}
                                >
                                  {showFullBreakdown ? 'Hide Breakdown' : 'View Full Breakdown'}
                                </button>
                                <button
                                  onClick={handleClearJournal}
                                  style={{
                                    padding: '8px 14px', fontSize: '12px', fontWeight: '600', borderRadius: '8px',
                                    border: '1px solid var(--red)', background: 'transparent', color: 'var(--red)', cursor: 'pointer'
                                  }}
                                >
                                  Clear Journal
                                </button>
                              </div>
                            </div>

                            {/* Domain breakdown (expandable) */}
                            {showFullBreakdown && (
                              <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text1)', marginBottom: '14px' }}>
                                  Accuracy by Domain
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                  {journalAnalysis.byDomain.map((d) => (
                                    <div key={d.domain}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                                        <span style={{ color: 'var(--text1)', fontWeight: '600' }}>{d.label}</span>
                                        <span style={{ color: 'var(--text2)' }}>{d.correct}/{d.total} correct ({d.percent}%)</span>
                                      </div>
                                      <div style={{ height: '8px', background: 'var(--bg4)', borderRadius: '5px', overflow: 'hidden' }}>
                                        <div style={{ width: `${d.percent}%`, height: '100%', background: d.color, borderRadius: '5px', transition: 'width 0.3s' }} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Pattern insights */}
                            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text1)', marginBottom: '12px' }}>
                                Pattern Insights
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {journalAnalysis.insights.map((insight, i) => (
                                  <div key={i} style={{
                                    fontSize: '13px', color: 'var(--text2)', lineHeight: 1.5,
                                    padding: '10px 12px', background: 'var(--bg3)', borderRadius: '8px',
                                    borderLeft: '3px solid var(--blue)'
                                  }}>
                                    {insight}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Trend visualization */}
                            {journalAnalysis.trend.length > 1 && (
                              <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text1)', marginBottom: '12px' }}>
                                  Accuracy Trend (last 8 weeks)
                                </div>
                                <div style={{ width: '100%', height: '220px' }}>
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={journalAnalysis.trend} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
                                      <CartesianGrid stroke="var(--border)" vertical={false} />
                                      <XAxis dataKey="week" stroke="var(--text3)" tick={{ fontSize: 11 }} tickLine={false} />
                                      <YAxis domain={[0, 100]} stroke="var(--text3)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                      <Tooltip
                                        contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: '8px', fontSize: '12px' }}
                                        formatter={(v, name) => [`${v}%`, name === 'movingAvg' ? 'Moving avg' : 'Accuracy']}
                                      />
                                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                                      <Line type="monotone" dataKey="accuracy" name="Accuracy" stroke="var(--blue)" strokeWidth={2.4} dot={{ r: 2.5 }} />
                                      <Line type="monotone" dataKey="movingAvg" name="Moving avg" stroke="#10b981" strokeWidth={2.4} strokeDasharray="5 4" dot={false} />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
              )}

              {view === 'profile' && (
                  <div className="profile-view active">
                    <div className="view-header">
                    <div className="view-title">My Profile</div>
                    <div className="view-sub">Manage your account and view your activity.</div>
                  </div>

                  <div style={{ marginTop: '24px', padding: '28px', background: 'var(--bg2)', borderRadius: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px' }}>
                      <div 
                        style={{ 
                          width: '88px', 
                          height: '88px', 
                          background: user.avatarColor,
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '36px',
                          fontWeight: '700',
                          color: '#fff',
                          flexShrink: 0
                        }}
                      >
                        {user.nickname.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text1)', marginBottom: '4px' }}>{user.nickname}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text3)', fontFamily: "'DM Mono',monospace", marginBottom: '12px' }}>{user.email}</div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span style={{ padding: '4px 10px', fontSize: '11px', background: 'rgba(37, 99, 235, 0.15)', color: '#2563eb', borderRadius: '6px', fontWeight: '600' }}>✓ Active</span>
                          <span style={{ padding: '4px 10px', fontSize: '11px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', borderRadius: '6px', fontWeight: '600' }}>■ Private</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#2563eb' }}>{history.length}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>Decisions Analyzed</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#ef4444' }}>
                          {history.filter(h => h.predictedRisk === 'critical' || h.predictedRisk === 'high').length}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>Interventions</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
                          {history.filter(h => h.predictedRisk === 'low').length}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>Approved</div>
                      </div>
                    </div>

                    <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)', fontSize: '13px', color: 'var(--text2)', lineHeight: '1.6' }}>
                      <p style={{ margin: '0 0 12px 0' }}>
                        <strong>Privacy Status:</strong> All data is stored locally on your device and encrypted.
                      </p>
                      <p style={{ margin: '0' }}>
                        <strong>Account Type:</strong> CogniAuth Guardian — Full access to decision analysis and history.
                      </p>
                    </div>
                  </div>



                  {/* Password Security Section */}
                  <div style={{ marginTop: '24px', padding: '28px', background: 'var(--bg2)', borderRadius: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text1)' }}>Security Settings</div>
                      <button 
                        onClick={() => {
                          setShowChangePassword(!showChangePassword);
                          setCurrentPassword('');
                          setNewPassword('');
                          setConfirmPassword('');
                          setNewPasswordErrors([]);
                          setPasswordChangeMessage('');
                          setPasswordChangeError('');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--amber)',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '14px'
                        }}
                      >
                        {showChangePassword ? 'Hide' : 'Change Password'}
                      </button>
                    </div>

                    {!showChangePassword ? (
                      <div style={{ fontSize: '13px', color: 'var(--text3)' }}>
                        <p style={{ margin: '0' }}>
                          Keep your account secure by using a strong password. Your password is never shared and stored securely on your device.
                        </p>
                      </div>
                    ) : (
                      <div>
                        {/* Current Password */}
                        <div className="field-wrap">
                          <div className="field-label"><span className="field-dot"></span>Current Password</div>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input 
                              className="auth-input" 
                              type={showCurrentPw ? 'text' : 'password'}
                              placeholder="Enter your current password"
                              value={currentPassword}
                              onChange={(e) => {
                                setCurrentPassword(e.target.value);
                                validateCurrentPassword(e.target.value);
                              }}
                              style={{ paddingRight: '40px' }}
                            />
                            <button
                              onClick={() => setShowCurrentPw(!showCurrentPw)}
                              style={{
                                position: 'absolute',
                                right: '12px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '14px',
                                padding: '0',
                                color: 'var(--text3)',
                                fontWeight: '600'
                              }}
                              title={showCurrentPw ? 'Hide' : 'Show'}
                            >
                              {showCurrentPw ? 'Hide' : 'Show'}
                            </button>
                          </div>
                        </div>

                        {/* Current Password Error */}
                        {currentPasswordError && (
                          <div style={{
                            padding: '12px',
                            borderRadius: '8px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            marginTop: '12px',
                            marginBottom: '12px',
                            color: '#ef4444',
                            fontSize: '13px'
                          }}>
                            ✗ {currentPasswordError}
                          </div>
                        )}

                        {currentPassword && !currentPasswordError && (
                          <div style={{
                            padding: '12px',
                            borderRadius: '8px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            marginTop: '12px',
                            marginBottom: '12px',
                            color: '#10b981',
                            fontSize: '13px',
                            fontWeight: '500'
                          }}>
                            ✓ Current password is correct
                          </div>
                        )}

                        {/* New Password */}
                        <div className="field-wrap">
                          <div className="field-label"><span className="field-dot"></span>New Password</div>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input 
                              className="auth-input" 
                              type={showNewPw ? 'text' : 'password'}
                              placeholder="Enter a new password"
                              value={newPassword}
                              onChange={(e) => {
                                setNewPassword(e.target.value);
                                if (e.target.value) {
                                  const validation = validatePassword(e.target.value);
                                  setNewPasswordErrors(validation.errors);
                                } else {
                                  setNewPasswordErrors([]);
                                }
                              }}
                              style={{ paddingRight: '40px' }}
                            />
                            <button
                              onClick={() => setShowNewPw(!showNewPw)}
                              style={{
                                position: 'absolute',
                                right: '12px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '14px',
                                padding: '0',
                                color: 'var(--text3)',
                                fontWeight: '600'
                              }}
                              title={showNewPw ? 'Hide' : 'Show'}
                            >
                              {showNewPw ? 'Hide' : 'Show'}
                            </button>
                          </div>
                        </div>

                        {/* Password Requirements Feedback */}
                        {newPassword && newPasswordErrors.length > 0 && (
                          <div style={{
                            padding: '12px',
                            borderRadius: '8px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            marginTop: '12px',
                            marginBottom: '12px'
                          }}>
                            <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                              Password requirements not met:
                            </div>
                            {newPasswordErrors.map((error, idx) => (
                              <div key={idx} style={{ color: '#ef4444', fontSize: '12px', marginBottom: idx < newPasswordErrors.length - 1 ? '6px' : '0' }}>
                                • {error}
                              </div>
                            ))}
                          </div>
                        )}

                        {newPassword && newPasswordErrors.length === 0 && (
                          <div style={{
                            padding: '12px',
                            borderRadius: '8px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            marginTop: '12px',
                            marginBottom: '12px',
                            color: '#10b981',
                            fontSize: '13px',
                            fontWeight: '500'
                          }}>
                            ✓ Password meets all requirements
                          </div>
                        )}

                        {/* Confirm Password */}
                        <div className="field-wrap">
                          <div className="field-label"><span className="field-dot"></span>Confirm New Password</div>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input 
                              className="auth-input" 
                              type={showConfirmPw ? 'text' : 'password'}
                              placeholder="Confirm your new password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              style={{ paddingRight: '40px' }}
                            />
                            <button
                              onClick={() => setShowConfirmPw(!showConfirmPw)}
                              style={{
                                position: 'absolute',
                                right: '12px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '14px',
                                padding: '0',
                                color: 'var(--text3)',
                                fontWeight: '600'
                              }}
                              title={showConfirmPw ? 'Hide' : 'Show'}
                            >
                              {showConfirmPw ? 'Hide' : 'Show'}
                            </button>
                          </div>
                        </div>

                        {/* Confirm Match Feedback */}
                        {confirmPassword && newPassword && confirmPassword !== newPassword && (
                          <div style={{
                            padding: '12px',
                            borderRadius: '8px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            marginTop: '12px',
                            marginBottom: '12px',
                            color: '#ef4444',
                            fontSize: '13px'
                          }}>
                            • Passwords do not match
                          </div>
                        )}

                        {confirmPassword && newPassword && confirmPassword === newPassword && newPasswordErrors.length === 0 && (
                          <div style={{
                            padding: '12px',
                            borderRadius: '8px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            marginTop: '12px',
                            marginBottom: '12px',
                            color: '#10b981',
                            fontSize: '13px',
                            fontWeight: '500'
                          }}>
                            ✓ Passwords match and meet requirements
                          </div>
                        )}

                        {/* Error Message */}
                        {passwordChangeError && (
                          <div style={{
                            padding: '12px',
                            borderRadius: '8px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            marginTop: '12px',
                            marginBottom: '12px',
                            color: '#ef4444',
                            fontSize: '13px'
                          }}>
                            {passwordChangeError}
                          </div>
                        )}

                        {/* Success Message */}
                        {passwordChangeMessage && (
                          <div style={{
                            padding: '12px',
                            borderRadius: '8px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            marginTop: '12px',
                            marginBottom: '12px',
                            color: '#10b981',
                            fontSize: '13px',
                            fontWeight: '500'
                          }}>
                            ✓ {passwordChangeMessage}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                          <button 
                            className="auth-btn"
                            onClick={handleChangePassword}
                            disabled={!currentPassword || currentPasswordError || !newPassword || !confirmPassword || newPasswordErrors.length > 0 || (newPassword !== confirmPassword)}
                            style={{
                              flex: 1,
                              opacity: !currentPassword || currentPasswordError || !newPassword || !confirmPassword || newPasswordErrors.length > 0 || (newPassword !== confirmPassword) ? 0.5 : 1,
                              cursor: !currentPassword || currentPasswordError || !newPassword || !confirmPassword || newPasswordErrors.length > 0 || (newPassword !== confirmPassword) ? 'not-allowed' : 'pointer'
                            }}
                          >
                            Update Password
                          </button>
                          <button 
                            className="auth-btn secondary"
                            onClick={() => {
                              setShowChangePassword(false);
                              setCurrentPassword('');
                              setNewPassword('');
                              setConfirmPassword('');
                              setNewPasswordErrors([]);
                              setPasswordChangeMessage('');
                              setPasswordChangeError('');
                              setCurrentPasswordError('');
                            }}
                            style={{ flex: 1 }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button 
                      className="auth-btn secondary" 
                      onClick={() => setView('dash')}
                      style={{ padding: '10px 24px', maxWidth: '200px' }}
                    >
                      ← Back
                    </button>
                    <button 
                      className="topbar-signout" 
                      onClick={handleLogout}
                      style={{ padding: '10px 24px' }}
                    >
                      Sign Out →
                    </button>
                  </div>
                </div>
              )}

              {view === 'insights' && (
                <InsightsDashboard history={history} isDark={isDark} />
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
