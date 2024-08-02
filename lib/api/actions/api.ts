'use server';
import prisma from '@/lib/prisma';
import { executeQuery } from '../utils/databaseUtils';
import { getDatabaseById } from './database';
import { getTableById } from './table';
import { decrypt } from '../utils/encryption';
import { Api, Column } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { createId } from '@paralleldrive/cuid2';

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

	let result;

	try {
		if (method === 'POST') {
			const [insertQuery, selectQuery] = generateCreateQuery(
				database.type,
				table.name,
				body,
				table.columns,
				table.idType
			);

			console.log('Executing INSERT query:', insertQuery);
			result = await executeQuery(
				{
					...database,
					credentials: decryptedCredentials,
				},
				insertQuery
			);

			if (database.type === 'postgresql') {
				// For PostgreSQL, the result of INSERT ... RETURNING * is already what we need
				return handleQueryResult(database.type, method, result);
			}

			if (database.type !== 'mongodb' && selectQuery) {
				console.log('Executing SELECT query:', selectQuery);
				result = await executeQuery(
					{
						...database,
						credentials: decryptedCredentials,
					},
					selectQuery
				);
			}
		} else {
			const query = generateQuery(method, database.type, table.name, params, body, table.columns, table.idType);
			console.log('Executing query:', query);
			result = await executeQuery(
				{
					...database,
					credentials: decryptedCredentials,
				},
				query
			);
		}

		// Handle the result based on the database type and method
		return handleQueryResult(database.type, method, result);
	} catch (error: any) {
		console.error('Error executing query:', error);
		return { error: error.message, status: 500 };
	}
}

function generateQuery(
	method: string,
	databaseType: string,
	tableName: string,
	params: any,
	body: any,
	columns: Column[],
	idType: string
): string {
	switch (method) {
		case 'GET':
			return params.id
				? generateReadByIdQuery(databaseType, tableName, params.id, idType)
				: generateReadAllQuery(databaseType, tableName);
		case 'POST':
			return generateCreateQuery(databaseType, tableName, body, columns, idType)[0];
		case 'PUT':
			return generateUpdateQuery(databaseType, tableName, params.id, body, columns, idType);
		case 'DELETE':
			return generateDeleteQuery(databaseType, tableName, params.id, idType);
		default:
			throw new Error(`Unsupported method: ${method}`);
	}
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

function generateReadByIdQuery(databaseType: string, tableName: string, id: string, idType: string): string {
	const idValue = idType === 'auto_increment' ? id : `'${id}'`;
	switch (databaseType) {
		case 'mysql':
		case 'postgresql':
			return `SELECT * FROM ${tableName} WHERE id = ${idValue}`;
		case 'mongodb':
			return `db.${tableName}.findOne({_id: ${idType === 'auto_increment' ? id : `ObjectId("${id}")`}})`;
		default:
			throw new Error(`Unsupported database type: ${databaseType}`);
	}
}

function generateCreateQuery(
	databaseType: string,
	tableName: string,
	data: any,
	columns: Column[],
	idType: string
): [string, string] {
	let columnNames = columns
		.filter((col) => col.name.toLowerCase() !== 'id' || idType !== 'auto_increment')
		.map((col) => col.name);

	let values = columnNames.map((col) => {
		if (col.toLowerCase() === 'id') {
			switch (idType) {
				case 'uuid':
					return databaseType === 'postgresql' ? 'gen_random_uuid()' : `'${uuidv4()}'`;
				case 'cuid':
					return `'${createId()}'`;
				default:
					return 'DEFAULT';
			}
		}
		return `'${data[col]}'`;
	});

	let insertQuery;
	let selectQuery;

	switch (databaseType) {
		case 'mysql':
			insertQuery = `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${values.join(', ')})`;
			selectQuery = `SELECT * FROM ${tableName} WHERE id = LAST_INSERT_ID()`;
			break;
		case 'postgresql':
			insertQuery = `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${values.join(', ')}) RETURNING *`;
			selectQuery = ''; // We don't need a separate select query for PostgreSQL
			break;
		case 'mongodb':
			const mongoData = columnNames.reduce((obj: any, col, index) => {
				obj[col] = values[index].replace(/^'|'$/g, ''); // Remove surrounding quotes
				return obj;
			}, {});
			insertQuery = `db.${tableName}.insertOne(${JSON.stringify(mongoData)})`;
			selectQuery = ''; // We don't need a separate select query for MongoDB
			break;
		default:
			throw new Error(`Unsupported database type: ${databaseType}`);
	}

	return [insertQuery, selectQuery];
}

function generateUpdateQuery(
	databaseType: string,
	tableName: string,
	id: string,
	data: any,
	columns: Column[],
	idType: string
): string {
	const setClause = columns
		.filter((col) => col.name.toLowerCase() !== 'id' && data[col.name] !== undefined)
		.map((col) => `${col.name} = '${data[col.name]}'`)
		.join(', ');

	const idValue = idType === 'auto_increment' ? id : `'${id}'`;

	switch (databaseType) {
		case 'mysql':
		case 'postgresql':
			return `UPDATE ${tableName} SET ${setClause} WHERE id = ${idValue}`;
		case 'mongodb':
			return `db.${tableName}.updateOne({_id: ${
				idType === 'auto_increment' ? id : `ObjectId("${id}")`
			}}, {$set: ${JSON.stringify(data)}})`;
		default:
			throw new Error(`Unsupported database type: ${databaseType}`);
	}
}

function generateDeleteQuery(databaseType: string, tableName: string, id: string, idType: string): string {
	const idValue = idType === 'auto_increment' ? id : `'${id}'`;
	switch (databaseType) {
		case 'mysql':
		case 'postgresql':
			return `DELETE FROM ${tableName} WHERE id = ${idValue}`;
		case 'mongodb':
			return `db.${tableName}.deleteOne({_id: ${idType === 'auto_increment' ? id : `ObjectId("${id}")`}})`;
		default:
			throw new Error(`Unsupported database type: ${databaseType}`);
	}
}

function handleQueryResult(databaseType: string, method: string, result: any) {
	if (!result) {
		return null;
	}

	switch (databaseType) {
		case 'mysql':
		case 'postgresql':
			if (method === 'GET' && Array.isArray(result)) {
				return result;
			} else if (method === 'POST' || (method === 'GET' && !Array.isArray(result))) {
				return result[0] || result;
			}
			return { affectedRows: result.affectedRows || result.rowCount };
		case 'mongodb':
			if (method === 'POST') {
				// Handle MongoDB insert result
				if (result.insertedId) {
					return { id: result.insertedId.toString(), ...result.ops?.[0] };
				} else {
					return result;
				}
			} else if (method === 'GET' && Array.isArray(result)) {
				return result.map((item: any) => ({ ...item, id: item._id.toString() }));
			} else if (method === 'GET') {
				return result ? { ...result, id: result._id?.toString() } : null;
			}
			return result;
		default:
			throw new Error(`Unsupported database type: ${databaseType}`);
	}
}
