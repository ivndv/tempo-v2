"use client";

import Script from "next/script";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

interface TurnstileApi {
	render: (
		contenedor: HTMLElement,
		opciones: {
			sitekey: string;
			theme?: "light" | "dark" | "auto";
			size?: "normal" | "compact" | "flexible";
			callback?: (token: string) => void;
			"expired-callback"?: () => void;
			"error-callback"?: () => void;
		},
	) => string;
	reset: (id?: string) => void;
	remove: (id?: string) => void;
}

declare global {
	interface Window {
		turnstile?: TurnstileApi;
	}
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function Turnstile({
	onToken,
	resetSignal = 0,
}: {
	onToken: (token: string) => void;
	resetSignal?: number;
}) {
	const t = useTranslations("Auth");
	const contenedorRef = useRef<HTMLDivElement>(null);
	const widgetRef = useRef<string | null>(null);
	const [cargado, setCargado] = useState(false);
	const onTokenRef = useRef(onToken);

	useEffect(() => {
		onTokenRef.current = onToken;
	}, [onToken]);

	useEffect(() => {
		if (window.turnstile) setCargado(true);
	}, []);

	useEffect(() => {
		if (!cargado || !contenedorRef.current || !window.turnstile || !SITE_KEY) {
			return;
		}

		widgetRef.current = window.turnstile.render(contenedorRef.current, {
			sitekey: SITE_KEY,
			theme: "dark",
			size: "flexible",
			callback: (token) => onTokenRef.current(token),
			"expired-callback": () => onTokenRef.current(""),
			"error-callback": () => onTokenRef.current(""),
		});

		return () => {
			if (widgetRef.current) {
				window.turnstile?.remove(widgetRef.current);
				widgetRef.current = null;
			}
		};
	}, [cargado]);

	useEffect(() => {
		if (resetSignal > 0 && widgetRef.current) {
			window.turnstile?.reset(widgetRef.current);
			onTokenRef.current("");
		}
	}, [resetSignal]);

	const onLoad = useCallback(() => setCargado(true), []);

	if (!SITE_KEY) {
		return <p className="text-xs text-danger-fg">{t("turnstileMissing")}</p>;
	}

	return (
		<>
			<Script
				src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
				strategy="afterInteractive"
				onLoad={onLoad}
			/>
			<div ref={contenedorRef} className="min-h-[65px] w-full" />
		</>
	);
}
