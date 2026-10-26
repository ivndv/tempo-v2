export interface IdGenerator {
	generate(): string;
}

// UUID v4 por ahora; si hace falta ordenar por creación, migrar a UUID v7.
export const cryptoIdGenerator: IdGenerator = {
	generate: () => crypto.randomUUID(),
};
