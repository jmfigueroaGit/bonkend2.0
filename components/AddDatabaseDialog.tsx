// components/AddDatabaseDialog.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DatabaseSchema, DatabaseCredentials } from '@/lib/schemas';
import { saveCredentials, testDatabaseConnection } from '@/lib/api/actions/database';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogDescription,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';

interface AddDatabaseDialogProps {
	onDatabaseAdded: () => void;
}

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

export function AddDatabaseDialog({ onDatabaseAdded }: AddDatabaseDialogProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [isTesting, setIsTesting] = useState(false);
	const [isConnectionTested, setIsConnectionTested] = useState(false);
	const [isConnectionValid, setIsConnectionValid] = useState(false);

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

	const onSubmit = async (data: any) => {
		if (!isConnectionValid) {
			toast({
				title: 'Error',
				description: 'Please test the connection before saving',
				variant: 'destructive',
			});
			return;
		}

		try {
			const result = await saveCredentials(data);
			if ('error' in result) {
				toast({
					title: 'Error',
					description: result.error,
					variant: 'destructive',
				});
			} else {
				toast({
					title: 'Success',
					description: 'Database added successfully',
				});
				setIsOpen(false);
				form.reset();
				onDatabaseAdded();
			}
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to add database',
				variant: 'destructive',
			});
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

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button>Add Database</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add New Database</DialogTitle>
					<DialogDescription>Enter the details of the database you want to connect to.</DialogDescription>
				</DialogHeader>
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
									<Select
										onValueChange={(value) => {
											field.onChange(value);
											// Set default port based on database type
											form.setValue('port', value === 'postgresql' ? 5432 : 3306);
										}}
										defaultValue={field.value}
									>
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
												<Input type='number' {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
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
												<Input type='password' {...field} />
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
							<Button type='submit' disabled={!isConnectionValid}>
								Save Database
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
