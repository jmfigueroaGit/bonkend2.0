'use client';

import { withAuth } from '@/lib/auth/withAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Code, Database, Loader2, PanelsTopLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getDatabaseList } from '@/lib/api/actions/database';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

function HomePage() {
	const [databases, setDatabases] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

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

	// Calculate the count of each database type
	const mysqlCount = databases.filter((db) => db.type === 'mysql').length;
	const postgresCount = databases.filter((db) => db.type === 'postgresql').length;
	const mongodbCount = databases.filter((db) => db.type === 'mongodb').length;

	// Build the formatted string excluding any type with a count of 0
	const databaseStrings = [
		mysqlCount > 0 ? `${mysqlCount} MySQL` : null,
		postgresCount > 0 ? `${postgresCount} Postgres` : null,
		mongodbCount > 0 ? `${mongodbCount} MongoDB` : null,
	].filter(Boolean); // Filter out null values

	const formattedDatabaseCount = databaseStrings.join(', ').replace(/, ([^,]*)$/, ' and $1'); // Add "and" before the last item

	return (
		<div>
			<div className='grid gap-3 md:grid-cols-2 lg:grid-cols-3'>
				<Link href='/projects'>
					<Card className='cursor-pointer transition-colors duration-200 hover:border-primary border border-opacity-10'>
						<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
							<CardTitle className='text-sm font-medium'>Projects</CardTitle>
							<PanelsTopLeft size={20} />
						</CardHeader>
						<CardContent>
							<div className='text-xl font-bold'>4 Active Projects</div>
							<p className='text-xs text-muted-foreground'>3 active projects</p>
						</CardContent>
					</Card>
				</Link>
				<Link href='/databases'>
					<Card className='cursor-pointer transition-colors duration-200 hover:border-primary border border-opacity-10'>
						<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
							<CardTitle className='text-sm font-medium'>Databases</CardTitle>
							<Database size={20} />
						</CardHeader>
						<CardContent>
							<div className='text-xl font-bold'>
								{databases?.length} Active {databases?.length > 1 ? 'Databases' : 'Database'}
							</div>
							{databases.length > 1 && databaseStrings.length > 0 ? (
								<p className='text-xs text-muted-foreground'>{formattedDatabaseCount}</p>
							) : (
								<p className='text-xs text-muted-foreground'>No databases</p>
							)}
						</CardContent>
					</Card>
				</Link>
				<Link href='/endpoints'>
					<Card className='cursor-pointer transition-colors duration-200 hover:border-primary border border-opacity-10'>
						<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
							<CardTitle className='text-sm font-medium'>API Requests</CardTitle>
							<Code size={20} />
						</CardHeader>
						<CardContent>
							<div className='text-xl font-bold'>+120</div>
							<p className='text-xs text-muted-foreground'>+19% from last month</p>
						</CardContent>
					</Card>
				</Link>
			</div>
		</div>
	);
}

export default withAuth(HomePage);
