// lib/actions/tableActions.ts

'use server';
import { MongoClient } from 'mongodb';
import prisma from '@/lib/prisma';
import { getDatabaseById } from '@/lib/api/actions/database';
import { executeQuery } from '@/lib/api/utils/databaseUtils';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { createId } from '@paralleldrive/cuid2';
import { MongoTableSchema, SqlTableSchema } from '@/lib/schemas';
import { decrypt } from '../utils/encryption';
import { createApiEndpoints } from './api';
import { Table, Column, Database } from '@prisma/client';

type TableWithRelations = Table & {
	columns: Column[];
	database: Database;
};

type TableResult = { success: true; table: TableWithRelations } | { success: false; error: string };

const ColumnSchema = z.object({
	name: z.string().min(1, 'Column name is required'),
	dataType: z.enum(['string', 'number', 'boolean', 'date']),
	isNullable: z.boolean(),
	defaultValue: z.string().optional(),
});

const TableSchema = z.object({
	name: z.string().min(1, 'Table name is required'),
	columns: z.array(ColumnSchema).min(1, 'At least one column is required'),
});

function getIdColumnDefinition(databaseType: string, idType: string): string {
	switch (databaseType) {
		case 'mysql':
			switch (idType) {
				case 'auto_increment':
					return 'id INT AUTO_INCREMENT PRIMARY KEY';
				case 'uuid':
					return 'id CHAR(36) PRIMARY KEY';
				case 'cuid':
					return 'id CHAR(24) PRIMARY KEY';
			}
		case 'postgresql':
			switch (idType) {
				case 'auto_increment':
					return 'id SERIAL PRIMARY KEY';
				case 'uuid':
					return 'id UUID PRIMARY KEY DEFAULT gen_random_uuid()';
				case 'cuid':
					return 'id CHAR(24) PRIMARY KEY';
			}
		default:
			throw new Error(`Unsupported database type: ${databaseType}`);
	}
}

export async function createTable(
	databaseId: string,
	tableData: z.infer<typeof SqlTableSchema> | z.infer<typeof MongoTableSchema>
) {
	try {
		const database: any = await getDatabaseById(databaseId);
		if ('error' in database) {
			throw new Error(database.error);
		}

		let query;
		let tableId;

		if (database.type === 'mongodb') {
			const { name } = MongoTableSchema.parse(tableData);
			query = `db.createCollection("${name}")`;
			tableId = uuidv4(); // We'll use this as our internal ID, not in MongoDB
			console.log('MongoDB query:', query);
		} else {
			const { name, idType, columns } = SqlTableSchema.parse(tableData);

			// Ensure the id column is first and properly set up
			const idColumn = getIdColumnDefinition(database.type, idType);
			const otherColumnDefinitions = columns.map(
				(col) =>
					`${col.name} ${mapDataType(database.type, col.dataType)}${col.isNullable ? '' : ' NOT NULL'}${
						col.defaultValue ? ` DEFAULT ${col.defaultValue}` : ''
					}`
			);

			const allColumnDefinitions = [idColumn, ...otherColumnDefinitions];
			query = `CREATE TABLE ${name} (${allColumnDefinitions.join(', ')})`;

			console.log('SQL query:', query);

			if (idType === 'uuid') {
				tableId = uuidv4();
			} else if (idType === 'cuid') {
				tableId = createId();
			} else {
				tableId = null; // For auto-increment, we'll get the ID after creation
			}
		}

		await executeQuery(database, query);

		// For SQL databases with auto-increment, get the last inserted ID
		if (database.type !== 'mongodb' && !tableId) {
			const idResult = await executeQuery(database, 'SELECT LAST_INSERT_ID() as id');
			tableId = idResult[0].id;
		}

		// Store the table information in our database
		const table = await prisma.table.create({
			data: {
				name: tableData.name,
				databaseId,
				idType: database.type === 'mongodb' ? 'mongodb_id' : (tableData as z.infer<typeof SqlTableSchema>).idType,
				columns: {
					create: [
						{
							name: 'id',
							dataType: database.type === 'mongodb' ? 'string' : (tableData as z.infer<typeof SqlTableSchema>).idType,
							isNullable: false,
							defaultValue: null,
						},
						...tableData.columns.map((col) => ({
							name: col.name,
							dataType: col.dataType,
							isNullable: col.isNullable,
							defaultValue: col.defaultValue,
						})),
					],
				},
			},
			include: { columns: true, database: true },
		});

		// Generate API endpoints for the new table
		const apiEndpoints = await createApiEndpoints(table.databaseId, table.id);

		revalidatePath(`/dashboard/databases/${databaseId}/tables`);
		return { success: true, table, apiEndpoints };
	} catch (error: any) {
		console.error('Failed to create table:', error);
		return { error: error.message, status: 500 };
	}
}

