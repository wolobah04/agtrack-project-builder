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
