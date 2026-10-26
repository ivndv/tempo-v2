"use client";

export async function pedirPermisoNotificaciones(): Promise<void> {
	if (typeof window === "undefined" || !("Notification" in window)) {
		return;
	}

	if (Notification.permission === "default") {
		try {
			await Notification.requestPermission();
		} catch {
			// El navegador puede rechazar la solicitud; seguimos con avisos internos.
		}
	}
}

export function notificar(titulo: string, cuerpo: string): void {
	if (typeof window === "undefined" || !("Notification" in window)) {
		return;
	}

	if (Notification.permission === "granted") {
		try {
			new Notification(titulo, { body: cuerpo });
		} catch {
			// Algunos navegadores requieren un service worker para notificaciones.
		}
	}
}

export function actualizarTitulo(texto: string): void {
	if (typeof document !== "undefined") {
		document.title = texto;
	}
}

// Beep corto sin depender de un asset externo.
export function reproducirBeep(): void {
	if (typeof window === "undefined") {
		return;
	}

	const AudioContextClass =
		window.AudioContext ??
		(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

	if (!AudioContextClass) {
		return;
	}

	try {
		const contexto = new AudioContextClass();
		const oscilador = contexto.createOscillator();
		const ganancia = contexto.createGain();
		const ahora = contexto.currentTime;

		oscilador.type = "sine";
		oscilador.frequency.setValueAtTime(880, ahora);
		ganancia.gain.setValueAtTime(0.0001, ahora);
		ganancia.gain.exponentialRampToValueAtTime(0.18, ahora + 0.01);
		ganancia.gain.exponentialRampToValueAtTime(0.0001, ahora + 0.28);

		oscilador.connect(ganancia);
		ganancia.connect(contexto.destination);
		oscilador.start(ahora);
		oscilador.stop(ahora + 0.3);
		oscilador.onended = () => {
			void contexto.close();
		};
	} catch {
		// El navegador puede bloquear audio sin gesto del usuario.
	}
}
