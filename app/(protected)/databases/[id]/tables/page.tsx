'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getTables } from '@/lib/api/actions/table';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { TableList } from '@/components/table/TableList';
import { Loader2 } from 'lucide-react';

export default function TablesPage({ params }: { params: { id: string } }) {
	const router = useRouter();
	const { toast } = useToast();
	const [tables, setTables] = useState([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchTables = async () => {
			const result: any = await getTables(params.id);
			if (result.success) {
				setTables(result.tables);
			} else {
				toast({
					title: 'Error',
					description: result.error,
					variant: 'destructive',
				});
			}
			setIsLoading(false);
		};
		fetchTables();
	}, [params.id, toast]);

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
				<h1 className='text-2xl font-bold'>Tables</h1>
				<div>
					<Button variant='outline' onClick={() => router.back()} className='mr-2'>
						Back
					</Button>
					<Link href={`/databases/${params.id}/tables/new`}>
						<Button>Add New Table</Button>
					</Link>
				</div>
			</div>
			<TableList databaseId={params.id} initialTables={tables} />
		</div>
	);
}
