// File: lib/auth/withAuth.tsx

'use client';

import { Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Custom hook for authentication logic
export const useAuth = () => {
	const { data: session, status } = useSession();
	const router = useRouter();

	useEffect(() => {
		if (status === 'unauthenticated') {
			router.push('/login');
		}
	}, [status, router]);

	return { session, status };
};

// Higher-Order Component for protecting routes
export function withAuth<P extends object>(WrappedComponent: React.ComponentType<P>) {
	return function WithAuth(props: P) {
		const { status } = useAuth();

		if (status === 'loading') {
			return (
				<div className='flex justify-center items-center h-64'>
					<Loader2 className='h-8 w-8 animate-spin' />
				</div>
			);
		}

		if (status === 'authenticated') {
			return <WrappedComponent {...props} />;
		}

		// Return null for 'unauthenticated' status as useAuth will handle the redirect
		return null;
	};
}
