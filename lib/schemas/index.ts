// lib/db/schemas.ts

import * as z from 'zod';

export const SqlSchema = z.object({
	name: z.string().min(1, 'Database name is required'),
	databaseType: z.enum(['mysql', 'postgresql']),
	host: z.string().min(1, 'Host is required'),
	port: z.number().int().positive('Port must be a positive integer'),
	database: z.string().min(1, 'Database name is required'),
	user: z.string().min(1, 'Username is required'),
	password: z.string().min(1, 'Password is required'),
});

export const MongoSchema = z.object({
	name: z.string().min(1, 'Database name is required'),
	databaseType: z.literal('mongodb'),
	mongoUri: z.string().url('Invalid MongoDB URI'),
});

export type SqlCredentials = z.infer<typeof SqlSchema>;
export type MongoCredentials = z.infer<typeof MongoSchema>;

export const DatabaseSchema = z.discriminatedUnion('databaseType', [
	z.object({
		name: z.string().min(1, 'Database name is required'),
		databaseType: z.literal('mysql'),
		host: z.string().min(1, 'Host is required'),
		port: z.number().int().positive('Port must be a positive integer'),
		database: z.string().min(1, 'Database name is required'),
		user: z.string().min(1, 'Username is required'),
		password: z.string().min(1, 'Password is required'),
	}),
	z.object({
		name: z.string().min(1, 'Database name is required'),
		databaseType: z.literal('postgresql'),
		host: z.string().min(1, 'Host is required'),
		port: z.number().int().positive('Port must be a positive integer'),
		database: z.string().min(1, 'Database name is required'),
		user: z.string().min(1, 'Username is required'),
		password: z.string().min(1, 'Password is required'),
	}),
	z.object({
		name: z.string().min(1, 'Database name is required'),
		databaseType: z.literal('mongodb'),
		mongoUri: z.string().url('Invalid MongoDB URI'),
	}),
]);

export type DatabaseCredentials = z.infer<typeof DatabaseSchema>;

export const TableSchema = z.object({
	name: z.string().min(1, 'Table name is required'),
	databaseId: z.string().uuid('Invalid database ID'),
});

export const SqlTableSchema = z.object({
	name: z.string().min(1, 'Table name is required'),
	idType: z.enum(['auto_increment', 'uuid', 'cuid']),
	columns: z
		.array(
			z.object({
				name: z.string().min(1, 'Column name is required'),
				dataType: z.enum(['string', 'number', 'boolean', 'date']),
				isNullable: z.boolean(),
				defaultValue: z.string().optional(),
			})
		)
		.min(1, 'At least one column is required'),
});

export const MongoTableSchema = z.object({
	name: z.string().min(1, 'Table name is required'),
	columns: z
		.array(
			z.object({
				name: z.string().min(1, 'Column name is required'),
				dataType: z.enum(['string', 'number', 'boolean', 'date']),
				isNullable: z.boolean(),
				defaultValue: z.string().optional(),
			})
		)
		.min(1, 'At least one column is required'),
});
