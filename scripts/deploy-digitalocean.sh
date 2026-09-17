#!/bin/bash
# Deploy CurlsAreFun to a fresh DigitalOcean Droplet (Ubuntu 22.04/24.04)
# Run this as root on the Droplet after copying the file with scp.

set -e

APP_DIR="/var/www/curlsarefun"
DB_NAME="curlsarefun"
DB_USER="curls"
DB_PASS="CurlsDB2024!"
APP_IP="164.92.126.232"

echo "=== Updating system ==="
apt update

echo "=== Installing dependencies ==="
apt install -y curl git nginx postgresql postgresql-contrib ufw

echo "=== Installing Node.js 22 ==="
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g pm2

echo "=== Setting up PostgreSQL ==="
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME};" 2>/dev/null || true
sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" 2>/dev/null || true

echo "=== Cloning repository ==="
mkdir -p /var/www
if [ ! -d "${APP_DIR}" ]; then
  git clone https://github.com/m109-coder/curlsarefun.git ${APP_DIR}
fi
cd ${APP_DIR}
git pull origin main

echo "=== Installing Node modules ==="
npm install
npx prisma generate

echo "=== Creating .env ==="
# IMPORTANT: Replace <PLACEHOLDER> values with real credentials before running.
cat > .env << 'EOF'
DATABASE_URL="postgresql://curls:CurlsDB2024!@localhost:5432/curlsarefun"
NEXT_PUBLIC_APP_URL=http://164.92.126.232
NODE_ENV=production
JWT_SECRET=super-secret-jwt-key-change-in-production-please-use-32-chars
ADMIN_EMAIL=admin@curlsarefun.com
ADMIN_PASSWORD=Curls2024!

# Optional Supabase Storage (only needed for promo image uploads)
NEXT_PUBLIC_SUPABASE_URL=<PLACEHOLDER>
SUPABASE_SERVICE_ROLE_KEY=<PLACEHOLDER>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<PLACEHOLDER>

# Shopify (required for products/orders)
SHOPIFY_STORE_DOMAIN=<PLACEHOLDER>
SHOPIFY_STOREFRONT_ACCESS_TOKEN=<PLACEHOLDER>
SHOPIFY_ADMIN_ACCESS_TOKEN=<PLACEHOLDER>
SHOPIFY_API_VERSION=2024-01
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=<PLACEHOLDER>

# Stripe (required for payments)
STRIPE_SECRET_KEY=<PLACEHOLDER>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<PLACEHOLDER>
STRIPE_WEBHOOK_SECRET=<PLACEHOLDER>
EOF

echo "=== Running Prisma migrations ==="
npx prisma migrate deploy

echo "=== Building Next.js ==="
npm run build

echo "=== Starting with PM2 ==="
pm2 delete curlsarefun 2>/dev/null || true
pm2 start npm --name "curlsarefun" -- start
pm2 startup
pm2 save

echo "=== Configuring Nginx ==="
cat > /etc/nginx/sites-available/curlsarefun << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

if [ ! -f /etc/nginx/sites-enabled/curlsarefun ]; then
  ln -s /etc/nginx/sites-available/curlsarefun /etc/nginx/sites-enabled/
fi

rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

echo "=== Firewall ==="
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw --force enable

echo "=== Done ==="
echo "App should be running at http://${APP_IP}"
