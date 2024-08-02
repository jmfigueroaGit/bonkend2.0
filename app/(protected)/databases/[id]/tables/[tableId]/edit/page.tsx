// app/dashboard/databases/[databaseId]/tables/[tableId]/edit/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTableById, updateTable } from '@/lib/api/actions/table';
import { TableForm } from '@/components/table/TableForm';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function TableEditPage({ params }: { params: { id: string; tableId: string } }) {
	const [table, setTable] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(true);
	const router = useRouter();
	const { toast } = useToast();

	useEffect(() => {
		async function fetchTable() {
			setIsLoading(true);
			const result: any = await getTableById(params.id, params.tableId);
			if (result.error) {
				toast({
					title: 'Error',
					description: result.error,
					variant: 'destructive',
				});
				router.push(`/dashboard/databases/${params.id}`);
			} else {
				setTable(result.table);
			}
			setIsLoading(false);
		}
		fetchTable();
	}, [params.id, params.tableId, router, toast]);

	const handleSuccess = () => {
		toast({
			title: 'Success',
			description: 'Table updated successfully',
		});
		router.push(`/databases/${params.id}/tables/${params.tableId}`);
	};

	if (isLoading) {
		return <div>Loading...</div>;
	}

	if (!table) {
		return <div>Table not found</div>;
	}

	if (!table.name) {
		return <div>Table name not found</div>;
	}

	return (
		<div className='container mx-auto py-10'>
			<h1 className='text-2xl font-bold mb-4'>Edit Table: {table.name}</h1>
			<TableForm
				initialData={table}
				databaseId={params.id}
				databaseType={table.database.type}
				tableId={params.tableId}
				onSuccess={handleSuccess}
			/>
			<Button variant='outline' className='mt-4' onClick={() => router.back()}>
				Cancel
			</Button>
		</div>
	);
}
