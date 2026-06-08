// server.js - Backend server for CogniAuth with MongoDB
// This file handles all database operations and API endpoints

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcryptjs from 'bcryptjs';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors()); // Allow requests from frontend
app.use(express.json()); // Parse JSON request bodies

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// User Schema (Database structure)
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  nickname: {
    type: String,
    required: true
  },
  avatarColor: {
    type: String,
    default: '#4a9eff'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  verified: {
    type: Boolean,
    default: false
  },
  resetToken: {
    type: String,
    default: null
  },
  resetTokenExpiresAt: {
    type: Date,
    default: null
  },
  resetTokenUsed: {
    type: Boolean,
    default: false
  },
  decisionHistory: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  }
}, { timestamps: true });

// Create User model
const User = mongoose.model('User', userSchema);

// ===========================
// API ROUTES
// ===========================

// 1. Register User
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, nickname, avatarColor } = req.body;

    // Validation
    if (!email || !password || !nickname) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered' 
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.errors.join('. ')
      });
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create new user
    const newUser = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      nickname,
      avatarColor: avatarColor || '#4a9eff',
      verified: true
    });

    await newUser.save();

    // Return user data without password
    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error registering user',
      error: error.message 
    });
  }
});

// 2. Authenticate User (Login)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password required' 
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Compare passwords
    const passwordMatch = await bcryptjs.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid password' 
      });
    }

    // Return user data without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Authentication successful',
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error logging in',
      error: error.message 
    });
  }
});

// 3. Get User by Email
app.get('/api/auth/user/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Return user data without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      user: userResponse
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching user',
      error: error.message 
    });
  }
});

// 4. Update User Profile
app.put('/api/auth/user/:email', async (req, res) => {
  try {
    const { nickname, avatarColor } = req.body;
    const email = req.params.email.toLowerCase();
    const updates = {};
    if (typeof nickname === 'string' && nickname.trim()) {
      updates.nickname = nickname;
    }
    if (typeof avatarColor === 'string' && avatarColor.trim()) {
      updates.avatarColor = avatarColor;
    }

    const updatedUser = await User.findOneAndUpdate({ email }, updates, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const userResponse = updatedUser.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating profile',
      error: error.message 
    });
  }
});

// 5. Get Decision History
app.get('/api/auth/user/:email/history', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      history: user.decisionHistory || []
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching history',
      error: error.message
    });
  }
});

// 6. Save Decision History Entry
app.post('/api/auth/user/:email/history', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const { entry } = req.body;

    if (!entry || typeof entry !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'History entry is required'
      });
    }

    const updatedUser = await User.findOneAndUpdate(
      { email },
      { $push: { decisionHistory: { $each: [entry], $position: 0 } } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userResponse = updatedUser.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'History saved successfully',
      history: userResponse.decisionHistory || [],
      user: userResponse
    });
  } catch (error) {
    console.error('Save history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving history',
      error: error.message
    });
  }
});

// 7. Store Password Reset Token
app.post('/api/auth/request-reset', async (req, res) => {
  try {
    const { email, token, expiresAt } = req.body;

    if (!email || !token || !expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'Email, token, and expiry are required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.resetToken = token;
    user.resetTokenExpiresAt = new Date(expiresAt);
    user.resetTokenUsed = false;
    await user.save();

    res.json({
      success: true,
      message: 'Reset token stored successfully'
    });
  } catch (error) {
    console.error('Request reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating reset token',
      error: error.message
    });
  }
});

// 8. Verify Password Reset Token
app.post('/api/auth/verify-reset-token', async (req, res) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({
        success: false,
        message: 'Email and token are required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.resetToken || user.resetToken !== token) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset link. Please request a new one.'
      });
    }

    if (user.resetTokenUsed) {
      return res.status(400).json({
        success: false,
        message: 'This reset link has already been used.'
      });
    }

    if (!user.resetTokenExpiresAt || Date.now() > user.resetTokenExpiresAt.getTime()) {
      return res.status(400).json({
        success: false,
        message: 'Reset link has expired. Please request a new one.'
      });
    }

    res.json({
      success: true,
      message: 'Reset token is valid'
    });
  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying reset token',
      error: error.message
    });
  }
});

// 9. Change Password
app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Verify current password
    const passwordMatch = await bcryptjs.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.errors.join('. ')
      });
    }

    // Hash and update password
    const hashedPassword = await bcryptjs.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error changing password',
      error: error.message 
    });
  }
});

// ===========================
// UTILITY FUNCTIONS
// ===========================

// 10. Reset Password with Token
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, newPassword, token } = req.body;

    if (!email || !newPassword || !token) {
      return res.status(400).json({
        success: false,
        message: 'Email, token, and new password are required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.resetToken !== token) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset link. Please request a new one.'
      });
    }

    if (user.resetTokenUsed) {
      return res.status(400).json({
        success: false,
        message: 'This reset link has already been used.'
      });
    }

    if (!user.resetTokenExpiresAt || Date.now() > user.resetTokenExpiresAt.getTime()) {
      return res.status(400).json({
        success: false,
        message: 'Reset link has expired. Please request a new one.'
      });
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.errors.join('. ')
      });
    }

    const hashedPassword = await bcryptjs.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiresAt = null;
    user.resetTokenUsed = true;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: error.message
    });
  }
});

// Validate password strength
function validatePassword(password) {
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

// ===========================
// START SERVER
// ===========================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
  console.log(`📝 Frontend: http://localhost:5173 (Vite default)`);
  console.log(`📝 Backend API: http://localhost:${PORT}/api/auth`);
});

// Export for potential use in other files
export default app;
