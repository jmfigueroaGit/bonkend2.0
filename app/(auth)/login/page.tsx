'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { signIn } from 'next-auth/react';
import Image from 'next/image';

export default function LoginPage() {
	const handleSignIn = (provider: string) => {
		signIn(provider, { callbackUrl: '/' });
	};

	return (
		<div className='flex min-h-screen bg-[#020817] text-white'>
			<div className='flex-1 flex items-center justify-center space-x-5'>
				<Image src='/logo.svg' width={220} height={170} alt='Bonkend' />
				<h1 className='text-5xl font-bold'>Bonkend.</h1>
			</div>
			<div className='flex-1 flex items-center justify-center'>
				<Card className='w-[350px] bg-gray-800 border-gray-700'>
					<CardHeader>
						<CardTitle className='text-center text-white'>Sign in to Bonkend</CardTitle>
					</CardHeader>
					<CardContent>
						<p className='text-center text-sm text-gray-400 mb-4'>Welcome back! Please sign in to continue</p>
						<Button
							onClick={() => handleSignIn('google')}
							variant='outline'
							className='w-full mb-2 bg-white text-black hover:bg-gray-200'
						>
							<svg className='w-5 h-5 mr-2' viewBox='0 0 24 24'>
								<path
									fill='currentColor'
									d='M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z'
								/>
							</svg>
							Continue with Google
						</Button>
						<Button
							onClick={() => handleSignIn('github')}
							variant='outline'
							className='w-full mb-4 bg-gray-700 text-white hover:bg-gray-600'
						>
							<svg className='w-5 h-5 mr-2' viewBox='0 0 24 24'>
								<path
									fill='currentColor'
									d='M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12'
								/>
							</svg>
							Continue with GitHub
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
