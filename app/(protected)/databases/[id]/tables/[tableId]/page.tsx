// app/dashboard/databases/[databaseId]/tables/[tableId]/edit/page.tsx
'use client';

import { TableForm } from '@/components/table/TableForm';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { getTableById } from '@/lib/api/actions/table';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { getDatabaseById } from '@/lib/api/actions/database';

export default function EditTablePage({ params }: { params: { id: string; tableId: string } }) {
	const router = useRouter();
	const { toast } = useToast();
	const [table, setTable] = useState<any>(null);
	const [database, setDatabase] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchDatabaseAndTable = async () => {
			const tableResult: any = await getTableById(params.id, params.tableId);
			const databaseResult: any = await getDatabaseById(params.id);
			if (tableResult.success && databaseResult.success) {
				setTable(tableResult.table);
				setDatabase(databaseResult.database);
			} else {
				toast({
					title: 'Error',
					description: tableResult.error,
					variant: 'destructive',
				});
			}
			setIsLoading(false);
		};
		fetchDatabaseAndTable();
	}, [params.id, params.tableId, toast]);

	if (isLoading) {
		return (
			<div className='flex justify-center items-center h-64'>
				<Loader2 className='h-8 w-8 animate-spin' />
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className='flex justify-center items-center h-64'>
				<Loader2 className='h-8 w-8 animate-spin' />
			</div>
		);
	}

	return (
		<div className='container mx-auto py-10'>
			<div className='flex justify-between items-center mb-6'>
				<h1 className='text-2xl font-bold'>Edit Table: {table.name}</h1>
				<Button variant='outline' onClick={() => router.back()}>
					Back
				</Button>
			</div>
			<TableForm
				initialData={table}
				databaseId={params.id}
				tableId={params.tableId}
				onSuccess={() => router.push(`/dashboard/databases/${params.id}/tables`)}
				databaseType={database.type}
			/>
		</div>
	);
}
