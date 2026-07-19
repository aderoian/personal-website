export class ContentNotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ContentNotFoundError';
	}
}

export class ContentConflictError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ContentConflictError';
	}
}
