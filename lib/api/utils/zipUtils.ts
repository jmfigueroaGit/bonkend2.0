// lib/utils/zipUtils.ts

import JSZip from 'jszip';

export async function createZip(files: { [filename: string]: string }): Promise<Buffer> {
	const zip = new JSZip();

	// Add each file to the zip
	Object.entries(files).forEach(([filename, content]) => {
		zip.file(filename, content);
	});

	// Generate the zip file
	const zipBuffer = await zip.generateAsync({
		type: 'nodebuffer',
		compression: 'DEFLATE',
		compressionOptions: {
			level: 9, // Maximum compression
		},
	});

	return zipBuffer;
}
