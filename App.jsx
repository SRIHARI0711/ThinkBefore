import React, { useState, useEffect } from 'react';
import './styles.css';
import { analyzeDecision } from './mlModel.js';

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
  const [history, setHistory] = useState([]);
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showSignupPw, setShowSignupPw] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('light', !isDark);
  }, [isDark]);

  const handleSignIn = () => {
    if (email && password) {
      setUser({ email, nickname: email.split('@')[0], avatarColor: '#f0a500' });
      setPage('app');
      setView('dash');
    }
  };

  const handleSignUp = () => {
    if (email && nickname && password) {
      setUser({ email, nickname, avatarColor: color });
      setPage('app');
      setView('dash');
    }
  };

  const handleAnalyze = () => {
    if (!text.trim()) return;
    const analysis = analyzeDecision(text);
    setResult(analysis);
    setHistory([analysis, ...history]);
    setText('');
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
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh' }}>
      <div className="grid-bg"></div>
      <div className="glow-orb a"></div>
      <div className="glow-orb b"></div>

      <nav className="topbar">
        <a className="brand" href="#">
          <div className="brand-icon">CG</div>
          <div className="brand-name">CogniGuard</div>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {user && <div style={{ color: 'var(--text2)', fontSize: '14px', fontWeight: '500' }}>{user.nickname}</div>}
          <div 
            onClick={() => setIsDark(!isDark)} 
            className="theme-toggle"
            style={{ cursor: 'pointer' }}
            title="Toggle light / dark mode"
          >
            <div className="theme-toggle-thumb">{isDark ? '🌙' : '☀️'}</div>
            <div className="theme-toggle-icons"><span>🌙</span><span>☀️</span></div>
          </div>
        </div>
      </nav>

      {!user ? (
        <div className="page active">
          <div className="auth-page">
            <div className="auth-card">
              {step === 'welcome' && (
                <div className="auth-step active">
                  <div style={{ fontSize: '48px', marginBottom: '14px' }}>🧠</div>
                  <div className="auth-title">CogniGuard</div>
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
                    ◈ Local AI · Works offline · Private
                  </div>
                </div>
              )}

              {step === 'login-email' && (
                <div className="auth-step active">
                  <div style={{ fontSize: '48px', marginBottom: '14px' }}>🔑</div>
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
                  <div style={{ fontSize: '48px', marginBottom: '14px' }}>🔐</div>
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
                          fontSize: '18px',
                          padding: '0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title={showLoginPw ? 'Hide password' : 'Show password'}
                      >
                        {showLoginPw ? '👁‍🗨' : '👁'}
                      </button>
                    </div>
                  </div>
                  <button 
                    className="auth-btn" 
                    onClick={handleSignIn}
                  >
                    Sign In →
                  </button>
                  <button 
                    className="auth-btn secondary" 
                    onClick={() => setStep('login-email')}
                    style={{ marginTop: '8px' }}
                  >
                    ← Back
                  </button>
                </div>
              )}

              {step === 'signup-email' && (
                <div className="auth-step active">
                  <div style={{ fontSize: '48px', marginBottom: '14px' }}>📧</div>
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
                      onKeyPress={(e) => e.key === 'Enter' && setStep('signup-nick')}
                    />
                  </div>
                  <button 
                    className="auth-btn" 
                    onClick={() => setStep('signup-nick')}
                  >
                    Send Code →
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

              {step === 'signup-nick' && (
                <div className="auth-step active">
                  <div style={{ fontSize: '48px', marginBottom: '14px' }}>✨</div>
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
                  <div style={{ fontSize: '48px', marginBottom: '14px' }}>🛡</div>
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
                        onChange={(e) => setPassword(e.target.value)}
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
                          fontSize: '18px',
                          padding: '0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title={showSignupPw ? 'Hide password' : 'Show password'}
                      >
                        {showSignupPw ? '👁‍🗨' : '👁'}
                      </button>
                    </div>
                  </div>
                  <button 
                    className="auth-btn" 
                    onClick={handleSignUp}
                  >
                    Create Account →
                  </button>
                  <button 
                    className="auth-btn secondary" 
                    onClick={() => setStep('signup-nick')}
                    style={{ marginTop: '8px' }}
                  >
                    ← Back
                  </button>
                </div>
              )}
            </div>
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
                <span className="nav-icon">⊞</span> Dashboard
              </div>
              <div className="nav-sep"></div>
              <div 
                className={`nav-item ${view === 'history' ? 'active' : ''}`}
                onClick={() => setView('history')}
                style={{ cursor: 'pointer' }}
              >
                <span className="nav-icon">◫</span> Decision History
              </div>
              <div className="nav-sep"></div>
              <div 
                className={`nav-item ${view === 'analyzer' ? 'active' : ''}`}
                onClick={() => setView('analyzer')}
                style={{ cursor: 'pointer' }}
                title="Open the full impulse analyzer"
              >
                <span className="nav-icon">🧠</span> AI Analyzer
              </div>
              <div className="nav-sep"></div>
              <div 
                className={`nav-item ${view === 'profile' ? 'active' : ''}`}
                onClick={() => setView('profile')}
                style={{ cursor: 'pointer' }}
              >
                <span className="nav-icon">◎</span> My Profile
              </div>
              <div className="nav-sep"></div>
              <div 
                className="nav-item logout-item"
                onClick={handleLogout}
                style={{ cursor: 'pointer', color: 'var(--red)', fontWeight: '500' }}
                title="Sign out of your account"
              >
                <span className="nav-icon">→</span> Sign Out
              </div>
            </nav>
            <div className="main-area">
              {view === 'dash' && (
                <div className="dash-view active">
                  <div className="view-header">
                    <div className="view-title">Good day, {user.nickname}!</div>
                    <div className="view-sub">Here's an overview of your decision intelligence activity.</div>
                  </div>
                  <div className="stats-grid">
                    <div className="stat-card amber">
                      <div className="stat-val amber">{history.length}</div>
                      <div className="stat-lbl">Total Analyzed</div>
                    </div>
                    <div className="stat-card red">
                      <div className="stat-val red">{history.filter(h => h.predictedRisk === 'critical').length}</div>
                      <div className="stat-lbl">Interventions</div>
                    </div>
                    <div className="stat-card green">
                      <div className="stat-val green">{history.filter(h => h.predictedRisk === 'low').length}</div>
                      <div className="stat-lbl">Approved</div>
                    </div>
                    <div className="stat-card blue">
                      <div className="stat-val blue">0</div>
                      <div className="stat-lbl">Day Streak</div>
                    </div>
                  </div>
                  <div className="section-title">Quick Analysis</div>
                  <div className="decision-panel">
                    <textarea 
                      className="decision-quick-input" 
                      placeholder="Describe a decision you are about to make…" 
                      rows="3"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                    ></textarea>
                    <div className="decision-btn-row">
                      <button 
                        className="quick-analyze-btn"
                        onClick={handleAnalyze}
                        disabled={!text.trim()}
                      >
                        ⚡ Analyze →
                      </button>
                      <span style={{ fontSize: '12px', color: 'var(--text3)', fontFamily: "'DM Mono',monospace" }}>Local AI · No API key needed</span>
                    </div>
                    {result && (
                      <div className="quick-result" style={{ marginTop: '16px', padding: '16px', background: 'var(--bg2)', borderRadius: '12px' }}>
                        <div className="qr-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span 
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              background: result.predictedRisk === 'critical' ? 'var(--red)' : result.predictedRisk === 'high' ? 'var(--amber)' : result.predictedRisk === 'medium' ? 'var(--blue)' : 'var(--green)',
                              color: '#fff'
                            }}
                          >
                            {result.predictedRisk.toUpperCase()}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text1)' }}>
                            {result.severityScore}/98
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                          <div style={{ padding: '10px', borderRadius: '10px', background: 'var(--bg3)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px' }}>Behavior</div>
                            <div style={{ fontSize: '13px', color: 'var(--text1)', fontWeight: '600' }}>{result.behavior.replace('-', ' ').toUpperCase()}</div>
                          </div>
                          <div style={{ padding: '10px', borderRadius: '10px', background: 'var(--bg3)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px' }}>HARMFULNESS</div>
                            <div style={{ fontSize: '13px', color: 'var(--text1)', fontWeight: '600' }}>{result.harmfulnessScore}/98</div>
                          </div>
                          <div style={{ padding: '10px', borderRadius: '10px', background: 'var(--bg3)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px' }}>NEGATIVITY</div>
                            <div style={{ fontSize: '13px', color: 'var(--text1)', fontWeight: '600' }}>{result.negativityScore}/98</div>
                          </div>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'var(--bg3)', borderRadius: '3px', overflow: 'hidden', marginBottom: '12px' }}>
                          <div 
                            style={{
                              width: `${(result.severityScore / 98) * 100}%`,
                              height: '100%',
                              background: result.predictedRisk === 'critical' ? 'var(--red)' : result.predictedRisk === 'high' ? 'var(--amber)' : result.predictedRisk === 'medium' ? 'var(--blue)' : 'var(--green)',
                              transition: 'width 0.3s'
                            }}
                          ></div>
                        </div>
                        <p style={{ margin: '0', fontSize: '14px', color: 'var(--text2)' }}>
                          {result.intervention}
                        </p>
                        {result.consequences && (
                          <div style={{ marginTop: '14px', padding: '14px', borderRadius: '12px', background: 'rgba(232, 74, 111, 0.05)', border: '1px solid rgba(232, 74, 111, 0.15)' }}>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--red)', marginBottom: '10px' }}>Predicted Consequences</div>
                            <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text2)', fontSize: '13px', lineHeight: '1.7' }}>
                              {result.consequences.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="section-title" style={{ marginTop: '24px' }}>Recent Activity</div>
                  <div className="activity-feed">
                    {history.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-icon">🔍</div>
                        No decisions analyzed yet. Use the analyzer above to get started.
                      </div>
                    ) : (
                      history.slice(0, 5).map((item, idx) => (
                        <div 
                          key={idx}
                          style={{ 
                            padding: '12px 16px',
                            marginBottom: '8px',
                            borderLeft: '3px solid ' + (item.predictedRisk === 'critical' ? 'var(--red)' : item.predictedRisk === 'high' ? 'var(--amber)' : item.predictedRisk === 'medium' ? 'var(--blue)' : 'var(--green)'),
                            borderRadius: '8px',
                            background: 'var(--bg2)',
                            fontSize: '13px'
                          }}
                        >
                          <div style={{ fontWeight: '500', color: 'var(--text1)', marginBottom: '4px'}}>
                            "{item.text}"
                          </div>
                          <div style={{ color: 'var(--text3)', fontSize: '12px' }}>
                            {item.behavior.replace('-', ' ').charAt(0).toUpperCase() + item.behavior.replace('-', ' ').slice(1)} · Severity: {item.severityScore} · {item.predictedRisk.toUpperCase()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {view === 'history' && (
                <div className="history-view active" style={{ padding: '24px' }}>
                  <div className="view-header">
                    <div className="view-title">Decision History</div>
                    <div className="view-sub">All your analyzed decisions — view your complete record.</div>
                  </div>
                  <div style={{ marginTop: '24px' }}>
                    {history.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg2)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>◫</div>
                        <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text1)', marginBottom: '8px' }}>No decisions analyzed yet</div>
                        <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '24px' }}>Start analyzing your decisions from the Dashboard to build your complete decision history.</div>
                        <button 
                          className="auth-btn"
                          onClick={() => setView('dash')}
                          style={{ padding: '10px 20px', fontSize: '14px' }}
                        >
                          Go to Dashboard →
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'var(--bg2)', borderRadius: '8px' }}>
                          <div style={{ fontSize: '12px', color: 'var(--text3)', fontWeight: '500' }}>
                            📊 Total Decisions: <span style={{ color: 'var(--amber)', fontWeight: '700' }}>{history.length}</span>
                          </div>
                        </div>
                        {history.map((item, idx) => (
                          <div 
                            key={idx}
                            style={{ 
                              padding: '16px',
                              marginBottom: '12px',
                              border: '1px solid var(--border)',
                              borderRadius: '10px',
                              background: 'var(--bg2)',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg3)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg2)'}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                              <div style={{ flex: 1, marginRight: '16px' }}>
                                <div style={{ fontWeight: '600', color: 'var(--text1)', marginBottom: '6px', fontSize: '14px' }}>
                                  "{item.text}"
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
                                  Behavior: {item.behavior.replace('-', ' ').charAt(0).toUpperCase() + item.behavior.replace('-', ' ').slice(1)} · Severity: {item.severityScore}/98 · {item.timestamp}
                                </div>
                              </div>
                              <span 
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  background: item.predictedRisk === 'critical' ? 'var(--red)' : item.predictedRisk === 'high' ? 'var(--amber)' : item.predictedRisk === 'medium' ? 'var(--blue)' : 'var(--green)',
                                  color: '#fff',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {item.predictedRisk.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {view === 'profile' && (
                <div className="profile-view active" style={{ padding: '24px' }}>
                  <div className="view-header">
                    <div className="view-title">My Profile</div>
                    <div className="view-sub">Manage your identity and view your behavioral patterns.</div>
                  </div>
                  <div style={{ marginTop: '24px', padding: '24px', background: 'var(--bg2)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                      <div 
                        style={{ 
                          width: '80px', 
                          height: '80px', 
                          background: user.avatarColor,
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '32px',
                          fontWeight: '700',
                          color: '#fff'
                        }}
                      >
                        {user.nickname.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text1)' }}>{user.nickname}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text3)' }}>{user.email}</div>
                        <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                          <span style={{ padding: '4px 8px', fontSize: '11px', background: 'var(--amber)', color: '#000', borderRadius: '4px', fontWeight: '600' }}>⚡ Guardian</span>
                          <span style={{ padding: '4px 8px', fontSize: '11px', background: 'var(--green)', color: '#000', borderRadius: '4px', fontWeight: '600' }}>✓ Verified</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '24px', marginBottom: '24px' }}>
                      <div style={{ textAlign: 'center', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--amber)' }}>{history.length}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>Decisions</div>
                      </div>
                      <div style={{ textAlign: 'center', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--red)' }}>
                          {history.filter(h => h.predictedRisk === 'critical' || h.predictedRisk === 'high').length}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>Interventions</div>
                      </div>
                      <div style={{ textAlign: 'center', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--green)' }}>—</div>
                        <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>Member Since</div>
                      </div>
                    </div>
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                      <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.6' }}>
                        <p style={{ margin: '0 0 12px 0' }}>
                          <strong>Account Status:</strong> Active and verified ✓
                        </p>
                        <p style={{ margin: '0 0 12px 0' }}>
                          <strong>Profile Type:</strong> CogniGuard Guardian
                        </p>
                        <p style={{ margin: '0' }}>
                          <strong>All data is stored locally</strong> and encrypted for your privacy.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button 
                      className="auth-btn secondary" 
                      onClick={() => setView('dash')}
                      style={{ padding: '10px 24px' }}
                    >
                      ← Back to Dashboard
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

              {view === 'analyzer' && (
                <div className="analyzer-view active" style={{ padding: '24px' }}>
                  <div className="view-header">
                    <div className="view-title">AI Impulse Analyzer</div>
                    <div className="view-sub">Deep dive analysis of your decision impulses and behavioral patterns.</div>
                  </div>
                  <div style={{ marginTop: '24px' }}>
                    <div style={{ padding: '24px', background: 'var(--bg2)', borderRadius: '12px', marginBottom: '24px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text1)', marginBottom: '16px' }}>🧠 Analyze New Decision</div>
                      <textarea 
                        className="decision-quick-input" 
                        placeholder="Describe a decision you want to analyze in detail…" 
                        rows="5"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text1)', fontFamily: 'inherit', fontSize: '14px', marginBottom: '12px' }}
                      ></textarea>
                      <button 
                        className="quick-analyze-btn"
                        onClick={handleAnalyze}
                        disabled={!text.trim()}
                        style={{ padding: '10px 20px', fontSize: '14px' }}
                      >
                        ⚡ Analyze Decision →
                      </button>
                    </div>

                    {result && (
                      <div style={{ padding: '24px', background: 'var(--bg2)', borderRadius: '12px', marginBottom: '24px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                          <div style={{ padding: '16px', background: 'var(--bg3)', borderRadius: '8px', textAlign: 'center', borderLeft: '3px solid ' + (result.predictedRisk === 'critical' ? 'var(--red)' : result.predictedRisk === 'high' ? 'var(--amber)' : result.predictedRisk === 'medium' ? 'var(--blue)' : 'var(--green)') }}>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: result.predictedRisk === 'critical' ? 'var(--red)' : result.predictedRisk === 'high' ? 'var(--amber)' : result.predictedRisk === 'medium' ? 'var(--blue)' : 'var(--green)', marginBottom: '4px' }}>
                              {result.severityScore}/98
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: '600' }}>SEVERITY</div>
                          </div>
                          <div style={{ padding: '16px', background: 'var(--bg3)', borderRadius: '8px', textAlign: 'center', borderLeft: '3px solid var(--amber)' }}>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text1)', marginBottom: '4px' }}>
                              {result.domain.toUpperCase()}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: '600' }}>DOMAIN</div>
                          </div>
                          <div style={{ padding: '16px', background: 'var(--bg3)', borderRadius: '8px', textAlign: 'center', borderLeft: '3px solid var(--blue)' }}>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: result.predictedRisk === 'critical' ? 'var(--red)' : result.predictedRisk === 'high' ? 'var(--amber)' : result.predictedRisk === 'medium' ? 'var(--blue)' : 'var(--green)', marginBottom: '4px', textTransform: 'uppercase' }}>
                              {result.predictedRisk}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: '600' }}>RISK LEVEL</div>
                          </div>
                          <div style={{ padding: '16px', background: 'var(--bg3)', borderRadius: '8px', textAlign: 'center', borderLeft: '3px solid var(--green)' }}>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text1)', marginBottom: '4px' }}>
                              {result.timestamp.split(',')[0]}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: '600' }}>TIMESTAMP</div>
                          </div>
                        </div>
                        <div style={{ padding: '16px', background: 'var(--bg3)', borderRadius: '8px', borderLeft: '3px solid var(--amber)', marginBottom: '16px' }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text1)', marginBottom: '8px' }}>💡 Intervention Suggestion</div>
                          <div style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: '1.5' }}>
                            {result.intervention}
                          </div>
                        </div>
                        {result.consequences && (
                          <div style={{ padding: '16px', background: 'var(--bg3)', borderRadius: '8px', borderLeft: '3px solid var(--red)', marginBottom: '16px' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--red)', marginBottom: '12px' }}>
                              ⚠️ Potential Consequences ({result.consequenceSeverity})
                            </div>
                            <ul style={{ margin: '0', paddingLeft: '20px', color: 'var(--text2)', fontSize: '13px', lineHeight: '1.7' }}>
                              {result.consequences.map((consequence, idx) => (
                                <li key={idx} style={{ marginBottom: '8px' }}>
                                  {consequence}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
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
