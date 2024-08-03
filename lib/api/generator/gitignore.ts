// lib/generators/gitignoreGenerator.ts

export function generateGitignore(): string {
	return `
  # Dependency directories
  node_modules/
  
  # Built output
  dist/
  build/
  
  # Logs
  logs
  *.log
  npm-debug.log*
  yarn-debug.log*
  yarn-error.log*
  
  # Environment variables
  .env
  
  # IDE specific files
  .vscode/
  .idea/
  *.swp
  *.swo
  
  # Operating System Files
  .DS_Store
  Thumbs.db
  
  # Prisma
  prisma/.env
  
  # Optional npm cache directory
  .npm
  
  # Optional eslint cache
  .eslintcache
  
  # Optional REPL history
  .node_repl_history
  
  # Output of 'npm pack'
  *.tgz
  
  # Yarn Integrity file
  .yarn-integrity
  
  # dotenv environment variables file
  .env
  .env.test
  
  # parcel-bundler cache (https://parceljs.org/)
  .cache
  
  # Next.js build output
  .next
  
  # Nuxt.js build / generate output
  .nuxt
  dist
  
  # Gatsby files
  .cache/
  # Comment in the public line in if your project uses Gatsby and *not* Next.js
  # public
  
  # Serverless directories
  .serverless/
  
  # FuseBox cache
  .fusebox/
  
  # DynamoDB Local files
  .dynamodb/
  
  # TernJS port file
  .tern-port
  
  # Stores VSCode versions used for testing VSCode extensions
  .vscode-test
  
  # yarn v2
  .yarn/cache
  .yarn/unplugged
  .yarn/build-state.yml
  .yarn/install-state.gz
  .pnp.*
  `.trim();
}