export async function updateTable(databaseId: string, tableId: string, tableData: z.infer<typeof TableSchema>) {
	try {
		const existingTable: any = await prisma.table.findUnique({
			where: { id: tableId, databaseId },
			include: { database: true, columns: true },
		});

		if (!existingTable) {
			return { error: 'Table not found', status: 404 };
		}

		const { name, columns } = tableData;

		let decryptedCredentials;

		try {
			decryptedCredentials = decrypt(JSON.parse(existingTable.database.credentials as string));
		} catch (error) {
			console.error('Error decrypting database credentials:', error);
			return { error: 'Failed to decrypt database credentials', status: 500 };
		}

		if (existingTable.database.type === 'mongodb') {
			// For MongoDB, update the stored schema in the database
			const updatedTable = await prisma.table.update({
				where: { id: tableId },
				data: {
					name,
					columns: {
						deleteMany: {},
						create: columns.map((col) => ({
							name: col.name,
							dataType: col.dataType,
							isNullable: col.isNullable,
							defaultValue: col.defaultValue,
						})),
					},
				},
				include: { columns: true },
			});

			// Optionally update the MongoDB collection schema
			const client = new MongoClient(decryptedCredentials.mongoUri);
			try {
				await client.connect();
				const db = client.db();
				await db.command({
					collMod: existingTable.name,
					validator: {
						$jsonSchema: {
							bsonType: 'object',
							required: columns.filter((col) => !col.isNullable).map((col) => col.name),
							properties: columns.reduce(
								(acc, col) => ({
									...acc,
									[col.name]: { bsonType: mapMongoDBType(col.dataType) },
								}),
								{}
							),
						},
					},
				});
			} finally {
				await client.close();
			}

			return { success: true, table: updatedTable };
		} else {
			// Generate ALTER TABLE queries based on the differences
			const queries = [];

			if (name !== existingTable.name) {
				queries.push(`ALTER TABLE ${existingTable.name} RENAME TO ${name}`);
			}

			const existingColumns = new Set(existingTable.columns.map((col: any) => col.name));
			const newColumns = new Set(columns.map((col) => col.name));

			// Add new columns
			for (const col of columns) {
				if (!existingColumns.has(col.name)) {
					queries.push(
						`ALTER TABLE ${name} ADD COLUMN ${col.name} ${mapDataType(existingTable.database.type, col.dataType)}${
							col.isNullable ? '' : ' NOT NULL'
						}${col.defaultValue ? ` DEFAULT ${col.defaultValue}` : ''}`
					);
				}
			}

			// Modify existing columns
			for (const col of columns) {
				if (existingColumns.has(col.name)) {
					const existingCol: any = existingTable.columns.find((c: any) => c.name === col.name);
					if (
						existingCol.dataType !== col.dataType ||
						existingCol.isNullable !== col.isNullable ||
						existingCol.defaultValue !== col.defaultValue
					) {
						if (existingTable.database.type === 'postgresql') {
							queries.push(
								`ALTER TABLE ${name} ALTER COLUMN ${col.name} TYPE ${mapDataType(
									existingTable.database.type,
									col.dataType
								)}${col.isNullable ? ' DROP NOT NULL' : ' SET NOT NULL'}${
									col.defaultValue ? `, ALTER COLUMN ${col.name} SET DEFAULT ${col.defaultValue}` : ''
								}`
							);
						} else {
							// MySQL
							queries.push(
								`ALTER TABLE ${name} MODIFY COLUMN ${col.name} ${mapDataType(
									existingTable.database.type,
									col.dataType
								)}${col.isNullable ? '' : ' NOT NULL'}${col.defaultValue ? ` DEFAULT ${col.defaultValue}` : ''}`
							);
						}
					}
				}
			}
			// Drop removed columns
			for (const col of existingTable.columns) {
				if (!newColumns.has(col.name)) {
					queries.push(`ALTER TABLE ${name} DROP COLUMN ${col.name}`);
				}
			}

			// Execute the queries
			for (const query of queries) {
				await executeQuery(
					{
						...existingTable.database,
						credentials: decryptedCredentials,
					},
					query
				);
			}

			// Update the table information in our database
			const updatedTable = await prisma.table.update({
				where: { id: tableId },
				data: {
					name,
					columns: {
						deleteMany: {},
						create: columns.map((col) => ({
							name: col.name,
							dataType: col.dataType,
							isNullable: col.isNullable,
							defaultValue: col.defaultValue,
						})),
					},
				},
				include: { columns: true },
			});

			return { success: true, table: updatedTable };
		}
	} catch (error: any) {
		console.error('Failed to update table:', error);
		return { error: error.message, status: 500 };
	}
}

