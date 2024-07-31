// utils/encryption.ts

import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY as string; // This should be a 32 byte key
const IV_LENGTH = 16;

export function encrypt(text: string): string {
	const iv = crypto.randomBytes(IV_LENGTH);
	const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
	let encrypted = cipher.update(text);
	encrypted = Buffer.concat([encrypted, cipher.final()]);
	return JSON.stringify({ iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') });
}

export function decrypt(data: string | { iv: string; encryptedData: string }): any {
	let parsedData: { iv: string; encryptedData: string };

	if (typeof data === 'string') {
		try {
			parsedData = JSON.parse(data);
		} catch (error) {
			console.error('Error parsing encrypted data:', error);
			return null;
		}
	} else {
		parsedData = data;
	}

	const { iv, encryptedData } = parsedData;
	const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), Buffer.from(iv, 'hex'));
	let decrypted = decipher.update(Buffer.from(encryptedData, 'hex'));
	decrypted = Buffer.concat([decrypted, decipher.final()]);
	return JSON.parse(decrypted.toString());
}
