// This file is deprecated - using React instead
// See App.jsx for all app logic

// ─────────────────────────────────────────
// STATE & USER DATABASE
// ─────────────────────────────────────────
const COLORS = [
  {hex:'#f0a500',label:'Amber'},{hex:'#e84545',label:'Red'},
  {hex:'#4a9eff',label:'Blue'},{hex:'#3ecf8e',label:'Green'},
  {hex:'#2ee0ca',label:'Teal'},{hex:'#c084fc',label:'Purple'},
  {hex:'#f97316',label:'Orange'},{hex:'#ec4899',label:'Pink'},
];

let state = {
  email:'',otp:'',otpExpiry:0,otpTimer:null,resetOtp:'',resetOtpExpiry:0,
  nickname:'',avatarColor:'#f0a500',joinDate:'',history:[],currentFilter:'all',
  isNewUser:false
};

// User DB stored as cg_users: { email: { nickname, avatarColor, joinDate, history, pwHash } }
function getUsers() {
  try { return JSON.parse(localStorage.getItem('cg_users')||'{}'); } catch(e){ return {}; }
}
function saveUsers(users) { localStorage.setItem('cg_users', JSON.stringify(users)); }
function userExists(email) { return !!getUsers()[email.toLowerCase()]; }

// Simple deterministic hash (not crypto — demo only)
function hashPw(pw) {
  let h = 0;
  for (let i = 0; i < pw.length; i++) { h = Math.imul(31, h) + pw.charCodeAt(i) | 0; }
  return 'cg_' + Math.abs(h).toString(36) + '_' + pw.length;
}

function loadState() {
  // Check if a session exists (auto-login)
  const sess = localStorage.getItem('cg_session');
  if (sess) {
    try {
      const s = JSON.parse(sess);
      const users = getUsers();
      const user = users[s.email];
      if (user) {
        state.email = s.email;
        state.nickname = user.nickname;
        state.avatarColor = user.avatarColor || '#f0a500';
        state.joinDate = user.joinDate;
        state.history = user.history || [];
        return 'app';
      }
    } catch(e) {}
  }
  return 'auth';
}

function saveState() {
  const users = getUsers();
  if (!users[state.email]) users[state.email] = {};
  users[state.email].nickname = state.nickname;
  users[state.email].avatarColor = state.avatarColor;
  users[state.email].joinDate = state.joinDate;
  users[state.email].history = state.history;
  if (users[state.email].pwHash) {} // preserve pw
  saveUsers(users);
  // Save session
  localStorage.setItem('cg_session', JSON.stringify({ email: state.email }));
}

function clearState() {
  localStorage.removeItem('cg_session');
  state = {
    email:'',otp:'',otpExpiry:0,otpTimer:null,resetOtp:'',resetOtpExpiry:0,
    nickname:'',avatarColor:'#f0a500',joinDate:'',history:[],currentFilter:'all',isNewUser:false
  };
}

// ─────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────
function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/[\s_-]/);
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0,2).toUpperCase();
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
  return Math.floor(diff/86400000) + 'd ago';
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
}

function genOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function toast(msg, type='success') {
  const el = document.getElementById('toast');
  el.textContent = (type === 'success' ? '✓ ' : '⚠ ') + msg;
  el.className = 'toast ' + type + ' show';
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ─────────────────────────────────────────
// TOPBAR + SIDEBAR RENDER
// ─────────────────────────────────────────
function renderTopbar() {
  const tr = document.getElementById('topbar-right');
  if (!tr) return;
  const av = initials(state.nickname);
  tr.innerHTML = `
    <div class="topbar-user-btn" onclick="switchView('profile',document.querySelector('[data-view=profile]'))">
      <div class="topbar-avatar" style="background:${state.avatarColor};color:#000">${av}</div>
      <span>${state.nickname}</span>
    </div>
    <button class="topbar-signout" onclick="signOut()">Sign out</button>
  `;
}

function renderSidebar() {
  // Nav is top-centered; user info is in the topbar
}

function updateAllAvatars() {
  const av = initials(state.nickname);
  const pva = document.getElementById('pv-avatar');
  if (pva) { pva.textContent = av; pva.style.background = state.avatarColor; pva.style.color = '#000'; }
  renderTopbar();
}


// ─────────────────────────────────────────
// VIEWS
// ─────────────────────────────────────────
function switchView(name, el) {
  document.querySelectorAll('.dash-view,.profile-view,.history-view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  if (el) el.classList.add('active');

  if (name === 'dash') renderDashboard();
  if (name === 'profile') renderProfile();
  if (name === 'history') renderHistory();
}

// ─────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────
function renderDashboard() {
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('dash-welcome').textContent = greet + ', ' + state.nickname + '!';

  const total = state.history.length;
  const blocked = state.history.filter(h=>['high','critical'].includes(h.risk_level)).length;
  const approved = state.history.filter(h=>h.risk_level==='low').length;
  document.getElementById('ds-total').textContent = total;
  document.getElementById('ds-blocked').textContent = blocked;
  document.getElementById('ds-approved').textContent = approved;
  document.getElementById('ds-streak').textContent = calcStreak();

  renderActivityFeed();
}

function calcStreak() {
  if (!state.history.length) return 0;
  const days = new Set(state.history.map(h => new Date(h.ts).toDateString()));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    if (days.has(d.toDateString())) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function renderActivityFeed() {
  const feed = document.getElementById('activity-feed');
  const recent = [...state.history].slice(0, 6);
  if (!recent.length) {
    feed.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div>No decisions analyzed yet. Use the analyzer above to get started.</div>';
    return;
  }
  feed.innerHTML = recent.map(h => `
    <div class="activity-item">
      <div class="act-dot ${h.risk_level}"></div>
      <div class="act-body">
        <div class="act-text">${h.decision}</div>
        <div class="act-meta">
          <span class="act-tag">${h.domain || 'general'}</span>
          <span class="act-tag">${h.intervention_type || 'analyzed'}</span>
          <span class="act-time">${timeAgo(h.ts)}</span>
        </div>
      </div>
      <span class="act-score ${h.risk_level}">${h.impulse_score}</span>
    </div>
  `).join('');
}

// ─────────────────────────────────────────
// QUICK ANALYZE (Dashboard)
// ─────────────────────────────────────────
async function quickAnalyze() {
  console.log('quickAnalyze called');
  const dec = document.getElementById('quick-dec').value.trim();
  if (!dec) return;
  const btn = document.getElementById('quick-btn');
  const qr = document.getElementById('quick-result');
  btn.disabled = true;
  btn.innerHTML = '<div class="qr-spin"></div> Analyzing…';
  btn.style.color = '#000';
  qr.classList.remove('show');

  // Analysis handled locally
  try {
    const parsed = await analyzeLocally(dec);

    // Render result
    const badge = document.getElementById('qr-badge');
    const score = document.getElementById('qr-score');
    const fill  = document.getElementById('qr-fill');
    const msg   = document.getElementById('qr-msg');
    badge.className   = 'qr-badge ' + parsed.risk_level;
    badge.textContent = parsed.risk_level.toUpperCase() + ' RISK';
    score.className   = 'qr-score ' + parsed.risk_level;
    score.textContent = parsed.impulse_score;
    msg.textContent   = parsed.intervention_message;
    qr.classList.add('show');
    setTimeout(() => { fill.className = 'qr-fill ' + parsed.risk_level; fill.style.width = parsed.impulse_score + '%'; }, 100);

    state.history.unshift({ id: Date.now(), ts: Date.now(), decision: dec, ...parsed });
    if (state.history.length > 100) state.history.pop();
    saveState();
    renderActivityFeed();
    renderDashStats();
    document.getElementById('quick-dec').value = '';
    toast('Analysis complete!');
  } catch(e) {
    toast('Analysis failed: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '⚡ Analyze →';
  }
}

function renderDashStats() {
  document.getElementById('ds-total').textContent = state.history.length;
  document.getElementById('ds-blocked').textContent = state.history.filter(h=>['high','critical'].includes(h.risk_level)).length;
  document.getElementById('ds-approved').textContent = state.history.filter(h=>h.risk_level==='low').length;
  document.getElementById('ds-streak').textContent = calcStreak();
}

// ─────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────
function renderProfile() {
  const av = initials(state.nickname);
  const pva = document.getElementById('pv-avatar');
  pva.textContent = av; pva.style.background = state.avatarColor; pva.style.color = '#000';
  document.getElementById('pv-name').textContent = state.nickname;
  document.getElementById('pv-email').textContent = state.email;
  document.getElementById('pv-decision-badge').textContent = state.history.length + ' decisions';
  document.getElementById('ps-total').textContent = state.history.length;
  document.getElementById('ps-interventions').textContent = state.history.filter(h=>['high','critical'].includes(h.risk_level)).length;
  document.getElementById('ps-joined').textContent = state.joinDate ? new Date(state.joinDate).toLocaleDateString('en-US',{month:'short',year:'numeric'}) : '—';
  document.getElementById('edit-nick').value = state.nickname;

  // Rebuild edit color picker
  buildColorPicker('edit-color-picker', (hex) => { updateAllAvatars(); renderProfile(); saveState(); });

  // Domain breakdown
  renderDomainBreakdown();
}

function renderDomainBreakdown() {
  const bars = document.getElementById('domain-bars');
  if (!state.history.length) {
    bars.innerHTML = '<div class="empty-state" style="padding:16px 0"><div class="empty-icon" style="font-size:20px">📊</div>Analyze more decisions to see domain patterns.</div>';
    return;
  }
  const counts = {};
  state.history.forEach(h => { counts[h.domain||'other'] = (counts[h.domain||'other']||0) + 1; });
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  const max = sorted[0][1];
  const domColors = {financial:'#f0a500',social:'#4a9eff',productivity:'#3ecf8e',health:'#e84545',relationship:'#c084fc',other:'#7a8699'};
  bars.innerHTML = sorted.map(([d,n]) => `
    <div class="domain-row">
      <span class="domain-name">${d}</span>
      <div class="domain-bar-wrap"><div class="domain-bar" style="width:${Math.round(n/max*100)}%;background:${domColors[d]||'#7a8699'}"></div></div>
      <span class="domain-pct">${Math.round(n/state.history.length*100)}%</span>
    </div>
  `).join('');
}

function toggleEdit() {
  const panel = document.getElementById('edit-panel');
  panel.classList.toggle('open');
}

function saveNick() {
  const val = document.getElementById('edit-nick').value.trim();
  if (!val || val.length < 3) { toast('Nickname too short', 'error'); return; }
  if (!/^[a-zA-Z0-9_\-. ]+$/.test(val)) { toast('Invalid characters in nickname', 'error'); return; }
  state.nickname = val;
  saveState();
  renderTopbar();
  renderSidebar();
  renderProfile();
  const panel = document.getElementById('edit-panel');
  panel.classList.remove('open');
  toast('Profile updated!');
}

// ─────────────────────────────────────────
// HISTORY
// ─────────────────────────────────────────
function renderHistory() {
  const table = document.getElementById('history-table');
  const filtered = state.currentFilter === 'all'
    ? state.history
    : state.history.filter(h => h.risk_level === state.currentFilter);

  if (!filtered.length) {
    table.innerHTML = '<div class="empty-state"><div class="empty-icon">◫</div>' + (state.history.length ? 'No decisions match this filter.' : 'No history yet. Start analyzing decisions from the dashboard.') + '</div>';
    return;
  }
  table.innerHTML = filtered.map(h => `
    <div class="hist-row" onclick="">
      <div class="hist-level-dot ${h.risk_level}"></div>
      <div class="hist-body">
        <div class="hist-decision">${h.decision}</div>
        <div class="hist-tags">
          <span class="hist-tag">${h.domain||'general'}</span>
          <span class="hist-tag">${h.sentiment||''}</span>
          ${(h.triggers||[]).slice(0,2).map(t=>`<span class="hist-tag">${t}</span>`).join('')}
        </div>
      </div>
      <div class="hist-right">
        <span class="hist-score ${h.risk_level}">${h.impulse_score}</span>
        <span class="hist-intervention ${h.intervention_type||''}">${(h.intervention_type||'').toUpperCase()}</span>
        <span class="hist-time">${timeAgo(h.ts)}</span>
      </div>
    </div>
  `).join('');
}

function filterHistory(f, el) {
  state.currentFilter = f;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderHistory();
}

// ─────────────────────────────────────────
// SIGN OUT
// ─────────────────────────────────────────
function confirmSignOut(btn) {
  if (btn.dataset.confirming) {
    signOut();
    return;
  }
  const orig = btn.textContent;
  btn.textContent = 'Confirm?';
  btn.dataset.confirming = '1';
  btn.style.borderColor = 'var(--red)';
  btn.style.color = 'var(--red)';
  setTimeout(() => {
    btn.textContent = orig;
    delete btn.dataset.confirming;
    btn.style.borderColor = '';
    btn.style.color = '';
  }, 2500);
}

function signOut() {
  clearState();
  document.getElementById('page-app').classList.remove('active');
  document.getElementById('page-auth').classList.add('active');
  document.getElementById('topbar-right').innerHTML = '';
  // Reset all auth fields
  ['email-input','nick-input','login-pw','setpw-input','confirmpw-input','resetpw-input'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  ['email-err','nick-err','login-pw-err','setpw-err','confirmpw-err','otp-err','rotp-err','resetpw-err'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = '';
  });
  clearOTPRow('sotp-'); clearOTPRow('fotp-');
  showStep('welcome','none',0);
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const dashNav = document.querySelector('[data-view="dash"]');
  if (dashNav) dashNav.classList.add('active');
  toast('Signed out successfully');
}

// ─────────────────────────────────────────
// OPEN COGNI ANALYZER (link to main app)
// ─────────────────────────────────────────
function openCogniGuard() {
  switchView('dash', document.querySelector('[data-view="dash"]'));
  setTimeout(() => {
    const el = document.getElementById('quick-dec');
    if (el) { el.focus(); el.scrollIntoView({behavior:'smooth',block:'center'}); }
  }, 200);
}

// ─────────────────────────────────────────
// AUTH: FLOW CONFIG + STEP BAR
// ─────────────────────────────────────────
const FLOW_STEPS = {
  none:   [],
  login:  ['login-email','login-pw'],
  forgot: ['login-email','login-pw','forgot-otp','forgot-newpw'],
  signup: ['signup-email','signup-otp','signup-nick','signup-pw'],
};
let currentFlow = 'none';

function renderStepBar(flow, activeIndex) {
  const steps = FLOW_STEPS[flow] || [];
  const bar = document.getElementById('step-bar');
  if (!bar) return;
  if (!steps.length) { bar.innerHTML = ''; return; }
  bar.innerHTML = steps.map((_,i) => {
    const done = i < activeIndex, active = i === activeIndex;
    return '<div class="step-pip ' + (done?'done':'') + ' ' + (active?'active':'') + '"></div>';
  }).join('');
}

function showStep(stepId, flow, idx) {
  document.querySelectorAll('.auth-step').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('step-' + stepId);
  if (el) el.classList.add('active');
  currentFlow = flow;
  renderStepBar(flow, idx);
}

function startFlow(type) {
  console.log('startFlow called with type:', type);
  alert('Button clicked! Type: ' + type); // Temporary debug alert
  if (type === 'login') {
    clearField('login-email'); clearErr('login-email-err');
    showStep('login-email', 'login', 0);
    setTimeout(() => { const e=document.getElementById('login-email'); if(e) e.focus(); }, 100);
  } else {
    clearField('signup-email'); clearErr('signup-email-err');
    showStep('signup-email', 'signup', 0);
    setTimeout(() => { const e=document.getElementById('signup-email'); if(e) e.focus(); }, 100);
  }
}

function clearField(id) { const e=document.getElementById(id); if(e) e.value=''; }
function clearErr(id)   { const e=document.getElementById(id); if(e) e.textContent=''; }

// ─────────────────────────────────────────
// PASSWORD HELPERS
// ─────────────────────────────────────────
function pwRules(pw) {
  return { len: pw.length>=8, upper: /[A-Z]/.test(pw), special: /[^a-zA-Z0-9]/.test(pw) };
}
function pwValid(pw) { const r=pwRules(pw); return r.len&&r.upper&&r.special; }

function checkStrength(pw, prefix) {
  const r=pwRules(pw);
  const score=[r.len,r.upper,r.special,pw.length>=12].filter(Boolean).length;
  const colors=['#e84545','#f0a500','#f5c04a','#3ecf8e'];
  const labels=['Weak','Fair','Good','Strong'];
  for(let i=0;i<4;i++){
    const seg=document.getElementById(prefix+'-seg-'+i);
    if(seg) seg.style.background = i<score ? colors[score-1] : 'var(--bg3)';
  }
  const lbl=document.getElementById(prefix+'-strength-label');
  if(lbl){ lbl.textContent=pw.length===0?'Enter a password':labels[score-1]||'Weak'; lbl.style.color=pw.length===0?'var(--text3)':colors[score-1]; }
  const ruleText={ len:'8+ characters', upper:'At least one uppercase letter (A-Z)', special:'At least one special character (!@#$...)' };
  Object.entries({len:prefix+'-rule-len',upper:prefix+'-rule-upper',special:prefix+'-rule-special'}).forEach(([key,elId])=>{
    const el=document.getElementById(elId); if(!el) return;
    const passed=r[key];
    el.className='rule '+(pw.length===0?'':passed?'pass':'fail');
    el.textContent=(pw.length===0?'x':passed?'v':'x')+' '+ruleText[key];
  });
}

function togglePw(inputId, btn) {
  const inp=document.getElementById(inputId); if(!inp) return;
  const isText=inp.type==='text'; inp.type=isText?'password':'text';
  btn.textContent=isText?'O':'X';
}

// ─────────────────────────────────────────
// OTP BOXES
// ─────────────────────────────────────────
function setupOTPBoxes() {
  [['sotp-',6,function(){verifySignupOTP();}],
   ['fotp-',6,function(){verifyForgotOTP();}]
  ].forEach(function(item){
    var prefix=item[0], count=item[1], onDone=item[2];
    for(var i=0;i<count;i++){
      (function(idx){
        var box=document.getElementById(prefix+idx); if(!box) return;
        box.addEventListener('input',function(e){
          var v=e.target.value.replace(/[^0-9]/g,''); e.target.value=v;
          if(v){ e.target.classList.add('filled');
            if(idx<count-1) document.getElementById(prefix+(idx+1)).focus();
            var code=''; for(var j=0;j<count;j++) code+=(document.getElementById(prefix+j)||{value:''}).value;
            if(code.length===count) onDone();
          } else e.target.classList.remove('filled');
        });
        box.addEventListener('keydown',function(e){
          if(e.key==='Backspace'&&!e.target.value&&idx>0) document.getElementById(prefix+(idx-1)).focus();
        });
        box.addEventListener('paste',function(e){
          e.preventDefault();
          var paste=((e.clipboardData||window.clipboardData).getData('text')).replace(/[^0-9]/g,'').slice(0,count);
          for(var j=0;j<paste.length;j++){var b=document.getElementById(prefix+j);if(b){b.value=paste[j];b.classList.add('filled');}}
          if(paste.length===count) onDone();
          else { var b2=document.getElementById(prefix+Math.min(paste.length,count-1)); if(b2) b2.focus(); }
        });
      })(i);
    }
  });
}

function clearOTPRow(prefix,count){
  count=count||6;
  for(var i=0;i<count;i++){var b=document.getElementById(prefix+i);if(b){b.value='';b.classList.remove('filled','err');}}
}
function shakeOTPRow(prefix,count){
  count=count||6;
  for(var i=0;i<count;i++){var b=document.getElementById(prefix+i);if(b){b.classList.add('err');setTimeout(function(){b.classList.remove('err');},500);}}
}
function getOTPVal(prefix,count){
  count=count||6; var v='';
  for(var i=0;i<count;i++) v+=(document.getElementById(prefix+i)||{value:''}).value;
  return v;
}
function startTimer(timerEl,resendBtn,expiryFn){
  clearInterval(state.otpTimer); if(resendBtn) resendBtn.disabled=true;
  state.otpTimer=setInterval(function(){
    var left=expiryFn()-Date.now();
    if(left<=0){clearInterval(state.otpTimer);if(timerEl){timerEl.textContent='Code expired';timerEl.classList.add('expiring');}if(resendBtn) resendBtn.disabled=false;return;}
    var m=Math.floor(left/60000),s=Math.floor((left%60000)/1000);
    if(timerEl) timerEl.textContent='[ '+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+' ]';
    if(left<60000&&timerEl) timerEl.classList.add('expiring');
  },500);
}

// ─────────────────────────────────────────
// LOGIN FLOW
// ─────────────────────────────────────────
function submitLoginEmail() {
  var val=document.getElementById('login-email').value.trim().toLowerCase();
  var err=document.getElementById('login-email-err'); err.textContent='';
  if(!val){err.textContent='Email is required';return;}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)){err.textContent='Enter a valid email';return;}
  var btn=document.getElementById('login-email-btn'); btn.disabled=true; btn.innerHTML='<div class="btn-spin"></div> Checking...';
  setTimeout(function(){
    if(!userExists(val)){err.textContent='No account found. Please sign up.';btn.disabled=false;btn.innerHTML='Continue';return;}
    state.email=val;
    document.getElementById('login-as-email').textContent=val;
    clearField('login-pw');clearField('login-confirmpw');clearErr('login-pw-err');clearErr('login-confirmpw-err');
    showStep('login-pw','login',1);
    setTimeout(function(){document.getElementById('login-pw').focus();},100);
    btn.disabled=false;btn.innerHTML='Continue';
  },500);
}

function submitLogin() {
  var pw=document.getElementById('login-pw').value;
  var cpw=document.getElementById('login-confirmpw').value;
  var pwErr=document.getElementById('login-pw-err');
  var cpwErr=document.getElementById('login-confirmpw-err');
  pwErr.textContent='';cpwErr.textContent='';
  if(!pw){pwErr.textContent='Enter your password';return;}
  if(!cpw){cpwErr.textContent='Please confirm your password';return;}
  if(pw!==cpw){cpwErr.textContent='Passwords do not match';return;}
  var btn=document.getElementById('login-pw-btn');btn.disabled=true;btn.innerHTML='<div class="btn-spin"></div> Signing in...';
  setTimeout(function(){
    var users=getUsers();var user=users[state.email];
    if(!user||user.pwHash!==hashPw(pw)){
      pwErr.textContent='Incorrect password';
      var inp=document.getElementById('login-pw');inp.classList.add('err');
      setTimeout(function(){inp.classList.remove('err');},800);
      btn.disabled=false;btn.innerHTML='Sign In';return;
    }
    state.nickname=user.nickname;state.avatarColor=user.avatarColor||'#f0a500';
    state.joinDate=user.joinDate;state.history=user.history||[];
    saveState();enterApp();btn.disabled=false;btn.innerHTML='Sign In';
  },600);
}

// ─────────────────────────────────────────
// FORGOT PASSWORD FLOW
// ─────────────────────────────────────────
function startForgot() {
  state.forgotOtp=genOTP();state.forgotOtpExpiry=Date.now()+10*60*1000;
  document.getElementById('forgot-otp-code').textContent=state.forgotOtp;
  document.getElementById('forgot-email-label').textContent=state.email;
  clearOTPRow('fotp-');clearErr('fotp-err');clearErr('forgot-newpw-err');clearErr('forgot-confirmpw-err');
  clearField('forgot-newpw');clearField('forgot-confirmpw');checkStrength('','f');
  showStep('forgot-otp','forgot',2);
  setTimeout(function(){document.getElementById('fotp-0').focus();},100);
  var timerEl=document.getElementById('forgot-timer');if(timerEl) timerEl.classList.remove('expiring');
  startTimer(timerEl,document.getElementById('forgot-resend-btn'),function(){return state.forgotOtpExpiry;});
  toast('Reset code generated!');
}

function resendForgotOTP() {
  state.forgotOtp=genOTP();state.forgotOtpExpiry=Date.now()+10*60*1000;
  document.getElementById('forgot-otp-code').textContent=state.forgotOtp;
  clearOTPRow('fotp-');clearErr('fotp-err');
  var timerEl=document.getElementById('forgot-timer');if(timerEl) timerEl.classList.remove('expiring');
  startTimer(timerEl,document.getElementById('forgot-resend-btn'),function(){return state.forgotOtpExpiry;});
  toast('New reset code sent!');
}

function verifyForgotOTP() {
  var entered=getOTPVal('fotp-');var err=document.getElementById('fotp-err');err.textContent='';
  if(entered.length<6){err.textContent='Enter all 6 digits';return;}
  if(Date.now()>state.forgotOtpExpiry){err.textContent='Code expired - resend it';return;}
  var btn=document.getElementById('fotp-btn');btn.disabled=true;btn.innerHTML='<div class="btn-spin"></div> Verifying...';
  setTimeout(function(){
    if(entered===state.forgotOtp){
      clearInterval(state.otpTimer);
      showStep('forgot-newpw','forgot',3);
      setTimeout(function(){document.getElementById('forgot-newpw').focus();},100);
    } else {err.textContent='Incorrect code';shakeOTPRow('fotp-');}
    btn.disabled=false;btn.innerHTML='Verify Code';
  },600);
}

function submitForgotNewPw() {
  var pw=document.getElementById('forgot-newpw').value;
  var cpw=document.getElementById('forgot-confirmpw').value;
  var pwErr=document.getElementById('forgot-newpw-err');
  var cpwErr=document.getElementById('forgot-confirmpw-err');
  pwErr.textContent='';cpwErr.textContent='';
  if(!pwValid(pw)){pwErr.textContent='Password does not meet all requirements';return;}
  if(pw!==cpw){cpwErr.textContent='Passwords do not match';return;}
  var btn=document.getElementById('forgot-newpw-btn');btn.disabled=true;btn.innerHTML='<div class="btn-spin"></div> Saving...';
  setTimeout(function(){
    var users=getUsers();
    if(users[state.email]){users[state.email].pwHash=hashPw(pw);saveUsers(users);
      var u=users[state.email];
      state.nickname=u.nickname;state.avatarColor=u.avatarColor||'#f0a500';
      state.joinDate=u.joinDate;state.history=u.history||[];
      saveState();enterApp();toast('Password reset! Welcome back.');
    }
    btn.disabled=false;btn.innerHTML='Reset & Sign In';
  },600);
}

// ─────────────────────────────────────────
// SIGNUP FLOW
// ─────────────────────────────────────────
function submitSignupEmail() {
  var val=document.getElementById('signup-email').value.trim().toLowerCase();
  var err=document.getElementById('signup-email-err');err.textContent='';
  if(!val){err.textContent='Email is required';return;}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)){err.textContent='Enter a valid email';return;}
  var btn=document.getElementById('signup-email-btn');btn.disabled=true;btn.innerHTML='<div class="btn-spin"></div> Sending...';
  setTimeout(function(){
    if(userExists(val)){err.textContent='Account already exists. Please sign in.';btn.disabled=false;btn.innerHTML='Send Code';return;}
    state.email=val;state.signupOtp=genOTP();state.signupOtpExpiry=Date.now()+10*60*1000;
    document.getElementById('signup-otp-code').textContent=state.signupOtp;
    document.getElementById('signup-otp-email').textContent=val;
    clearOTPRow('sotp-');clearErr('sotp-err');
    showStep('signup-otp','signup',1);
    setTimeout(function(){document.getElementById('sotp-0').focus();},100);
    var timerEl=document.getElementById('signup-timer');if(timerEl) timerEl.classList.remove('expiring');
    startTimer(timerEl,document.getElementById('signup-resend-btn'),function(){return state.signupOtpExpiry;});
    toast('Verification code generated!');btn.disabled=false;btn.innerHTML='Send Code';
  },700);
}

