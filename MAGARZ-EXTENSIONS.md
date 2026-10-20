# MagarZ Cloud extensions implementation map

## Panel navigation

`Extensions & Services` is a first-class sidebar page at `/extensions`, not a hidden setting. It groups the requested management, hosting/deployment, and admin/automation tools and offers search/status filters. It deliberately distinguishes available, partial, and provider-required features.

## Existing working routes/components surfaced by the hub

- Server console/logs and command controls: existing server detail routes and Socket.IO events.
- File Manager: existing `/api/servers/:id/files*` routes.
- SFTP: existing server SFTP UI.
- Resource usage: existing `/api/servers/:id/stats`.
- Backups: existing `/api/servers/:id/backups` routes.
- Node.js and Python application deployment: existing Deploy page runtime choices.
- API key management: `/api-keys`.
- Admin resource and user controls: existing admin server pages.

## Deployment limits

Node.js and Python runtimes are exposed because those are supported by the current runtime code. A working production Web Hosting product also needs a web gateway/reverse proxy, persistent port mapping, domain/DNS and TLS integration. PHP/WordPress, Git build workers, database provisioning, scheduled tasks, full audit logs, and KVM VPS provisioning are marked as requiring provider configuration rather than falsely advertised as enabled.

## Billing

No billing, payment, checkout, or order module is added by this change, as requested.

## Verify

Run `npm ci`, `npm run lint`, and `npm run build` in the deployment environment. Test in staging with the same Docker/Wings runtime and permissions as production before exposing provisioning actions.


## Live extension API added in this revision

- `GET /api/extensions/status` (authenticated): reads current `.data` inventory and reports explicitly configured/integrated versus provider-required capabilities.
- `GET /api/extensions/audit` (admin/owner): reads the latest 250 persisted audit events.
- Successful/failed mutating server API requests are recorded to `.data/audit_events.json` with actor, timestamp, action, target and response outcome. Request bodies/secrets are not logged.
- The Extensions & Services page now loads live inventory/status and can open the persisted audit log panel. Empty audit history is shown honestly.


## Working update: scheduled server tasks
- Added authenticated `/api/extensions/schedules` list/create/delete endpoints.
- Allows only start/stop/restart; verifies server ownership at creation and again at execution.
- Supports one-time or recurring execution (5 minutes to 7 days).
- Tasks persist in `.data/scheduled_tasks.json`; results and audit events are recorded.
- Scheduler is single-process. Do not run multiple panel replicas without replacing it with a distributed queue/lock.


## Production hardening pass (2026-10-20)
- HTTP and Socket.IO CORS now use an explicit origin allow-list via `CORS_ORIGINS`.
- Production startup requires a strong `JWT_SECRET`; development fallback is not accepted in production.
- JSON/form request body limits reduced to 2 MB by default; file uploads use dedicated upload routes.
- Socket.IO `joinServer` verifies server ownership before joining a log room.
- Baseline security response headers added; see `PRODUCTION-READINESS.md`.
