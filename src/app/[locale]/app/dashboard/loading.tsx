// Esqueleto del dashboard mientras llegan los datos del servidor.
export default function Loading() {
	return (
		<div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div className="space-y-2">
					<div className="h-8 w-48 animate-pulse rounded-lg bg-border/50" />
					<div className="h-4 w-64 animate-pulse rounded bg-border/30" />
				</div>
				<div className="h-8 w-24 animate-pulse rounded-lg bg-border/30" />
			</div>
			<div className="grid gap-4 sm:grid-cols-3">
				<div className="h-24 animate-pulse rounded-xl border border-border bg-border/20" />
				<div className="h-24 animate-pulse rounded-xl border border-border bg-border/20" />
				<div className="h-24 animate-pulse rounded-xl border border-border bg-border/20" />
			</div>
			<div className="h-64 animate-pulse rounded-xl border border-border bg-border/20" />
		</div>
	);
}
