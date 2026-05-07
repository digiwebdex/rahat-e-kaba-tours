
# Migrate Project to VPS — alrawshaintl.com

The project is **already self-hosted ready**: it has its own Express backend (`server/`), PostgreSQL schema (`server/schema.sql`), and uses a custom API client (`@/lib/api`) — not the Supabase runtime. We only need to push to GitHub, clone on the VPS, install, build, configure Nginx + SSL, and run with PM2.

> Run **PowerShell** blocks on your local Windows machine. Run **VPS** blocks after you SSH into the server.

---

## Part A — Local (PowerShell): Push to GitHub

```powershell
# 1. Go to your local project folder (adjust path)
cd C:\path\to\your\project

# 2. Initialize git if not already
git init
git branch -M main

# 3. Connect to your GitHub repo
git remote remove origin 2>$null
git remote add origin https://github.com/digiwebdex/rahat-e-kaba-tours.git

# 4. Make sure secrets are NOT pushed
@"
node_modules
dist
.env
server/.env
server/uploads
*.log
"@ | Out-File -Encoding utf8 .gitignore -Append

# 5. Commit & push
git add .
git commit -m "Initial deploy to VPS"
git push -u origin main --force
```

---

## Part B — VPS: One-time Server Setup

SSH into the VPS:

```powershell
ssh root@187.77.144.38
```

Then run on the VPS:

```bash
# 1. Update + install required packages
apt update && apt upgrade -y
apt install -y curl git nginx ufw build-essential

# 2. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 3. Install PM2 globally
npm install -g pm2

# 4. Install PostgreSQL 16
apt install -y postgresql postgresql-contrib

# 5. Open firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

---

## Part C — VPS: Database Setup

```bash
# Create DB user + database (change the password!)
sudo -u postgres psql <<'SQL'
CREATE USER digiwebdex WITH PASSWORD 'ChangeThis_StrongPass_2026';
CREATE DATABASE alrawsha OWNER digiwebdex;
GRANT ALL PRIVILEGES ON DATABASE alrawsha TO digiwebdex;
\c alrawsha
GRANT ALL ON SCHEMA public TO digiwebdex;
SQL
```

---

## Part D — VPS: Clone & Configure Project

```bash
# 1. Clone repo
mkdir -p /var/www
cd /var/www
git clone https://github.com/digiwebdex/rahat-e-kaba-tours.git alrawsha
cd alrawsha

# 2. Backend env
cat > server/.env <<'EOF'
DATABASE_URL=postgresql://digiwebdex:ChangeThis_StrongPass_2026@127.0.0.1:5432/alrawsha
JWT_SECRET=replace_with_long_random_string_1
JWT_REFRESH_SECRET=replace_with_long_random_string_2
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
PORT=3004
FRONTEND_URL=https://alrawshaintl.com
UPLOAD_DIR=./uploads
BULKSMSBD_API_KEY=
BULKSMSBD_SENDER_ID=ALRAWSHA
RESEND_API_KEY=
NOTIFICATION_FROM_EMAIL=noreply@alrawshaintl.com
EOF

# 3. Frontend env (point API to same domain)
cat > .env <<'EOF'
VITE_API_URL=/api
EOF

# 4. Load DB schema
sudo -u postgres psql -d alrawsha -f server/schema.sql

# 5. Install backend deps + create uploads dir
cd /var/www/alrawsha/server
npm install --production
mkdir -p uploads

# 6. Install frontend deps + build
cd /var/www/alrawsha
npm install
npm run build
```

---

## Part E — VPS: Run Backend with PM2

```bash
cd /var/www/alrawsha/server
pm2 start index.js --name alrawsha-api
pm2 save
pm2 startup systemd -u root --hp /root
# Run the command PM2 prints, then:
pm2 save
```

---

## Part F — VPS: Nginx + Domain

```bash
cat > /etc/nginx/sites-available/alrawsha <<'NGINX'
server {
    listen 80;
    server_name alrawshaintl.com www.alrawshaintl.com;

    client_max_body_size 25M;

    location /api/ {
        proxy_pass http://127.0.0.1:3004/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        alias /var/www/alrawsha/server/uploads/;
    }

    location / {
        root /var/www/alrawsha/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/alrawsha /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
```

**DNS:** At your domain registrar, point:
- `A    @     187.77.144.38`
- `A    www   187.77.144.38`

Wait 5–30 minutes for DNS propagation, then install SSL:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d alrawshaintl.com -d www.alrawshaintl.com --non-interactive --agree-tos -m admin@alrawshaintl.com --redirect
systemctl reload nginx
```

---

## Part G — Standard Update Workflow (after future code changes)

**Local PowerShell:**
```powershell
git add .
git commit -m "Update"
git push origin main
```

**VPS:**
```bash
cd /var/www/alrawsha
git pull origin main
cd server && npm install --production && cd ..
npm install && npm run build
pm2 reload alrawsha-api
```

---

## Verification Checklist

- `https://alrawshaintl.com` loads the homepage
- `https://alrawshaintl.com/api/health` returns OK (or any 2xx)
- `pm2 status` shows `alrawsha-api` online
- `sudo -u postgres psql -d alrawsha -c "\dt"` lists tables
- Admin login works at `/auth`

---

## Important Notes

- **No Supabase / Lovable runtime is used** — the app talks to `/api` on your own VPS, backed by your local PostgreSQL.
- The default admin user is created via `server/schema.sql` seeds (check the file for credentials, then change immediately).
- Replace **all** `replace_with_...` and the database password with strong random values before going live.
- File uploads land in `/var/www/alrawsha/server/uploads/` — back this folder up regularly along with the database (`pg_dump alrawsha`).