function resendSignupOTP() {
  state.signupOtp=genOTP();state.signupOtpExpiry=Date.now()+10*60*1000;
  document.getElementById('signup-otp-code').textContent=state.signupOtp;
  clearOTPRow('sotp-');clearErr('sotp-err');
  var timerEl=document.getElementById('signup-timer');if(timerEl) timerEl.classList.remove('expiring');
  startTimer(timerEl,document.getElementById('signup-resend-btn'),function(){return state.signupOtpExpiry;});
  toast('New code generated!');
}

function verifySignupOTP() {
  var entered=getOTPVal('sotp-');var err=document.getElementById('sotp-err');err.textContent='';
  if(entered.length<6){err.textContent='Enter all 6 digits';return;}
  if(Date.now()>state.signupOtpExpiry){err.textContent='Code expired';return;}
  var btn=document.getElementById('sotp-btn');btn.disabled=true;btn.innerHTML='<div class="btn-spin"></div> Verifying...';
  setTimeout(function(){
    if(entered===state.signupOtp){
      clearInterval(state.otpTimer);showStep('signup-nick','signup',2);
      buildColorPicker('color-picker',updateNickPreview);updateNickPreview();
      setTimeout(function(){document.getElementById('nick-input').focus();},100);
    } else {err.textContent='Incorrect code';shakeOTPRow('sotp-');}
    btn.disabled=false;btn.innerHTML='Verify';
  },700);
}

