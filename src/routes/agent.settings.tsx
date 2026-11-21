import { createFileRoute } from "@tanstack/react-router";
import { SettingsView } from "@/components/agtrack/SettingsView";
export const Route = createFileRoute("/agent/settings")({ component: () => <SettingsView /> });
