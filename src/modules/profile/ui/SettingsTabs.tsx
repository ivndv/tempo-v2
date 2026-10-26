import { Link } from "@/i18n/navigation";

interface SettingsTab {
	key: string;
	label: string;
}

interface SettingsTabsProps {
	tabs: SettingsTab[];
	active: string;
	label: string;
}

// Tabs de Ajustes con la sección activa en la URL.
export function SettingsTabs({ tabs, active, label }: SettingsTabsProps) {
	return (
		<nav aria-label={label} className="flex gap-1 overflow-x-auto border-b border-border">
			{tabs.map((tab) => (
				<Link
					key={tab.key}
					href={{ pathname: "/app/settings", query: { tab: tab.key } }}
					prefetch={false}
					aria-current={active === tab.key ? "page" : undefined}
					className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm transition ${
						active === tab.key
							? "border-primary text-primary"
							: "border-transparent text-muted hover:text-foreground"
					}`}
				>
					{tab.label}
				</Link>
			))}
		</nav>
	);
}
