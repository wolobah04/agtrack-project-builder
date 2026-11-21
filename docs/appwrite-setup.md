# AgTrack Appwrite setup

AgTrack uses Appwrite Cloud for accounts, role-aware data access, farm records, reports, public traceability, chat history, notifications, and audit logs. Set `VITE_USE_MOCK=true` to use the existing browser-only sample-data mode instead.

## 1. Create the project

1. Open [Appwrite Cloud](https://cloud.appwrite.io/) and create a project named **AgTrack**.
2. Copy its **Project ID** from the project settings.
3. In **Overview → Integrations → Platforms**, add a **Web** platform for each app hostname you use (the Lovable preview hostname, your published hostname, and `localhost` for local development).
4. In **Settings → API keys**, create a server key with **Auth/Users**, **Databases**, and **Teams** read/write scopes. Never expose this key in browser code or commit it.

The AgTrack project ID is `6b011308003b57f341b6`. The default endpoint is `https://cloud.appwrite.io/v1`.

## 2. Configure environment variables

Copy `.env.example` values into your local environment or hosting settings:

- `VITE_APPWRITE_ENDPOINT` and `VITE_APPWRITE_PROJECT_ID`: public browser configuration.
- `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`: server-only setup and API access.
- `APPWRITE_DATABASE_ID`: defaults to `agtrack`.
- `GROQ_API_KEY`: server-only key for the AI farm assistant. Create it in the [Groq console](https://console.groq.com/keys) and store it in the project's secure Secrets settings; never expose it to the browser.

For the first Ministry account, optionally set `APPWRITE_ADMIN_NAME`, `APPWRITE_ADMIN_PHONE`, and `APPWRITE_ADMIN_PASSWORD`. Passwords need at least 8 characters. Do not commit real passwords.

## 3. Create the database

```sh
bun install
bun run appwrite:setup
```

The script is idempotent: you can safely run it again. It creates the database, all tables, columns, indexes, role teams, and an optional first Ministry admin. It does not delete or reset existing data.

### Tables created

| Table | Purpose |
| --- | --- |
| `users` | Names, phone numbers, counties, farm types, assignments and active status |
| `user_roles` | Farmer, agent and Ministry roles, separated from editable profiles |
| `harvests` | Harvest quantities, grades and unique batch codes |
| `expenses` | Farm costs by category, optionally linked to a crop-season activity |
| `crop_seasons` | Plot-specific crop seasons, planting dates and linked harvest batches |
| `crop_activities` | Private plans, actual work history, repeat checks and buyer approval |
| `losses` | Crop losses and causes |
| `inventory` | Stock-in and stock-out transactions |
| `traces` | Harvest, storage, transfer and sale history |
| `reports` | Generated farm report summaries |
| `audit` | Ministry-visible activity history |
| `chat_messages` | Private farm assistant history |
| `notifications` | Per-user notification records |

All application tables deny direct browser writes. TanStack server functions validate the Appwrite session JWT, check the separate role record and farmer assignment, then use the server key. Public batch lookup returns only the batch's crop, county, grade, safe trace stages, and farmer-approved completed crop activities dated on or before the batch harvest. Planned, overdue and skipped work always remains private.

## 4. Sign in

AgTrack keeps its phone-number sign-in interface. Internally, each phone maps to a private synthetic Appwrite email such as `231770000003@phone.agtrack.app`; users never need to enter that email.

The first admin uses the phone and password supplied to the setup script. Re-running the script with a changed `APPWRITE_ADMIN_PASSWORD` updates that admin's password. Farmers and agents can then register through the normal sign-up screens. Agents can also register farmers assigned to them.

Phone-only accounts cannot receive Appwrite email recovery links. A field agent or Ministry admin must help with those password resets.

## Local commands

```sh
bun run test
bun run build
```
