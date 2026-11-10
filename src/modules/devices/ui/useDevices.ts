"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getClientContainer } from "@/shared/infrastructure/clientContainer";
import type { Dispositivo } from "../domain/dispositivo";

export const dispositivosKeys = {
	all: ["devices"] as const,
};

export function useDispositivos(iniciales?: Dispositivo[], activo = true) {
	return useQuery({
		queryKey: dispositivosKeys.all,
		queryFn: () => getClientContainer().dispositivos.listar.execute(),
		initialData: iniciales,
		enabled: activo,
		staleTime: iniciales && iniciales.length > 0 ? 30_000 : 0,
	});
}

export function useRenombrarDispositivo() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, nombre }: { id: string; nombre: string }) =>
			getClientContainer().dispositivos.renombrar.execute(id, nombre),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: dispositivosKeys.all }),
	});
}

export function useEliminarDispositivo() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => getClientContainer().dispositivos.eliminar.execute(id),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: dispositivosKeys.all }),
	});
}
