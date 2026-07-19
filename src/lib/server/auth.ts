import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';

export const ADMIN_SESSION_COOKIE = 'admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

type SessionPayload = {
	v: 1;
	exp: number;
};

function readSecret(name: 'ADMIN_PASSWORD' | 'ADMIN_SESSION_SECRET'): string | undefined {
	const value = process.env[name]?.trim();
	return value || undefined;
}

export function isAdminConfigured(): boolean {
	return Boolean(readSecret('ADMIN_PASSWORD') && readSecret('ADMIN_SESSION_SECRET'));
}

function getAdminPassword(): string | undefined {
	return readSecret('ADMIN_PASSWORD');
}

function getSessionSecret(): string | undefined {
	return readSecret('ADMIN_SESSION_SECRET');
}

function encodeBase64Url(value: string | Buffer): string {
	return Buffer.from(value)
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/g, '');
}

function decodeBase64Url(value: string): Buffer | null {
	const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
	const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
	try {
		return Buffer.from(normalized + pad, 'base64');
	} catch {
		return null;
	}
}

function sign(payload: string, secret: string): string {
	return encodeBase64Url(createHmac('sha256', secret).update(payload).digest());
}

export function constantTimeEqual(a: string, b: string): boolean {
	const aBuf = Buffer.from(a);
	const bBuf = Buffer.from(b);
	if (aBuf.length !== bBuf.length) {
		timingSafeEqual(aBuf, aBuf);
		return false;
	}
	return timingSafeEqual(aBuf, bBuf);
}

export function verifyAdminPassword(password: string): boolean {
	const expected = getAdminPassword();
	if (!expected || !getSessionSecret()) {
		return false;
	}
	return constantTimeEqual(password, expected);
}

export function createAdminSessionToken(): string | null {
	const secret = getSessionSecret();
	if (!secret || !getAdminPassword()) {
		return null;
	}

	const payload: SessionPayload = {
		v: 1,
		exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
	};
	const encoded = encodeBase64Url(JSON.stringify(payload));
	return `${encoded}.${sign(encoded, secret)}`;
}

export function verifyAdminSessionToken(token: string | undefined): boolean {
	if (!token) return false;
	const secret = getSessionSecret();
	if (!secret || !getAdminPassword()) return false;

	const [encoded, signature] = token.split('.');
	if (!encoded || !signature) return false;

	const expected = sign(encoded, secret);
	if (!constantTimeEqual(signature, expected)) return false;

	const raw = decodeBase64Url(encoded);
	if (!raw) return false;

	try {
		const payload = JSON.parse(raw.toString('utf8')) as SessionPayload;
		if (payload.v !== 1 || typeof payload.exp !== 'number') return false;
		return payload.exp > Math.floor(Date.now() / 1000);
	} catch {
		return false;
	}
}

export function setAdminSessionCookie(cookies: Cookies, token: string): void {
	cookies.set(ADMIN_SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: SESSION_TTL_SECONDS
	});
}

export function clearAdminSessionCookie(cookies: Cookies): void {
	cookies.delete(ADMIN_SESSION_COOKIE, { path: '/' });
}

export function readAdminSession(cookies: Cookies): boolean {
	return verifyAdminSessionToken(cookies.get(ADMIN_SESSION_COOKIE));
}
