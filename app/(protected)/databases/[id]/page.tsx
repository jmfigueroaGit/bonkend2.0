import React from 'react';
import { getDatabaseById } from '@/lib/api/actions/database';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const page = async ({ params }: { params: { id: string } }) => {
	const result = await getDatabaseById(params.id);

	if ('error' in result) {
		notFound();
	}

	const database = result;

	return (
		<div className='container mx-auto py-10'>
			<h1 className='text-2xl font-bold mb-4'>{database.name}</h1>
			<div className='bg-white shadow overflow-hidden sm:rounded-lg'>
				<div className='px-4 py-5 sm:px-6'>
					<h3 className='text-lg leading-6 font-medium text-gray-900'>Database Details</h3>
				</div>
				<div className='border-t border-gray-200'>
					<dl>
						<div className='bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6'>
							<dt className='text-sm font-medium text-gray-500'>Type</dt>
							<dd className='mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2'>{database.type}</dd>
						</div>
						{database.type !== 'mongodb' ? (
							<>
								<div className='bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6'>
									<dt className='text-sm font-medium text-gray-500'>Host</dt>
									<dd className='mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2'>{database.credentials.host}</dd>
								</div>
								<div className='bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6'>
									<dt className='text-sm font-medium text-gray-500'>Port</dt>
									<dd className='mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2'>{database.credentials.port}</dd>
								</div>
								<div className='bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6'>
									<dt className='text-sm font-medium text-gray-500'>Database Name</dt>
									<dd className='mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2'>{database.credentials.database}</dd>
								</div>
								<div className='bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6'>
									<dt className='text-sm font-medium text-gray-500'>Username</dt>
									<dd className='mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2'>{database.credentials.user}</dd>
								</div>
							</>
						) : (
							<div className='bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6'>
								<dt className='text-sm font-medium text-gray-500'>MongoDB URI</dt>
								<dd className='mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2'>{database.credentials.mongoUri}</dd>
							</div>
						)}
					</dl>
				</div>
			</div>
			<div className='mt-6 flex space-x-3'>
				<Link href={`/databases/${params.id}/edit`}>
					<Button>Edit Database</Button>
				</Link>
				<Link href='/databases'>
					<Button variant='outline'>Back to List</Button>
				</Link>
			</div>
			<div className='mt-6'>
				<Link href={`/databases/${database.id}/tables`}>
					<Button>Manage Tables</Button>
				</Link>
			</div>
		</div>
	);
};

export default page;