function updateNickPreview() {
  var val=document.getElementById('nick-input').value;
  var av=document.getElementById('nick-avatar-preview');
  var nl=document.getElementById('nick-name-live');
  if(av){av.textContent=val?initials(val):'?';av.style.background=state.avatarColor;av.style.color='#000';}
  if(nl) nl.textContent=val||'Your nickname';
}

function submitNick() {
  var val=document.getElementById('nick-input').value.trim();
  var err=document.getElementById('nick-err');err.textContent='';
  if(!val){err.textContent='Nickname is required';return;}
  if(val.length<3){err.textContent='Must be at least 3 characters';return;}
  if(!/^[a-zA-Z0-9_\-. ]+$/.test(val)){err.textContent='Only letters, numbers, spaces, _ - . allowed';return;}
  state.nickname=val;
  clearField('setpw-input');clearField('confirmpw-input');clearErr('setpw-err');clearErr('confirmpw-err');
  checkStrength('','s');showStep('signup-pw','signup',3);
  setTimeout(function(){document.getElementById('setpw-input').focus();},100);
}

function submitSetPassword() {
  var pw=document.getElementById('setpw-input').value;
  var cpw=document.getElementById('confirmpw-input').value;
  var pwErr=document.getElementById('setpw-err');var cpwErr=document.getElementById('confirmpw-err');
  pwErr.textContent='';cpwErr.textContent='';
  if(!pwValid(pw)){pwErr.textContent='Password does not meet all requirements';return;}
  if(pw!==cpw){cpwErr.textContent='Passwords do not match';return;}
  var btn=document.getElementById('setpw-btn');btn.disabled=true;btn.innerHTML='<div class="btn-spin"></div> Creating account...';
  setTimeout(function(){
    state.joinDate=Date.now();var users=getUsers();
    users[state.email]={nickname:state.nickname,avatarColor:state.avatarColor,joinDate:state.joinDate,history:[],pwHash:hashPw(pw)};
    saveUsers(users);saveState();enterApp();btn.disabled=false;btn.innerHTML='Create Account';
  },600);
}

