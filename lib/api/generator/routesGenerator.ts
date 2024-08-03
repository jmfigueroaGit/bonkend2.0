// lib/generators/routesGenerator.ts

import { Api as ApiEndpoint, Table } from '@prisma/client';

export function generateRoutesFiles(
	tables: Table[],
	apiEndpoints: ApiEndpoint[],
	format: 'javascript' | 'typescript'
): { [filename: string]: string } {
	const routeFiles: { [filename: string]: string } = {};
	const ext = format === 'typescript' ? 'ts' : 'js';

	tables.forEach((table) => {
		const tableEndpoints = apiEndpoints.filter((endpoint) => endpoint.tableId === table.id);
		const routeContent = generateRouteFileContent(table.name, tableEndpoints, format);

		routeFiles[`routes/${table.name.toLowerCase()}Routes.${ext}`] = routeContent;
	});

	// Generate index file to combine all routes
	routeFiles[`routes/index.${ext}`] = generateRoutesIndexFile(tables, format);

	return routeFiles;
}

function generateRouteFileContent(
	tableName: string,
	endpoints: ApiEndpoint[],
	format: 'javascript' | 'typescript'
): string {
	const imports =
		format === 'typescript'
			? `import express from 'express';
import * as ${tableName}Controller from '../controllers/${tableName.toLowerCase()}Controller';`
			: `const express = require('express');
const ${tableName}Controller = require('../controllers/${tableName.toLowerCase()}Controller');`;

	const routes = endpoints
		.map((endpoint) => {
			const { method, path, name } = endpoint;
			const controllerMethod = `${method.toLowerCase()}${capitalize(tableName)}`;
			return `router.${method.toLowerCase()}('${convertUrlPath(path)}', ${tableName}Controller.${controllerMethod});`;
		})
		.join('\n');

	const exportStatement = format === 'typescript' ? `export default router;` : `module.exports = router;`;

	return `
${imports}

const router = express.Router();

${routes}

${exportStatement}
  `.trim();
}

function generateRoutesIndexFile(tables: Table[], format: 'javascript' | 'typescript'): string {
	const imports = tables
		.map((table) =>
			format === 'typescript'
				? `import ${table.name.toLowerCase()}Routes from './${table.name.toLowerCase()}Routes';`
				: `const ${table.name.toLowerCase()}Routes = require('./${table.name.toLowerCase()}Routes');`
		)
		.join('\n');

	const routerDeclaration =
		format === 'typescript'
			? `import express from 'express';\n\nconst router = express.Router();`
			: `const express = require('express');\n\nconst router = express.Router();`;

	const uses = tables
		.map((table) => `router.use('/${table.name.toLowerCase()}', ${table.name.toLowerCase()}Routes);`)
		.join('\n');

	const exportStatement = format === 'typescript' ? `export default router;` : `module.exports = router;`;

	return `
${routerDeclaration}

${imports}

${uses}

${exportStatement}
  `.trim();
}

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

function convertUrlPath(url: string): string {
	// Split the URL into segments
	const segments: any = url.split('/');

	// Remove empty segments caused by leading '/'
	const filteredSegments = segments.filter((segment: any) => segment !== '');

	// Remove the first segment (prefix)
	filteredSegments.shift();

	// Reconstruct the path with replaced placeholders
	const convertedPath = filteredSegments
		.map((segment: any) => {
			return segment.replace(/{([^}]+)}/g, ':$1'); // Replace {id} with :id
		})
		.join('/');

	// Return the root '/' or '/:id' format
	return convertedPath ? `/${convertedPath}` : '/';
}
