#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting Deployment for Codex..."

# Ensure we are in the project root
cd "$(dirname "$0")/.."

# 1. Environment Check
echo "🔑 Checking environment..."
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file missing! Please create it manually on the server."
    exit 1
fi

# 2. Update Code (Assuming this script is triggered AFTER a git pull or by the runner)
# git pull origin main # The GitHub runner usually handles this part

# 3. Backend Deployment (Laravel)
echo "🐘 Installing PHP dependencies..."
composer install --no-dev --optimize-autoloader

echo "📂 Setting permissions..."
chmod -R 775 storage bootstrap/cache

echo "🗄️ Running migrations..."
php artisan migrate --force

# 4. Frontend Deployment (React/Vite)
echo "⚛️  Installing JS dependencies..."
bun install

echo "🛠️ Building assets..."
bun run build

# 5. Optimization & Cleanup
echo "🧹 Clearing and caching..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize

# 6. Restart Workers
echo "🔄 Restarting queue workers..."
php artisan queue:restart

echo "✅ Deployment Finished Successfully!"
