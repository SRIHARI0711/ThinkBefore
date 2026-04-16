# CogniGuard - React Version

A modern AI-powered impulse intervention system built with **React**, **Framer Motion**, and **Vite**.

## 🚀 Features

- **React Components**: Modular, reusable UI components with smooth animations
- **Framer Motion**: Beautiful, physics-based animations for background elements and interactions
- **Local AI Engine**: Rule-based NLP for decision analysis (no API needed)
- **Dark/Light Theme**: Toggle between dark and light modes with smooth transitions
- **Responsive Design**: Mobile-first design that works on all screen sizes
- **Authentication Flows**: Multi-step signup and login with validation
- **Decision Dashboard**: Analyze your decisions with real-time impulse scoring
- **Profile Management**: Customize your avatar and profile settings
- **Decision History**: Track all your analyzed decisions with filtering

## 📦 Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```
   The app will open at `http://localhost:3000`

3. **Build for production:**
   ```bash
   npm run build
   ```

## 🎨 Animations & Movements

### Background Animations
- **Floating grid pattern** - Smooth scrolling grid background that creates depth
- **Glow orbs** - Two animated circles that move and float independently, creating atmospheric lighting effects
- **Smooth transitions** - All page transitions use AnimatePresence for fluid motion

### Interactive Animations
- **Button hover effects** - Scale and subtle lift on hover
- **Form inputs** - Smooth focus states and transitions
- **Stats cards** - Scale up on hover with momentum
- **Quick analysis meter** - Animated progress bar that fills smoothly
- **Step transitions** - Authentication steps fade and slide in (0.35s easing)
- **Activity feed** - Staggered fade-in animations for decision history

### Theme Toggle
- **Smooth color transitions** - All colors transition smoothly when switching themes (0.25s)
- **Icon animation** - Theme toggle thumb smoothly slides between light/dark positions

## 🧠 Local AI Engine

The built-in AI analyzes decisions by:

1. **Domain Detection**: Categorizes decisions (financial, social, relationship, productivity, health)
2. **Sentiment Analysis**: Identifies emotional states (angry, sad, excited, stressed, neutral)
3. **Impulse Scoring**: Weighs 12+ factors including:
   - Urgency language
   - Emotional intensity
   - Severe consequence triggers
   - Caps and punctuation intensity
   - Word count and timing pressure

4. **Risk Assessment**: Maps scores to risk levels
   - 🔴 **Critical** (76+): Immediate intervention needed
   - 🟑 **High** (51-75): Consider waiting
   - 🔵 **Medium** (26-50): Reflect on decision
   - 🟢 **Low** (<26): Likely good decision

## 📁 Project Structure

```
CogniAuth/
├── App.jsx                 # Main React component with all views
├── main.jsx               # React entry point
├── index.html             # Original vanilla JS version
├── index-react.html       # React HTML entry point (for Vite)
├── styles.css             # Shared CSS styling
├── script.js              # Original vanilla JS logic
├── package.json           # Dependencies and scripts
├── vite.config.js         # Vite configuration
└── README.md              # This file
```

## 🔄 How to Use

### For Development
1. **Vanilla JS Version**: Open `index.html` in browser
2. **React Version**: Run `npm run dev` to start dev server

### Authentication
- **Quick Demo Login**: 
  - Email: any email
  - Password: any password (demo-only, no real auth)
  
- **Sign Up**: Create account with nickname and custom avatar color

### Analyze Decisions
1. Go to Dashboard (after login)
2. Enter a decision in the "Quick Analysis" box
3. Click "⚡ Analyze" to see impulse score and intervention

### View History
- See all analyzed decisions with risk levels and domains
- Filter by risk level
- View decision details and reasoning

## 🎯 Key React Hooks Used

- `useState` - Managing form inputs, page state, theme
- `useEffect` - Theme initialization
- `useRef` - Optional for complex animations
- `AnimatePresence` - Smooth page/component transitions

## 🎬 Animation Libraries

- **Framer Motion** (v10.16.4): For smooth, declarative animations
  - Used for: Background orbs, button interactions, page transitions, progress bars
  - Key features: `animate`, `whileHover`, `whileTap`, `transition`, `AnimatePresence`

## 🚀 Performance Tips

- Component animations use GPU acceleration
- Background animations run at 60fps on modern devices
- Code splitting ready with Vite
- No external API calls - all processing is local

## 🎨 Customization

### Change Colors
Edit CSS variables in `styles.css`:
```css
:root {
  --amber: #f0a500;
  --red: #e84545;
  --green: #3ecf8e;
  /* ... more colors */
}
```

### Modify Animations
Update animation speeds in `App.jsx`:
```jsx
animate={{
  x: [0, 50, 0],
  y: [0, -50, 0],
}}
transition={{
  duration: 15,  // Change this
  repeat: Infinity,
  ease: 'easeInOut',
}}
```

### Add New Features
Create new components and use the AI engine:
```jsx
const result = AI.analyze(userInput);
// result contains: domain, sentiment, impulseScore, riskLevel, intervention, triggers
```

## 📝 Notes

- Local storage is used for user data (demo-only)
- No backend or database integration
- All data is stored in browser's localStorage
- Works completely offline
- Perfect for testing UI/UX patterns

## 🔧 Tech Stack

- **React 18.2** - UI library
- **Framer Motion 10.16** - Animation library
- **Vite 4.4** - Build tool & dev server
- **CSS 3** - Styling with custom properties
- **Vanilla JavaScript** - AI logic

## 💡 Next Steps

Want to extend this? Try:
1. Add state management (Redux, Zustand)
2. Connect to a real backend API
3. Add more animation sequences
4. Implement PWA features
5. Add dark mode persistence
6. Create mobile app version with React Native

---

**Built with ❤️ using React & Framer Motion**
