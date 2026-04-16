# CogniGuard - Complete Setup Guide

## 📚 Project Overview

Your CogniAuth project now has **TWO versions**:

### 1. **Vanilla JavaScript Version** (No Dependencies)
- **File**: `index.html`
- **Used with**: `styles.css` + `script.js`
- **How to use**: Open `index.html` directly in browser
- **Pros**: No build step, no dependencies, instant preview
- **Cons**: No fancy animations, all vanilla code

### 2. **React Version** (Modern Stack)
- **Main files**: `App.jsx`, `main.jsx`, `package.json`, `vite.config.js`
- **HTML entry**: `index-react.html`
- **Framework**: React 18.2 + Framer Motion
- **Build tool**: Vite
- **Animations**: Smooth, physics-based background movements & transitions
- **Pros**: Modern dev experience, component reusability, advanced animations
- **Cons**: Requires Node.js and npm, build step needed

---

## 🚀 Using the React Version

### Step 1: Install Node.js (if not already installed)
- Download from: https://nodejs.org/ (LTS version recommended)
- Verify installation:
  ```bash
  node --version
  npm --version
  ```

### Step 2: Install Dependencies
Navigate to the CogniAuth folder and install:
```bash
npm install
```

This will install:
- `react@18.2.0` - UI library
- `react-dom@18.2.0` - React DOM rendering
- `framer-motion@10.16.4` - Animation library
- Build tools (Vite, etc.)

### Step 3: Start Development Server
```bash
npm run dev
```

Expected output:
```
  VITE v4.4.0  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  press h + enter to show help
```

The app will automatically open in your default browser at `http://localhost:3000`

### Step 4: Build for Production
When ready to deploy:
```bash
npm run build
```

Output files will be in the `dist/` folder.

---

## 🎨 What's New in the React Version?

### Animated Background
- **Floating grid pattern** that scrolls smoothly
- **Glowing orbs** that drift and float continuously
- **Smooth color transitions** between light/dark themes

### Interactive Elements
- **Button animations**: Scale up on hover, snap back on click
- **Form transitions**: Steps fade and slide in smoothly
- **Stats cards**: Lift up and scale on hover
- **Authentication flow**: Smooth page transitions with AnimatePresence

### Local AI Analysis
Interactive decision analyzer with:
- Real-time impulse scoring
- Emotional sentiment detection
- Domain categorization
- Visual risk indicators (Critical/High/Medium/Low)
- Trigger identification

---

## 📁 Project Structure After Setup

```
CogniAuth/
│
├── 📄 Vanilla JS Version (Production Ready)
│   ├── index.html          ← Open this in browser
│   ├── styles.css          ← All styling (21KB)
│   └── script.js           ← All JavaScript logic (57KB)
│
├── 📦 React Version (Modern Development)
│   ├── App.jsx             ← Main React component (complete app)
│   ├── main.jsx            ← React entry point
│   ├── index-react.html    ← HTML root for React
│   ├── package.json        ← Dependencies & scripts
│   ├── vite.config.js      ← Build configuration
│   │
│   └── node_modules/       ← (Created after npm install)
│       ├── react/
│       ├── react-dom/
│       ├── framer-motion/
│       └── ... (other dependencies)
│
├── 📖 Documentation
│   ├── README-REACT.md     ← React setup & features guide
│   └── SETUP.md            ← This file
│
├── ⚙️ Configuration
│   └── .gitignore          ← Git ignore rules
│
└── 📂 Build Output (after npm run build)
    └── dist/               ← Production files
```

---

## 🎯 Quick Comparison

| Feature | Vanilla JS | React |
|---------|-----------|-------|
| Setup time | 0 minutes | 5 minutes |
| File size (uncompressed) | 85 KB | ~200 KB (before build) |
| Build step | No | Yes (Vite) |
| Animations | Basic CSS | Advanced (Framer Motion) |
| State management | Manual | React hooks |
| File separation | Separate | All in App.jsx |
| Dev experience | Direct edit | Hot reload |
| Production | Open HTML | Build → deploy dist/ |
| Dark mode | CSS-based | React state-based |

---

## 🔄 Converting Between Versions

### Want to Use Vanilla JS?
1. Open `index.html` in your browser
2. No npm or build tools needed
3. Edit files directly with any text editor

### Want to Switch to React?
1. Run `npm install`
2. Run `npm run dev`
3. Edit `App.jsx` for changes
4. Hot reload automatically updates browser

### Can I Use Both?
**Yes!** You can keep both:
- Use vanilla `index.html` for quick testing
- Use React version for development with advanced features
- Files are independent

---

## 🎓 Learning Resources

### For React
- https://react.dev/ - Official React docs
- https://react.dev/learn/hooks - React Hooks explained

### For Framer Motion
- https://www.framer.com/motion/ - Official documentation
- Try the interactive examples for animation ideas

### For Vite
- https://vitejs.dev/ - Super fast build tool docs

---

## ⚡ Performance Notes

- **Vanilla JS**: Minimal overhead, instant load
- **React**: Slightly larger initial bundle, but:
  - Modern tooling optimizations
  - Component code splitting ready
  - Hot module replacement in dev
  - Minified production builds (~30-40KB gzipped)

---

## 🐛 Troubleshooting

### `npm install` fails?
```bash
# Clear npm cache and retry
npm cache clean --force
npm install
```

### Port 3000 already in use?
Edit `vite.config.js` and change the port:
```js
server: {
  port: 3001,  // Change this number
  open: true
}
```

### Animations not smooth?
- Check browser hardware acceleration is enabled
- Use latest version of browser
- Check performance on less powerful devices

### Want to debug AI analysis?
Open browser console and check the results:
```js
AI.analyze("test decision text")
```

---

## 🎨 Customization Examples

### Change animation speed
In `App.jsx`:
```jsx
transition={{
  duration: 20,  // Increase = slower
  repeat: Infinity,
  ease: 'linear',
}}
```

### Adjust theme colors
In `styles.css`:
```css
:root {
  --amber: #f0a500;    /* Change these hex colors */
  --red: #e84545;
  --green: #3ecf8e;
  /* ... more colors */
}
```

### Add more avatar colors
In `App.jsx`, edit the COLORS array:
```jsx
const COLORS = [
  { hex: '#f0a500', label: 'Amber' },
  { hex: '#e84545', label: 'Red' },
  // Add more...
  { hex: '#yourcolor', label: 'Your Color' },
];
```

---

## 💡 Next Steps

1. **Try the vanilla version first**: Open `index.html` to see what it looks like
2. **Set up React**: Run `npm install && npm run dev` for modern development
3. **Customize colors/animations**: Edit CSS and React component animations
4. **Add features**: Extend components or integrate with real backend
5. **Deploy**: Use `npm run build` to create production files

---

## 📞 Quick Commands Reference

```bash
# React Development
npm install      # Install dependencies (one time)
npm run dev      # Start dev server with hot reload
npm run build    # Build for production
npm run preview  # Preview production build

# Vanilla JS
# Just open index.html in your browser - that's it!
```

---

## 🎉 You're All Set!

Choose your path:
- **Quick Demo?** → Open `index.html`
- **Modern Development?** → Run `npm run dev`
- **Production Deploy?** → Run `npm run build`, host the `dist/` folder

**Happy coding!** 🚀
