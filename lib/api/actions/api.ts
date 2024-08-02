'use server';
import prisma from '@/lib/prisma';
import { executeQuery } from '../utils/databaseUtils';
import { getDatabaseById } from './database';
import { getTableById } from './table';
import { decrypt } from '../utils/encryption';
import { Api, Column } from '@prisma/client';

export async function createApiEndpoints(databaseId: string, tableId: string): Promise<Api[] | { error: string }> {
	const tableResult = await getTableById(databaseId, tableId);

	if (!tableResult.success) {
		return { error: tableResult.error };
	}

	const { table } = tableResult;

	const tableNameLower = table.name.toLowerCase();

	const apiEndpoints = [
		{ name: `Create ${table.name}`, method: 'POST', path: `/${tableNameLower}` },
		{ name: `Get All ${table.name}`, method: 'GET', path: `/${tableNameLower}` },
		{ name: `Get ${table.name} by ID`, method: 'GET', path: `/${tableNameLower}/{id}` },
		{ name: `Update ${table.name}`, method: 'PUT', path: `/${tableNameLower}/{id}` },
		{ name: `Delete ${table.name}`, method: 'DELETE', path: `/${tableNameLower}/{id}` },
	];

	try {
		const createdApis = await Promise.all(
			apiEndpoints.map((endpoint) =>
				prisma.api.create({
					data: {
						...endpoint,
						tableId: table.id,
					},
				})
			)
		);

		return createdApis;
	} catch (error) {
		console.error('Failed to create API endpoints:', error);
		return { error: 'Failed to create API endpoints' };
	}
}

export async function executeApiRequest(
	apiId: string,
	method: string,
	params: any = {},
	body: any = {},
	headerObject: any
) {
	const api = await prisma.api.findUnique({
		where: { id: apiId },
		include: { table: { include: { database: true, columns: true } } },
	});

	if (!api) {
		throw new Error('API not found');
	}

	const { table } = api;
	const { database } = table;

	let decryptedCredentials;

	try {
		decryptedCredentials = decrypt(JSON.parse(database.credentials as string));
	} catch (error) {
		console.error('Error decrypting database credentials:', error);
		return { error: 'Failed to decrypt database credentials', status: 500 };
	}

	let query: any = '';
	let additionalQuery: any = '';
	switch (method) {
		case 'GET':
			if (params.id) {
				query = generateReadByIdQuery(database.type, table.name, params.id);
			} else {
				query = generateReadAllQuery(database.type, table.name);
			}
			break;
		case 'POST':
			query = generateCreateQuery(database.type, table.name, body, table.columns);
			break;
		case 'PUT':
			query = generateUpdateQuery(database.type, table.name, params.id, body, table.columns);
			break;
		case 'DELETE':
			query = generateDeleteQuery(database.type, table.name, params.id);
			break;
		default:
			throw new Error(`Unsupported method: ${method}`);
	}

	let result = executeQuery(
		{
			...database,
			credentials: decryptedCredentials,
		},
		query
	);

	// For MySQL POST requests, execute an additional query to get the inserted row
	if (method === 'POST' && database.type === 'mysql' && additionalQuery) {
		console.log('Executing additional query:', additionalQuery);
		result = await executeQuery(
			{
				...database,
				credentials: decryptedCredentials,
			},
			additionalQuery
		);
	}

	// Handle the result based on the database type and method
	return handleQueryResult(database.type, method, result);
}

export async function getApisByTableId(tableId: string): Promise<Api[] | { error: string }> {
	try {
		const apis = await prisma.api.findMany({
			where: { tableId: tableId },
		});
		return apis;
	} catch (error) {
		console.error('Failed to fetch APIs:', error);
		return { error: 'Failed to fetch APIs' };
	}
}

function generateReadAllQuery(databaseType: string, tableName: string): string {
	switch (databaseType) {
		case 'mysql':
		case 'postgresql':
			return `SELECT * FROM ${tableName}`;
		case 'mongodb':
			return `db.${tableName}.find({})`;
		default:
			throw new Error(`Unsupported database type: ${databaseType}`);
	}
}

function generateReadByIdQuery(databaseType: string, tableName: string, id: string): string {
	switch (databaseType) {
		case 'mysql':
		case 'postgresql':
			return `SELECT * FROM ${tableName} WHERE id = '${id}'`;
		case 'mongodb':
			return `db.${tableName}.findOne({_id: ObjectId("${id}")})`;
		default:
			throw new Error(`Unsupported database type: ${databaseType}`);
	}
}

function generateCreateQuery(
	databaseType: string,
	tableName: string,
	data: any,
	columns: Column[]
): [string, string | null] {
	const columnNames = columns.filter((col) => col.name !== 'id' && data[col.name] !== undefined).map((col) => col.name);

	if (columnNames.length === 0) {
		throw new Error('No valid columns to insert');
	}

	const values = columnNames.map((col) => `'${data[col]}'`);

	switch (databaseType) {
		case 'mysql':
			const insertQuery = `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${values.join(', ')})`;
			const selectQuery = `SELECT * FROM ${tableName} WHERE id = LAST_INSERT_ID()`;
			return [insertQuery, selectQuery];
		case 'postgresql':
			return [`INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${values.join(', ')}) RETURNING *`, null];
		case 'mongodb':
			return [`db.${tableName}.insertOne(${JSON.stringify(data)})`, null];
		default:
			throw new Error(`Unsupported database type: ${databaseType}`);
	}
}

function generateUpdateQuery(databaseType: string, tableName: string, id: string, data: any, columns: any[]): string {
	const setClause = columns
		.filter((col) => data[col.name] !== undefined)
		.map((col) => `${col.name} = '${data[col.name]}'`)
		.join(', ');

	switch (databaseType) {
		case 'mysql':
		case 'postgresql':
			return `UPDATE ${tableName} SET ${setClause} WHERE id = '${id}'`;
		case 'mongodb':
			return `db.${tableName}.updateOne({_id: ObjectId("${id}")}, {$set: ${JSON.stringify(data)}})`;
		default:
			throw new Error(`Unsupported database type: ${databaseType}`);
	}
}

function generateDeleteQuery(databaseType: string, tableName: string, id: string): string {
	switch (databaseType) {
		case 'mysql':
		case 'postgresql':
			return `DELETE FROM ${tableName} WHERE id = '${id}'`;
		case 'mongodb':
			return `db.${tableName}.deleteOne({_id: ObjectId("${id}")})`;
		default:
			throw new Error(`Unsupported database type: ${databaseType}`);
	}
}

function handleQueryResult(databaseType: string, method: string, result: any) {
	switch (databaseType) {
		case 'mysql':
		case 'postgresql':
			if (method === 'POST') {
				return result[0]; // Return the first (and only) inserted row
			}
			return result;
		case 'mongodb':
			if (method === 'POST') {
				return { ...result.ops[0], id: result.insertedId.toString() };
			}
			return result;
		default:
			throw new Error(`Unsupported database type: ${databaseType}`);
	}
}
