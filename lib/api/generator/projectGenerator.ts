// lib/generators/projectGenerator.ts

'use server';

import { Database, Table, Api, Column } from '@prisma/client';
import { convertUrlPath, generateRoutesFiles } from './routesGenerator';
import { generateServerFile } from './serverGenerator';
import { generateEnvFile } from './envGenerator';
import { generateReadme } from './readmeGenerator';
import { generateGitignore } from './gitignore';
import { generatePrismaClientConfig } from './prismaClientConfigGenerator';
import { generateFuctionName } from '../utils/generator';

export async function generateProject(
	database: Database,
	tables: Table[],
	apis: any[],
	columns: any[],
	format: 'javascript' | 'typescript'
) {
	const ext = format === 'typescript' ? 'ts' : 'js';
	const files: { [filename: string]: string } = {};

	// Generate server file
	files[`server.${ext}`] = generateServerFile(format, tables);

	// Generate route files
	const routeFiles = generateRoutesFiles(tables, apis, format);
	Object.assign(files, routeFiles);

	// Generate controller files
	const controllerFiles = generateControllerFiles(tables, apis, columns, format);
	Object.assign(files, controllerFiles);

	// Generate error handler file
	files[`middleware/errorHandler.${ext}`] = generateErrorHandlerFile(format);

	// Generate Prisma schema
	files['prisma/schema.prisma'] = generatePrismaSchema(database, tables, columns);

	// Generate Prisma client configuration
	files[`config/prisma.${ext}`] = generatePrismaClientConfig(format);

	// Generate package.json
	files['package.json'] = generatePackageJson(format, database.name);

	// Generate README.md
	files['README.md'] = generateReadme(database.name, database.type);

	// Generate .gitignore file
	files['.gitignore'] = generateGitignore();

	// Generate .env file
	const envContent = generateEnvFile(database);
	files['.env'] = envContent;
	files['.env.example'] = envContent.replace(/=.*/g, '=your_value_here');

	// Generate tsconfig.json if TypeScript
	if (format === 'typescript') {
		files['tsconfig.json'] = generateTsConfig();
	}

	return files;
}

function generateControllerFiles(
	tables: Table[],
	apis: Api[],
	columns: Column[],
	format: 'javascript' | 'typescript'
): { [filename: string]: string } {
	const controllerFiles: { [filename: string]: string } = {};
	const ext = format === 'typescript' ? 'ts' : 'js';

	tables.forEach((table) => {
		const tableApis = apis.filter((api) => api.tableId === table.id);
		const controllerContent = generateControllerFileContent(table, tableApis, columns, format);
		controllerFiles[`controllers/${table.name.toLowerCase()}Controller.${ext}`] = controllerContent;
	});

	return controllerFiles;
}

function generateControllerFileContent(
	table: Table,
	apis: Api[],
	columns: Column[],
	format: 'javascript' | 'typescript'
): string {
	const imports =
		format === 'typescript'
			? `import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AppError, errorResponse } from '../middleware/errorHandler';`
			: `const prisma = require('../config/prisma');
const { AppError, errorResponse } = require('../middleware/errorHandler');`;

	const methods = apis
		.map((api) => {
			const methodName = generateFuctionName(api.path, api.method);
			const params = format === 'typescript' ? '(req: Request, res: Response)' : '(req, res)';

			return `
  async function ${methodName}${params} {
    try {
      // Implement the logic for ${api.name} here
      // This is a placeholder implementation
      ${generateMethodContent(api, table)}

    } catch (error) {
	  if(process.env.NODE_ENV === 'development') console.error(error);
      res.status(500).json({ error: 'An error occurred: ', error });
    }
  }`;
		})
		.join('\n\n');

	const exports =
		format === 'typescript'
			? `export { ${apis.map((api) => `${generateFuctionName(api.path, api.method)}`).join(', ')} };`
			: `module.exports = { ${apis.map((api) => `${generateFuctionName(api.path, api.method)}`).join(', ')} };`;

	console.log(methods);
	return `
  ${imports}
  
  
  ${methods}
  
  ${exports}
    `.trim();
}

