"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { detectarDispositivo, obtenerDeviceId } from "@/shared/infrastructure/device";
import { createClient } from "@/shared/infrastructure/supabase/client";

function temaLocal(): string | null {
	try {
		return window.localStorage.getItem("theme");
	} catch {
		return null;
	}
}

// Registra el navegador actual y sincroniza el tema del dispositivo.
export function RegisterDevice() {
	const router = useRouter();
	const { setTheme } = useTheme();

	useEffect(() => {
		let activo = true;
		const id = obtenerDeviceId();
		const { nombre, plataforma } = detectarDispositivo();
		const local = temaLocal();
		const supabase = createClient();

		void supabase
			.rpc("registrar_dispositivo", {
				p_id: id,
				p_name: nombre,
				p_platform: plataforma,
				p_theme: local ?? undefined,
			})
			.then(async ({ error }) => {
				if (error || !activo) {
					return;
				}

				// Refresca una vez por sesión para que Ajustes vea el dispositivo nuevo.
				try {
					const clave = "tempo:device-registered";
					if (window.sessionStorage.getItem(clave) !== id) {
						window.sessionStorage.setItem(clave, id);
						router.refresh();
					}
				} catch {
					// Sin sessionStorage se evita el refresh para no entrar en bucle.
				}

				// Si este navegador nunca eligió tema, recupera el del servidor.
				if (local) {
					return;
				}

				const { data } = await supabase.from("devices").select("theme").eq("id", id).maybeSingle();

				if (activo && data?.theme) {
					setTheme(data.theme);
				}
			});

		return () => {
			activo = false;
		};
	}, [setTheme, router.refresh]);

	return null;
}
