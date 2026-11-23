# 4. Deploy to the Hostinger VPS

This puts the site live at **https://shreyasballari.com**. The other three addresses
(`www.shreyasballari.com`, `shreyasballari.ai`, `www.shreyasballari.ai`) permanently redirect to it,
so search engines see one site instead of four copies.

The site is fully static: `pnpm build` produces a `dist/` folder of HTML, JS, images and video.
nginx serves that folder. There is **no Node process, no port and no PM2** to run on the server, and
nothing here touches the other sites already on the VPS.

```
Browser ──► nginx (port 80/443, shared with the other sites)
              └─ server_name shreyasballari.com ──► /var/www/shreyasballari/site   (copy of dist/)
                                                    /var/www/shreyasballari/repo   (git clone, build happens here)
```

Commands below are run on the VPS over SSH as `root` (Hostinger's default). Lines starting with `#`
are comments. Replace `YOUR_VPS_IP` with the VPS's IPv4 address (hPanel → VPS → Overview).

---

## Step 1. Point both domains at the VPS (DNS)

In hPanel → **Domains** → `shreyasballari.com` → **DNS / Nameservers** → DNS records:

| Type | Name | Points to | TTL |
| --- | --- | --- | --- |
| A | `@` | `YOUR_VPS_IP` | 300 |
| A | `www` | `YOUR_VPS_IP` | 300 |

- **Delete** any other `A` records for `@` and `www` (Hostinger adds parking records by default).
- **Delete** any `AAAA` records for `@` and `www`, unless you know the VPS's IPv6 address and put
  that there instead. A leftover AAAA record is the most common reason the HTTPS certificate fails in
  Step 7.
- If `www` exists as a `CNAME`, delete it and add the `A` record above.

Do exactly the same for `shreyasballari.ai`.

Check from your own computer (can take 5 minutes to a few hours):

```sh
nslookup shreyasballari.com
nslookup www.shreyasballari.com
nslookup shreyasballari.ai
nslookup www.shreyasballari.ai
```

All four must answer with `YOUR_VPS_IP` before you do Step 7. You can do Steps 2 to 6 while you wait.

## Step 2. Check what web server the VPS already uses

```sh
ssh root@YOUR_VPS_IP

ss -tlnp | grep -E ':(80|443)\s'
```

- If the output says **`nginx`**, carry on with this guide.
- If it says `apache2`, `httpd`, `litespeed`, `caddy`, or `docker-proxy` (Coolify, Dokploy,
  Nginx Proxy Manager, Traefik …), or the VPS uses a panel such as CloudPanel, aaPanel or
  CyberPanel, **stop here**. Those need a different Step 6. Add the site through that tool instead,
  pointing it at `/var/www/shreyasballari/site`.

Also check that nothing else already claims these domains:

```sh
grep -rn "shreyasballari" /etc/nginx/ || echo "free"
```

## Step 3. Install Node 22, pnpm, git and rsync

The other sites may depend on whatever Node version is installed system-wide, so this uses **nvm**,
which installs Node only for the root user and does not replace anything.

```sh
apt update && apt install -y git rsync curl

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.nvm/nvm.sh

nvm install 22
npm install -g pnpm@9.15.0

node -v   # v22.x
pnpm -v   # 9.15.0
```

## Step 4. Give the VPS read access to the GitHub repo

**If the repo is public**, skip to Step 5 and use the `https://` clone line there.

**If the repo is private**, create a read-only deploy key:

```sh
ssh-keygen -t ed25519 -f ~/.ssh/shreyasballari_deploy -N "" -C "vps-deploy-shreyasballari"

cat >> ~/.ssh/config <<'EOF'

Host github-shreyasballari
  HostName github.com
  User git
  IdentityFile ~/.ssh/shreyasballari_deploy
  IdentitiesOnly yes
EOF

cat ~/.ssh/shreyasballari_deploy.pub
```

Copy the line that is printed. On GitHub: repo **Settings → Deploy keys → Add deploy key**, paste it,
title it `Hostinger VPS`, and leave **Allow write access unticked**.

```sh
ssh -T git@github-shreyasballari
# "Hi NFCSolutionsIndia/Shreyas_Ballari_Portfolio! You've successfully authenticated…" = working
```

## Step 5. Clone and build

```sh
mkdir -p /var/www/shreyasballari/site /var/www/letsencrypt
cd /var/www/shreyasballari

# Private repo (deploy key from Step 4):
git clone git@github-shreyasballari:NFCSolutionsIndia/Shreyas_Ballari_Portfolio.git repo
# Public repo instead:
# git clone https://github.com/NFCSolutionsIndia/Shreyas_Ballari_Portfolio.git repo

cd repo
pnpm install --frozen-lockfile
VITE_SITE_URL=https://shreyasballari.com pnpm build

rsync -a --delete dist/ /var/www/shreyasballari/site/
ls /var/www/shreyasballari/site    # should show index.html, assets/, …
```

`VITE_SITE_URL` must be set at build time. Without it, link previews (WhatsApp, LinkedIn, Google)
point at `localhost`. Do **not** set `BASE_PATH`; that is only for GitHub Pages.

> **If the build stops with `Killed` or "JavaScript heap out of memory"**, the VPS ran out of RAM
> (the 3D libraries are large). Add 2 GB of swap and run the build again:
>
> ```sh
> fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
> echo '/swapfile none swap sw 0 0' >> /etc/fstab
> ```

## Step 6. nginx, first part (HTTP only, for the certificate)

The certificate doesn't exist yet, so nginx can't load an HTTPS block yet. Start with just this:

```sh
cat > /etc/nginx/sites-available/shreyasballari.conf <<'EOF'
server {
    listen 80;
    server_name shreyasballari.com www.shreyasballari.com shreyasballari.ai www.shreyasballari.ai;

    location ^~ /.well-known/acme-challenge/ { root /var/www/letsencrypt; }
    location / { root /var/www/shreyasballari/site; try_files $uri $uri.html $uri/ /index.html; }
}
EOF

ln -s /etc/nginx/sites-available/shreyasballari.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

> If your nginx has no `sites-available`/`sites-enabled` folders (some CentOS/AlmaLinux setups), put the
> file in `/etc/nginx/conf.d/shreyasballari.conf` instead and skip the `ln -s` line.

**Always run `nginx -t` before reloading.** If it reports an error, nginx keeps running with the
old config, so the other sites stay up. Fix the error first.

Quick test, still over HTTP: open `http://shreyasballari.com` in a browser. The site should load.

## Step 7. Get the HTTPS certificate (one certificate for all four names)

```sh
certbot --version || apt install -y certbot

certbot certonly --webroot -w /var/www/letsencrypt \
  -d shreyasballari.com -d www.shreyasballari.com \
  -d shreyasballari.ai  -d www.shreyasballari.ai \
  --deploy-hook "systemctl reload nginx"
```

When it asks, enter an email for expiry notices and agree to the terms. Success ends with
`Successfully received certificate` and the path `/etc/letsencrypt/live/shreyasballari.com/`.
Renewal is automatic (certbot's timer). `--deploy-hook` reloads nginx after every renewal.

If it fails with "unauthorized" or "connection" errors: one of the four names doesn't resolve to the
VPS yet, or an `AAAA` record still exists. Go back to Step 1.

## Step 8. nginx, final config (HTTPS + redirects)

Replace the file from Step 6 with the full version:

```sh
cat > /etc/nginx/sites-available/shreyasballari.conf <<'EOF'
# Every http:// address → https://shreyasballari.com
server {
    listen 80;
    server_name shreyasballari.com www.shreyasballari.com shreyasballari.ai www.shreyasballari.ai;

    location ^~ /.well-known/acme-challenge/ { root /var/www/letsencrypt; }
    location / { return 301 https://shreyasballari.com$request_uri; }
}

# https://www.shreyasballari.com, https://shreyasballari.ai, https://www.shreyasballari.ai → main site
server {
    listen 443 ssl http2;
    server_name www.shreyasballari.com shreyasballari.ai www.shreyasballari.ai;

    ssl_certificate     /etc/letsencrypt/live/shreyasballari.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/shreyasballari.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    return 301 https://shreyasballari.com$request_uri;
}

# The site
server {
    listen 443 ssl http2;
    server_name shreyasballari.com;

    ssl_certificate     /etc/letsencrypt/live/shreyasballari.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/shreyasballari.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    root  /var/www/shreyasballari/site;
    index index.html;

    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml application/wasm model/gltf-binary;

    # Pages: always check for a new version, so updates show up immediately.
    location / {
        add_header Cache-Control "no-cache";
        add_header X-Content-Type-Options nosniff always;
        try_files $uri $uri.html $uri/ /index.html;
    }

    # Hand-gesture engine (MediaPipe) needs the correct type for .wasm files.
    location ~* \.wasm$ {
        types { } default_type application/wasm;
        expires 7d;
    }

    # Scripts, styles, fonts, pictures, 3D models, video: cache for a week.
    location ~* \.(?:js|mjs|css|woff2?|ttf|glb|gltf|bin|hdr|ktx2|png|jpe?g|webp|avif|gif|svg|ico|mp4|webm|json|webmanifest)$ {
        expires 7d;
        try_files $uri =404;
    }
}
EOF

nginx -t && systemctl reload nginx
```

> On nginx 1.25.1 or newer, `nginx -t` may print a warning that `listen ... http2` is deprecated.
> It's only a warning; the config still works.

## Step 9. Check it

```sh
curl -sI http://shreyasballari.ai        | grep -iE 'HTTP/|location'   # 301 → https://shreyasballari.com/
curl -sI https://www.shreyasballari.ai   | grep -iE 'HTTP/|location'   # 301 → https://shreyasballari.com/
curl -sI https://www.shreyasballari.com  | grep -iE 'HTTP/|location'   # 301 → https://shreyasballari.com/
curl -sI https://shreyasballari.com      | grep -iE 'HTTP/'            # 200
```

Then in a browser (and on a phone):

- [ ] https://shreyasballari.com loads, with a padlock.
- [ ] All three tabs at the bottom (Creative, Studio, Classic) work.
- [ ] The Oncure video plays.
- [ ] Reloading the page on a sub-page (not just the home page) still works and doesn't show an nginx 404.
- [ ] Hand control turns on (this exercises the `.wasm` files).
- [ ] Send a test message through the contact form and confirm it arrives. The form service may send
      a one-time confirmation email the first time it sees the new domain.
- [ ] The other sites on the VPS still load.

## Step 10. Publishing updates

Create the deploy script once:

```sh
cat > /usr/local/bin/deploy-shreyasballari <<'EOF'
#!/usr/bin/env bash
set -eo pipefail
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"

cd /var/www/shreyasballari/repo
git fetch --quiet origin main
git reset --hard origin/main
pnpm install --frozen-lockfile
VITE_SITE_URL=https://shreyasballari.com pnpm build

# Only replace the live files once the build has succeeded.
rsync -a --delete dist/ /var/www/shreyasballari/site/
echo "Deployed $(git log -1 --format='%h %s')"
EOF
chmod +x /usr/local/bin/deploy-shreyasballari
```

From then on, every update is:

1. On your computer: `git add -A`, `git commit -m "what changed"`, `git push`.
2. On the VPS: `ssh root@YOUR_VPS_IP deploy-shreyasballari`

If the build fails, the script stops before the `rsync` line, so the live site keeps the previous
version.

**Rolling back:** on the VPS, `cd /var/www/shreyasballari/repo`, `git log --oneline` to find a good
commit, `git reset --hard <commit>`, then run the `pnpm build` and `rsync` lines from the script by
hand. (Running `deploy-shreyasballari` again would bring back the latest version.)

---

## Troubleshooting

| Problem | Likely cause and fix |
| --- | --- |
| Browser shows one of the *other* sites | DNS points here but nginx didn't load this file. Run `nginx -T \| grep shreyasballari`; check the `ln -s` in Step 6 and that you reloaded. |
| Browser shows a Hostinger parking page | DNS still points at Hostinger's parking servers. Step 1. |
| `certbot` fails | A name doesn't resolve to the VPS yet, or an `AAAA` record remains. Step 1. Check with `nslookup -type=AAAA shreyasballari.com`. |
| 404 when reloading a sub-page | The `try_files` line is missing from `location /`. |
| Old version still showing after deploy | Hard-refresh (Ctrl + Shift + R). Pages aren't cached, but pictures and scripts are cached for 7 days. A replaced photo with the **same file name** can take up to a week to update for returning visitors, so give it a new name. |
| Hand control doesn't start | Check `curl -sI https://shreyasballari.com/mediapipe/wasm/vision_wasm_internal.wasm` shows `content-type: application/wasm`. |
| Build `Killed` | Out of memory. Add swap (Step 5 note). |
| nginx logs | `tail -f /var/log/nginx/error.log` |
