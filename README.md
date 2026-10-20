# MagarZ Cloud Panel (JTG-based)

## One-command VPS installer

After uploading **the contents of this ZIP** to the root of the public
`Sohilisopiu/mz-panel` GitHub repository and committing them to the `main`
branch, run this on a supported Ubuntu/Debian VPS:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Sohilisopiu/mz-panel/main/install.sh)
```

The one-line installer downloads the repository into `/opt/mz-panel` when run
as root (or `~/mz-panel` as a regular user), then opens the interactive menu.
Do not use the GitHub repository page URL as the script URL; `curl` needs the
Raw `install.sh` URL. Review scripts before running them as root.

If your repository uses a different branch or the project files are inside a
subfolder, update the Raw URL/repository layout accordingly.


Made by Jishnu

## Quick Automated Setup (Recommended)

Run the automated management script:

```bash
bash install.sh
```

Menu Options:
1. **Install Panel** (Installs Node.js, Docker, PM2, dependencies, builds & starts on port 6767)
2. **Update Panel**
3. **Create Admin User**
4. **Restart Panel**
5. **Exit**

---

## Manual Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/JishnuTheGamer/Jtg.git
   cd Jtg
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the application:
   ```bash
   npm run build
   ```

4. Create an admin user:
   ```bash
   npm run createuser
   ```

5. Start the server (Port 6767):
   ```bash
   npm run start
   ```

## Development

To run the panel in development mode on port 3000:

```bash
npm run dev
```



## MagarZ Cloud web runtime update (2026-10-18)

The Deploy wizard now includes **Static Website** and **PHP Website** profiles in addition to existing Node.js and Python application profiles. With Docker runtime enabled, static sites use `nginx:alpine` and serve files from the server's persistent file directory; PHP sites use `php:<version>-cli-alpine` and serve `public/` with PHP's built-in HTTP server. Starter `index.html` / `public/index.php` files are created automatically.

These are functional basic runtime profiles, not a complete managed website platform. Custom domain routing, automatic HTTPS/ACME, Git build workers, WordPress one-click + database provisioning, PHP-FPM production tuning, and database management are not included in this update. Use Docker runtime; the local-process runtime currently supports Node.js/Python and Minecraft only.

Build verification note: `npm run build` requires project dependencies. In the editing environment, `vite` was unavailable in `node_modules`, so a full build could not be run here. Run `npm ci && npm run build` on the target development environment before deploying.


## MagarZ Cloud production notes

See `PRODUCTION-READINESS.md` for the security hardening added to this working copy and the mandatory deployment checks. Configure `JWT_SECRET` and `CORS_ORIGINS` before production use. Do not expose Docker socket access or the panel API directly to the public internet.
