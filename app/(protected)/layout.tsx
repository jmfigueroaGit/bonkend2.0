import { ThemeProvider } from '@/components/common/theme-provider';
import { Sidebar } from '@/components/layouts/sidebar';
import Navigation from '@/components/navigation';
import { Toaster } from '@/components/ui/toaster';
import React from 'react';

const ProtectedLayout = async ({ children }: { children: React.ReactNode }) => {
	return (
		<ThemeProvider attribute='class' defaultTheme='system' enableSystem disableTransitionOnChange>
			<div className='hidden md:block '>
				<div className='border-t'>
					<Navigation />
					<div className='bg-background '>
						<div className='grid lg:grid-cols-5 h-screen'>
							<Sidebar className='hidden lg:block' />
							<div className='col-span-3 lg:col-span-4 lg:border-l px-4 py-6 lg:px-8'>{children}</div>
							<Toaster />
						</div>
					</div>
				</div>
			</div>
		</ThemeProvider>
	);
};

export default ProtectedLayout;
