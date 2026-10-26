"use client";

import { Check, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { getPathname, Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useLogout } from "@/modules/auth/ui/useLogout";
import { guardarTemaDispositivo } from "@/modules/devices/ui/deviceTheme";
import { createClient } from "@/shared/infrastructure/supabase/client";

interface UserMenuProps {
	email?: string;
}

export function UserMenu({ email }: UserMenuProps) {
	const invitado = !email;
	const t = useTranslations("Nav");
	const sesion = useTranslations("Session");
	const locale = useLocale();
	const pathname = usePathname();
	const { theme, setTheme } = useTheme();
	const { salir, saliendo } = useLogout();
	const [abierto, setAbierto] = useState(false);
	const [montado, setMontado] = useState(false);
	const contenedor = useRef<HTMLDivElement>(null);
	const boton = useRef<HTMLButtonElement>(null);
	const panel = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setMontado(true);
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: pathname es la señal de cambio de ruta.
	useEffect(() => {
		setAbierto(false);
	}, [pathname]);

	useEffect(() => {
		if (!abierto) return;

		function alHacerClic(evento: PointerEvent) {
			if (!contenedor.current?.contains(evento.target as Node)) {
				setAbierto(false);
			}
		}

		document.addEventListener("pointerdown", alHacerClic);
		return () => document.removeEventListener("pointerdown", alHacerClic);
	}, [abierto]);

	useEffect(() => {
		if (!abierto) return;
		panel.current?.querySelector<HTMLElement>('[role^="menuitem"]')?.focus();
	}, [abierto]);

	function cerrar() {
		setAbierto(false);
		boton.current?.focus();
	}

	function alTeclear(evento: KeyboardEvent<HTMLDivElement>) {
		if (evento.key === "Escape") {
			evento.preventDefault();
			cerrar();
			return;
		}

		if (evento.key !== "ArrowDown" && evento.key !== "ArrowUp") {
			return;
		}

		evento.preventDefault();
		const items = Array.from(
			panel.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [],
		);

		if (items.length === 0) {
			return;
		}

		const actual = items.indexOf(document.activeElement as HTMLElement);
		const siguiente =
			evento.key === "ArrowDown"
				? (actual + 1) % items.length
				: (actual - 1 + items.length) % items.length;
		items[siguiente]?.focus();
	}

	async function cambiarIdioma(destino: "en" | "es") {
		if (email) {
			try {
				const supabase = createClient();
				const {
					data: { user },
				} = await supabase.auth.getUser();

				if (user) {
					await supabase.from("profiles").update({ locale: destino }).eq("id", user.id);
				}
			} catch {
				// El idioma de la URL manda; el perfil se reintenta al cambiarlo de nuevo.
			}
		}

		window.location.assign(getPathname({ locale: destino, href: pathname }));
	}

	const temas = [
		{ valor: "light", etiqueta: t("themeLight") },
		{ valor: "dark", etiqueta: t("themeDark") },
		{ valor: "system", etiqueta: t("themeSystem") },
	] as const;

	return (
		<div ref={contenedor} className="relative">
			<button
				ref={boton}
				type="button"
				onClick={() => setAbierto((valor) => !valor)}
				aria-haspopup="menu"
				aria-expanded={abierto}
				aria-label={t("openUserMenu")}
				className="flex items-center gap-2 rounded-full text-muted transition hover:text-foreground"
			>
				{email ? <span className="hidden max-w-36 truncate text-xs sm:inline">{email}</span> : null}
				<span className="grid size-8 place-items-center rounded-full border border-border bg-surface text-foreground">
					<User size={16} aria-hidden />
				</span>
			</button>

			{abierto ? (
				<div
					ref={panel}
					role="menu"
					aria-label={t("openUserMenu")}
					onKeyDown={alTeclear}
					className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-border bg-surface p-2 shadow-xl"
				>
					<p className="truncate border-b border-border px-3 pb-2 pt-1 text-xs text-muted">
						{email ?? sesion("guest")}
					</p>

					<div className="py-2">
						<p className="px-3 text-[10px] uppercase tracking-[0.18em] text-muted">
							{t("language")}
						</p>
						<div className="mt-1 flex gap-1">
							{routing.locales.map((opcion) => (
								<button
									key={opcion}
									type="button"
									role="menuitemradio"
									aria-checked={locale === opcion}
									onClick={() => void cambiarIdioma(opcion)}
									className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition ${
										locale === opcion
											? "bg-primary/10 text-primary"
											: "text-muted hover:bg-surface-muted hover:text-foreground"
									}`}
								>
									{opcion === "en" ? "English" : "Español"}
									{locale === opcion ? <Check size={13} aria-hidden /> : null}
								</button>
							))}
						</div>
					</div>

					<div className="border-t border-border py-2">
						<p className="px-3 text-[10px] uppercase tracking-[0.18em] text-muted">{t("theme")}</p>
						<div className="mt-1 grid grid-cols-3 gap-1">
							{temas.map((opcion) => (
								<button
									key={opcion.valor}
									type="button"
									role="menuitemradio"
									aria-checked={montado && theme === opcion.valor}
									onClick={() => {
										setTheme(opcion.valor);
										if (email) void guardarTemaDispositivo(opcion.valor);
									}}
									className={`flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs transition ${
										montado && theme === opcion.valor
											? "bg-primary/10 text-primary"
											: "text-muted hover:bg-surface-muted hover:text-foreground"
									}`}
								>
									{opcion.etiqueta}
									{montado && theme === opcion.valor ? <Check size={13} aria-hidden /> : null}
								</button>
							))}
						</div>
					</div>

					<div className="border-t border-border pt-2">
						<Link
							href="/app/settings"
							role="menuitem"
							onClick={() => setAbierto(false)}
							className="block rounded-lg px-3 py-2 text-sm text-foreground transition hover:bg-surface-muted"
						>
							{t("settings")}
						</Link>
						{invitado ? null : (
							<button
								type="button"
								role="menuitem"
								onClick={() => void salir()}
								disabled={saliendo}
								className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-danger-fg transition hover:bg-danger-bg disabled:opacity-60"
							>
								{saliendo ? sesion("loggingOut") : sesion("logout")}
							</button>
						)}
					</div>
				</div>
			) : null}
		</div>
	);
}
