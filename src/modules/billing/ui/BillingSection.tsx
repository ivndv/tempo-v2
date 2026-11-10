"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import type { EstadoSuscripcion, SuscripcionResumen } from "../domain/suscripcion";

interface BillingSectionProps {
	suscripcion: SuscripcionResumen;
}

const ETIQUETAS_ESTADO: Record<EstadoSuscripcion, string> = {
	active: "active",
	trialing: "trialing",
	past_due: "past_due",
	canceled: "canceled",
	paused: "paused",
	incomplete: "incomplete",
	incomplete_expired: "incomplete_expired",
	unpaid: "unpaid",
};

function formatearFecha(fecha: string | null, locale: string): string | null {
	if (!fecha) {
		return null;
	}

	const valor = new Date(fecha);
	if (Number.isNaN(valor.getTime())) {
		return null;
	}

	return new Intl.DateTimeFormat(locale, {
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(valor);
}

export function BillingSection({ suscripcion }: BillingSectionProps) {
	const t = useTranslations("Billing");
	const locale = useLocale();
	const router = useRouter();
	const searchParams = useSearchParams();
	const checkoutExitoso = searchParams.get("checkout") === "success";
	const fecha = formatearFecha(suscripcion.currentPeriodEnd, locale);
	const esPro = suscripcion.plan === "pro";
	const usaPortal = suscripcion.hasCustomer || esPro;
	const estado = suscripcion.status ? ETIQUETAS_ESTADO[suscripcion.status] : null;

	useEffect(() => {
		if (!checkoutExitoso || esPro) {
			return;
		}

		const primero = window.setTimeout(() => router.refresh(), 2500);
		const segundo = window.setTimeout(() => router.refresh(), 6000);

		return () => {
			window.clearTimeout(primero);
			window.clearTimeout(segundo);
		};
	}, [checkoutExitoso, esPro, router]);

	return (
		<section className="space-y-4 rounded-2xl border border-border bg-surface p-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2 className="text-sm font-medium text-foreground">{t("title")}</h2>
					<p className="mt-1 text-sm text-muted">
						{esPro ? t("pro") : t("free")}
						{estado && estado !== "active" ? ` · ${t(estado)}` : ""}
					</p>
				</div>

				{esPro ? (
					<span className="rounded-full border border-success-border bg-success-bg px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-primary">
						{t("pro")}
					</span>
				) : null}
			</div>

			{checkoutExitoso ? (
				<p
					className={`rounded-lg border px-3 py-2 text-sm ${
						esPro
							? "border-success-border bg-success-bg text-success-fg"
							: "border-border bg-surface-muted text-muted"
					}`}
				>
					{esPro ? t("success") : t("processing")}
				</p>
			) : null}

			{estado && estado !== "active" ? <p className="text-sm text-muted">{t(estado)}</p> : null}

			{esPro && fecha ? (
				<p className="text-sm text-muted">
					{suscripcion.cancelAtPeriodEnd
						? t("cancels", { date: fecha })
						: t("renews", { date: fecha })}
				</p>
			) : null}

			{!esPro ? <p className="text-sm text-muted">{t("freeDescription")}</p> : null}

			<div className="flex flex-wrap gap-2">
				{usaPortal ? (
					<a
						href="/api/billing/portal"
						className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground/40"
					>
						{t("manage")}
					</a>
				) : (
					<a
						href="/api/billing/checkout"
						className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
					>
						{t("upgrade")}
					</a>
				)}
			</div>
		</section>
	);
}
