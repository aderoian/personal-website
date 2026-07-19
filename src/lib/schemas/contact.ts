import { z } from 'zod';

export const contactFormSchema = z.object({
	name: z.string().trim().min(1, 'Please enter your name.').max(120, 'Please enter your name.'),
	email: z
		.string()
		.trim()
		.min(1, 'Please enter a valid email address.')
		.max(254, 'Please enter a valid email address.')
		.email('Please enter a valid email address.'),
	message: z.string().trim().min(1, 'Please enter a message.').max(8000, 'Please enter a message.'),
	website: z.string().trim().optional()
});

export type ContactFormData = z.infer<typeof contactFormSchema>;
