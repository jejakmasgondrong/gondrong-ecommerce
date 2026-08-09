import packageJson from "../../package.json";

export default function VersionBadge() {
  const version =
    process.env.NEXT_PUBLIC_APP_VERSION ?? packageJson.version ?? "0.0.0";

  return (
    <span
      title={`GondrongShop · release version`}
      className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
    >
      v{version}
    </span>
  );
}