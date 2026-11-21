import { createFileRoute } from "@tanstack/react-router";
import { SettingsView } from "@/components/agtrack/SettingsView";
export const Route = createFileRoute("/farmer/settings")({ component: () => <SettingsView /> });
