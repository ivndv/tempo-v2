import { Timer } from "lucide-react";
import { VolverAtras } from "@/components/layout/VolverAtras";

interface AuthShellProps {
	titulo: string;
	subtitulo: React.ReactNode;
	children: React.ReactNode;
	pie?: React.ReactNode;
	volverA?: React.ComponentProps<typeof VolverAtras>["fallback"];
}

export function AuthShell({ titulo, subtitulo, children, pie, volverA = "/" }: AuthShellProps) {
	return (
		<main className="mx-auto flex min-h-[calc(100svh-var(--header-h))] w-full max-w-5xl flex-1 items-center px-4 py-10 sm:px-6 sm:py-16">
			<div className="mx-auto w-full max-w-sm">
				<div className="mb-6">
					<VolverAtras fallback={volverA} />
				</div>

				<div className="space-y-3 text-center">
					<span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
						<Timer size={22} aria-hidden />
					</span>

					<h1 className="text-3xl font-semibold tracking-tight">{titulo}</h1>
					<p className="text-sm text-muted">{subtitulo}</p>
				</div>

				<div className="mt-8">{children}</div>

				{pie ? <div className="mt-8 text-center text-xs text-muted">{pie}</div> : null}
			</div>
		</main>
	);
}
