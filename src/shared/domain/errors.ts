export class DomainError extends Error {
	readonly code: string;

	constructor(message: string, code = "domain_error") {
		super(message);
		this.name = "DomainError";
		this.code = code;
	}
}
