// app/databases/[id]/edit/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DatabaseSchema, DatabaseCredentials } from '@/lib/schemas';
import { getDatabaseById, testDatabaseConnection, updateDatabase } from '@/lib/api/actions/database';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';

type FormValues = {
	name: string;
	databaseType: 'mysql' | 'postgresql' | 'mongodb';
	host?: string;
	port?: number;
	database?: string;
	user?: string;
	password?: string;
	mongoUri?: string;
};

export default function EditDatabasePage({ params }: { params: { id: string } }) {
	const [isLoading, setIsLoading] = useState(true);
	const [isTesting, setIsTesting] = useState(false);
	const [isConnectionTested, setIsConnectionTested] = useState(false);
	const [isConnectionValid, setIsConnectionValid] = useState(false);
	const router = useRouter();

	const form = useForm<FormValues>({
		resolver: zodResolver(DatabaseSchema),
		defaultValues: {
			name: '',
			databaseType: 'mysql',
			host: '',
			port: 3306,
			database: '',
			user: '',
			password: '',
			mongoUri: '',
		},
	});

	useEffect(() => {
		const fetchDatabase = async () => {
			const result = await getDatabaseById(params.id);
			if ('error' in result) {
				toast({
					title: 'Error',
					description: result.error,
					variant: 'destructive',
				});
				router.push('/databases');
			} else {
				// Correctly set form values based on the fetched data
				form.reset({
					name: result.name,
					databaseType: result.type as 'mysql' | 'postgresql' | 'mongodb',
					...(result.type === 'mongodb'
						? { mongoUri: result.credentials.mongoUri }
						: {
								host: result.credentials.host,
								port: result.credentials.port,
								database: result.credentials.database,
								user: result.credentials.user,
								password: result.credentials.password,
						  }),
				});
			}
			setIsLoading(false);
		};
		fetchDatabase();
	}, [params.id, form, router]);

	const onSubmit = async (data: any) => {
		setIsLoading(true);
		const result = await updateDatabase(params.id, data);
		setIsLoading(false);
		if ('error' in result) {
			toast({
				title: 'Error',
				description: result.error,
				variant: 'destructive',
			});
		} else {
			toast({
				title: 'Success',
				description: 'Database updated successfully',
			});
			router.push('/databases');
		}
	};

	const handleTestConnection = async () => {
		setIsTesting(true);
		setIsConnectionTested(false);
		setIsConnectionValid(false);

		const data: any = form.getValues();
		const result = await testDatabaseConnection(data);

		setIsTesting(false);
		setIsConnectionTested(true);
		setIsConnectionValid(result.success);

		if (result.success) {
			toast({
				title: 'Success',
				description: 'Database connection successful',
			});
		} else {
			toast({
				title: 'Error',
				description: `Connection failed: ${result.message}`,
				variant: 'destructive',
			});
		}
	};

	// Reset connection state when form values change
	form.watch(() => {
		if (isConnectionTested) {
			setIsConnectionTested(false);
			setIsConnectionValid(false);
		}
	});

	if (isLoading) {
		return <div>Loading...</div>;
	}

	return (
		<div className='container mx-auto py-10'>
			<h1 className='text-2xl font-bold mb-4'>Edit Database</h1>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
					<FormField
						control={form.control}
						name='name'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Database Name</FormLabel>
								<FormControl>
									<Input {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name='databaseType'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Database Type</FormLabel>
								<Select onValueChange={field.onChange} value={field.value}>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder='Select database type' />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										<SelectItem value='mysql'>MySQL</SelectItem>
										<SelectItem value='postgresql'>PostgreSQL</SelectItem>
										<SelectItem value='mongodb'>MongoDB</SelectItem>
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>
					{form.watch('databaseType') !== 'mongodb' ? (
						<>
							<FormField
								control={form.control}
								name='host'
								render={({ field }) => (
									<FormItem>
										<FormLabel>Host</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name='port'
								render={({ field }) => (
									<FormItem>
										<FormLabel>Port</FormLabel>
										<FormControl>
											<Input {...field} type='number' />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name='database'
								render={({ field }) => (
									<FormItem>
										<FormLabel>Database Name</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name='user'
								render={({ field }) => (
									<FormItem>
										<FormLabel>Username</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name='password'
								render={({ field }) => (
									<FormItem>
										<FormLabel>Password</FormLabel>
										<FormControl>
											<Input {...field} type='password' />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</>
					) : (
						<FormField
							control={form.control}
							name='mongoUri'
							render={({ field }) => (
								<FormItem>
									<FormLabel>MongoDB URI</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					)}
					<div className='flex justify-between'>
						<Button type='button' onClick={handleTestConnection} disabled={isTesting}>
							{isTesting ? 'Testing...' : 'Test Connection'}
						</Button>
						<Button type='submit' disabled={!isConnectionValid || isLoading}>
							{isLoading ? 'Updating...' : 'Update Database'}
						</Button>
					</div>
				</form>
			</Form>
		</div>
	);
}
