// lib/actions/tableActions.ts

'use server';

import prisma from '@/lib/prisma';
import { getDatabaseById } from '@/lib/api/actions/database';
import { executeQuery } from '@/lib/api/utils/databaseUtils';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { createId } from '@paralleldrive/cuid2';
import { MongoTableSchema, SqlTableSchema } from '@/lib/schemas';

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
			const { name, columns } = MongoTableSchema.parse(tableData);
			query = `db.createCollection("${name}")`;
			tableId = uuidv4(); // We'll use this as our internal ID, not in MongoDB
		} else {
			const { name, idType, columns } = SqlTableSchema.parse(tableData);
			const idColumn = getIdColumnDefinition(database.type, idType);
			const columnDefinitions = columns.map(
				(col) =>
					`${col.name} ${mapDataType(database.type, col.dataType)}${col.isNullable ? '' : ' NOT NULL'}${
						col.defaultValue ? ` DEFAULT ${col.defaultValue}` : ''
					}`
			);

			columnDefinitions.unshift(idColumn);
			query = `CREATE TABLE ${name} (${columnDefinitions.join(', ')})`;

			if (idType === 'uuid') {
				tableId = uuidv4();
			} else if (idType === 'cuid') {
				tableId = createId();
			} else {
				tableId = null; // For auto-increment, we'll get the ID after creation
			}
		}

		// Execute the query on the client's database
		await executeQuery(database, query);

		// Store the table information in our database
		const table = await prisma.table.create({
			data: {
				name: tableData.name,
				databaseId,
				idType: database.type === 'mongodb' ? 'mongodb_id' : (tableData as z.infer<typeof SqlTableSchema>).idType,
				columns: {
					create: tableData.columns.map((col) => ({
						name: col.name,
						dataType: col.dataType,
						isNullable: col.isNullable,
						defaultValue: col.defaultValue,
					})),
				},
			},
			include: { columns: true },
		});

		revalidatePath(`/dashboard/databases/${databaseId}/tables`);
		return { success: true, table };
	} catch (error: any) {
		console.error('Failed to create table:', error);
		return { error: error.message, status: 500 };
	}
}

export async function updateTable(databaseId: string, tableId: string, tableData: z.infer<typeof TableSchema>) {
	try {
		const { name, columns } = TableSchema.parse(tableData);

		const database: any = await getDatabaseById(databaseId);
		if ('error' in database) {
			throw new Error(database.error);
		}

		const existingTable = await prisma.table.findUnique({
			where: { id: tableId },
			include: { columns: true },
		});

		if (!existingTable) {
			throw new Error('Table not found');
		}

		let queries = [];
		if (database.type !== 'mongodb') {
			// Generate ALTER TABLE queries for SQL databases
			if (name !== existingTable.name) {
				queries.push(`ALTER TABLE ${existingTable.name} RENAME TO ${name}`);
			}

			const existingColumns = new Set(existingTable.columns.map((col) => col.name));
			const newColumns = new Set(columns.map((col) => col.name));

			// Add new columns
			for (const col of columns) {
				if (!existingColumns.has(col.name)) {
					queries.push(
						`ALTER TABLE ${name} ADD COLUMN ${col.name} ${mapDataType(database.type, col.dataType)}${
							col.isNullable ? '' : ' NOT NULL'
						}${col.defaultValue ? ` DEFAULT ${col.defaultValue}` : ''}`
					);
				}
			}

			// Drop removed columns
			for (const col of existingTable.columns) {
				if (!newColumns.has(col.name)) {
					queries.push(`ALTER TABLE ${name} DROP COLUMN ${col.name}`);
				}
			}

			// Modify existing columns
			for (const col of columns) {
				if (existingColumns.has(col.name)) {
					const existingCol: any = existingTable.columns.find((c) => c.name === col.name);
					if (
						existingCol.dataType !== col.dataType ||
						existingCol.isNullable !== col.isNullable ||
						existingCol.defaultValue !== col.defaultValue
					) {
						queries.push(
							`ALTER TABLE ${name} MODIFY COLUMN ${col.name} ${mapDataType(database.type, col.dataType)}${
								col.isNullable ? '' : ' NOT NULL'
							}${col.defaultValue ? ` DEFAULT ${col.defaultValue}` : ''}`
						);
					}
				}
			}
		} else {
			// For MongoDB, we'll update the stored schema
			queries.push(`db.${existingTable.name}.updateMany({}, { $set: ${JSON.stringify(columns)} })`);
		}

		// Execute the queries on the client's database
		for (const query of queries) {
			await executeQuery(database, query);
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

		revalidatePath(`/dashboard/databases/${databaseId}/tables`);
		return { success: true, table: updatedTable };
	} catch (error: any) {
		console.error('Failed to update table:', error);
		return { error: error.message, status: 500 };
	}
}

export async function getTables(databaseId: string) {
	try {
		const tables = await prisma.table.findMany({
			where: { databaseId },
			include: { columns: true },
		});
		return { success: true, tables };
	} catch (error) {
		console.error('Failed to fetch tables:', error);
		return { error: 'Failed to fetch tables', status: 500 };
	}
}

export async function getTableById(databaseId: string, tableId: string) {
	try {
		const table = await prisma.table.findFirst({
			where: { id: tableId, databaseId },
			include: { columns: true },
		});
		if (!table) {
			return { error: 'Table not found', status: 404 };
		}
		return { success: true, table };
	} catch (error) {
		console.error('Failed to fetch table:', error);
		return { error: 'Failed to fetch table', status: 500 };
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