// ─────────────────────────────────────────
// ENTER APP
// ─────────────────────────────────────────
function enterApp() {
  document.getElementById('page-auth').classList.remove('active');
  document.getElementById('page-app').classList.add('active');
  renderTopbar();renderSidebar();renderDashboard();
  buildColorPicker('edit-color-picker',function(hex){updateAllAvatars();saveState();});
  toast('Welcome, '+state.nickname+'!');
}

function buildColorPicker(containerId, onSelect) {
  var c=document.getElementById(containerId); if(!c) return;
  c.innerHTML='';
  COLORS.forEach(function(col){
    var sw=document.createElement('div');
    sw.className='color-swatch'+(col.hex===state.avatarColor?' selected':'');
    sw.style.background=col.hex; sw.title=col.label;
    sw.onclick=function(){
      state.avatarColor=col.hex;
      document.querySelectorAll('#'+containerId+' .color-swatch').forEach(function(s){s.classList.remove('selected');});
      sw.classList.add('selected'); onSelect(col.hex);
    };
    c.appendChild(sw);
  });
}

function goBack() { showStep('welcome','none',0); }


// ═══════════════════════════════════════════════════════
// LOCAL AI ENGINE — No API key required
// Rule-based NLP + behavioral scoring system
// ═══════════════════════════════════════════════════════

