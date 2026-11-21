# AgTrack

Farm records, field-agent support, produce traceability and Ministry reporting for Liberia.

## Backend

AgTrack is connected to **Appwrite Cloud** project `6b011308003b57f341b6`. The database contains 11 tables covering users, separate security roles, harvests, expenses, losses, inventory, traceability, reports, activity, chat history and notifications.

All data access goes through `src/lib/api.ts`. Appwrite is used automatically; the earlier REST API and browser sample-data mode remain fallbacks.

- [Complete Appwrite setup guide](docs/appwrite-setup.md)
- [Idempotent schema setup script](scripts/setup-appwrite.mjs)

```sh
bun install
bun run appwrite:setup
bun run dev
```

The setup script requires `APPWRITE_PROJECT_ID` and a server-only `APPWRITE_API_KEY`. It can also create the first Ministry admin when `APPWRITE_ADMIN_PHONE` and `APPWRITE_ADMIN_PASSWORD` are set. See the setup guide before running it locally.

## Checks

```sh
bun run test
oj typecheck -b --noEmit
```

## Continue with Lovable

Edit this project in the [Lovable editor](https://lovable.dev/projects/1003bbae-3eeb-4b17-9ed0-fd044c80451a). Changes committed here stay in sync with the editor.
