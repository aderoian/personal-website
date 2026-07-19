import { afterEach, describe, expect, it } from 'vitest';
import {
	constantTimeEqual,
	createAdminSessionToken,
	isAdminConfigured,
	verifyAdminPassword,
	verifyAdminSessionToken
} from '$lib/server/auth';

const originalPassword = process.env.ADMIN_PASSWORD;
const originalSecret = process.env.ADMIN_SESSION_SECRET;

afterEach(() => {
	if (originalPassword === undefined) delete process.env.ADMIN_PASSWORD;
	else process.env.ADMIN_PASSWORD = originalPassword;

	if (originalSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
	else process.env.ADMIN_SESSION_SECRET = originalSecret;
});

describe('admin auth', () => {
	it('fails closed when credentials are missing', () => {
		delete process.env.ADMIN_PASSWORD;
		delete process.env.ADMIN_SESSION_SECRET;
		expect(isAdminConfigured()).toBe(false);
		expect(verifyAdminPassword('anything')).toBe(false);
		expect(createAdminSessionToken()).toBeNull();
		expect(verifyAdminSessionToken('anything')).toBe(false);
	});

	it('accepts a valid password and rejects an invalid one', () => {
		process.env.ADMIN_PASSWORD = 'correct-horse';
		process.env.ADMIN_SESSION_SECRET = 'session-secret-value-for-tests-32b';
		expect(isAdminConfigured()).toBe(true);
		expect(verifyAdminPassword('correct-horse')).toBe(true);
		expect(verifyAdminPassword('wrong-password')).toBe(false);
	});

	it('creates and verifies signed session tokens', () => {
		process.env.ADMIN_PASSWORD = 'correct-horse';
		process.env.ADMIN_SESSION_SECRET = 'session-secret-value-for-tests-32b';
		const token = createAdminSessionToken();
		expect(token).toBeTruthy();
		expect(verifyAdminSessionToken(token ?? undefined)).toBe(true);
	});

	it('rejects tampered session tokens', () => {
		process.env.ADMIN_PASSWORD = 'correct-horse';
		process.env.ADMIN_SESSION_SECRET = 'session-secret-value-for-tests-32b';
		const token = createAdminSessionToken();
		expect(token).toBeTruthy();
		const [payload, signature] = (token as string).split('.');
		expect(verifyAdminSessionToken(`${payload}.deadbeef`)).toBe(false);
		expect(verifyAdminSessionToken(`${payload}x.${signature}`)).toBe(false);
	});

	it('rejects expired session tokens', () => {
		process.env.ADMIN_PASSWORD = 'correct-horse';
		process.env.ADMIN_SESSION_SECRET = 'session-secret-value-for-tests-32b';
		const expiredPayload = Buffer.from(
			JSON.stringify({ v: 1, exp: Math.floor(Date.now() / 1000) - 10 }),
			'utf8'
		)
			.toString('base64')
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/g, '');
		expect(verifyAdminSessionToken(`${expiredPayload}.fakesig`)).toBe(false);
	});

	it('compares strings in constant time for equal lengths', () => {
		expect(constantTimeEqual('abcd', 'abcd')).toBe(true);
		expect(constantTimeEqual('abcd', 'abce')).toBe(false);
		expect(constantTimeEqual('short', 'longer')).toBe(false);
	});
});
