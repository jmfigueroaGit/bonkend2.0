'use client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
	Braces,
	CircleHelp,
	CreditCard,
	Database,
	LayoutDashboard,
	LogOut,
	Settings,
	UserRoundCog,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Sidebar({ className }: React.HTMLAttributes<HTMLDivElement>) {
	const pathname = usePathname();

	return (
		<div className={cn('pb-12', className)}>
			<div className='space-y-4 py-4'>
				<div className='px-3 py-2'>
					<h2 className='mb-2 px-4 text-lg font-semibold tracking-tight'>Explore Now</h2>
					<div className='space-y-1'>
						<Link href='/'>
							<Button variant={`${pathname === '/' ? 'secondary' : 'ghost'}`} className='w-full justify-start'>
								<LayoutDashboard className='mr-2 h-4 w-4' />
								Dashboard
							</Button>
						</Link>
						<Link href='/databases'>
							<Button variant={`${pathname === '/database' ? 'secondary' : 'ghost'}`} className='w-full justify-start'>
								<Database className='mr-2 h-4 w-4' />
								Database
							</Button>
						</Link>
						<Link href='/projects'>
							<Button variant={`${pathname === '/projects' ? 'secondary' : 'ghost'}`} className='w-full justify-start'>
								<Braces className='mr-2 h-4 w-4' />
								API Endpoints
							</Button>
						</Link>
					</div>
				</div>
				<div className='px-3 py-2'>
					<h2 className='mb-2 px-4 text-lg font-semibold tracking-tight'>My Account</h2>
					<div className='space-y-1'>
						<Link href='/profile'>
							<Button variant={`${pathname === '/profile' ? 'secondary' : 'ghost'}`} className='w-full justify-start'>
								<UserRoundCog className='mr-2 h-4 w-4' />
								Profile
							</Button>
						</Link>
						<Link href='/billing'>
							<Button variant={`${pathname === '/billing' ? 'secondary' : 'ghost'}`} className='w-full justify-start'>
								<CreditCard className='mr-2 h-4 w-4' />
								Billing
							</Button>
						</Link>
						<Link href='/settings'>
							<Button variant={`${pathname === '/settings' ? 'secondary' : 'ghost'}`} className='w-full justify-start'>
								<Settings className='mr-2 h-4 w-4' />
								Settings
							</Button>
						</Link>
						<Link href='/help'>
							<Button variant={`${pathname === '/help' ? 'secondary' : 'ghost'}`} className='w-full justify-start'>
								<CircleHelp className='mr-2 h-4 w-4' />
								Help
							</Button>
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
