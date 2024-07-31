// components/table/TableForm.tsx

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createTable, updateTable } from '@/lib/api/actions/table';
import { useToast } from '@/components/ui/use-toast';
import { ColumnForm } from './ColumnForm';

const TableSchema = z.object({
	name: z.string().min(1, 'Table name is required'),
	idType: z.enum(['auto_increment', 'uuid', 'cuid']).optional(),
	columns: z
		.array(
			z.object({
				name: z.string().min(1, 'Column name is required'),
				dataType: z.enum(['string', 'number', 'boolean', 'date']),
				isNullable: z.boolean(),
				defaultValue: z.string().optional(),
			})
		)
		.min(1, 'At least one column is required'),
});

interface TableFormProps {
	initialData?: z.infer<typeof TableSchema>;
	databaseId: string;
	databaseType: 'mysql' | 'postgresql' | 'mongodb';
	tableId?: string | null;
	onSuccess?: () => void;
}

export function TableForm({ initialData, databaseId, databaseType, tableId = null, onSuccess }: TableFormProps) {
	const { toast } = useToast();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const form = useForm<z.infer<typeof TableSchema>>({
		resolver: zodResolver(TableSchema),
		defaultValues: initialData || {
			name: '',
			idType: databaseType !== 'mongodb' ? 'auto_increment' : undefined,
			columns: [{ name: '', dataType: 'string', isNullable: true }],
		},
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: 'columns',
	});

	const onSubmit = async (data: z.infer<typeof TableSchema>) => {
		setIsSubmitting(true);
		try {
			let result;

			if (tableId) {
				result = await updateTable(databaseId, tableId, data);
			} else {
				result = await createTable(databaseId, data);
			}

			if (result.success) {
				toast({
					title: 'Success',
					description: `Table ${tableId ? 'updated' : 'created'} successfully`,
				});
				if (onSuccess) onSuccess();
			} else {
				toast({
					title: 'Error',
					description: result.error,
					variant: 'destructive',
				});
			}
		} catch (error) {
			toast({
				title: 'Error',
				description: 'An unexpected error occurred',
				variant: 'destructive',
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
				<FormField
					control={form.control}
					name='name'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Table Name</FormLabel>
							<FormControl>
								<Input {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{databaseType !== 'mongodb' && (
					<FormField
						control={form.control}
						name='idType'
						render={({ field }) => (
							<FormItem>
								<FormLabel>ID Type</FormLabel>
								<Select onValueChange={field.onChange} defaultValue={field.value}>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder='Select ID type' />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										<SelectItem value='auto_increment'>Auto Increment</SelectItem>
										<SelectItem value='uuid'>UUID</SelectItem>
										<SelectItem value='cuid'>CUID</SelectItem>
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}

				{fields.map((field, index) => (
					<ColumnForm key={field.id} form={form} index={index} onRemove={() => remove(index)} />
				))}

				<div className='flex justify-between'>
					<Button type='button' onClick={() => append({ name: '', dataType: 'string', isNullable: true })}>
						Add Column
					</Button>

					<Button type='submit' disabled={isSubmitting}>
						{isSubmitting ? 'Saving...' : tableId ? 'Update Table' : 'Create Table'}
					</Button>
				</div>
			</form>
		</Form>
	);
}
