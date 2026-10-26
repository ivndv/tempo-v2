// Esqueleto de carga para las pantallas de la app.
export default function Loading() {
	return (
		<div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
			<div className="h-8 w-40 animate-pulse rounded-lg bg-border/50" />
			<div className="h-40 animate-pulse rounded-xl border border-border bg-border/20" />
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="h-24 animate-pulse rounded-xl border border-border bg-border/20" />
				<div className="h-24 animate-pulse rounded-xl border border-border bg-border/20" />
			</div>
		</div>
	);
}
