# AgTrack

Farm records, field-agent support, produce traceability and Ministry reporting for Liberia.

## Backend

AgTrack is connected to **Appwrite Cloud** project `6b011308003b57f341b6`. The database contains 11 tables covering users, separate security roles, harvests, expenses, losses, inventory, traceability, reports, activity, chat history and notifications.

All data access goes through `src/lib/api.ts`. Appwrite is used automatically; the earlier REST API and browser sample-data mode remain fallbacks.

- [Complete Appwrite setup guide](docs/appwrite-setup.md)
- [Idempotent schema setup script](scripts/setup-appwrite.mjs)

## AI farm assistant

The farmer chat uses Groq's `openai/gpt-oss-120b` model through an authenticated server function. The browser fetches live Open-Meteo weather for the farmer's selected or mentioned county and sends it with the question, avoiding shared server-IP rate limits. Each request also includes only the signed-in farmer's own harvest, expense, loss, inventory and traceability records. It includes the farmer's current quality score, calculated with the same shared formula and complete records used by the farmer and Ministry dashboards. Store `GROQ_API_KEY` in the project's secure Secrets settings; it is never sent to the browser. The browser-only sample-data mode keeps its rule-based fallback and calculates score answers from the records saved in that mode.

## Quality score

The quality score is derived from saved farm records rather than stored as demo data. Empty farms start at 0, incomplete record loads show an error instead of a partial score, and the farmer page shows the harvest, loss, traceability and activity totals behind the result.

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
