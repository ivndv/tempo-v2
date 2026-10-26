"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import type { Tarea } from "../domain/tarea";
import { DexieTareaRepository } from "../infrastructure/DexieTareaRepository";

interface TasksBlockProps {
	bloqueId: string;
	focusId: string | null;
}

const repositorio = new DexieTareaRepository();

export function TasksBlock({ bloqueId, focusId }: TasksBlockProps) {
	const t = useTranslations("Tasks");
	const resultado = useLiveQuery(async () => {
		try {
			const tareas = await repositorio.listarPorBloque(bloqueId);
			return { tareas, error: null as string | null };
		} catch (cause: unknown) {
			return {
				tareas: [] as Tarea[],
				error: cause instanceof Error ? cause.message : t("loadError"),
			};
		}
	}, [bloqueId, t]);

	const [nombre, setNombre] = useState("");
	const [errorAccion, setErrorAccion] = useState<string | null>(null);
	const tareas = resultado?.tareas ?? [];
	const cargando = resultado === undefined;
	const error = errorAccion ?? resultado?.error ?? null;

	function mensajeError(cause: unknown): string {
		if (
			typeof DOMException !== "undefined" &&
			cause instanceof DOMException &&
			cause.name === "QuotaExceededError"
		) {
			return t("quota");
		}

		return cause instanceof Error ? cause.message : t("saveError");
	}

	async function crear(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const limpio = nombre.trim();

		if (!limpio || limpio.length > 100) {
			return;
		}

		setErrorAccion(null);

		try {
			await repositorio.crearEnBloque(limpio, bloqueId, focusId);
			setNombre("");
		} catch (cause: unknown) {
			setErrorAccion(mensajeError(cause));
		}
	}

	async function alternar(tarea: Tarea) {
		setErrorAccion(null);

		try {
			await repositorio.cambiarEstadoEnBloque(
				tarea.id,
				tarea.estado === "done" ? "pending" : "done",
				focusId,
			);
		} catch (cause: unknown) {
			setErrorAccion(mensajeError(cause));
		}
	}

	async function eliminar(tarea: Tarea) {
		setErrorAccion(null);

		try {
			await repositorio.eliminarEnBloque(tarea.id, focusId);
		} catch (cause: unknown) {
			setErrorAccion(mensajeError(cause));
		}
	}

	return (
		<section className="space-y-3 rounded-2xl border border-border bg-surface p-5">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<h2 className="text-xs font-medium uppercase tracking-[0.25em] text-muted">{t("title")}</h2>
				<p className="text-xs text-muted">{focusId ? t("linkedFocus") : t("linkedBlock")}</p>
			</div>

			<form onSubmit={crear} className="flex gap-2">
				<label className="sr-only" htmlFor="nombre-tarea">
					{t("nameLabel")}
				</label>
				<input
					id="nombre-tarea"
					name="nombre"
					required
					maxLength={100}
					value={nombre}
					onChange={(event) => setNombre(event.target.value)}
					placeholder={t("placeholder")}
					className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-primary"
				/>
				<button
					type="submit"
					className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
				>
					{t("add")}
				</button>
			</form>

			{error ? (
				<p className="rounded-lg border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-fg">
					{error}
				</p>
			) : null}

			{cargando ? (
				<p className="text-sm text-muted">{t("loading")}</p>
			) : tareas.length === 0 ? (
				<p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
					{t("empty")}
				</p>
			) : (
				<ul className="space-y-2">
					{tareas.map((tarea) => {
						const done = tarea.estado === "done";

						return (
							<li
								key={tarea.id}
								className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
							>
								<button
									type="button"
									onClick={() => alternar(tarea)}
									aria-label={done ? t("markPending") : t("markDone")}
									className={`grid size-6 place-items-center rounded-full border text-xs transition ${
										done
											? "border-primary bg-primary text-primary-foreground"
											: "border-border text-transparent hover:border-primary"
									}`}
								>
									✓
								</button>

								<span
									className={`flex-1 text-sm ${done ? "text-muted line-through" : "text-foreground"}`}
								>
									{tarea.nombre}
								</span>

								<button
									type="button"
									onClick={() => eliminar(tarea)}
									aria-label={t("deleteAria")}
									className="text-xs text-muted transition hover:text-danger-fg"
								>
									{t("delete")}
								</button>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}
