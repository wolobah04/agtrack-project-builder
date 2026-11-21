# Appwrite integration

- [x] Add Appwrite browser and server clients with environment-based demo fallback.
- [x] Add an idempotent setup script for the database, tables, columns, indexes, teams, and first admin.
- [x] Move authentication, farm records, reports, public tracing, administration, chat history, and audit logs to Appwrite when configured.
- [x] Document setup and keep the browser-only demo mode available with `VITE_USE_MOCK=true`.
- [x] Run the setup script against Appwrite project `6b011308003b57f341b6`; 11 tables and the first admin were created.
- [x] Verify live agent/farmer sign-up, farm record creation, report generation, chat persistence, public tracing, and Ministry read-back.
- [x] Verify the final admin password update and remove all temporary Appwrite test data.

# Groq farm assistant

- [x] Build the authenticated Groq server function with live Open-Meteo and farmer-record context.
- [x] Replace static Appwrite chat replies with model responses and preserve conversation history.
- [x] Add the Groq API key through the secure secret form.
- [x] Verify a signed-in farmer receives an AI answer grounded in live weather and farm records.

# Real quality score

- [x] Calculate farmer and Ministry scores from complete saved records, with no demo or partial-load score.
- [x] Show the real record totals behind the farmer's score and its historical trend.
- [x] Give Groq the identical score, component breakdown and underlying record totals.
- [x] Test empty farms, real score changes and an AI quality-score answer.
- [x] Label the public example score and keep it separate from real farmer data.
- [x] Use the shared real-record score in the browser-demo assistant and REST Ministry fallback.
- [x] Re-run score, assistant, fallback and routing checks after the full-app sweep.

# Public buyer QR links

- [x] Generate QR codes with the permanent public app address instead of the private preview address.
- [x] Verify a signed-out buyer can open batch history at `https://agtrack.online` without a Lovable login.
- [x] Republish with buyer QR codes pointed at the verified `https://agtrack.online` domain.
- [x] Sweep all buyer QR, lookup, internal-link and database-read paths for login-free public batch history.

# Persistent login and authentication navigation

- [x] Keep saved sessions across refreshes until explicit sign-out and hide guest links for active users.
- [x] Sweep public pages, role dashboards, fallback clients, and Appwrite session functions for the same rule.
- [x] Re-test sign-in persistence, role navigation, and every sign-out path; clean up temporary accounts.

# Farmer crop seasons

- [x] Add season and planned-activity storage with owner-only farm access and linked expenses.
- [x] Build crop-season templates, editable planning calendar, mobile agenda, and actual-work timeline.
- [x] Support rescheduling, skipping, recurring field checks, unplanned work, and publication approval.
- [x] Show only approved completed work on the matching public batch, up to its harvest date.
- [x] Test scheduling, recurring work, expense linking, and harvest-cutoff privacy rules; verify the farmer flow and remove temporary records.

# Custom-domain weather

- [x] Reproduce the missing forecast in the published AI chat while the Weather page succeeds.
- [x] Identify AgTrack's Open-Meteo server requests and preserve provider errors for diagnostics.
- [x] Verify the preview AI answers with live Bomi rain probability and expected rainfall.
- [x] Publish the request-header fix and identify the remaining production `429` server-IP rate limit.
- [x] Send browser-fetched forecasts to the AI server function and verify the preview.
- [x] Republish and verify live AI weather on `https://agtrack.online`.
- [x] Remove the temporary farmer and chat records used for live domain verification.

# Ministry user and batch search

- [x] Add a polished global search with keyboard access and clear result states.
- [x] Search users by name, phone, county, or role and open matching accounts in Management.
- [x] Search harvest batch codes and open their public buyer traceability history.
- [x] Add filtering to Management and test the search rules and signed-in flow.
