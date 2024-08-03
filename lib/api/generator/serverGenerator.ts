// lib/generators/serverGenerator.ts

import { Table } from '@prisma/client';

export function generateServerFile(format: 'javascript' | 'typescript', tables: Table[]): string {
	const imports =
		format === 'typescript'
			? `import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
require('dotenv').config();
`
			: `const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');
require('dotenv').config();
`;

	const serverContent = `
${imports}

const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use('/api', routes);

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(\`Server is running on http://localhost:\${PORT}\`);
});

${format === 'typescript' ? 'export default app;' : 'module.exports = app;'}
`.trim();

	return serverContent;
}
