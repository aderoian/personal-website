export type ContactFormValues = {
	name: string;
	email: string;
	message: string;
};

export type ContactFormFailure = {
	error: string;
	values?: ContactFormValues;
};

export const emptyContactFormValues: ContactFormValues = {
	name: '',
	email: '',
	message: ''
};
