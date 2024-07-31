// components/table/ColumnForm.tsx
'use client';

import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

interface ColumnFormProps {
	form: any; // Replace 'any' with the appropriate form type from react-hook-form if possible
	index: number;
	onRemove: () => void;
}

export function ColumnForm({ form, index, onRemove }: ColumnFormProps) {
	return (
		<div className='space-y-4 p-4 border rounded-md'>
			<FormField
				control={form.control}
				name={`columns.${index}.name`}
				render={({ field }) => (
					<FormItem>
						<FormLabel>Column Name</FormLabel>
						<FormControl>
							<Input {...field} />
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name={`columns.${index}.dataType`}
				render={({ field }) => (
					<FormItem>
						<FormLabel>Data Type</FormLabel>
						<Select onValueChange={field.onChange} defaultValue={field.value}>
							<FormControl>
								<SelectTrigger>
									<SelectValue placeholder='Select a data type' />
								</SelectTrigger>
							</FormControl>
							<SelectContent>
								<SelectItem value='string'>String</SelectItem>
								<SelectItem value='number'>Number</SelectItem>
								<SelectItem value='boolean'>Boolean</SelectItem>
								<SelectItem value='date'>Date</SelectItem>
							</SelectContent>
						</Select>
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name={`columns.${index}.isNullable`}
				render={({ field }) => (
					<FormItem className='flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4'>
						<FormControl>
							<Checkbox checked={field.value} onCheckedChange={field.onChange} />
						</FormControl>
						<div className='space-y-1 leading-none'>
							<FormLabel>Nullable</FormLabel>
						</div>
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name={`columns.${index}.defaultValue`}
				render={({ field }) => (
					<FormItem>
						<FormLabel>Default Value (Optional)</FormLabel>
						<FormControl>
							<Input {...field} />
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			<Button type='button' variant='destructive' onClick={onRemove}>
				Remove Column
			</Button>
		</div>
	);
}
