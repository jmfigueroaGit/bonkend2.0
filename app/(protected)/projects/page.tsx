// app/export-project/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { getDatabaseList } from '@/lib/api/actions/database';
import { exportProject } from '@/lib/api/actions/project';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function ExportProjectPage() {
	const [databases, setDatabases] = useState<any[]>([]);
	const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
	const [exportFormat, setExportFormat] = useState<'javascript' | 'typescript'>('javascript');
	const [isLoading, setIsLoading] = useState(true);
	const [isExporting, setIsExporting] = useState(false);

	useEffect(() => {
		fetchDatabases();
	}, []);

	const fetchDatabases = async () => {
		setIsLoading(true);
		try {
			const result: any = await getDatabaseList();
			if ('error' in result) {
				toast({
					title: 'Error',
					description: result.error,
					variant: 'destructive',
				});
			} else {
				setDatabases(result);
			}
		} catch (err) {
			toast({
				title: 'Error',
				description: 'Failed to fetch databases',
				variant: 'destructive',
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleExport = async () => {
		if (!selectedDatabase) {
			toast({
				title: 'Error',
				description: 'Please select a database',
				variant: 'destructive',
			});
			return;
		}

		setIsExporting(true);
		try {
			const result: any = await exportProject(selectedDatabase, exportFormat);

			if (result.success) {
				// Create a Blob from the zip buffer
				const blob = new Blob([result.data], { type: result.contentType });

				// Create a download link and click it
				const link = document.createElement('a');
				link.href = window.URL.createObjectURL(blob);
				link.download = result.filename;
				link.click();

				// Clean up
				window.URL.revokeObjectURL(link.href);

				toast({
					title: 'Success',
					description: 'Project exported successfully',
				});
			} else {
				throw new Error(result.error);
			}
		} catch (error: any) {
			toast({
				title: 'Error',
				description: error.message || 'Failed to export project',
				variant: 'destructive',
			});
		} finally {
			setIsExporting(false);
		}
	};

	if (isLoading) {
		return (
			<div className='flex justify-center items-center h-64'>
				<Loader2 className='h-8 w-8 animate-spin' />
			</div>
		);
	}

	return (
		<div className='container mx-auto py-10'>
			<Card>
				<CardHeader>
					<CardTitle>Export Project</CardTitle>
					<CardDescription>Generate and download your backend project</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='space-y-2'>
						<Label htmlFor='database'>Select Database</Label>
						<Select onValueChange={(value) => setSelectedDatabase(value)}>
							<SelectTrigger id='database'>
								<SelectValue placeholder='Select a database' />
							</SelectTrigger>
							<SelectContent>
								{databases.map((db) => (
									<SelectItem key={db.id} value={db.id}>
										{db.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className='space-y-2'>
						<Label htmlFor='format'>Export Format</Label>
						<Select
							onValueChange={(value: 'javascript' | 'typescript') => setExportFormat(value)}
							defaultValue={exportFormat}
						>
							<SelectTrigger id='format'>
								<SelectValue placeholder='Select export format' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='javascript'>JavaScript</SelectItem>
								<SelectItem value='typescript'>TypeScript</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</CardContent>
				<CardFooter>
					<Button onClick={handleExport} disabled={isExporting}>
						{isExporting ? (
							<>
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
								Exporting...
							</>
						) : (
							'Export Project'
						)}
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
