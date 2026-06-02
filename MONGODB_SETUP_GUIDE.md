# MongoDB Setup Guide for CogniAuth

This guide will walk you through setting up MongoDB for persistent user data storage. After this setup, user data will be saved to the cloud and retrieved even after re-login.

---

## Table of Contents
1. [Create MongoDB Atlas Account](#step-1-create-mongodb-atlas-account)
2. [Create a Database Cluster](#step-2-create-a-database-cluster)
3. [Get Connection String](#step-3-get-connection-string)
4. [Set Up Backend Server](#step-4-set-up-backend-server)
5. [Install Required Packages](#step-5-install-required-packages)
6. [Create Environment Variables](#step-6-create-environment-variables)
7. [Update User Database Service](#step-7-update-user-database-service)
8. [Test Your Setup](#step-8-test-your-setup)
9. [Security Considerations](#security-considerations)

---

## STEP 1: Create MongoDB Atlas Account

MongoDB Atlas is a cloud database service where your data will be stored.

### 1.1 Go to MongoDB Atlas
- Open your browser and go to: https://www.mongodb.com/cloud/atlas
- Click **"Sign Up"** button

### 1.2 Create an Account
- Enter your email
- Create a password
- Accept terms and click **"Create your Atlas account"**
- Verify your email by clicking the link sent to your inbox

### 1.3 Complete Setup Wizard
- You'll see a setup wizard. Click **"Continue"**
- For "What are you building?", select **"I'm building an application"**
- Select **"Yes"** for would you like MongoDB to suggest a template
- Click **"Continue"**

---

## STEP 2: Create a Database Cluster

A cluster is where your data will actually be stored.

### 2.1 Create Cluster
- After completing the wizard, you'll be on the "Deploy your database" page
- Click **"Create"** for the free tier option (recommended for learning)

### 2.2 Select Cloud Provider
- Choose **"AWS"** (most common)
- Choose a region close to you (e.g., **"ap-south-1"** for India/Asia)
- Cluster name: Keep default or change to **"cogniauthcluster"**
- Click **"Create Deployment"**

### 2.3 Create Database User
- Username: **cogniauth_user** (or your choice)
- Password: Create a **strong password** (use a password manager!)
  - Must be 8+ characters
  - Include uppercase, lowercase, numbers, and special characters
  - Example: `Secure@Pass123`
- ⚠️ **SAVE THIS PASSWORD SOMEWHERE SAFE** - you'll need it!
- Click **"Create User"**

### 2.4 Add IP Address
- For development, click **"Add My Current IP Address"**
- This allows your local machine to connect to MongoDB
- ✅ You should see your IP added to the allowlist
- Click **"Finish and Close"**

---

## STEP 3: Get Connection String

### 3.1 Find Connection String
- Go back to the MongoDB Atlas dashboard
- Click on your cluster (e.g., "cogniauthcluster")
- Click **"Connect"** button
- Select **"Drivers"** option
- Choose **"Node.js"** driver
- Copy the connection string provided

### 3.2 Your Connection String
It will look something like:
```
mongodb+srv://cogniauth_user:<password>@cogniauthcluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

**Replace `<password>` with the actual password you created** (the one from Step 2.3)

---

## STEP 4: Set Up Backend Server

Your frontend currently runs on Vite. We need a backend server to handle database operations.

### 4.1 Choose Your Backend
We'll use **Node.js with Express** (simple and quick setup).

---

## STEP 5: Install Required Packages

### 5.1 Install Dependencies
In your terminal (in the d:\CogniAuth directory), run:

```bash
npm install express mongoose cors dotenv bcryptjs
```

**What these packages do:**
- **express**: Web server framework
- **mongoose**: MongoDB database library (makes it easy to use MongoDB)
- **cors**: Allows your frontend to talk to your backend
- **dotenv**: Manages secret variables (passwords, connection strings)
- **bcryptjs**: Encrypts passwords for security

### 5.2 Verify Installation
Check your `package.json` to confirm these are added under "dependencies"

---

## STEP 6: Create Environment Variables

Environment variables store secrets like your MongoDB password. **Never push these to GitHub!**

### 6.1 Create .env File
In the root of your project (d:\CogniAuth), create a new file named **`.env`**

### 6.2 Add Your Secrets
In the `.env` file, add:

```
MONGODB_URI=mongodb+srv://cogniauth_user:<password>@cogniauthcluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_change_this_12345
PORT=5000
NODE_ENV=development
```

**Replace:**
- `cogniauth_user` with your actual username
- `<password>` with the password from Step 2.3
- `cogniauthcluster.xxxxx` with your actual cluster details (from your connection string)
- `your_super_secret_jwt_key_change_this_12345` with a random string (e.g., generate at https://www.uuidgenerator.net/)

### 6.3 Update .gitignore
Make sure `.env` is in your `.gitignore` file so secrets aren't pushed to GitHub:

```
.env
.env.local
node_modules/
```

---

## STEP 7: Update User Database Service

Now we'll create a new backend file that uses MongoDB instead of localStorage.

### Next Steps:
1. **Create a new file**: `server.js` (backend server)
2. **Create a new file**: `models/User.js` (database schema)
3. **Update**: `userDatabase.js` (to use API instead of localStorage)

These files will be provided in the next section.

---

## STEP 8: Test Your Setup

### 8.1 Start Backend Server
```bash
node server.js
```

You should see:
```
Server is running on port 5000
MongoDB connected successfully
```

### 8.2 Test User Registration
Open Postman or use curl to test registration:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password@123",
    "nickname": "TestUser",
    "avatarColor": "#f0a500"
  }'
```

---

## STEP 9: Deployment

When you're ready to deploy:

### 9.1 Update MongoDB IP Whitelist
- Go to MongoDB Atlas → Your Cluster → Network Access
- Add your deployed server's IP address
- Or allow access from anywhere (⚠️ less secure)

### 9.2 Deploy Backend
Options:
- **Heroku** (free tier available)
- **Railway** (recommended, easy setup)
- **Render** (free tier available)
- **AWS/Google Cloud/Azure** (more complex)

---

## Security Considerations

### ⚠️ Never Do This:
- ❌ Push `.env` file to GitHub
- ❌ Put passwords in code
- ❌ Use simple passwords
- ❌ Allow all IPs in MongoDB (in production)

### ✅ Always Do This:
- ✅ Use environment variables
- ✅ Encrypt passwords with bcryptjs
- ✅ Use HTTPS (in production)
- ✅ Validate all user input
- ✅ Use strong JWT secrets
- ✅ Restrict MongoDB IP access

---

## Next Steps

Once you've completed this guide:
1. Come back and let me know you've completed the MongoDB setup
2. I'll provide the `server.js` file
3. I'll provide the updated `userDatabase.js` that connects to MongoDB
4. We'll test everything together

---

## Troubleshooting

### "Connection Refused"
- Check your MongoDB connection string
- Verify your IP is whitelisted in MongoDB Atlas
- Make sure the password in `.env` matches MongoDB

### "Cannot Find Module"
- Run `npm install` again
- Delete `node_modules` folder and run `npm install`

### Still Having Issues?
Let me know the error message and I'll help you debug!
