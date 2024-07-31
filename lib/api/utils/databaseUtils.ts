// lib/databaseUtils.ts

import mysql from 'mysql2/promise';
import { Client } from 'pg';
import { MongoClient } from 'mongodb';
import { decrypt } from './encryption';

interface DatabaseConfig {
	type: 'mysql' | 'postgresql' | 'mongodb';
	credentials: string; // Encrypted credentials
}

export async function executeQuery(database: DatabaseConfig, query: string): Promise<any> {
	const decryptedCredentials = database.credentials;

	switch (database.type) {
		case 'mysql':
			return executeMySqlQuery(decryptedCredentials, query);
		case 'postgresql':
			return executePostgresQuery(decryptedCredentials, query);
		case 'mongodb':
			return executeMongoDbQuery(decryptedCredentials, query);
		default:
			throw new Error(`Unsupported database type: ${database.type}`);
	}
}

async function executeMySqlQuery(credentials: any, query: string): Promise<any> {
	const connection = await mysql.createConnection({
		host: credentials.host,
		user: credentials.user,
		password: credentials.password,
		database: credentials.database,
	});

	try {
		const [results] = await connection.query(query);
		return results;
	} finally {
		await connection.end();
	}
}

async function executePostgresQuery(credentials: any, query: string): Promise<any> {
	const client = new Client({
		host: credentials.host,
		user: credentials.user,
		password: credentials.password,
		database: credentials.database,
		port: credentials.port,
	});

	try {
		await client.connect();
		const result = await client.query(query);
		return result.rows;
	} finally {
		await client.end();
	}
}

async function executeMongoDbQuery(credentials: any, query: string): Promise<any> {
	const client = new MongoClient(credentials.uri);

	try {
		await client.connect();
		const db = client.db();
		// For MongoDB, we need to parse the query string and execute the corresponding operation
		const [operation, ...args] = query.split('.');
		switch (operation) {
			case 'createCollection':
				return await db.createCollection(args[0].replace(/['"]+/g, ''));
			case 'drop':
				return await db.collection(args[0].replace(/['"]+/g, '')).drop();
			default:
				throw new Error(`Unsupported MongoDB operation: ${operation}`);
		}
	} finally {
		await client.close();
	}
}
