import mysql from 'mysql2/promise';
import { Client } from 'pg';
import { MongoClient, ObjectId } from 'mongodb';
import { decrypt } from './encryption';

interface DatabaseConfig {
	type: string; // Changed from 'mysql' | 'postgresql' | 'mongodb' to string
	credentials: string; // Encrypted credentials
	id: string;
	name: string;
	userId: string;
	createdAt: Date;
	updatedAt: Date;
}

type SupportedDatabaseType = 'mysql' | 'postgresql' | 'mongodb';

function isSupportedDatabaseType(type: string): type is SupportedDatabaseType {
	return ['mysql', 'postgresql', 'mongodb'].includes(type);
}

export async function executeQuery(database: DatabaseConfig, query: string): Promise<any> {
	if (!isSupportedDatabaseType(database.type)) {
		throw new Error(`Unsupported database type: ${database.type}`);
	}

	const decryptedCredentials = database.credentials;

	console.log('Executing query:', query); // Add this for debugging

	switch (database.type) {
		case 'mysql':
			return executeMySqlQuery(decryptedCredentials, query);
		case 'postgresql':
			return executePostgresQuery(decryptedCredentials, query);
		case 'mongodb':
			return executeMongoDbQuery(decryptedCredentials, query);
	}
}

async function executeMySqlQuery(credentials: any, query: string): Promise<any> {
	const connection = await mysql.createConnection({
		host: credentials.host,
		user: credentials.user,
		password: credentials.password,
		database: credentials.database,
		port: credentials.port,
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
	if (!credentials.mongoUri) {
		throw new Error('MongoDB URI is undefined');
	}
	const client = new MongoClient(credentials.mongoUri);

	try {
		await client.connect();
		const db = client.db();

		if (query.startsWith('db.createCollection')) {
			const match = query.match(/"([^"]*)"/);
			const collectionName: any = match ? match[1] : null;
			await db.createCollection(collectionName);
			return { created: true, collectionName };
		} else if (query.startsWith('db.') && query.endsWith('.drop()')) {
			const collectionName = query.split('.')[1];
			await db.collection(collectionName).drop();
			return { dropped: true, collectionName };
		} else if (query.startsWith('db.')) {
			const [, collectionName, operation] = query.match(/db\.(\w+)\.(\w+)/) || [];
			const collection = db.collection(collectionName);

			if (operation === 'find') {
				const result = await collection.find().toArray();
				return result.map((doc) => ({ ...doc, _id: doc._id.toString() }));
			} else if (operation === 'findOne') {
				const idMatch = query.match(/ObjectId\("(.+)"\)/);
				const id = idMatch ? idMatch[1] : null;
				const result = await collection.findOne({ _id: id ? new ObjectId(id) : undefined });
				return result ? { ...result, _id: result._id.toString() } : null;
			} else if (operation === 'insertOne') {
				const dataMatch = query.match(/insertOne\((.+)\)/);
				const data = dataMatch ? JSON.parse(dataMatch[1]) : {};
				const result = await collection.insertOne(data);
				return {
					insertedId: result.insertedId.toString(),
					ops: [{ ...data, _id: result.insertedId.toString() }],
				};
			} else if (operation === 'updateOne') {
				const [, id, updateData] = query.match(/updateOne\({_id: ObjectId\("(.+)"\)}, {\$set: (.+)}\)/) || [];
				const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: JSON.parse(updateData) });
				return { ...result, _id: id };
			} else if (operation === 'deleteOne') {
				const idMatch = query.match(/ObjectId\("(.+)"\)/);
				const id = idMatch ? idMatch[1] : null;
				const result = await collection.deleteOne({ _id: id ? new ObjectId(id) : undefined });
				return { ...result, _id: id };
			}
		}

		throw new Error(`Unsupported MongoDB operation: ${query}`);
	} finally {
		await client.close();
	}
}
