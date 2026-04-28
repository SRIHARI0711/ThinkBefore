import React, { useState, useEffect, useRef } from 'react';
import './styles.css';
import { analyzeDecision } from './mlModel.js';
import { 
  generateOTP, 
  sendOTPEmail, 
  verifyOTP, 
  clearOTP,
  loadEmailConfig,
  saveEmailConfig,
  getEmailConfig 
} from './emailService.js';
import { 
  registerUser, 
  authenticateUser, 
  userExists, 
  getUser,
  validatePassword,
  changePassword 
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
  
  // OTP and Authentication States
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [emailConfig, setEmailConfigState] = useState(null);
  const [showEmailSettings, setShowEmailSettings] = useState(false);
  const [editEmailFrom, setEditEmailFrom] = useState('');
  const [editEmailSenderName, setEditEmailSenderName] = useState('');

  useEffect(() => {
    document.body.classList.toggle('light', !isDark);
    // Load email configuration on startup
    loadEmailConfig();
    const config = getEmailConfig();
    setEmailConfigState(config);
    setEditEmailFrom(config.fromEmail);
    setEditEmailSenderName(config.senderName);
  }, [isDark]);

  const handleSignIn = () => {
    setAuthError('');
    if (!email || !password) {
      setAuthError('Please enter both email and password');
      return;
    }

    // Authenticate against user database
    const result = authenticateUser(email, password);
    
    if (result.success) {
      setUser(result.user);
      setPage('app');
      setView('dash');
      setPassword('');
    } else {
      setAuthError(result.message);
    }
  };

  const handleSignUp = () => {
    // Register user in database
    const result = registerUser(email, password, nickname, color);
    
    if (result.success) {
      setUser({ email, nickname, avatarColor: color, emailLower: email.toLowerCase() });
      setPage('app');
      setView('dash');
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

    if (userExists(email)) {
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
      setStep('signup-otp'); // Move to OTP verification step
      // Show OTP in dev mode
      if (result.otp) {
        setTimeout(() => {
          setOtpError(`[Dev Mode] Your OTP: ${result.otp} (expires in 10 minutes)`);
        }, 500);
      }
    } else {
      setOtpError(result.message);
    }
    setIsSendingOtp(false);
  };

  const handleVerifyOTP = () => {
    setOtpError('');
    if (!otp) {
      setOtpError('Please enter the OTP');
      return;
    }

    setIsVerifyingOtp(true);
    const result = verifyOTP(email, otp);
    
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
      setOtpError('OTP resent successfully');
      setTimeout(() => setOtpError(''), 3000);
      if (result.otp) {
        setOtpError(`OTP resent! [Dev Mode] Code: ${result.otp}`);
      }
    } else {
      setOtpError('Failed to resend OTP: ' + result.message);
    }
    setIsSendingOtp(false);
  };

  const handleChangePassword = () => {
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
    const result = changePassword(user.email, currentPassword, newPassword);
    
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

  const handleAnalyze = () => {
    if (!text.trim()) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      const analysis = analyzeDecision(text);
      setResult(analysis);
      setHistory([analysis, ...history]);
      setText('');
      setIsAnalyzing(false);
    }, 600);
  };

  const handleLogout = () => {
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
  };

  const getRiskColor = (risk) => {
    switch(risk) {
      case 'critical': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getRiskBg = (risk) => {
    switch(risk) {
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

      <nav className="topbar">
        <a className="brand" href="#">
          <div className="brand-icon">CG</div>
          <div className="brand-name">CogniAuth</div>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user && <div style={{ color: 'var(--text2)', fontSize: '14px', fontWeight: '500' }}>{user.nickname}</div>}
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
                {/* Hero Section */}
                <div className="home-hero">
                  <div className="hero-content">
                    <h1 className="hero-title">Pause Before You Act</h1>
                    <p className="hero-subtitle">
                      AI-powered analysis helps you make decisions you won't regret. Get real-time intervention before impulsive choices.
                    </p>
                    <div className="hero-cta-group">
                      <button 
                        className="cta-btn primary"
                        onClick={() => { setEmail(''); setPassword(''); setStep('login-email'); }}
                      >
                        Get Started →
                      </button>
                      <button 
                        className="cta-btn secondary"
                        onClick={() => { setEmail(''); setPassword(''); setNickname(''); setColor('#f0a500'); setStep('signup-email'); }}
                      >
                        Create Account
                      </button>
                    </div>
                  </div>
                  <div className="hero-visual">
                    <div className="visual-element brain-icon">
                      <div style={{
                        width: '160px',
                        height: '160px',
                        borderRadius: '24px',
                        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        boxShadow: '0 20px 60px rgba(37, 99, 235, 0.3)',
                        animation: 'float 3s ease-in-out infinite'
                      }}>
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                          <circle cx="12" cy="8" r="3"/>
                          <path d="M12 11v5M8 16h8M6 16c0 2-1 3-1 3M18 16c0 2 1 3 1 3M9 13c-1.5 0-2-1-2-2M15 13c1.5 0 2-1 2-2"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Features Section */}
                <div className="home-section">
                  <h2 className="section-title">Why CogniAuth Works</h2>
                  <div className="features-grid">
                    <div className="feature-card">
                      <div className="feature-icon-minimal">▲</div>
                      <h3>Stop Before You Regret</h3>
                      <p>Real-time analysis the moment you consider a decision. Know instantly whether this impulse is one you'll thank yourself for later.</p>
                    </div>
                    <div className="feature-card">
                      <div className="feature-icon-minimal">▯</div>
                      <h3>See Your Patterns Before They Cost You</h3>
                      <p>Identify the behavioral patterns that trigger your regrets. Watch as CogniAuth learns what usually goes wrong for you.</p>
                    </div>
                    <div className="feature-card">
                      <div className="feature-icon-minimal">◉</div>
                      <h3>Get Expert Advice When You Need It Most</h3>
                      <p>Instead of generic feedback, receive personalized interventions designed for your specific decision. Real guidance, real impact.</p>
                    </div>
                  </div>
                </div>

                {/* Use Cases Section */}
                <div className="home-section">
                  <h2 className="section-title">Real-World Scenarios</h2>
                  <div className="usecases-grid">
                    <div className="usecase-card">
                      <div className="usecase-label">Financial</div>
                      <p className="usecase-scenario">"Got a $2K bonus—thinking about splurging on a new laptop"</p>
                      <div className="usecase-intervention">→ Wait 48 hours. Most regrets on major purchases happen within this window.</div>
                    </div>
                    <div className="usecase-card">
                      <div className="usecase-label">Relationships</div>
                      <p className="usecase-scenario">"Thinking about texting my ex at 2 AM"</p>
                      <div className="usecase-intervention">→ Strong emotional charge detected. Sleep on it. You'll feel different tomorrow.</div>
                    </div>
                    <div className="usecase-card">
                      <div className="usecase-label">Career</div>
                      <p className="usecase-scenario">"My coworker got promoted. Should I submit my resignation?"</p>
                      <div className="usecase-intervention">→ This is an emotional reaction to disappointment. Discuss with a mentor first.</div>
                    </div>
                    <div className="usecase-card">
                      <div className="usecase-label">Communication</div>
                      <p className="usecase-scenario">"I want to send an angry email to my boss right now"</p>
                      <div className="usecase-intervention">→ High emotional tone detected. Save as draft—review when calm and ready.</div>
                    </div>
                  </div>
                </div>

                {/* Trust Section */}
                <div className="home-section trust-section">
                  <h2 className="section-title">Built on Trust</h2>
                  <div className="trust-grid">
                    <div className="trust-card">
                      <div className="trust-icon-minimal">■</div>
                      <h4>Privacy First</h4>
                      <p>All analysis happens locally on your device. Your decisions and data never leave your computer. No cloud storage. No tracking. No data sales.</p>
                    </div>
                    <div className="trust-card">
                      <div className="trust-icon-minimal">●</div>
                      <h4>Explainable AI</h4>
                      <p>You'll understand exactly why CogniAuth flagged a decision and what factors contributed to the risk score. No black boxes. Full transparency into how we think.</p>
                    </div>
                    <div className="trust-card">
                      <div className="trust-icon-minimal">✚</div>
                      <h4>Evidence-Based</h4>
                      <p>Our intervention framework draws from behavioral economics and neuroscience research on impulsive decision-making. Built on 20+ years of psychology studies.</p>
                    </div>
                  </div>
                </div>

                {/* Final CTA */}
                <div className="home-final-cta">
                  <h2>Ready to Make Better Decisions?</h2>
                  <p>Join hundreds of users preventing impulsive regrets every day.</p>
                  <button 
                    className="cta-btn primary large"
                    onClick={() => { setEmail(''); setPassword(''); setStep('signup-email'); }}
                  >
                    Start Free Today →
                  </button>
                </div>
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
                      background: otpError.includes('Dev Mode') ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      border: otpError.includes('Dev Mode') ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                      color: otpError.includes('Dev Mode') ? '#3b82f6' : '#ef4444',
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
                    disabled={isSendingOtp}
                    style={{ marginTop: '8px' }}
                  >
                    {isSendingOtp ? 'Resending...' : 'Resend Code'}
                  </button>
                  <button 
                    className="auth-btn secondary" 
                    onClick={() => { setStep('signup-email'); setOtpError(''); setOtp(''); }}
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
            </div>
            )}
          </div>
        </div>
      ) : (
        <div className="page active">
          <div className="app-shell">
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
                <div className="dash-view active">
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
                        {['shopping', 'messaging', 'productivity', 'finance'].map(cat => (
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
                    <div className="result-section">
                      <div className="result-header">
                        <h3>Analysis Results</h3>
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

                      {/* Risk Score and Meter */}
                      <div className={`result-risk-box ${result.predictedRisk === 'critical' || result.predictedRisk === 'high' ? result.predictedRisk : ''}`}>
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text3)', marginBottom: '8px' }}>RISK LEVEL</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                            <div 
                              style={{
                                fontSize: '48px',
                                fontWeight: '800',
                                color: getRiskColor(result.predictedRisk),
                                fontFamily: "'DM Mono',monospace"
                              }}
                            >
                              {result.severityScore}
                            </div>
                            <div>
                              <div 
                                style={{
                                  display: 'inline-block',
                                  padding: '6px 14px',
                                  borderRadius: '8px',
                                  background: getRiskBg(result.predictedRisk),
                                  color: getRiskColor(result.predictedRisk),
                                  fontSize: '13px',
                                  fontWeight: '700',
                                  letterSpacing: '1px'
                                }}
                              >
                                {result.predictedRisk.toUpperCase()}
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>out of 100</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Meter */}
                        <div style={{ height: '8px', background: 'var(--bg3)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div 
                            style={{
                              width: `${(result.severityScore / 100) * 100}%`,
                              height: '100%',
                              background: getRiskColor(result.predictedRisk),
                              borderRadius: '4px',
                              transition: result.predictedRisk === 'critical' ? 'width 0.5s cubic-bezier(0.34, 1.2, 0.64, 1)' : 'width 0.8s cubic-bezier(0.34, 1.2, 0.64, 1)'
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Analysis Details */}
                      <div className="result-analysis">
                        <h4 className="result-subheading">Decision Breakdown</h4>
                        <div className="analysis-grid">
                          <div className="analysis-item">
                            <div className="analysis-label">Behavior Type</div>
                            <div className="analysis-value">{result.behavior.replace('-', ' ').charAt(0).toUpperCase() + result.behavior.replace('-', ' ').slice(1)}</div>
                          </div>
                          <div className="analysis-item">
                            <div className="analysis-label">Harmfulness</div>
                            <div className="analysis-value">{result.harmfulnessScore}/100</div>
                          </div>
                          <div className="analysis-item">
                            <div className="analysis-label">Emotional Charge</div>
                            <div className="analysis-value">{result.negativityScore}/100</div>
                          </div>
                        </div>
                      </div>

                      {/* Intervention */}
                      <div className="result-intervention">
                        <h4 className="result-subheading">→ Recommended Intervention</h4>
                        <p style={{ margin: '0', fontSize: '14px', color: 'var(--text2)', lineHeight: '1.6' }}>
                          {result.intervention}
                        </p>
                      </div>

                      {/* Consequences if present */}
                      {result.consequences && result.consequences.length > 0 && (
                        <div className="result-consequences">
                          <h4 className="result-subheading">⚠ Potential Consequences</h4>
                          <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '13px', color: 'var(--text2)', lineHeight: '1.7' }}>
                            {result.consequences.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <button 
                        className="auth-btn"
                        onClick={() => { setText(''); setResult(null); }}
                        style={{ marginTop: '16px', width: '100%' }}
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
                              <span>{item.behavior.replace('-', ' ')}</span>
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
                </div>
              )}

              {view === 'history' && (
                <div className="history-view active">
                  <div className="view-header">
                    <div className="view-title">Decision History</div>
                    <div className="view-sub">Review all your analyzed decisions.</div>
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
                  ) : (
                    <div style={{ marginTop: '24px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {history.map((item, idx) => (
                          <div 
                            key={idx}
                            style={{
                              padding: '16px',
                              border: '1px solid var(--border)',
                              borderRadius: '10px',
                              background: 'var(--bg2)',
                              display: 'flex',
                              gap: '16px',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: '600', color: 'var(--text1)', marginBottom: '6px', fontSize: '14px' }}>
                                "{item.text.slice(0, 70)}{item.text.length > 70 ? '...' : ''}"
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
                                {item.behavior.replace('-', ' ')} • Severity: {item.severityScore}/100 • {item.timestamp}
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
                        ))}
                      </div>
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

                  {/* Email Configuration Section */}
                  <div style={{ marginTop: '24px', padding: '28px', background: 'var(--bg2)', borderRadius: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text1)' }}>Email Settings</div>
                      <button 
                        onClick={() => setShowEmailSettings(!showEmailSettings)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--amber)',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '14px'
                        }}
                      >
                        {showEmailSettings ? 'Hide' : 'Edit'}
                      </button>
                    </div>

                    {!showEmailSettings ? (
                      <div style={{ fontSize: '13px', color: 'var(--text3)' }}>
                        <div style={{ marginBottom: '8px' }}>
                          <strong>Sender Email:</strong> {emailConfig?.fromEmail || 'cogniguard@example.com'}
                        </div>
                        <div>
                          <strong>Sender Name:</strong> {emailConfig?.senderName || 'CogniAuth'}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="field-wrap">
                          <div className="field-label"><span className="field-dot"></span>Sender Email Address</div>
                          <input 
                            className="auth-input" 
                            type="email" 
                            placeholder="cogniguard@example.com"
                            value={editEmailFrom}
                            onChange={(e) => setEditEmailFrom(e.target.value)}
                          />
                          <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>
                            OTP emails will be sent from this address
                          </div>
                        </div>
                        <div className="field-wrap">
                          <div className="field-label"><span className="field-dot"></span>Sender Name</div>
                          <input 
                            className="auth-input" 
                            type="text" 
                            placeholder="CogniAuth"
                            value={editEmailSenderName}
                            onChange={(e) => setEditEmailSenderName(e.target.value)}
                          />
                          <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>
                            Display name for OTP emails
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                          <button 
                            className="auth-btn"
                            onClick={() => {
                              saveEmailConfig({
                                fromEmail: editEmailFrom,
                                senderName: editEmailSenderName
                              });
                              const updatedConfig = getEmailConfig();
                              setEmailConfigState(updatedConfig);
                              setShowEmailSettings(false);
                            }}
                            style={{ flex: 1 }}
                          >
                            Save Changes
                          </button>
                          <button 
                            className="auth-btn secondary"
                            onClick={() => {
                              setShowEmailSettings(false);
                              setEditEmailFrom(emailConfig?.fromEmail || 'cogniguard@example.com');
                              setEditEmailSenderName(emailConfig?.senderName || 'CogniAuth');
                            }}
                            style={{ flex: 1 }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
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
                              onChange={(e) => setCurrentPassword(e.target.value)}
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
                            disabled={!currentPassword || !newPassword || !confirmPassword || newPasswordErrors.length > 0 || (newPassword !== confirmPassword)}
                            style={{
                              flex: 1,
                              opacity: !currentPassword || !newPassword || !confirmPassword || newPasswordErrors.length > 0 || (newPassword !== confirmPassword) ? 0.5 : 1,
                              cursor: !currentPassword || !newPassword || !confirmPassword || newPasswordErrors.length > 0 || (newPassword !== confirmPassword) ? 'not-allowed' : 'pointer'
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

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
