import type { ReactNode } from "react";

interface LegalShellProps {
	etiqueta: string;
	titulo: string;
	actualizado: string;
	children: ReactNode;
}

// Estructura común de las páginas legales.
export function LegalShell({ etiqueta, titulo, actualizado, children }: LegalShellProps) {
	return (
		<main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
			<header className="space-y-3 border-b border-border pb-8">
				<p className="text-xs font-medium uppercase tracking-[0.35em] text-primary">{etiqueta}</p>
				<h1 className="text-4xl font-semibold tracking-tight">{titulo}</h1>
				<p className="text-sm text-muted">{actualizado}</p>
			</header>

			<div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground">{children}</div>
		</main>
	);
}

interface LegalSectionProps {
	titulo: string;
	children: ReactNode;
}

export function LegalSection({ titulo, children }: LegalSectionProps) {
	return (
		<section className="space-y-3">
			<h2 className="text-lg font-semibold text-foreground">{titulo}</h2>
			{children}
		</section>
	);
}
