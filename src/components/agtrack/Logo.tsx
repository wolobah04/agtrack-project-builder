import logo from "@/assets/agtrack-logo.png.asset.json";
import { cn } from "@/lib/utils";
export function Logo({ className }: { className?: string }) {
  return <img src={logo.url} alt="AgTrack" className={cn("h-8 w-auto", className)} />;
}
