#!/bin/bash

# Learning Tracker Deployment Script
# This script helps deploy the app to Netlify

echo "🚀 Learning Tracker Deployment Script"
echo "=================================="

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "📦 Installing Netlify CLI..."
    npm install -g netlify-cli
fi

# Check if we're in a git repository
if [ ! -d .git ]; then
    echo "📁 Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit: Learning Tracker v1.0.0"
    echo ""
    echo "⚠️  IMPORTANT: You need to:"
    echo "   1. Create a GitHub repository at https://github.com"
    echo "   2. Run: git remote add origin https://github.com/YOUR_USERNAME/learning-tracker.git"
    echo "   3. Run: git push -u origin main"
    echo "   4. Then run this script again to deploy"
    exit 1
fi

# Check if remote origin exists
if ! git remote get-url origin &> /dev/null; then
    echo "❌ No GitHub remote found. Please set up GitHub repository first."
    echo "   See DEPLOYMENT.md for detailed instructions."
    exit 1
fi

# Build the project
echo "🔨 Building the project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Deploy to Netlify
    echo "🌐 Deploying to Netlify..."
    npm run deploy
    
    if [ $? -eq 0 ]; then
        echo "🎉 Deployment successful!"
        echo ""
        echo "📊 Your app is now live on Netlify!"
        echo "🔗 Check your Netlify dashboard for the URL"
    else
        echo "❌ Deployment failed. Check Netlify configuration."
    fi
else
    echo "❌ Build failed. Please fix errors and try again."
fi

echo ""
echo "📚 For detailed instructions, see DEPLOYMENT.md"
