// app/dashboard/databases/[databaseId]/tables/[tableId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTableById } from '@/lib/api/actions/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function TableViewPage({ params }: { params: { id: string; tableId: string } }) {
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

	if (isLoading) {
		return (
			<div className='flex justify-center items-center h-64'>
				<Loader2 className='h-8 w-8 animate-spin' />
			</div>
		);
	}

	if (!table) {
		return <div>Table not found</div>;
	}

	return (
		<div className='container mx-auto py-10'>
			<h1 className='text-2xl font-bold mb-4'>{table.name}</h1>
			<div className='mb-4'>
				<strong>Database Type:</strong> {table.database.type}
			</div>
			<div className='mb-4'>
				<strong>ID Type:</strong> {table.idType}
			</div>
			<h2 className='text-xl font-semibold mb-2'>Columns</h2>
			<table className='min-w-full divide-y divide-gray-200'>
				<thead className='bg-gray-50'>
					<tr>
						<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Name</th>
						<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Type</th>
						<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Nullable</th>
						<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
							Default Value
						</th>
					</tr>
				</thead>
				<tbody className='bg-white divide-y divide-gray-200 text-black'>
					{table.columns.map((column: any) => (
						<tr key={column.id}>
							<td className='px-6 py-4 whitespace-nowrap'>{column.name}</td>
							<td className='px-6 py-4 whitespace-nowrap'>{column.dataType}</td>
							<td className='px-6 py-4 whitespace-nowrap'>{column.isNullable ? 'Yes' : 'No'}</td>
							<td className='px-6 py-4 whitespace-nowrap'>{column.defaultValue || 'N/A'}</td>
						</tr>
					))}
				</tbody>
			</table>
			<div className='mt-4 flex space-x-2'>
				<Link href={`/databases/${params.id}/tables/${params.tableId}/edit`}>
					<Button>Edit Table</Button>
				</Link>
				<Button variant='outline' onClick={() => router.push(`/databases/${params.id}`)}>
					Back to Tables
				</Button>
			</div>
		</div>
	);
}