const _AI = (() => {

  // ── Keyword dictionaries ──────────────────────────────
  const DOMAINS = {
    financial:    ['buy','purchase','spend','order','pay','afford','price','cost','sale','deal','cheap','expensive','credit','loan','invest','money','dollars','$','₹','£','€','shopping','cart','checkout'],
    social:       ['text','message','send','reply','post','tweet','email','call','dm','chat','say','tell','write','respond','comment','inbox'],
    relationship: ['ex','boyfriend','girlfriend','partner','husband','wife','date','love','miss','breakup','divorce','relationship','feelings'],
    productivity: ['work','job','task','meeting','deadline','project','boss','manager','office','skip','avoid','procrastinat','study','homework','assignment'],
    health:       ['eat','food','drink','smoke','gym','exercise','diet','sleep','calories','junk','pizza','burger','alcohol','beer','wine'],
    other:        []
  };

  const URGENCY_WORDS   = ['right now','immediately','now','asap','today','tonight','this moment',"can't wait",'hurry','urgent','instantly','quick'];
  const REGRET_WORDS    = ['maybe','might regret','not sure','unsure','thinking about','wondering','should i','what if','probably'];
  const IMPULSE_WORDS   = ['just do it','screw it','forget it','whatever',"don't care",'yolo','why not','going to','gonna','about to','want to right now'];
  const ANGER_WORDS     = ['angry','furious','mad','pissed','hate','frustrated','annoyed','fed up','rage','sick of'];
  const SAD_WORDS       = ['sad','depressed','lonely','miss','heartbroken','crying','down','low','empty','hopeless'];
  const EXCITED_WORDS   = ['excited','amazing','awesome',"can't wait",'so good','love it','perfect','great deal','limited time','only today'];
  const STRESS_WORDS    = ['stressed','overwhelmed','exhausted','tired','burned out','pressure',"can't cope",'too much'];
  const LATE_INDICATORS = ['midnight','late night','3am','2am','1am','4am',"can't sleep",'insomnia'];
  const FEAR_WORDS      = ['fomo','fear of missing out','everyone else','limited','last chance','expires','selling out','only a few left'];

  // Consequence severity indicators
  const SEVERE_CONSEQUENCES = {
    financial: ['bankrupt','debt','lose money','financial ruin','can\'t afford','homeless','eviction','foreclosure','lawsuit','legal action','court','arrest','jail','prison','criminal','felony'],
    health: ['die','death','kill','suicide','overdose','addiction','hospital','emergency','injury','accident','disease','illness','cancer','heart attack','stroke','coma','disabled','paralyzed'],
    relationship: ['divorce','break up','lose partner','cheat','affair','abuse','violence','fight','argument','hate me','leave me','abandon','betray','ghost','block','unfriend','family issues','estranged'],
    career: ['fired','lose job','quit','resign','unemployed','laid off','termination','discipline','warning','reprimand','demotion','transfer','reputation','scandal','embarrassment','humiliation'],
    social: ['embarrass','humiliate','shame','ridicule','bully','harass','stalk','threaten','intimidate','blackmail','expose','reveal secret','betray trust','lie','deceive'],
    long_term: ['permanent','forever','irreversible','can\'t undo','regret forever','ruin life','destroy','end everything','never recover','scarred','traumatized','ptsd','therapy','counseling']
  };

  const INTERVENTIONS = {
    financial: {
      delay:   ["Pause before buying — wait 24 hours and see if you still want it as much.",
                "The '24-hour rule' is your best friend here: if you still want it tomorrow, it's probably worth it.",
                "Try writing down 3 things you could do with that money instead. Then decide."],
      reflect: ["Ask yourself: is this a want or a need? Would you buy it at full price?",
                "Imagine explaining this purchase to your future self 3 months from now.",
                "Check your last 5 purchases — do you still use all of them?"],
      warn:    ["High financial impulse detected. This decision pattern often leads to buyer's remorse.",
                "Urgency in sales is a marketing tactic. The deal is rarely as time-sensitive as it seems.",
                "Consider: does this purchase align with your financial goals this month?"],
    },
    social: {
      delay:   ["Don't send that message yet — write it out, save it as a draft, and revisit in an hour.",
                "A message sent in emotion is hard to unsend. Give yourself 30 minutes first.",
                "Sleep on it. Morning-you will often have a clearer head than right-now-you."],
      reflect: ["Would you say this out loud to their face, right now? If not, reconsider.",
                "What outcome are you hoping for from this message? Is sending it likely to get you there?",
                "Think about how this will read to the other person — not how it feels to write."],
      warn:    ["Sending emotionally charged messages often escalates conflicts rather than resolving them.",
                "High emotional state detected. This is a common time to say things we later regret.",
                "Strong impulse to communicate detected. Give it 60 minutes before sending."],
    },
    relationship: {
      delay:   ["Don't reach out when emotions are running high. Give yourself at least a few hours.",
                "Missing someone is real, but acting on that impulse often complicates things. Wait it out.",
                "Write what you want to say in a note first — you don't have to send it."],
      reflect: ["What changed? If the reason you separated still exists, reaching out may not help.",
                "Think about what you actually want from this interaction — closure, connection, or something else?",
                "Is this feeling coming from genuine care, or from loneliness in this moment?"],
      warn:    ["Relationship decisions made late at night or in emotional peaks have a high regret rate.",
                "Reconnecting impulsively often reopens wounds rather than healing them.",
                "High emotional charge detected around this relationship decision. Slow down."],
    },
    productivity: {
      delay:   ["Avoidance feels good now but adds stress later. Try working for just 10 minutes first.",
                "Break the task into one tiny first step — just that, nothing more.",
                "Set a 25-minute timer. If you still want to stop after, you can — but often you won't."],
      reflect: ["What's the real reason you're avoiding this? Boredom, fear, or something else?",
                "What's the cost of not doing this today? Is that cost acceptable?",
                "Future-you has to deal with whatever current-you avoids. Is that fair to them?"],
      warn:    ["Repeated task avoidance compounds into larger stress. The longer you wait, the harder it gets.",
                "Quitting a job after a single bad day has a very high regret rate.",
                "Strong productivity avoidance signal detected. This is worth examining."],
    },
    health: {
      delay:   ["Wait 20 minutes — cravings usually peak and then fade on their own.",
                "Drink a glass of water first, then reassess how hungry or craving-y you actually feel.",
                "Try substituting with something lower-impact and see if it scratches the itch."],
      reflect: ["Is this hunger, boredom, stress, or habit? They all feel the same in the moment.",
                "How will you feel in 2 hours after making this choice?",
                "What does your body actually need right now — food, rest, or something else?"],
      warn:    ["Impulse eating/drinking under stress is a common coping pattern with diminishing returns.",
                "This choice pattern detected repeatedly can undermine long-term health goals.",
                "Consider: is this choice aligned with how you want to treat your body?"],
    },
    other: {
      delay:   ["Pause for 10 minutes before acting. Most impulses lose 50% of their intensity quickly.",
                "Ask yourself: will this matter in a week? A month? A year?",
                "Sleep on it if you can — night-time impulses rarely feel as urgent by morning."],
      reflect: ["What's driving this feeling right now? Is it the situation, or your emotional state?",
                "What's the worst realistic outcome of acting on this? Are you okay with that?",
                "What would a calm, rested version of you decide?"],
      warn:    ["Elevated impulse signal detected. Take a moment before committing.",
                "High urgency feelings are often temporary. The decision, less so.",
                "Consider what you'd advise a close friend in the same situation."],
    }
  };

  const ALTERNATIVES = {
    financial:    ["Make a wishlist instead of buying — revisit in 72 hours","Look for second-hand or refurbished alternatives","Set a savings goal for it instead of impulse buying","Compare 3 similar products before deciding"],
    social:       ["Write the message in notes first, don't send yet","Call a trusted friend to talk it through instead","Wait 1 hour then re-read what you drafted","Express your feelings in a journal instead"],
    relationship: ["Journal your feelings instead of acting on them","Talk to a friend about how you're feeling","Focus on self-care for the next few hours","Give yourself a concrete 'decide by' date — not right now"],
    productivity: ["Start with just 5 minutes of the task","Tackle one micro-step instead of the whole thing","Take a 10-min break then reassess","Reorganize your task list and pick the easiest item first"],
    health:       ["Drink water and wait 15 minutes first","Go for a 5-minute walk to reset","Prepare a healthier alternative","Address the underlying emotion — boredom, stress, loneliness"],
    other:        ["Write down pros and cons before deciding","Discuss it with someone you trust","Set a timer — decide when it goes off, not right now","Sleep on it and decide fresh tomorrow"],
  };

  // ── Helpers ───────────────────────────────────────────
  const low = t => t.toLowerCase();
  const has = (text, words) => words.some(w => low(text).includes(w));
  const score = (text, words) => words.filter(w => low(text).includes(w)).length;

  function detectDomain(text) {
    let best = 'other', bestScore = 0;
    for (const [domain, words] of Object.entries(DOMAINS)) {
      const s = score(text, words);
      if (s > bestScore) { bestScore = s; best = domain; }
    }
    return best;
  }

  function detectSentiment(text) {
    if (has(text, ANGER_WORDS))   return 'angry';
    if (has(text, SAD_WORDS))     return 'sad';
    if (has(text, EXCITED_WORDS)) return 'excited';
    if (has(text, STRESS_WORDS))  return 'stressed';
    if (has(text, FEAR_WORDS))    return 'anxious';
    if (has(text, LATE_INDICATORS)) return 'tired';
    return 'neutral';
  }

  function scoreImpulse(text) {
    let pts = 0;
    const t = low(text);
    // Urgency signals
    pts += score(text, URGENCY_WORDS)   * 12;
    // Raw impulse phrases
    pts += score(text, IMPULSE_WORDS)   * 10;
    // Emotional charge
    pts += score(text, ANGER_WORDS)     * 9;
    pts += score(text, EXCITED_WORDS)   * 7;
    pts += score(text, FEAR_WORDS)      * 8;
    pts += score(text, SAD_WORDS)       * 6;
    pts += score(text, STRESS_WORDS)    * 6;
    pts += score(text, LATE_INDICATORS) * 8;
    // Regret qualifiers reduce score slightly
    pts -= score(text, REGRET_WORDS)    * 5;

    // Severe consequences analysis - significantly increases risk
    let consequenceScore = 0;
    for (const [category, words] of Object.entries(SEVERE_CONSEQUENCES)) {
      const count = score(text, words);
      if (count > 0) {
        // Weight consequences by severity
        const weight = category === 'health' ? 25 :
                      category === 'financial' ? 20 :
                      category === 'relationship' ? 18 :
                      category === 'career' ? 15 :
                      category === 'social' ? 12 : 10;
        consequenceScore += count * weight;
      }
    }
    pts += consequenceScore;

    // Word count proxy for emotional elaboration
    const words = text.trim().split(/\s+/).length;
    if (words > 20) pts += 5;
    // Caps intensity (shouting = impulse)
    const capsRatio = (text.match(/[A-Z]/g)||[]).length / Math.max(text.length, 1);
    if (capsRatio > 0.3) pts += 10;
    // Punctuation intensity
    const puncts = (text.match(/[!?]/g)||[]).length;
    pts += Math.min(puncts * 4, 16);
    return Math.max(5, Math.min(98, pts));
  }

  function getRiskLevel(score) {
    if (score >= 76) return 'critical';
    if (score >= 51) return 'high';
    if (score >= 26) return 'medium';
    return 'low';
  }

  function getInterventionType(score, domain, sentiment) {
    if (score < 26) return 'approve';
    if (score >= 76) return 'warn';
    if (['angry','sad'].includes(sentiment)) return 'reflect';
    if (score >= 51) return 'delay';
    return 'reflect';
  }

  function buildIntentSummary(text, domain) {
    const t = text.trim();
    const first = t.charAt(0).toUpperCase() + t.slice(1);
    const truncated = first.length > 80 ? first.slice(0, 80) + '…' : first;
    return `User intends to: ${truncated.replace(/^I (want to|am going to|will|'m going to)/i, '').trim()}.`;
  }

  function buildIntervention(type, domain, sentiment, score) {
    const pool = INTERVENTIONS[domain] || INTERVENTIONS.other;
    const msgs = pool[type === 'approve' ? 'reflect' : type === 'warn' ? 'warn' : type] || pool.reflect;
    const msg = msgs[Math.floor(Math.random() * msgs.length)];
    if (type === 'approve') return "This seems like a considered decision. Proceed thoughtfully, but trust your judgment here.";
    return msg;
  }

  function buildReasoning(score, domain, sentiment, impulseWords, urgencyWords, consequenceScore) {
    const level = getRiskLevel(score);
    const parts = [];
    if (urgencyWords > 0) parts.push(`urgency language detected (${urgencyWords} signal${urgencyWords>1?'s':''})`);
    if (['angry','stressed','excited'].includes(sentiment)) parts.push(`elevated emotional state (${sentiment})`);
    if (impulseWords > 0) parts.push(`impulsive phrasing detected`);
    if (consequenceScore > 0) parts.push(`severe consequences mentioned (significantly elevates risk)`);
    const signal = parts.length ? `Key signals: ${parts.join(', ')}. ` : '';
    return `${signal}Impulse score of ${score} places this in the ${level} risk category for ${domain} decisions. ${score > 50 ? 'A brief pause is recommended before acting.' : 'This appears relatively measured.'}`;
  }

  function buildTriggers(text, sentiment) {
    const triggers = [];
    if (has(text, URGENCY_WORDS))   triggers.push('time pressure');
    if (has(text, FEAR_WORDS))      triggers.push('FOMO');
    if (has(text, ANGER_WORDS))     triggers.push('emotional reactivity');
    if (has(text, LATE_INDICATORS)) triggers.push('late-night decision');
    if (has(text, IMPULSE_WORDS))   triggers.push('impulse phrasing');
    if (has(text, EXCITED_WORDS))   triggers.push('excitement bias');
    if (has(text, STRESS_WORDS))    triggers.push('stress response');
    if (triggers.length === 0)      triggers.push('low behavioral signal');
    return triggers.slice(0, 4);
  }

  function getCooldown(score, domain) {
    if (score < 26) return 0;
    if (score < 51) return 30;
    if (score < 76) return 60;
    if (domain === 'financial') return 1440; // 24h
    if (domain === 'relationship') return 480; // 8h
    return 120;
  }

  // ── Public API ────────────────────────────────────────
  return {
    analyze(text) {
      const domain    = detectDomain(text);
      const sentiment = detectSentiment(text);
      const impulse   = scoreImpulse(text);
      const urgCount  = score(text, URGENCY_WORDS);
      const impCount  = score(text, IMPULSE_WORDS);

      // Calculate consequence score for reasoning
      let consequenceScore = 0;
      for (const [category, words] of Object.entries(SEVERE_CONSEQUENCES)) {
        consequenceScore += score(text, words);
      }

      const risk      = getRiskLevel(impulse);
      const iType     = getInterventionType(impulse, domain, sentiment);
      const emoInt    = Math.min(10, Math.max(1, Math.round(
        score(text, [...ANGER_WORDS,...SAD_WORDS,...EXCITED_WORDS,...STRESS_WORDS]) * 1.8 + 1
      )));
      const urgLevel  = Math.min(10, Math.max(1, urgCount * 3 + (impulse > 60 ? 3 : 1)));
      const regretPct = Math.min(95, Math.max(5, impulse - 10 + (sentiment === 'angry' ? 15 : 0)));

      return {
        intent_summary:      buildIntentSummary(text, domain),
        domain,
        sentiment,
        emotion_intensity:   emoInt,
        urgency_level:       urgLevel,
        impulse_score:       impulse,
        regret_probability:  regretPct,
        risk_level:          risk,
        triggers:            buildTriggers(text, sentiment),
        intervention_type:   iType,
        intervention_message: buildIntervention(iType, domain, sentiment, impulse),
        cooldown_minutes:    getCooldown(impulse, domain),
        alternatives:        (ALTERNATIVES[domain] || ALTERNATIVES.other).slice(0, 3),
        reasoning:           buildReasoning(impulse, domain, sentiment, impCount, urgCount, consequenceScore),
      };
    }
  };
})();

