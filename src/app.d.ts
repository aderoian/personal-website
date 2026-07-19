declare global {
	namespace App {
		interface Locals {
			contactLastSubmit?: number;
			adminAuthenticated: boolean;
		}
	}
}

export {};
