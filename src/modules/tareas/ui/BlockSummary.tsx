"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useTranslations } from "next-intl";
import { DexieTareaRepository } from "../infrastructure/DexieTareaRepository";

interface BlockSummaryProps {
	bloqueId: string;
}

const repositorio = new DexieTareaRepository();

export function BlockSummary({ bloqueId }: BlockSummaryProps) {
	const t = useTranslations("Tasks");
	const datos = useLiveQuery(async () => {
		const [resumen, tareas] = await Promise.all([
			repositorio.resumenBloque(bloqueId),
			repositorio.listarPorBloque(bloqueId, true),
		]);

		return { resumen, tareas };
	}, [bloqueId]);

	const resumen = datos?.resumen;
	const tareas = datos?.tareas ?? [];

	return (
		<section className="rounded-2xl border border-border bg-surface p-5">
			<h2 className="text-xs font-medium uppercase tracking-[0.25em] text-muted">
				{t("summaryTitle")}
			</h2>

			<div className="mt-3 grid grid-cols-3 gap-3 text-center">
				<Contador etiqueta={t("created")} valor={resumen?.creadas ?? 0} />
				<Contador etiqueta={t("completed")} valor={resumen?.completadas ?? 0} />
				<Contador etiqueta={t("deleted")} valor={resumen?.eliminadas ?? 0} />
			</div>

			{tareas.length > 0 ? (
				<ul className="mt-4 space-y-1 text-sm text-muted">
					{tareas.map((tarea) => (
						<li key={tarea.id} className="flex items-center justify-between gap-3">
							<span className={tarea.deletedAt ? "line-through opacity-50" : ""}>
								{tarea.nombre}
							</span>
							<span className="text-xs text-muted">
								{tarea.deletedAt
									? t("statusDeleted")
									: tarea.estado === "done"
										? t("statusCompleted")
										: t("statusPending")}
							</span>
						</li>
					))}
				</ul>
			) : null}
		</section>
	);
}

function Contador({ etiqueta, valor }: { etiqueta: string; valor: number }) {
	return (
		<div className="rounded-xl border border-border bg-surface-muted px-3 py-2">
			<p className="text-lg font-semibold text-foreground">{valor}</p>
			<p className="text-[10px] uppercase tracking-[0.15em] text-muted">{etiqueta}</p>
		</div>
	);
}
