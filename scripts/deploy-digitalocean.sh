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

echo "=== Installing Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2

echo "=== Setting up PostgreSQL ==="
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME};" 2>/dev/null || true
sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" 2>/dev/null || true

echo "=== Cloning repository ==="
mkdir -p /var/www
cd /var/www
if [ ! -d "${APP_DIR}" ]; then
  git clone https://github.com/m109-coder/curlsarefun.git
fi
cd ${APP_DIR}
git pull origin main

echo "=== Installing Node modules ==="
npm install
npx prisma generate

echo "=== Creating .env ==="
# The user must edit this section with real secrets before running the script.
cat > .env << EOF
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"
NEXT_PUBLIC_APP_URL=http://${APP_IP}
NODE_ENV=production
JWT_SECRET=super-secret-jwt-key-change-in-production-please-use-32-chars
ADMIN_EMAIL=admin@curlsarefun.com
ADMIN_PASSWORD=Curls2024!

# Required for full functionality — replace with real values
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_token
SHOPIFY_ADMIN_ACCESS_TOKEN=your_admin_token
SHOPIFY_API_VERSION=2024-01
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
STRIPE_SECRET_KEY=sk_test_your_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
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
