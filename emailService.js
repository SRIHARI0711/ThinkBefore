// emailService.js
// OTP and password-reset delivery via @emailjs/browser (npm package).
// Requires: npm install @emailjs/browser

import emailjs from '@emailjs/browser';

// TEMPORARY DEBUG — remove after fixing
console.log('EmailJS Config:', {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  otpTemplate: import.meta.env.VITE_EMAILJS_OTP_TEMPLATE_ID,
  resetTemplate: import.meta.env.VITE_EMAILJS_RESET_TEMPLATE_ID,
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
});

// ─── Config ─────────────────────────────────────────────────────────────────
// Values come from .env (VITE_ prefix makes them available in the browser).
// Fall back to the hard-coded strings so the app still works if .env is absent.
const EMAILJS_CONFIG = {
  SERVICE_ID:        import.meta.env.VITE_EMAILJS_SERVICE_ID        || 'service_mgk426n',
  OTP_TEMPLATE_ID:   import.meta.env.VITE_EMAILJS_OTP_TEMPLATE_ID   || 'template_1qgv09k',
  RESET_TEMPLATE_ID: import.meta.env.VITE_EMAILJS_RESET_TEMPLATE_ID || 'template_cs9iyfa',
  PUBLIC_KEY:        import.meta.env.VITE_EMAILJS_PUBLIC_KEY        || 'migRVJbtXtmogMrXg',
};

const API_BASE_URL = 'http://localhost:5000/api/auth';

// ─── Initialisation ──────────────────────────────────────────────────────────
let _initialised = false;

function ensureInit() {
  if (_initialised) return;
  emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
  _initialised = true;
}

// Called once in App.jsx's useEffect — keeps backward compat.
export function loadEmailConfig() {
  ensureInit();
}

// Legacy helpers kept so nothing else in the codebase breaks.
export function initializeEmailJS(publicKey) {
  emailjs.init(publicKey || EMAILJS_CONFIG.PUBLIC_KEY);
  _initialised = true;
  return true;
}

export function saveEmailConfig(config) {
  if (config?.publicKey) {
    emailjs.init(config.publicKey);
    _initialised = true;
  }
}

export function getEmailConfig() {
  return { ...EMAILJS_CONFIG };
}

// ─── OTP helpers ─────────────────────────────────────────────────────────────
export function generateOTP(length = 6) {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}

export async function sendOTPEmail(userEmail, otp) {
  try {
    ensureInit();

    const templateParams = {
      to_email:    userEmail,
      to_name:     userEmail.split('@')[0],
      otp_code:    otp,
      from_email:  'noreply.thinkbefore@gmail.com',
      sender_name: 'ThinkBefore',
      expiry_time: '1 minute',
    };

    const response = await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.OTP_TEMPLATE_ID,
      templateParams
    );

    // Store OTP locally so verifyOTP() can check it (1-minute window).
    localStorage.setItem(`otp_${userEmail}`, JSON.stringify({
      code:      otp,
      timestamp: Date.now(),
      expiresAt: Date.now() + 60 * 1000,
    }));

    return {
      success: true,
      message: `OTP sent successfully to ${userEmail}`,
      response,
    };
  } catch (error) {
    localStorage.removeItem(`otp_${userEmail}`);
    console.error('[EmailJS] sendOTPEmail error:', error);
    return {
      success: false,
      message: `Failed to send OTP: ${error?.text || error?.message || 'Unknown EmailJS error'}`,
      error,
    };
  }
}

export function getOTPTimeRemaining(userEmail) {
  const stored = localStorage.getItem(`otp_${userEmail}`);
  if (!stored) return 0;

  const { expiresAt } = JSON.parse(stored);
  const timeRemaining = expiresAt - Date.now();

  if (timeRemaining <= 0) {
    localStorage.removeItem(`otp_${userEmail}`);
    return 0;
  }
  return Math.ceil(timeRemaining / 1000);
}

export function verifyOTP(userEmail, enteredOTP) {
  const stored = localStorage.getItem(`otp_${userEmail}`);
  if (!stored) {
    return { valid: false, message: 'No OTP found for this email' };
  }

  const otpData = JSON.parse(stored);

  if (Date.now() > otpData.expiresAt) {
    localStorage.removeItem(`otp_${userEmail}`);
    return { valid: false, message: 'OTP has expired. Please request a new one.' };
  }

  if (otpData.code === enteredOTP) {
    localStorage.removeItem(`otp_${userEmail}`);
    return { valid: true, message: 'OTP verified successfully' };
  }

  return { valid: false, message: 'Invalid OTP. Please try again.' };
}

export function clearOTP(userEmail) {
  localStorage.removeItem(`otp_${userEmail}`);
}

// ─── Password reset helpers ───────────────────────────────────────────────────
export function generateResetToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function sendPasswordResetEmail(userEmail, userName) {
  try {
    ensureInit();

    const resetToken = generateResetToken();
    const expiresAt  = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Ask the backend to persist the token.
    const tokenStoreResponse = await fetch(`${API_BASE_URL}/request-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, token: resetToken, expiresAt }),
    });

    const tokenStoreData = await tokenStoreResponse.json();
    if (!tokenStoreResponse.ok) {
      return {
        success: false,
        message: tokenStoreData.message || 'Failed to prepare password reset.',
      };
    }

    const resetLink = `${window.location.origin}?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(userEmail)}`;

    const templateParams = {
      to_email:    userEmail,
      to_name:     userName || userEmail.split('@')[0],
      reset_link:  resetLink,
      from_email:  'noreply.thinkbefore@gmail.com',
      sender_name: 'ThinkBefore',
      expiry_time: '24 hours',
    };

    const response = await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.RESET_TEMPLATE_ID,
      templateParams
    );

    return {
      success: true,
      message: `Password reset link sent to ${userEmail}`,
      response,
    };
  } catch (error) {
    console.error('[EmailJS] sendPasswordResetEmail error:', error);
    return {
      success: false,
      message: `Failed to send password reset email: ${error?.text || error?.message || 'Unknown EmailJS error'}`,
      error,
    };
  }
}

export async function verifyResetToken(userEmail, token) {
  try {
    const response = await fetch(`${API_BASE_URL}/verify-reset-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, token }),
    });
    const data = await response.json();
    return { valid: !!data.success, message: data.message };
  } catch (error) {
    return { valid: false, message: 'Unable to verify reset link. Please try again.' };
  }
}

// Kept for backward compat — backend handles the actual invalidation.
export function markResetTokenAsUsed() { return true; }
export function clearResetToken()      { return true; }
