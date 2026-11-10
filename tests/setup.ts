import "fake-indexeddb/auto";
import { cargarEnvLocal } from "./env";

// Carga .env.local para los tests de integración locales.
cargarEnvLocal();
