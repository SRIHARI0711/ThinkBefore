// Email Service Configuration
// This file handles email sending for OTP verification using EmailJS

// Default configuration - can be modified in settings
let emailConfig = {
  fromEmail: 'cogniguard@example.com',
  senderName: 'CogniAuth',
  serviceId: '',           // EmailJS Service ID
  templateId: '',          // EmailJS OTP Template ID
  resetTemplateId: '',     // EmailJS Password Reset Template ID
  publicKey: '',           // EmailJS Public Key
  provider: 'emailjs'
};

// Initialize EmailJS
export function initializeEmailJS(publicKey) {
  if (publicKey && window.emailjs) {
    window.emailjs.init(publicKey);
    emailConfig.publicKey = publicKey;
    return true;
  }
  return false;
}

// Load configuration from localStorage on startup
export function loadEmailConfig() {
  const stored = localStorage.getItem('emailConfig');
  if (stored) {
    emailConfig = JSON.parse(stored);
    // Initialize EmailJS if public key is available
    if (emailConfig.publicKey) {
      initializeEmailJS(emailConfig.publicKey);
    }
  }
}

// Save configuration to localStorage
export function saveEmailConfig(config) {
  emailConfig = { ...emailConfig, ...config };
  localStorage.setItem('emailConfig', JSON.stringify(emailConfig));
  // Reinitialize EmailJS if public key was updated
  if (config.publicKey) {
    initializeEmailJS(config.publicKey);
  }
}

// Get current configuration
export function getEmailConfig() {
  return { ...emailConfig };
}

