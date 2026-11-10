"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { lazy, type ReactNode, Suspense, useState } from "react";
import { crearQueryClient } from "./queryClient";

const Devtools =
	process.env.NODE_ENV === "development"
		? lazy(() =>
				import("@tanstack/react-query-devtools").then((modulo) => ({
					default: modulo.ReactQueryDevtools,
				})),
			)
		: null;

export function QueryProvider({ children }: { children: ReactNode }) {
	const [cliente] = useState(crearQueryClient);

	return (
		<QueryClientProvider client={cliente}>
			{children}
			{Devtools ? (
				<Suspense fallback={null}>
					<Devtools initialIsOpen={false} />
				</Suspense>
			) : null}
		</QueryClientProvider>
	);
}
