// userDatabase.js - Frontend service with MongoDB backend + compatibility wrapper
// Returns promises that App.jsx can await

const API_BASE_URL = 'http://localhost:5000/api/auth';

// Cache for user session data
let currentUserCache = null;

// Validate password strength (same validation as backend)
export function validatePassword(password) {
  const errors = [];
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&* etc)');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// Register new user
export function registerUser(email, password, nickname, avatarColor) {
  return (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          nickname,
          avatarColor
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Error registering user'
        };
      }

      if (data.user) {
        currentUserCache = data.user;
      }

      return data;
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Network error: Unable to register user. Make sure backend server is running on port 5000.'
      };
    }
  })();
}

// Authenticate user (login)
export function authenticateUser(email, password) {
  return (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Authentication failed'
        };
      }

      if (data.user) {
        currentUserCache = data.user;
      }

      return data;
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        message: 'Network error: Unable to authenticate. Make sure backend server is running on port 5000.'
      };
    }
  })();
}

// Check if user exists
export function userExists(email) {
  return (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/user/${encodeURIComponent(email.toLowerCase())}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.success;
      }
      return false;
    } catch (error) {
      console.error('User exists check error:', error);
      return false;
    }
  })();
}

// Get user by email
export function getUser(email) {
  return (async () => {
    try {
      if (currentUserCache && currentUserCache.email === email.toLowerCase()) {
        return currentUserCache;
      }

      const response = await fetch(`${API_BASE_URL}/user/${encodeURIComponent(email.toLowerCase())}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (data.success && data.user) {
        currentUserCache = data.user;
        return data.user;
      }
      return null;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  })();
}

// Update user profile
export function updateUserProfile(email, updates) {
  return (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/user/${encodeURIComponent(email.toLowerCase())}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Error updating profile'
        };
      }

      if (data.user) {
        currentUserCache = data.user;
      }

      return data;
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        message: 'Network error: Unable to update profile'
      };
    }
  })();
}

export function getUserHistory(email) {
  return (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/user/${encodeURIComponent(email.toLowerCase())}/history`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return Array.isArray(data.history) ? data.history : [];
    } catch (error) {
      console.error('Get history error:', error);
      return [];
    }
  })();
}

export function saveDecisionHistory(email, entry) {
  return (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/user/${encodeURIComponent(email.toLowerCase())}/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entry })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Error saving history'
        };
      }

      if (data.user) {
        currentUserCache = data.user;
      }

      return data;
    } catch (error) {
      console.error('Save history error:', error);
      return {
        success: false,
        message: 'Network error: Unable to save history'
      };
    }
  })();
}

// Change password
export function changePassword(email, oldPassword, newPassword) {
  return (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          currentPassword: oldPassword,
          newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Error changing password'
        };
      }

      return data;
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: 'Network error: Unable to change password'
      };
    }
  })();
}

// Verify password (for security checks)
export function verifyPassword(email, password) {
  return (async () => {
    try {
      const result = await authenticateUser(email, password);
      return result && result.success;
    } catch (error) {
      console.error('Verify password error:', error);
      return false;
    }
  })();
}

// Reset password
export function resetPassword(email, newPassword, token) {
  return (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          newPassword,
          token
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Reset password error:', error);
      return {
        success: false,
        message: 'Network error: Unable to reset password'
      };
    }
  })();
}

// Get all users (for admin purposes - optional)
export function getAllUsers() {
  console.warn('getAllUsers() is deprecated with MongoDB backend');
  return {};
}

// Session management helpers
export function saveUserSession(user) {
  if (user && user.email) {
    currentUserCache = user;
    sessionStorage.setItem('currentUser', JSON.stringify(user));
  }
}

export function getUserSession() {
  const userStr = sessionStorage.getItem('currentUser');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      currentUserCache = user;
      return user;
    } catch (e) {
      return null;
    }
  }
  return currentUserCache;
}

export function clearUserSession() {
  currentUserCache = null;
  sessionStorage.removeItem('currentUser');
}
