// components/table/TableList.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { getTables, deleteTable } from '@/lib/api/actions/table';
import { DeleteTableDialog } from './DeleteTableDialog';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

export function TableList({ databaseId, tables }: { databaseId: string; tables: any[] }) {
	const [tableToDelete, setTableToDelete] = useState<any>(null);
	const { toast } = useToast();

	const handleDeleteClick = (table: any) => {
		setTableToDelete(table);
	};

	const handleDeleteConfirm = async () => {
		if (tableToDelete) {
			const result = await deleteTable(databaseId, tableToDelete.id);
			if (result.success) {
				toast({
					title: 'Success',
					description: 'Table deleted successfully',
				});
			} else {
				toast({
					title: 'Error',
					description: result.error,
					variant: 'destructive',
				});
			}
		}
		setTableToDelete(null);
	};

	return (
		<div>
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
								<Link href={`/dashboard/databases/${databaseId}/tables/${table.id}`}>
									<Button variant='outline' size='sm'>
										View
									</Button>
								</Link>
								<Link href={`/dashboard/databases/${databaseId}/tables/${table.id}/edit`}>
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

			<DeleteTableDialog
				isOpen={!!tableToDelete}
				onClose={() => setTableToDelete(null)}
				onConfirm={handleDeleteConfirm}
				tableName={tableToDelete?.name}
			/>
		</div>
	);
}
