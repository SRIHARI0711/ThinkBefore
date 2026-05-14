#!/bin/bash
# ML Model Quick Start & Training Guide

echo "================================"
echo "CogniAuth ML Model - Quick Start"
echo "================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js found: $(node -v)"
echo ""

# Step 1: Install dependencies
echo "Step 1: Installing dependencies..."
npm install
echo ""

# Step 2: Train the model
echo "Step 2: Training ML model..."
echo "This will:"
echo "  • Load 240 labeled training examples"
echo "  • Split into train/validation/test sets"
echo "  • Train Naive Bayes classifier"
echo "  • Evaluate on test set"
echo "  • Save trained model to ml-model-trained.json"
echo ""

node ml-training.mjs

if [ ! -f ml-model-trained.json ]; then
    echo "❌ Training failed. Model file not created."
    exit 1
fi

echo ""
echo "✅ Model training complete!"
echo ""

# Step 3: Show what's been created
echo "Generated files:"
ls -lh ml-training-data.json ml-model-trained.json mlModel.js 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
echo ""

# Step 4: Start development server
echo "Step 3: Starting development server..."
echo "Open http://localhost:5173 in your browser"
echo ""
npm run dev
