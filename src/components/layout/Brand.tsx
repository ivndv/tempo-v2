import { Timer } from "lucide-react";
import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";

interface BrandProps {
	href?: ComponentProps<typeof Link>["href"];
}

// Marca de Tempo: logo + nombre, compartida por header, footer y auth.
export function Brand({ href = "/" }: BrandProps) {
	return (
		<Link href={href} className="group flex items-center gap-2.5">
			<span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground transition group-hover:bg-primary-hover">
				<Timer size={17} strokeWidth={2.5} aria-hidden />
			</span>
			<span className="text-lg font-semibold tracking-tight text-foreground">Tempo</span>
		</Link>
	);
}
