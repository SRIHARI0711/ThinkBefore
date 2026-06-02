# MongoDB Implementation Checklist

Follow these steps in order to implement MongoDB for your CogniAuth project.

---

## ✅ QUICK START (For Beginners)

### Phase 1: MongoDB Setup (15-20 minutes)

- [ ] **Step 1**: Go to https://www.mongodb.com/cloud/atlas
- [ ] **Step 2**: Click "Sign Up" and create a free account
- [ ] **Step 3**: Verify your email
- [ ] **Step 4**: Create a free cluster (choose AWS, ap-south-1 Mumbai, name it "cogniauthcluster")
- [ ] **Step 5**: Create a database user (username: `cogniauth_user`, save the password!)
- [ ] **Step 6**: Add your IP address to the whitelist (click "Add My Current IP Address")
- [ ] **Step 7**: Copy your connection string from the "Connect" → "Drivers" → "Node.js" section

**Connection string will look like:**
```
mongodb+srv://cogniauth_user:<password>@cogniauthcluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

---

### Phase 2: Install Dependencies (2-3 minutes)

In your terminal in the d:\CogniAuth folder, run:

```bash
npm install
```

This will install:
- `express` - Backend server
- `mongoose` - MongoDB library
- `bcryptjs` - Password encryption
- `cors` - Frontend-backend communication
- `dotenv` - Environment variables
- `concurrently` - Run frontend and backend together

✅ Check `package.json` to verify all packages are installed.

---

### Phase 3: Create Environment Variables (2-3 minutes)

**In the root folder (d:\CogniAuth), create a new file called `.env`**

Copy this template and fill in your details:

```
MONGODB_URI=mongodb+srv://cogniauth_user:YOUR_PASSWORD_HERE@cogniauthcluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
JWT_SECRET=random_secret_key_12345
PORT=5000
NODE_ENV=development
```

**Replace:**
- `YOUR_PASSWORD_HERE` with the password from Step 5 above
- `cogniauthcluster.xxxxx` with your actual cluster details

⚠️ **IMPORTANT**: Do NOT push `.env` to GitHub (it's already in .gitignore)

---

### Phase 4: Start Both Frontend & Backend (5 minutes)

You now have two options:

#### **Option A: Run Both Together (Recommended)**

Open terminal and run:

```bash
npm run dev-all
```

This will start:
- Frontend: http://localhost:5173 (best performance with Mumbai region!)
- Backend: http://localhost:5000

#### **Option B: Run Separately**

**Terminal 1 - Backend:**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

✅ You should see:
```
✅ Server is running on http://localhost:5000
✅ MongoDB connected successfully
```

---

### Phase 5: Replace Frontend Code (5 minutes)

1. **Backup your current `userDatabase.js`** (or just replace it):
   - The one we created (`userDatabase-mongodb.js`) is ready to use
   - It will connect to the backend API instead of localStorage

2. **Update `userDatabase.js`**:
   - Copy the contents of `userDatabase-mongodb.js`
   - Paste into `userDatabase.js`
   - Your `App.jsx` doesn't need any changes!

---

### Phase 6: Test the Setup (5 minutes)

1. Go to http://localhost:5173 (your frontend)
2. Click "Sign Up" and create a new account
3. Verify it works by logging out
4. Log back in - **Your data should still be there!** ✅
5. Go to MongoDB Atlas and check your database
   - Click your cluster → Collections → You should see a "Users" collection with your user data!

---

## 📊 What's Changed

### Before (LocalStorage):
```
User registers → Data saved to browser memory (localStorage)
User logs out → Data lost if browser cache cleared ❌
```

### After (MongoDB):
```
User registers → Data sent to backend → Saved to MongoDB cloud ✅
User logs out → Next login fetches data from MongoDB ✅
Data persists forever ✅
```

---

## 🆘 Troubleshooting

### Issue: "Cannot connect to MongoDB"

**Solution:**
1. Check your `.env` file has correct password
2. Verify IP is whitelisted in MongoDB Atlas
3. Check MongoDB URI doesn't have typos

### Issue: "Port 5000 already in use"

**Solution:**
Change PORT in `.env`:
```
PORT=5001
```

Then update API_BASE_URL in App.jsx:
```javascript
const API_BASE_URL = 'http://localhost:5001/api/auth';
```

### Issue: "Cannot GET /api/auth/..."

**Solution:**
1. Make sure backend server is running (`npm run server`)
2. Check frontend is trying to connect to correct port (5000)
3. Check for typos in API calls

### Issue: Frontend shows "Network error"

**Solution:**
1. Backend server is not running - start it with `npm run server`
2. Check both frontend (5173) and backend (5000) are running
3. Check browser console for error messages

---

## 📚 File Structure

After setup, your project will have:

```
d:\CogniAuth\
├── .env                    (⭐ NEW - Secret passwords, NOT in GitHub)
├── server.js              (⭐ NEW - Backend API server)
├── userDatabase.js         (✏️ UPDATED - Now calls API instead of localStorage)
├── userDatabase-mongodb.js (📋 Reference copy)
├── package.json           (✏️ UPDATED - Added new dependencies)
└── ... (other files stay the same)
```

---

## 🔐 Security Notes

✅ **Do This:**
- Use strong passwords (8+ chars, uppercase, numbers, special chars)
- Keep `.env` file secret (never commit to GitHub)
- In production, use HTTPS
- In production, add custom domain to MongoDB IP whitelist

❌ **Don't Do This:**
- Don't share `.env` file
- Don't put passwords in code
- Don't allow all IPs in production (MongoDB Atlas security)
- Don't use simple passwords

---

## 🚀 What's Next?

After this setup works:

1. **Email Verification** - You already have this set up!
2. **Password Reset** - You already have this set up!
3. **User Sessions** - User data persists ✅ (this is what we just implemented!)
4. **Deployment** - When ready, deploy to Heroku/Railway/Render

---

## 💡 Pro Tips

- **Check your data**: Visit https://cloud.mongodb.com → Your cluster → Collections → See all users
- **Run migrations**: Backend handles all data format changes
- **Scale easily**: MongoDB handles thousands of users automatically
- **Free tier**: MongoDB free tier has 512MB storage, enough for testing

---

Need help? Check the detailed guide in `MONGODB_SETUP_GUIDE.md`
