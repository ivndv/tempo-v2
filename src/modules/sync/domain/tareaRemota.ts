export interface TareaRemota {
	id: string;
	nombre: string;
	estado: string;
	createdAt: string;
	updatedAt: string;
	completedAt: string | null;
	deletedAt: string | null;
	bloqueId: string | null;
	creadaEnFocusId: string | null;
	completadaEnFocusId: string | null;
	eliminadaEnFocusId: string | null;
	clientUpdatedAt: string | null;
	deviceId: string | null;
}
