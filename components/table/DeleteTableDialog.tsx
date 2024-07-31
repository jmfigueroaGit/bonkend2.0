// components/table/DeleteTableDialog.tsx
'use client';

import React from 'react';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeleteTableDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	tableName: string;
}

export function DeleteTableDialog({ isOpen, onClose, onConfirm, tableName }: DeleteTableDialogProps) {
	return (
		<AlertDialog open={isOpen} onOpenChange={onClose}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Are you sure you want to delete this table?</AlertDialogTitle>
					<AlertDialogDescription>
						This action cannot be undone. This will permanently delete the table &quot;{tableName}&quot; and all of its
						data from the database.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
