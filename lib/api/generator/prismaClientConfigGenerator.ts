// lib/generators/prismaClientConfigGenerator.ts

export function generatePrismaClientConfig(format: 'javascript' | 'typescript'): string {
	if (format === 'typescript') {
		return `
  import { PrismaClient } from '@prisma/client';
  
  declare global {
    // This must be a \`var\` and not a \`let / const\`
    var prisma: PrismaClient | undefined;
  }
  
  let prisma: PrismaClient;
  
  if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient();
  } else {
    if (!global.prisma) {
      global.prisma = new PrismaClient();
    }
    prisma = global.prisma;
  }
  
  export default prisma;
  `.trim();
	} else {
		return `
  const { PrismaClient } = require('@prisma/client');
  
  let prisma;
  
  if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient();
  } else {
    if (!global.prisma) {
      global.prisma = new PrismaClient();
    }
    prisma = global.prisma;
  }
  
  module.exports = prisma;
  `.trim();
	}
}
