"use client";

import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ComponentProps, type ReactNode, useEffect, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { enlaceNavActivo, enlaceNavBase, enlaceNavInactivo } from "./styles";

export interface NavItem {
	href: ComponentProps<typeof Link>["href"];
	label: string;
}

interface HeaderNavProps {
	items: NavItem[];
	desktopActions: ReactNode;
	mobileActions: ReactNode;
}

// Navegación con link activo y menú desplegable en móvil.
export function HeaderNav({ items, desktopActions, mobileActions }: HeaderNavProps) {
	const t = useTranslations("Nav");
	const pathname = usePathname();
	const [abierto, setAbierto] = useState(false);

	// Cierra el menú al cambiar de ruta.
	// biome-ignore lint/correctness/useExhaustiveDependencies: pathname es la señal de cambio de ruta.
	useEffect(() => {
		setAbierto(false);
	}, [pathname]);

	// Cierra el menú con Escape.
	useEffect(() => {
		if (!abierto) return;

		function alPresionar(evento: KeyboardEvent) {
			if (evento.key === "Escape") setAbierto(false);
		}

		window.addEventListener("keydown", alPresionar);
		return () => window.removeEventListener("keydown", alPresionar);
	}, [abierto]);

	const esActivo = (href: string) => pathname === href;

	return (
		<>
			<nav
				aria-label={t("main")}
				className="hidden items-center justify-center gap-5 md:col-start-2 md:flex"
			>
				{items.map((item) => (
					<Link
						key={String(item.href)}
						href={item.href}
						prefetch={false}
						aria-current={esActivo(String(item.href)) ? "page" : undefined}
						className={`${enlaceNavBase} ${
							esActivo(String(item.href)) ? enlaceNavActivo : enlaceNavInactivo
						}`}
					>
						{item.label}
					</Link>
				))}
			</nav>

			<div className="hidden items-center justify-end gap-2 md:col-start-3 md:flex">
				{desktopActions}
			</div>

			<button
				type="button"
				onClick={() => setAbierto((valor) => !valor)}
				aria-expanded={abierto}
				aria-controls={abierto ? "menu-movil" : undefined}
				aria-label={abierto ? t("closeMenu") : t("openMenu")}
				className="col-start-3 grid size-9 justify-self-end place-items-center rounded-lg border border-border text-foreground transition hover:border-foreground/40 hover:text-foreground md:hidden"
			>
				{abierto ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
			</button>

			{abierto ? (
				<div
					id="menu-movil"
					className="absolute inset-x-0 top-full border-b border-border bg-background px-4 pb-5 pt-2 shadow-lg md:hidden"
				>
					<nav aria-label={t("main")} className="flex flex-col">
						{items.map((item) => (
							<Link
								key={String(item.href)}
								href={item.href}
								prefetch={false}
								aria-current={esActivo(String(item.href)) ? "page" : undefined}
								className={`${enlaceNavBase} border-b border-border py-3 ${
									esActivo(String(item.href)) ? enlaceNavActivo : enlaceNavInactivo
								}`}
							>
								{item.label}
							</Link>
						))}
					</nav>

					<div className="mt-4 flex flex-col gap-2">{mobileActions}</div>
				</div>
			) : null}
		</>
	);
}
