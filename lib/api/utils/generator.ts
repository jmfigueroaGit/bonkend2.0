import { Api } from '@prisma/client';
import { convertUrlPath } from '../generator/routesGenerator';

export function generateFuctionName(path: string, method: string): string {
	const urlPath = convertUrlPath(path);

	switch (method) {
		case 'GET':
			if (urlPath === '/') return `findAll`;
			else return `findByID`;
		case 'POST':
			return `create`;
		case 'PUT':
			return `updateByID`;
		case 'DELETE':
			return `deleteByID`;
		default:
			return '';
	}
}
