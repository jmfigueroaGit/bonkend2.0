// lib/generators/readmeGenerator.ts

export function generateReadme(projectName: string, databaseType: string): string {
	return `
  # ${projectName} Backend
  
  This is a generated backend project using Express.js and Prisma with a ${databaseType} database.
  
  ## Setup Instructions
  
  1. **Install Dependencies**
     Run the following command to install all necessary dependencies:
     \`\`\`
     npm install
     \`\`\`
  
  2. **Environment Setup**
     - Copy the \`.env.example\` file to \`.env\`:
       \`\`\`
       cp .env.example .env
       \`\`\`
     - Open the \`.env\` file and update the \`DATABASE_URL\` with your database credentials.
  
  3. **Database Setup**
     - Make sure your ${databaseType} database is running and accessible.
     - Run Prisma migrations to set up your database schema:
       \`\`\`
       npm run prisma:migrate
       \`\`\`
  
  4. **Generate Prisma Client**
     Run the following command to generate the Prisma client:
     \`\`\`
     npm run prisma:generate
     \`\`\`
  
  5. **Start the Server**
     - For development:
       \`\`\`
       npm run dev
       \`\`\`
     - For production:
       \`\`\`
       npm run build
       npm start
       \`\`\`
  
  ## Available Scripts
  
  - \`npm run dev\`: Starts the server in development mode with hot-reloading.
  - \`npm run build\`: Builds the project for production.
  - \`npm start\`: Starts the server in production mode.
  - \`npm run prisma:generate\`: Generates the Prisma client.
  - \`npm run prisma:migrate\`: Runs Prisma migrations.
  
  ## API Documentation
  
  [Include information about your API endpoints here]
  
  ## Error Handling
  
  This project includes a custom error handling middleware. To use it in your controllers, you can throw errors like this:
  
  \`\`\`javascript
  throw new AppError('Your error message', statusCode);
  \`\`\`
  
  ## Contributing
  
  [Include information about how to contribute to the project]
  
  ## License
  
  [Include license information here]
  `.trim();
}