// Generate OTP code
export function generateOTP(length = 6) {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

// Send OTP via email using EmailJS service
export async function sendOTPEmail(userEmail, otp) {
  try {
    // Always store OTP locally for verification
    localStorage.setItem(`otp_${userEmail}`, JSON.stringify({
      code: otp,
      timestamp: Date.now(),
      expiresAt: Date.now() + 1 * 60 * 1000 // 1 minute
    }));

    // Try to send via EmailJS if configured
    if (emailConfig.publicKey && emailConfig.serviceId && emailConfig.templateId && window.emailjs) {
      const templateParams = {
        to_email: userEmail,
        to_name: userEmail.split('@')[0],
        otp_code: otp,
        from_email: emailConfig.fromEmail,
        sender_name: emailConfig.senderName,
        expiry_time: '1 minute'
      };

      const response = await window.emailjs.send(
        emailConfig.serviceId,
        emailConfig.templateId,
        templateParams
      );

      return {
        success: true,
        message: 'OTP sent successfully to ' + userEmail,
        response
      };
    } else {
      // Fallback: Store OTP locally for development/testing
      localStorage.setItem(`otp_${userEmail}`, JSON.stringify({
        code: otp,
        timestamp: Date.now(),
        expiresAt: Date.now() + 1 * 60 * 1000 // 1 minute
      }));

      console.log(`[Development Mode] OTP for ${userEmail}: ${otp}`);
      
      return {
        success: true,
        message: 'OTP generated successfully. Check your email for the code.'
      };
    }
  } catch (error) {
    console.error('Error sending OTP:', error);
    return {
      success: false,
      message: 'Failed to send OTP: ' + error.message,
      error
    };
  }
}

// Get OTP expiry time remaining in seconds
export function getOTPTimeRemaining(userEmail) {
  const stored = localStorage.getItem(`otp_${userEmail}`);
  
  if (!stored) {
    return 0;
  }

  const otpData = JSON.parse(stored);
  const timeRemaining = otpData.expiresAt - Date.now();
  
  if (timeRemaining <= 0) {
    localStorage.removeItem(`otp_${userEmail}`);
    return 0;
  }
  
  return Math.ceil(timeRemaining / 1000); // Return in seconds
}

// Verify OTP code
export function verifyOTP(userEmail, enteredOTP) {
  const stored = localStorage.getItem(`otp_${userEmail}`);
  
  if (!stored) {
    return {
      valid: false,
      message: 'No OTP found for this email'
    };
  }

  const otpData = JSON.parse(stored);
  
  // Check if OTP has expired (1 minute)
  if (Date.now() > otpData.expiresAt) {
    localStorage.removeItem(`otp_${userEmail}`);
    return {
      valid: false,
      message: 'OTP has expired. Please request a new one.'
    };
  }

  // Verify OTP code
  if (otpData.code === enteredOTP) {
    localStorage.removeItem(`otp_${userEmail}`);
    return {
      valid: true,
      message: 'OTP verified successfully'
    };
  }

  return {
    valid: false,
    message: 'Invalid OTP. Please try again.'
  };
}

// Clear stored OTP
export function clearOTP(userEmail) {
  localStorage.removeItem(`otp_${userEmail}`);
}

// Generate password reset token (unique token with expiry)
export function generateResetToken(userEmail, length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Store token with expiry (24 hours)
  localStorage.setItem(`reset_token_${userEmail}`, JSON.stringify({
    token: token,
    timestamp: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    used: false
  }));
  
  return token;
}

// Send password reset email using EmailJS service
export async function sendPasswordResetEmail(userEmail, userName) {
  try {
    // Check if user exists in our database
    // (This will be validated in App.jsx before calling this function)
    
    // Generate reset token
    const resetToken = generateResetToken(userEmail);
    
    // Create reset link - using URL encoding
    const resetLink = `${window.location.origin}?page=auth&step=reset-password&token=${resetToken}&email=${encodeURIComponent(userEmail)}`;
    
    // Try to send via EmailJS if configured
    if (emailConfig.publicKey && emailConfig.serviceId && emailConfig.resetTemplateId && window.emailjs) {
      const templateParams = {
        to_email: userEmail,
        to_name: userName || userEmail.split('@')[0],
        reset_link: resetLink,
        from_email: emailConfig.fromEmail,
        sender_name: emailConfig.senderName,
        expiry_time: '24 hours'
      };

      const response = await window.emailjs.send(
        emailConfig.serviceId,
        emailConfig.resetTemplateId,
        templateParams
      );

      return {
        success: true,
        message: 'Password reset link sent to ' + userEmail,
        response,
        token: resetToken // Return token for dev mode
      };
    } else {
      // Fallback: Development mode
      console.log(`[Development Mode] Reset link for ${userEmail}: ${resetLink}`);
      console.log(`[Development Mode] Reset token: ${resetToken}`);
      
      return {
        success: true,
        message: 'Password reset link generated successfully. Check your email for the link.',
        token: resetToken // Return token for dev mode
      };
    }
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return {
      success: false,
      message: 'Failed to send password reset email: ' + error.message,
      error
    };
  }
}

// Verify password reset token
export function verifyResetToken(userEmail, token) {
  const stored = localStorage.getItem(`reset_token_${userEmail}`);
  
  if (!stored) {
    return {
      valid: false,
      message: 'No reset token found. Please request a new password reset.'
    };
  }

  const tokenData = JSON.parse(stored);
  
  // Check if token has expired (24 hours)
  if (Date.now() > tokenData.expiresAt) {
    localStorage.removeItem(`reset_token_${userEmail}`);
    return {
      valid: false,
      message: 'Reset link has expired. Please request a new one.'
    };
  }

  // Check if token was already used
  if (tokenData.used) {
    return {
      valid: false,
      message: 'This reset link has already been used.'
    };
  }

  // Verify token matches
  if (tokenData.token !== token) {
    return {
      valid: false,
      message: 'Invalid reset token.'
    };
  }

  return {
    valid: true,
    message: 'Reset token verified successfully'
  };
}

// Mark reset token as used
export function markResetTokenAsUsed(userEmail) {
  const stored = localStorage.getItem(`reset_token_${userEmail}`);
  
  if (stored) {
    const tokenData = JSON.parse(stored);
    tokenData.used = true;
    localStorage.setItem(`reset_token_${userEmail}`, JSON.stringify(tokenData));
  }
}

// Clear reset token
export function clearResetToken(userEmail) {
  localStorage.removeItem(`reset_token_${userEmail}`);
}
