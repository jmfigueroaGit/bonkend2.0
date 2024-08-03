import { getDatabaseById } from './database';
import { getTableColumns, getTables } from './table';
import { getApisByTableId } from './api';
import { generateProject } from '@/lib/api/generator/projectGenerator';
import { createZip } from '../utils/zipUtils'; // You'll need to implement this

export async function exportProject(databaseId: string, format: 'javascript' | 'typescript') {
	try {
		const database: any = await getDatabaseById(databaseId);
		if ('error' in database) {
			throw new Error(database.error);
		}

		const tablesResult = await getTables(databaseId);
		if ('error' in tablesResult) {
			throw new Error(tablesResult.error);
		}

		const tables = tablesResult.tables;

		const apis = await Promise.all(tables.map((table) => getApisByTableId(table.id)));
		const allApis = apis.flat();

		const columns = await Promise.all(tables.map((table) => getTableColumns(table.id)));
		const allColumns = columns.flat();

		const projectFiles = await generateProject(database, tables, allApis, allColumns, format);

		// Create a zip file from the generated files
		const zipBuffer = await createZip(projectFiles);

		return {
			success: true,
			data: zipBuffer,
			filename: `${database.name}-backend.zip`,
		};
	} catch (error: any) {
		console.error('Failed to export project:', error);
		return { error: error.message, status: 500 };
	}
}
