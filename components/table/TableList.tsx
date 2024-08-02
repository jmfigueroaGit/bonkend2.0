import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { deleteTable, getTables } from '@/lib/api/actions/table';
import { DeleteTableDialog } from './DeleteTableDialog';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

export function TableList({ databaseId, initialTables }: { databaseId: string; initialTables: any[] }) {
	const [tables, setTables] = useState<any[]>(initialTables || []);
	const [tableToDelete, setTableToDelete] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(false);
	const { toast } = useToast();

	const refreshTables = async () => {
		setIsLoading(true);
		const result: any = await getTables(databaseId);
		if (result.success) {
			setTables(result.tables);
		} else {
			toast({
				title: 'Error',
				description: 'Failed to refresh tables',
				variant: 'destructive',
			});
		}
		setIsLoading(false);
	};

	const handleDeleteClick = (table: any) => {
		setTableToDelete(table);
	};

	const handleDeleteConfirm = async () => {
		if (tableToDelete) {
			setIsLoading(true);
			const result = await deleteTable(databaseId, tableToDelete.id);
			if (result.success) {
				toast({
					title: 'Success',
					description: 'Table deleted successfully',
				});
				await refreshTables();
			} else {
				toast({
					title: 'Error',
					description: result.error,
					variant: 'destructive',
				});
				setIsLoading(false);
			}
		}
		setTableToDelete(null);
	};

	return (
		<div>
			<div className='flex justify-between items-center mb-4'>
				<h2 className='text-xl font-semibold'>Tables</h2>
				<Button onClick={refreshTables} disabled={isLoading}>
					{isLoading ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : 'Refresh'}
				</Button>
			</div>

			{isLoading ? (
				<div className='flex justify-center items-center h-32'>
					<Loader2 className='h-8 w-8 animate-spin' />
				</div>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Table Name</TableHead>
							<TableHead>Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{tables.map((table) => (
							<TableRow key={table.id}>
								<TableCell>{table.name}</TableCell>
								<TableCell className='space-x-2'>
									<Link href={`/databases/${databaseId}/tables/${table.id}`}>
										<Button variant='outline' size='sm'>
											View
										</Button>
									</Link>
									<Link href={`/databases/${databaseId}/tables/${table.id}/edit`}>
										<Button variant='outline' size='sm'>
											Edit
										</Button>
									</Link>
									<Button variant='destructive' size='sm' onClick={() => handleDeleteClick(table)}>
										Delete
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}

			<DeleteTableDialog
				isOpen={!!tableToDelete}
				onClose={() => setTableToDelete(null)}
				onConfirm={handleDeleteConfirm}
				tableName={tableToDelete?.name}
			/>
		</div>
	);
}
