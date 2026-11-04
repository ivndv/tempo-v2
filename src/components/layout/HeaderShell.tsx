import type { ReactNode } from "react";
import { saltoContenido } from "./styles";

interface HeaderShellProps {
	children: ReactNode;
	skipLabel: string;
}

// Estructura del header: marca a la izquierda, nav al centro y acciones a la derecha.
export function HeaderShell({ children, skipLabel }: HeaderShellProps) {
	return (
		<header className="fixed inset-x-0 top-0 z-40 border-b border-border/60 bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150 transition-colors duration-300 supports-[backdrop-filter]:bg-background/40">
			<a href="#contenido" className={saltoContenido}>
				{skipLabel}
			</a>

			<div className="mx-auto grid h-14 w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 px-4 sm:px-6">
				{children}
			</div>
		</header>
	);
}