function generateMethodContent(api: Api, table: Table): string {
	const lowercaseTableName = table.name.toLowerCase();
	switch (api.method) {
		case 'GET':
			if (api.path.includes('{id}')) {
				return `
	  const { id } = req.params;
	  const result = await prisma.${lowercaseTableName}.findUnique({
		where: { id: ${table.idType === 'auto_increment' ? 'parseInt(id)' : 'id'} }
	  });
	  if (!result) {
		throw new AppError('${capitalize(table.name)} not found', 404);
	  }
	  res.status(200).json(result);`;
			} else {
				return `
	  const results = await prisma.${lowercaseTableName}.findMany();
	  res.status(200).json(results);`;
			}
		case 'POST':
			return `
	  const data = req.body;
	  const result = await prisma.${lowercaseTableName}.create({ data });
	  res.status(201).json(result);`;
		case 'PUT':
			return `
	  const { id } = req.params;
	  const data = req.body;
	  const result = await prisma.${lowercaseTableName}.update({
		where: { id: ${table.idType === 'auto_increment' ? 'parseInt(id)' : 'id'} },
		data
	  });
	  if (!result) {
		throw new AppError('${capitalize(table.name)} not found', 404);
	  }
	  res.status(200).json(result);`;
		case 'DELETE':
			return `
	  const { id } = req.params;
	  const result = await prisma.${lowercaseTableName}.delete({
		where: { id: ${table.idType === 'auto_increment' ? 'parseInt(id)' : 'id'} }
	  });
	  if (!result) {
		throw new AppError('${capitalize(table.name)} not found', 404);
	  }
	  res.status(204).send({message: 'Deleted successfully'});`;
		default:
			return `
	  throw new AppError('Method not implemented', 501);`;
	}
}

function generatePrismaSchema(database: Database, tables: Table[], columns: Column[]): string {
	let schema = `
  datasource db {
    provider = "${database.type}"
    url      = env("DATABASE_URL")
  }
  
  generator client {
    provider = "prisma-client-js"
  }
  `;

	tables.forEach((table) => {
		schema += `
  model ${capitalize(table.name)} {
    ${columns
			.filter((col) => col.tableId === table.id)
			.map((col) => `${col.name} ${mapColumnType(col, table.idType, database.type)}`)
			.join('\n  ')}
  }
  `;
	});

	return schema.trim();
}

function mapColumnType(column: Column, tableIdType: string, databaseType: string): string {
	let type = mapDataType(column.dataType);

	if (column.name.toLowerCase() === 'id') {
		switch (tableIdType) {
			case 'auto_increment':
				if (databaseType === 'mongodb') {
					return `Int @id @default(autoincrement()) @map("_id") @test.ObjectId`;
				}
				return `Int @id @default(autoincrement())`;
			case 'uuid':
				return `String @id @default(uuid())`;
			case 'cuid':
				return `String @id @default(cuid())`;
			default:
				return `String @id`;
		}
	}

	if (column.isNullable) {
		type += '?';
	}

	return type;
}

function mapDataType(dataType: string): string {
	switch (dataType.toLowerCase()) {
		case 'string':
		case 'text':
			return 'String';
		case 'integer':
		case 'int':
			return 'Int';
		case 'float':
		case 'double':
			return 'Float';
		case 'boolean':
			return 'Boolean';
		case 'datetime':
			return 'DateTime';
		case 'date':
			return 'Date';
		default:
			return 'String'; // Default to String for unknown types
	}
}

