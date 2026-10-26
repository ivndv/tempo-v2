"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import type { Plan } from "@/modules/billing/domain/plan";
import { getLocalDb } from "@/shared/infrastructure/dexie/db";

interface ExportSectionProps {
	guest: boolean;
	plan: Plan;
}

export function ExportSection({ guest, plan }: ExportSectionProps) {
	const t = useTranslations("Settings");
	const [error, setError] = useState<string | null>(null);

	async function descargarLocal() {
		setError(null);

		try {
			const db = getLocalDb();
			const [tareas, pomodoros, breaks] = await Promise.all([
				db.tareas.toArray(),
				db.pomodoros.toArray(),
				db.breaks.toArray(),
			]);

			const contenido = {
				exportedAt: new Date().toISOString(),
				version: 1,
				device: "local",
				tareas,
				pomodoros,
				breaks,
			};

			const blob = new Blob([JSON.stringify(contenido, null, 2)], {
				type: "application/json",
			});
			const url = URL.createObjectURL(blob);
			const enlace = document.createElement("a");
			enlace.href = url;
			enlace.download = `tempo-local-${new Date().toISOString().slice(0, 10)}.json`;
			enlace.click();
			URL.revokeObjectURL(url);
		} catch {
			setError(t("downloadError"));
		}
	}

	return (
		<div className="space-y-4">
			<div className="space-y-1">
				<h2 className="text-lg font-semibold tracking-tight">{t("exportTitle")}</h2>
				<p className="text-sm text-muted">{t("exportSubtitle")}</p>
			</div>

			{guest ? (
				<>
					<section className="rounded-2xl border border-border bg-surface p-6">
						<h3 className="text-sm font-medium text-foreground">{t("guestJsonTitle")}</h3>
						<p className="mt-1 text-sm text-muted">{t("guestJsonText")}</p>
						<button
							type="button"
							onClick={() => void descargarLocal()}
							className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
						>
							{t("guestJsonButton")}
						</button>
					</section>

					<p className="rounded-xl border border-success-border bg-success-bg px-4 py-3 text-sm text-success-fg">
						{t("guestExportNote")}{" "}
						<Link href="/signup" className="underline">
							{t("guestCta")}
						</Link>
					</p>
				</>
			) : (
				<>
					<section className="rounded-2xl border border-border bg-surface p-6">
						<h3 className="text-sm font-medium text-foreground">{t("jsonTitle")}</h3>
						<p className="mt-1 text-sm text-muted">{t("jsonText")}</p>
						<a
							href="/api/export/json"
							className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
						>
							{t("jsonButton")}
						</a>
					</section>

					<section className="rounded-2xl border border-border bg-surface p-6">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<h3 className="text-sm font-medium text-foreground">{t("csvTitle")}</h3>
							<span className="rounded-full border border-success-border px-2.5 py-1 text-[10px] uppercase tracking-wide text-success-fg">
								{t("csvPro")}
							</span>
						</div>
						<p className="mt-1 text-sm text-muted">{t("csvText")}</p>

						{plan === "pro" ? (
							<a
								href="/api/export/csv"
								className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
							>
								{t("csvButton")}
							</a>
						) : (
							<div className="mt-4 flex flex-wrap items-center gap-3">
								<span className="text-sm text-muted">{t("proRequired")}</span>
								<Link
									href="/pricing"
									className="rounded-lg border border-success-border px-3 py-1.5 text-sm font-medium text-success-fg transition hover:border-primary"
								>
									{t("goPro")}
								</Link>
							</div>
						)}
					</section>
				</>
			)}

			{error ? (
				<p className="rounded-lg border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-fg">
					{error}
				</p>
			) : null}
		</div>
	);
}
