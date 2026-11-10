import type { DispositivoResumen } from "../domain/dashboard";

interface DeviceFocusChartProps {
	devices: DispositivoResumen[];
	title: string;
	subtitle?: string;
	empty: string;
}

export function DeviceFocusChart({ devices, title, subtitle, empty }: DeviceFocusChartProps) {
	const maximo = Math.max(...devices.map((dispositivo) => dispositivo.focusMinutes), 1);

	return (
		<section className="rounded-2xl border border-border bg-surface p-6">
			<div className="flex items-baseline justify-between gap-3">
				<h2 className="text-sm font-medium text-foreground">{title}</h2>
				{subtitle ? <p className="text-xs text-muted">{subtitle}</p> : null}
			</div>

			{devices.length === 0 ? (
				<p className="mt-4 text-sm text-muted">{empty}</p>
			) : (
				<ul className="mt-4 space-y-3">
					{devices.map((dispositivo) => {
						const ancho = Math.max(4, Math.round((dispositivo.focusMinutes / maximo) * 100));
						const nombre =
							dispositivo.nombre ||
							(dispositivo.deviceId === "desconocido" ? "—" : dispositivo.deviceId.slice(0, 8));

						return (
							<li key={dispositivo.deviceId} className="space-y-1.5">
								<div className="flex items-baseline justify-between gap-3 text-sm">
									<span className="truncate text-foreground">{nombre}</span>
									<span className="shrink-0 text-muted">
										{formatMinutes(dispositivo.focusMinutes)}
									</span>
								</div>
								<div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
									<div className="h-full rounded-full bg-info" style={{ width: `${ancho}%` }} />
								</div>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}

function formatMinutes(minutos: number): string {
	if (minutos < 60) {
		return `${minutos} min`;
	}

	const horas = Math.floor(minutos / 60);
	const resto = minutos % 60;
	return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}
