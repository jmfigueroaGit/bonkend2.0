'use client';
import Link from 'next/link';
import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { ModeToggle } from '@/components/common/mode-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Image from 'next/image';

const Navigation = () => {
	const { data: session } = useSession();

	return (
		<div className='top-0 right-0 left-0 p-4 flex items-center justify-between z-10'>
			<aside className='flex items-center gap-2'>
				<Link href='/' className='text-xl font-bold cursor-pointer flex items-center space-x-2'>
					<div className='relative w-20 h-5'>
						<Image src='/logo.svg' alt='Bonkend' fill style={{ objectFit: 'contain' }} />
					</div>
					<span>Bonkend.</span>
				</Link>
			</aside>
			<aside className='flex gap-2 items-center'>
				{session?.user && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant='ghost' className='relative h-8 w-8 rounded-full'>
								<Avatar className='h-8 w-8'>
									<AvatarImage src={session.user.image || ''} alt={session.user.name || ''} />
									<AvatarFallback>{session.user.name?.[0]}</AvatarFallback>
								</Avatar>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent className='w-56' align='end' forceMount>
							<DropdownMenuLabel className='font-normal'>
								<div className='flex flex-col space-y-1'>
									<p className='text-sm font-medium leading-none'>{session.user.name}</p>
									<p className='text-xs leading-none text-muted-foreground'>{session.user.email}</p>
								</div>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={() => signOut()}>Log out</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
				<ModeToggle />
			</aside>
		</div>
	);
};

export default Navigation;
