import type { ReactNode } from "react";
import { saltoContenido } from "./styles";

interface HeaderShellProps {
	children: ReactNode;
	skipLabel: string;
}

// Estructura del header: marca a la izquierda, nav al centro y acciones a la derecha.
export function HeaderShell({ children, skipLabel }: HeaderShellProps) {
	return (
		<header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur">
			<a href="#contenido" className={saltoContenido}>
				{skipLabel}
			</a>

			<div className="mx-auto grid h-14 w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 px-4 sm:px-6">
				{children}
			</div>
		</header>
	);
}
