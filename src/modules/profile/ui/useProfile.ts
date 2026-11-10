"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getClientContainer } from "@/shared/infrastructure/clientContainer";
import type { Perfil } from "../domain/perfil";

export const perfilKeys = {
	all: ["profile"] as const,
	detalle: (userId: string) => ["profile", userId] as const,
};

export function usePerfil(userId: string, inicial: Perfil) {
	return useQuery({
		queryKey: perfilKeys.detalle(userId),
		queryFn: () => getClientContainer().perfil.obtener.execute(),
		initialData: inicial,
	});
}

export function useActualizarPerfil(userId?: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (cambios: Partial<Perfil>) =>
			getClientContainer().perfil.actualizar.execute(cambios),
		onSuccess: (_resultado, cambios) => {
			if (userId) {
				queryClient.setQueryData<Perfil>(perfilKeys.detalle(userId), (actual) =>
					actual ? { ...actual, ...cambios } : actual,
				);
			}

			void queryClient.invalidateQueries({ queryKey: perfilKeys.all });
		},
	});
}
