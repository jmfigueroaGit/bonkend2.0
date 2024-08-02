'use client';
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { executeApiRequest, getApisByTableId } from '@/lib/api/actions/api';
import { getDatabaseList } from '@/lib/api/actions/database';
import { getTables } from '@/lib/api/actions/table';

const ApiTester = () => {
	const [databases, setDatabases] = useState([]);
	const [selectedDatabase, setSelectedDatabase] = useState(null);
	const [tables, setTables] = useState([]);
	const [selectedTable, setSelectedTable] = useState(null);
	const [apis, setApis] = useState([]);
	const [selectedApi, setSelectedApi] = useState<any>(null);
	const [method, setMethod] = useState('GET');
	const [url, setUrl] = useState('');
	const [params, setParams] = useState([{ key: '', value: '' }]);
	const [headers, setHeaders] = useState([{ key: '', value: '' }]);
	const [body, setBody] = useState('');
	const [response, setResponse] = useState<{ error: string } | null>(null);

	useEffect(() => {
		fetchDatabases();
	}, []);

	const fetchDatabases = async () => {
		const result: any = await getDatabaseList();
		if ('error' in result) {
			console.error('Error fetching databases:', result.error);
		} else {
			setDatabases(result);
		}
	};

	const fetchTables = async (databaseId: any) => {
		const result: any = await getTables(databaseId);
		if ('error' in result) {
			console.error('Error fetching tables:', result.error);
		} else {
			setTables(result.tables);
		}
	};

	const fetchApis = async (tableId: any) => {
		const result: any = await getApisByTableId(tableId);
		if (!('error' in result)) {
			setApis(result);
		} else {
			console.error('Error fetching APIs:', result.error);
		}
	};

	const handleDatabaseSelect = (databaseId: any) => {
		setSelectedDatabase(databaseId);
		fetchTables(databaseId);
	};

	const handleTableSelect = (tableId: any) => {
		setSelectedTable(tableId);
		fetchApis(tableId);
		setSelectedApi(null);
	};

	const handleApiSelect = (apiId: any) => {
		const api: any = apis.find((a: any) => a.id === apiId);
		setSelectedApi(api);
		setMethod(api.method);
		setUrl(api.path);
		setParams([{ key: '', value: '' }]);
		setHeaders([{ key: '', value: '' }]);
		setBody('');
		setResponse(null);
	};

	const handleParamChange = (index: any, key: any, value: any) => {
		const newParams = [...params];
		newParams[index] = { key, value };
		setParams(newParams);
	};

	const handleHeaderChange = (index: any, key: any, value: any) => {
		const newHeaders = [...headers];
		newHeaders[index] = { key, value };
		setHeaders(newHeaders);
	};

	const handleAddParam = () => {
		setParams([...params, { key: '', value: '' }]);
	};

	const handleAddHeader = () => {
		setHeaders([...headers, { key: '', value: '' }]);
	};

	const handleSubmit = async () => {
		if (!selectedApi) return;

		const paramObject: any = {};
		params.forEach((param) => {
			if (param.key) paramObject[param.key] = param.value;
		});

		const headerObject: any = {};
		headers.forEach((header) => {
			if (header.key) headerObject[header.key] = header.value;
		});

		try {
			const result = await executeApiRequest(
				selectedApi.id,
				method,
				paramObject,
				JSON.parse(body || '{}'),
				headerObject
			);
			setResponse(result);
		} catch (error: any) {
			setResponse({ error: error.message });
		}
	};

	return (
		<div className='container mx-auto p-4'>
			<Card>
				<CardHeader>
					<CardTitle>API Tester</CardTitle>
					<CardDescription>Test your APIs like in Postman</CardDescription>
				</CardHeader>
				<CardContent>
					<div className='space-y-4'>
						<div className='flex space-x-4'>
							<Select onValueChange={handleDatabaseSelect}>
								<SelectTrigger className='w-[200px]'>
									<SelectValue placeholder='Select Database' />
								</SelectTrigger>
								<SelectContent>
									{databases.map((db: any) => (
										<SelectItem key={db.id} value={db.id}>
											{db.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select onValueChange={handleTableSelect}>
								<SelectTrigger className='w-[200px]'>
									<SelectValue placeholder='Select Table' />
								</SelectTrigger>
								<SelectContent>
									{tables.map((table: any) => (
										<SelectItem key={table.id} value={table.id}>
											{table.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select onValueChange={handleApiSelect}>
								<SelectTrigger className='w-[200px]'>
									<SelectValue placeholder='Select API' />
								</SelectTrigger>
								<SelectContent>
									{apis.map((api: any) => (
										<SelectItem key={api.id} value={api.id}>
											{api.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className='flex space-x-4'>
							<Input value={method} readOnly className='w-[100px]' />
							<Input value={url} readOnly className='flex-grow' />
							<Button onClick={handleSubmit}>Send</Button>
						</div>
						<Tabs defaultValue='params'>
							<TabsList>
								<TabsTrigger value='params'>Params</TabsTrigger>
								<TabsTrigger value='headers'>Headers</TabsTrigger>
								<TabsTrigger value='body'>Body</TabsTrigger>
							</TabsList>
							<TabsContent value='params'>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Key</TableHead>
											<TableHead>Value</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{params.map((param, index) => (
											<TableRow key={index}>
												<TableCell>
													<Input
														value={param.key}
														onChange={(e) => handleParamChange(index, e.target.value, param.value)}
														placeholder='Key'
													/>
												</TableCell>
												<TableCell>
													<Input
														value={param.value}
														onChange={(e) => handleParamChange(index, param.key, e.target.value)}
														placeholder='Value'
													/>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
								<Button onClick={handleAddParam} className='mt-2'>
									Add Param
								</Button>
							</TabsContent>
							<TabsContent value='headers'>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Key</TableHead>
											<TableHead>Value</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{headers.map((header, index) => (
											<TableRow key={index}>
												<TableCell>
													<Input
														value={header.key}
														onChange={(e) => handleHeaderChange(index, e.target.value, header.value)}
														placeholder='Key'
													/>
												</TableCell>
												<TableCell>
													<Input
														value={header.value}
														onChange={(e) => handleHeaderChange(index, header.key, e.target.value)}
														placeholder='Value'
													/>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
								<Button onClick={handleAddHeader} className='mt-2'>
									Add Header
								</Button>
							</TabsContent>
							<TabsContent value='body'>
								<Textarea
									placeholder='Request Body (JSON)'
									value={body}
									onChange={(e) => setBody(e.target.value)}
									rows={10}
								/>
							</TabsContent>
						</Tabs>
					</div>
				</CardContent>
			</Card>

			{response && (
				<Card className='mt-4'>
					<CardHeader>
						<CardTitle>Response</CardTitle>
					</CardHeader>
					<CardContent>
						<pre className='bg-gray-700 p-4 rounded overflow-auto max-h-96'>{JSON.stringify(response, null, 2)}</pre>
					</CardContent>
				</Card>
			)}
		</div>
	);
};

export default ApiTester;
