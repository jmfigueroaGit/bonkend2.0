// app/dashboard/databases/[databaseId]/tables/new/page.tsx
'use client';

import { TableForm } from '@/components/table/TableForm';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { getDatabaseById } from '@/lib/api/actions/database';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

export default function AddTablePage({ params }: { params: { id: string } }) {
	const [database, setDatabase] = useState<any>(null);
	const [databaseType, setDatabaseType] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const router = useRouter();

	useEffect(() => {
		const fetchDatabase = async () => {
			const result: any = await getDatabaseById(params.id);
			if ('error' in result) {
				toast({
					title: 'Error',
					description: result.error,
					variant: 'destructive',
				});
				return;
			} else {
				setDatabase(result);
			}
			setIsLoading(false);
		};
		fetchDatabase();
	}, [params.id]);

	const handleSuccess = () => {
		router.push(`/databases/${params.id}/tables`);
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
			<div className='flex justify-between items-center mb-6'>
				<h1 className='text-2xl font-bold'>
					Add Table to: {database.name} ({database.type === 'mongodb' ? 'MongoDB' : 'SQL'})
				</h1>
				<Button variant='outline' onClick={() => router.back()}>
					Back
				</Button>
			</div>
			<TableForm databaseId={params.id} onSuccess={handleSuccess} databaseType={database.type} />
		</div>
	);
}