// ─────────────────────────────────────────
// LOCAL ANALYZE — replaces API call
// ─────────────────────────────────────────
function analyzeLocally(text) {
  return new Promise(resolve => {
    // Small artificial delay so UI loading states show properly
    setTimeout(() => resolve(_AI.analyze(text)), 320);
  });
}

// ─────────────────────────────────────────
// THEME TOGGLE
// ─────────────────────────────────────────
function toggleTheme() {
  const isLight = document.body.classList.toggle('light');
  localStorage.setItem('cg_theme', isLight ? 'light' : 'dark');
  // Update thumb emoji in both topbar states
  document.querySelectorAll('#toggle-thumb').forEach(t => t.textContent = isLight ? '☀️' : '🌙');
  toast(isLight ? '☀️ Light mode on' : '🌙 Dark mode on');
}

function initTheme() {
  const saved = localStorage.getItem('cg_theme');
  const isLight = saved ? saved === 'light' : true;
  if (isLight) {
    document.body.classList.add('light');
    const thumb = document.getElementById('toggle-thumb');
    if (thumb) thumb.textContent = '☀️';
  }
}

setupOTPBoxes();
initTheme();
renderStepBar('none', 0);

const startPage = loadState();
if (startPage === 'app') {
  document.getElementById('page-auth').classList.remove('active');
  document.getElementById('page-app').classList.add('active');
  renderTopbar(); renderSidebar(); renderDashboard();
  buildColorPicker('edit-color-picker', (hex) => { updateAllAvatars(); saveState(); });
}

// Enter key handlers
['login-email',e=>submitLoginEmail(),'login-pw',e=>submitLogin(),
 'login-confirmpw',e=>submitLogin(),'signup-email',e=>submitSignupEmail(),
 'setpw-input',e=>document.getElementById('confirmpw-input').focus(),
 'confirmpw-input',e=>submitSetPassword(),
 'forgot-newpw',e=>document.getElementById('forgot-confirmpw').focus(),
 'forgot-confirmpw',e=>submitForgotNewPw(),
 'nick-input',e=>submitNick()
].reduce((acc,v,i,arr)=>{
  if(i%2===0){const el=document.getElementById(v);if(el) el.addEventListener('keydown',ke=>{if(ke.key==='Enter') arr[i+1](ke);});}
  return acc;
},[]);
