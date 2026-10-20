# MagarZ Cloud extension API update

This update works on the existing panel project and does not re-add the Minecraft, Node.js, or Python choices shown in the Deploy screenshot.

## Added
- Authenticated `GET /api/extensions/status`: reads actual panel inventory from `.data/servers.json` and `.data/users.json`, and labels provider-dependent capabilities honestly.
- Admin/owner-only `GET /api/extensions/audit`: returns up to 250 most recent persisted audit events.
- Server mutation audit middleware records actor, timestamp, action, target ID, HTTP result; request bodies and credentials are never recorded.
- Extensions & Services page displays live inventory/capabilities and an audit-log viewer.

## API
- `GET /api/extensions/status` — any authenticated user.
- `GET /api/extensions/audit` — admin/owner only.

## Verification limits
`npm run lint` could not complete because the environment's `node_modules` is incomplete (missing `@types/*` packages). `npm run build` could not start because `vite` in the mounted `node_modules/.bin` is not executable. No live deployment test was possible here. Run `npm ci`, `npm run lint`, and `npm run build` in the actual deployment environment before production.
