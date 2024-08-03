// lib/generators/envGenerator.ts

export function generateEnvFile(database: any): string {
	let envContent = `PORT=3000
NODE_ENV=development
`;

	switch (database.type) {
		case 'mongodb':
			envContent += `DATABASE_URL="${database.credentials?.mongoUri}"`;
			break;
		case 'mysql':
			envContent += `DATABASE_URL="${database.type}://${database.credentials.user}:${database.credentials.password}@${database.credentials.host}:${database.credentials.port}/${database.credentials.database}"`;
			break;
		case 'postgresql':
			envContent += `DATABASE_URL="${database.type}://${database.credentials.user}:${database.credentials.password}@${database.credentials.host}:${database.credentials.port}/${database.credentials.database}"`;
			break;
		default:
			envContent += `DATABASE_URL="your_database_connection_string_here"`;
	}

	return envContent;
}
