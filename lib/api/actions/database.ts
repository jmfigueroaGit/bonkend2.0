// lib/db/actions/database.ts

'use server';

import { SqlSchema, MongoSchema, DatabaseCredentials } from '@/lib/schemas';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/nextAuth';
import { encrypt, decrypt } from '@/lib/api/utils/encryption';
import * as z from 'zod';
import mysql from 'mysql2/promise';
import { Client } from 'pg';
import { MongoClient } from 'mongodb';

export interface Database {
	id: string;
	name: string;
	type: 'mysql' | 'postgresql' | 'mongodb';
	credentials: string | null;
	userId: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface DecryptedDatabase extends Omit<Database, 'credentials'> {
	credentials: {
		host?: string;
		port?: number;
		database?: string;
		user?: string;
		password?: string;
		mongoUri?: string;
	} | null;
}

export async function testDatabaseConnection(credentials: DatabaseCredentials) {
	try {
		switch (credentials.databaseType) {
			case 'mysql':
				const connection = await mysql.createConnection({
					host: credentials.host,
					port: credentials.port,
					user: credentials.user,
					password: credentials.password,
					database: credentials.database,
				});
				await connection.end();
				break;

			case 'postgresql':
				const client = new Client({
					host: credentials.host,
					port: credentials.port,
					user: credentials.user,
					password: credentials.password,
					database: credentials.database,
				});
				await client.connect();
				await client.end();
				break;

			case 'mongodb':
				const mongoClient = new MongoClient(credentials.mongoUri);
				await mongoClient.connect();
				await mongoClient.db().admin().listDatabases();
				await mongoClient.close();
				break;

			default:
				throw new Error('Unsupported database type');
		}

		return { success: true, message: 'Connection successful' };
	} catch (error: any) {
		console.error('Database connection error:', error);
		return { success: false, message: 'Connection failed', error: error.message };
	}
}

export async function saveCredentials(credentials: z.infer<typeof SqlSchema> | z.infer<typeof MongoSchema>) {
	const session = await getServerSession(authOptions);

	if (!session) {
		return { error: 'Unauthorized', status: 401, success: false };
	}

	const encryptedCredentials =
		credentials.databaseType === 'mongodb'
			? encrypt(JSON.stringify({ mongoUri: credentials.mongoUri }))
			: encrypt(
					JSON.stringify({
						host: credentials.host,
						port: credentials.port,
						database: credentials.database,
						user: credentials.user,
						password: credentials.password,
					})
			  );

	const response = await prisma.database.create({
		data: {
			userId: session.user.id,
			name: credentials.name,
			credentials: JSON.stringify(encryptedCredentials),
			type: credentials.databaseType,
		},
	});

	return {
		success: true,
		response,
	};
}
export async function getDatabaseList() {
	try {
		const session = await getServerSession(authOptions);

		if (!session) {
			return { error: 'Unauthorized', status: 401 };
		}

		const databases = await prisma.database.findMany({
			where: { userId: session.user.id },
			select: {
				id: true,
				name: true,
				type: true,
				credentials: true,
				tables: {
					select: {
						apis: {
							select: {
								id: true,
							},
						},
					},
				},
			},
		});

		return databases.map((database) => ({
			...database,
			credentials: decrypt(JSON.parse(database.credentials as string)),
		}));
	} catch (error) {
		console.error('Error fetching databases:', error);
		return { error: 'Failed to fetch databases', status: 500 };
	}
}

export async function getDatabaseById(id: string) {
	try {
		const session = await getServerSession(authOptions);

		if (!session) {
			return { error: 'Unauthorized', status: 401 };
		}

		const database = await prisma.database.findFirst({
			where: { id, userId: session.user.id },
		});

		if (!database) {
			return { error: 'Database not found', status: 404 };
		}

		return {
			...database,
			credentials: decrypt(JSON.parse(database.credentials as string)),
		};
	} catch (error) {
		console.error('Error fetching database:', error);
		return { error: 'Failed to fetch database', status: 500 };
	}
}

export async function updateDatabase(id: string, data: DatabaseCredentials) {
	try {
		const session = await getServerSession(authOptions);

		if (!session) {
			return { error: 'Unauthorized', status: 401 };
		}

		const encryptedCredentials = encrypt(JSON.stringify(data));

		const updatedDatabase = await prisma.database.update({
			where: { id, userId: session.user.id },
			data: {
				name: data.name,
				type: data.databaseType,
				credentials: encryptedCredentials,
			},
		});

		return {
			...updatedDatabase,
			credentials: decrypt(JSON.parse(updatedDatabase.credentials as string)),
		};
	} catch (error) {
		console.error('Error updating database:', error);
		return { error: 'Failed to update database', status: 500 };
	}
}

export async function deleteDatabaseById(databaseId: string) {
	const session = await getServerSession(authOptions);

	if (!session) {
		return { error: 'Unauthorized', status: 401 };
	}

	const database = await prisma.database.findFirst({
		where: { id: databaseId, userId: session.user.id },
	});

	if (!database) {
		return { error: 'Database not found', status: 404 };
	}

	await prisma.database.delete({
		where: { id: databaseId },
	});

	return {
		message: 'Database deleted successfully',
		status: 200,
	};
}
