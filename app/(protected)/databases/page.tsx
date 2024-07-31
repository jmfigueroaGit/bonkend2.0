// app/databases/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { getDatabaseList, deleteDatabaseById, DecryptedDatabase } from '@/lib/api/actions/database';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddDatabaseDialog } from '@/components/AddDatabaseDialog';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function DatabasesPage() {
	const [databases, setDatabases] = useState<DecryptedDatabase[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [databaseToDelete, setDatabaseToDelete] = useState<DecryptedDatabase | null>(null);

	const fetchDatabases = async () => {
		setIsLoading(true);
		setError(null);
		try {
			const result: any = await getDatabaseList();
			if ('error' in result) {
				setError(result.error);
				toast({
					title: 'Error',
					description: result.error,
					variant: 'destructive',
				});
			} else {
				setDatabases(result);
			}
		} catch (err) {
			setError('Failed to fetch databases');
			toast({
				title: 'Error',
				description: 'Failed to fetch databases',
				variant: 'destructive',
			});
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchDatabases();
	}, []);

	const handleDeleteClick = (database: any) => {
		setDatabaseToDelete(database);
		setDeleteDialogOpen(true);
	};

	const handleDeleteConfirm = async () => {
		if (databaseToDelete) {
			try {
				const result = await deleteDatabaseById(databaseToDelete.id);
				if ('error' in result) {
					toast({
						title: 'Error',
						description: result.error,
						variant: 'destructive',
					});
				} else {
					toast({
						title: 'Success',
						description: 'Database deleted successfully',
					});
					fetchDatabases(); // Refresh the list
				}
			} catch (err) {
				toast({
					title: 'Error',
					description: 'Failed to delete database',
					variant: 'destructive',
				});
			}
		}
		setDeleteDialogOpen(false);
		setDatabaseToDelete(null);
	};

	if (isLoading) {
		return (
			<div className='flex justify-center items-center h-64'>
				<Loader2 className='h-8 w-8 animate-spin' />
			</div>
		);
	}

	if (error) {
		return (
			<div className='text-center'>
				<p className='text-red-500 mb-4'>{error}</p>
				<Button onClick={fetchDatabases}>Try Again</Button>
			</div>
		);
	}

	return (
		<div className='container mx-auto py-10'>
			<div className='flex justify-between items-center mb-6'>
				<h1 className='text-2xl font-bold'>Databases</h1>
				<AddDatabaseDialog onDatabaseAdded={fetchDatabases} />
			</div>

			{databases.length === 0 ? (
				<p className='text-center flex justify-center items-center'>
					No databases found. Add a new database to get started.
				</p>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Type</TableHead>
							<TableHead>Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{databases.map((database) => (
							<TableRow key={database.id}>
								<TableCell>{database.name}</TableCell>
								<TableCell>{database.type}</TableCell>
								<TableCell>
									<div className='flex space-x-2'>
										<Link href={`/databases/${database.id}`}>
											<Button variant='outline' size='sm'>
												View
											</Button>
										</Link>
										<Link href={`/databases/${database.id}/edit`}>
											<Button variant='outline' size='sm'>
												Edit
											</Button>
										</Link>
										<Button variant='destructive' size='sm' onClick={() => handleDeleteClick(database)}>
											Delete
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you sure you want to delete this database?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. This will permanently delete the database &quot;{databaseToDelete?.name}
							&quot; and remove its data from our servers.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