export async function getTables(databaseId: string) {
	try {
		const tables = await prisma.table.findMany({
			where: { databaseId },
			include: { columns: true, apis: true },
		});
		return { success: true, tables };
	} catch (error) {
		console.error('Failed to fetch tables:', error);
		return { error: 'Failed to fetch tables', status: 500 };
	}
}

export async function getTableById(databaseId: string, tableId: string): Promise<TableResult> {
	try {
		const table = await prisma.table.findUnique({
			where: { id: tableId, databaseId },
			include: {
				columns: true,
				database: true,
				apis: true,
			},
		});

		if (!table) {
			return { success: false, error: 'Table not found' };
		}

		return { success: true, table };
	} catch (error) {
		console.error('Failed to fetch table:', error);
		return { success: false, error: 'Failed to fetch table' };
	}
}

export async function deleteTable(databaseId: string, tableId: string) {
	try {
		const database: any = await getDatabaseById(databaseId);
		if ('error' in database) {
			throw new Error(database.error);
		}

		const table = await prisma.table.findFirst({
			where: { id: tableId, databaseId },
		});

		if (!table) {
			throw new Error('Table not found');
		}

		let query;
		if (database.type === 'mongodb') {
			query = `db.${table.name}.drop()`;
		} else {
			query = `DROP TABLE ${table.name}`;
		}

		// Execute the query on the client's database
		await executeQuery(database, query);

		// Delete the table information from our database
		await prisma.table.delete({ where: { id: tableId } });

		revalidatePath(`/dashboard/databases/${databaseId}`);
		return { success: true, message: 'Table deleted successfully' };
	} catch (error: any) {
		console.error('Failed to delete table:', error);
		return { error: error.message, status: 500 };
	}
}

function mapDataType(databaseType: string, dataType: string): string {
	const typeMap: { [key: string]: { [key: string]: string } } = {
		mysql: {
			string: 'VARCHAR(255)',
			number: 'INT',
			boolean: 'BOOLEAN',
			date: 'DATETIME',
		},
		postgresql: {
			string: 'TEXT',
			number: 'INTEGER',
			boolean: 'BOOLEAN',
			date: 'TIMESTAMP',
		},
		mongodb: {
			string: 'String',
			number: 'Number',
			boolean: 'Boolean',
			date: 'Date',
		},
	};

	return typeMap[databaseType][dataType] || dataType;
}

function mapMongoDBType(dataType: string): string {
	switch (dataType) {
		case 'string':
			return 'string';
		case 'number':
			return 'number';
		case 'boolean':
			return 'bool';
		case 'date':
			return 'date';
		default:
			return 'string';
	}
}
