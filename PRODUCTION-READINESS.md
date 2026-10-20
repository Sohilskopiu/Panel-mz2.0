# MagarZ Cloud — Production Readiness Notes

## Changes in this pass
- Removed permissive wildcard CORS defaults and added `CORS_ORIGINS` allow-list support.
- Added bounded JSON/urlencoded request bodies; large uploads must use the existing multipart/chunk endpoints.
- Disabled Express `X-Powered-By` and added baseline security response headers.
- Production startup now refuses the development JWT fallback; configure a unique `JWT_SECRET` of at least 32 characters.
- Socket.IO server log subscriptions now verify that the authenticated user owns the requested server, unless they are admin/owner.
- Socket.IO and HTTP CORS share the configured origin allow-list.

## Required environment configuration
- `NODE_ENV=production`
- `JWT_SECRET` — unique random secret, at least 32 characters; never commit it.
- `CORS_ORIGINS` — comma-separated exact HTTPS origins, e.g. `https://panel.example.com`.
- Configure TLS at a trusted reverse proxy; do not expose the app directly to the public internet without it.
- Protect `.data`, backups, uploaded files, and Docker socket access with OS permissions.

## Important feature status
The Extensions Hub intentionally labels integrations as available, partial, or requiring provider setup. A visible card does not mean an external provider is configured. Billing/payment features are not part of this project scope.

## Before production release
1. Run `npm ci`, `npm run lint`, and `npm run build` on the target Node.js version.
2. Run the panel in an isolated staging host with a non-production Docker node.
3. Verify all owner/role checks for every server mutation endpoint and WebSocket event.
4. Test backup restore from a real backup, not just backup creation.
5. Configure a reverse proxy, TLS, firewall, log rotation, and tested off-host backups.
6. Do not mount `/var/run/docker.sock` into untrusted containers or expose it to customer-controlled code.
7. Use a queue/distributed lock before enabling scheduled jobs on multiple replicas.

## Not claimed as complete
Git deployment workers, PHP-FPM/WordPress provisioning, managed database lifecycle, DNS/SSL automation, Lavalink templates, and Proxmox/KVM provisioning require provider-specific implementation and live tests.