function generatePackageJson(format: 'javascript' | 'typescript', projectName: string): string {
	const npmPackages =
		format === 'typescript'
			? 'npm i -D @types/cors @types/express @types/node nodemon prisma ts-node-dev typescript && npm install @prisma/client cors dotenv express'
			: 'npm install @prisma/client cors dotenv express && npm install -D nodemon prisma';
	return JSON.stringify(
		{
			name: projectName,
			version: '1.0.0',
			description: 'Generated backend project',
			main: format === 'typescript' ? 'dist/server.js' : 'server.js',
			scripts: {
				start: format === 'typescript' ? 'node dist/server.js' : 'node server.js',
				dev: format === 'typescript' ? 'ts-node-dev --respawn --transpile-only src/server.ts' : 'nodemon server.js',
				build: format === 'typescript' ? 'tsc' : "echo 'No build step for JavaScript'",
				'prisma:generate': 'prisma generate',
				'prisma:migrate': 'prisma migrate dev',
				'prisma:studio': 'prisma studio',
				setup: `${npmPackages} && npm run prisma:migrate && npm run prisma:generate && npm run dev`,
			},
			dependencies: {},
			devDependencies: {},
		},
		null,
		2
	);
}
function generateTsConfig(): string {
	return JSON.stringify(
		{
			compilerOptions: {
				target: 'es6',
				module: 'commonjs',
				outDir: './dist',
				rootDir: './src',
				strict: true,
				esModuleInterop: true,
			},
			include: ['src/**/*'],
			exclude: ['node_modules'],
		},
		null,
		2
	);
}

function generateErrorHandlerFile(format: 'javascript' | 'typescript'): string {
	const typeAnnotations =
		format === 'typescript'
			? `: {
	  message: string;
	  status: string;
	  statusCode: number;
	  isOperational?: boolean;
	  stack?: string;
	}`
			: '';

	return `
  ${format === 'typescript' ? "import { Request, Response, NextFunction } from 'express';" : ''}
  
  class AppError extends Error {
	${
		format === 'typescript'
			? `
	statusCode: number;
	status: string;
	isOperational: boolean;
	`
			: ''
	}
  
	constructor(message${format === 'typescript' ? ': string' : ''}, statusCode${
		format === 'typescript' ? ': number' : ''
	}) {
	  super(message);
	  this.statusCode = statusCode;
	  this.status = \`\${statusCode}\`.startsWith('4') ? 'fail' : 'error';
	  this.isOperational = true;
  
	  Error.captureStackTrace(this, this.constructor);
	}
  }
  
  function errorResponse(err${typeAnnotations}) {
	return {
	  success: false,
	  error: {
		message: err.message,
		status: err.status,
		statusCode: err.statusCode,
		...(process.env.NODE_ENV === 'development' && { stack: err.stack })
	  }
	};
  }
  
  const errorHandler = (err${format === 'typescript' ? ': AppError' : ''}, req${
		format === 'typescript' ? ': Request' : ''
	}, res${format === 'typescript' ? ': Response' : ''}, next${format === 'typescript' ? ': NextFunction' : ''}) => {
	err.statusCode = err.statusCode || 500;
	err.status = err.status || 'error';
  
	if (process.env.NODE_ENV === 'development') {
	  sendErrorDev(err, res);
	} else if (process.env.NODE_ENV === 'production') {
	  sendErrorProd(err, res);
	}
  };
  
  const sendErrorDev = (err${format === 'typescript' ? ': AppError' : ''}, res${
		format === 'typescript' ? ': Response' : ''
	}) => {
	res.status(err.statusCode).json(errorResponse(err));
  };
  
  const sendErrorProd = (err${format === 'typescript' ? ': AppError' : ''}, res${
		format === 'typescript' ? ': Response' : ''
	}) => {
	if (err.isOperational) {
	  res.status(err.statusCode).json(errorResponse(err));
	} else {
	  console.error('ERROR 💥', err);
	  res.status(500).json(errorResponse({
		message: 'Something went very wrong!',
		status: 'error',
		statusCode: 500,
		isOperational: false
	  }));
	}
  };
  
  ${
		format === 'typescript'
			? 'export { AppError, errorHandler, errorResponse };'
			: 'module.exports = { AppError, errorHandler, errorResponse };'
	}
  `.trim();
}

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}
