// lib/generators/projectGenerator.ts

'use server';

import { Database, Table, Api, Column } from '@prisma/client';
import { generateRoutesFiles } from './routesGenerator';
import { generateServerFile } from './serverGenerator';
import { generateEnvFile } from './envGenerator';
import { generateReadme } from './readmeGenerator';
import { generateGitignore } from './gitignore';

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
	const controllerFiles = generateControllerFiles(tables, apis, format);
	Object.assign(files, controllerFiles);

	// Generate error handler file
	files[`middleware/errorHandler.${ext}`] = generateErrorHandlerFile(format);

	// Generate Prisma schema
	files['prisma/schema.prisma'] = generatePrismaSchema(database, tables, columns);

	// Generate package.json
	files['package.json'] = generatePackageJson(format, database.name);

	// Generate README.md
	files['README.md'] = generateReadme(database.name, database.type);

	// Generate .gitignore file
	files['.gitignore'] = generateGitignore();

	// Generate .env file
	files['.env'] = generateEnvFile(database);

	// Generate tsconfig.json if TypeScript
	if (format === 'typescript') {
		files['tsconfig.json'] = generateTsConfig();
	}

	return files;
}

function generateControllerFiles(
	tables: Table[],
	apis: Api[],
	format: 'javascript' | 'typescript'
): { [filename: string]: string } {
	const controllerFiles: { [filename: string]: string } = {};
	const ext = format === 'typescript' ? 'ts' : 'js';

	tables.forEach((table) => {
		const tableApis = apis.filter((api) => api.tableId === table.id);
		const controllerContent = generateControllerFileContent(table, tableApis, format);
		controllerFiles[`controllers/${table.name.toLowerCase()}Controller.${ext}`] = controllerContent;
	});

	return controllerFiles;
}

function generateControllerFileContent(table: Table, apis: Api[], format: 'javascript' | 'typescript'): string {
	const imports =
		format === 'typescript'
			? `import { Request, Response } from 'express';\nimport { PrismaClient } from '@prisma/client';`
			: `const { PrismaClient } = require('@prisma/client');`;

	const prismaDeclaration = `const prisma = new PrismaClient();`;

	const methods = apis
		.map((api) => {
			const methodName = `${api.method.toLowerCase()}${capitalize(table.name)}`;
			const params = format === 'typescript' ? '(req: Request, res: Response)' : '(req, res)';

			return `
  async function ${methodName}${params} {
    try {
      // Implement the logic for ${api.name} here
      // This is a placeholder implementation
      const result = await prisma.${table.name.toLowerCase()}.findMany();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'An error occurred' });
    }
  }`;
		})
		.join('\n\n');

	const exports =
		format === 'typescript'
			? `export { ${apis.map((api) => `${api.method.toLowerCase()}${capitalize(table.name)}`).join(', ')} };`
			: `module.exports = { ${apis.map((api) => `${api.method.toLowerCase()}${capitalize(table.name)}`).join(', ')} };`;

	return `
  ${imports}
  
  ${prismaDeclaration}
  
  ${methods}
  
  ${exports}
    `.trim();
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
			},
			dependencies: {
				'@prisma/client': '^4.0.0',
				cors: '^2.8.5',
				dotenv: '^16.0.0',
				express: '^4.18.2',
			},
			devDependencies: {
				'@types/cors': format === 'typescript' ? '^2.8.13' : undefined,
				'@types/express': format === 'typescript' ? '^4.17.17' : undefined,
				'@types/node': format === 'typescript' ? '^18.15.11' : undefined,
				nodemon: '^2.0.22',
				prisma: '^4.0.0',
				'ts-node-dev': format === 'typescript' ? '^2.0.0' : undefined,
				typescript: format === 'typescript' ? '^5.0.3' : undefined,
			},
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
	// Content of the error handler file
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
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  };
  
  const sendErrorProd = (err${format === 'typescript' ? ': AppError' : ''}, res${
		format === 'typescript' ? ': Response' : ''
	}) => {
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    } else {
      console.error('ERROR 💥', err);
      res.status(500).json({
        status: 'error',
        message: 'Something went very wrong!'
      });
    }
  };
  
  ${format === 'typescript' ? 'export { AppError, errorHandler };' : 'module.exports = { AppError, errorHandler };'}
    `.trim();
}

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}
