"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { getClientContainer } from "@/shared/infrastructure/clientContainer";
import { detectarDispositivo, obtenerDeviceId } from "@/shared/infrastructure/device";
import { dispositivosKeys } from "./useDevices";

function temaLocal(): string | null {
	try {
		return window.localStorage.getItem("theme");
	} catch {
		return null;
	}
}

// Registra el navegador actual y sincroniza el tema del dispositivo
export function RegisterDevice() {
	const queryClient = useQueryClient();
	const { setTheme } = useTheme();

	useEffect(() => {
		let activo = true;
		const id = obtenerDeviceId();
		const { nombre, plataforma } = detectarDispositivo();
		const local = temaLocal();

		void getClientContainer()
			.dispositivos.registrar.execute({
				id,
				nombre,
				plataforma,
				tema: local ?? undefined,
			})
			.then((resultado) => {
				if (!activo) {
					return;
				}

				void queryClient.invalidateQueries({ queryKey: dispositivosKeys.all });

				// Si este navegador nunca eligió tema, recupera el del servidor.
				if (!local && resultado.tema) {
					setTheme(resultado.tema);
				}
			})
			.catch(() => {
				// Se reintenta en el próximo montaje
			});

		return () => {
			activo = false;
		};
	}, [queryClient, setTheme]);

	return null;
}
