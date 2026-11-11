import { sslChecker, sslCheckerBatch } from 'ssl-checker';
import {
	NodeConnectionTypes,
	NodeOperationError,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

export class SslChecker implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SSL Certificate Checker',
		name: 'sslChecker',
		icon: {
			light: 'file:../../icons/ssl-checker.svg',
			dark: 'file:../../icons/ssl-checker.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] === "checkMany" ? "Check Many" : "Check"}}',
		description: 'Check SSL/TLS certificates and connection details',
		defaults: {
			name: 'SSL Certificate Checker',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Check', value: 'check' },
					{ name: 'Check Many', value: 'checkMany' },
				],
				default: 'check',
			},
			{
				displayName: 'Hostname',
				name: 'host',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'example.com',
				description: 'Hostname or IP address, without a protocol or path',
				displayOptions: { show: { operation: ['check'] } },
			},
			{
				displayName: 'Hostnames',
				name: 'hosts',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'example.com\nexample.org',
				typeOptions: { rows: 5 },
				description: 'One hostname or IP address per line',
				displayOptions: { show: { operation: ['checkMany'] } },
			},
			{
				displayName: 'Protocol',
				name: 'protocol',
				type: 'options',
				options: [
					{ name: 'FTP (STARTTLS)', value: 'ftp' },
					{ name: 'HTTPS', value: 'https' },
					{ name: 'IMAP (STARTTLS)', value: 'imap' },
					{ name: 'POP3 (STARTTLS)', value: 'pop3' },
					{ name: 'SMTP (STARTTLS)', value: 'smtp' },
				],
				default: 'https',
				description: 'Transport to use for the certificate check',
			},
			{
				displayName: 'Port',
				name: 'port',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0, maxValue: 65535 },
				description: 'Port to connect to. Use 0 for the protocol default.',
			},
			{
				displayName: 'HTTP Method',
				name: 'method',
				type: 'options',
				options: [
					{ name: 'HEAD', value: 'HEAD' },
					{ name: 'GET', value: 'GET' },
				],
				default: 'HEAD',
				description: 'HTTPS request method',
				displayOptions: { show: { protocol: ['https'] } },
			},
			{
				displayName: 'Timeout',
				name: 'timeout',
				type: 'number',
				default: 10000,
				typeOptions: { minValue: 1 },
				description: 'Connection timeout in milliseconds',
			},
			{
				displayName: 'Reject Unauthorized',
				name: 'rejectUnauthorized',
				type: 'boolean',
				default: false,
				description: 'Whether to fail the check when the certificate is not trusted',
			},
			{
				displayName: 'Include Subject Alternative Names',
				name: 'validateSubjectAltName',
				type: 'boolean',
				default: false,
				description: 'Whether to include the certificate DNS and IP names in the result',
			},
			{
				displayName: 'Include Expiration Warning',
				name: 'includeExpiringSoon',
				type: 'boolean',
				default: false,
				description: 'Whether to add an expiringSoon field to the result',
			},
			{
				displayName: 'Warning Days',
				name: 'warnDays',
				type: 'number',
				default: 30,
				typeOptions: { minValue: 0 },
				description: 'Mark certificates expiring within this many days',
				displayOptions: { show: { includeExpiringSoon: [true] } },
			},
			{
				displayName: 'Server Name (SNI)',
				name: 'servername',
				type: 'string',
				default: '',
				placeholder: 'example.com',
				description: 'Override the server name sent during TLS negotiation',
			},
			{
				displayName: 'Include TLS Security Grade',
				name: 'grade',
				type: 'boolean',
				default: false,
				description: 'Whether to probe supported TLS versions and weak ciphers to calculate a grade',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const operation = this.getNodeParameter('operation', itemIndex) as string;
			const options: Parameters<typeof sslChecker>[1] = {
				protocol: this.getNodeParameter('protocol', itemIndex) as 'https' | 'smtp' | 'imap' | 'pop3' | 'ftp',
				timeout: this.getNodeParameter('timeout', itemIndex) as number,
				rejectUnauthorized: this.getNodeParameter('rejectUnauthorized', itemIndex) as boolean,
				validateSubjectAltName: this.getNodeParameter('validateSubjectAltName', itemIndex) as boolean,
				grade: this.getNodeParameter('grade', itemIndex) as boolean,
			};
			const port = this.getNodeParameter('port', itemIndex) as number;
			if (port > 0) options.port = port;

			if (options.protocol === 'https') {
				options.method = this.getNodeParameter('method', itemIndex) as 'HEAD' | 'GET';
			}

			if (this.getNodeParameter('includeExpiringSoon', itemIndex) as boolean) {
				options.warnDays = this.getNodeParameter('warnDays', itemIndex) as number;
			}

			const servername = this.getNodeParameter('servername', itemIndex) as string;
			if (servername.trim()) options.servername = servername.trim();

			if (operation === 'checkMany') {
				const hosts = (this.getNodeParameter('hosts', itemIndex) as string)
					.split(/\r?\n/)
					.map((host) => host.trim())
					.filter(Boolean);

				if (hosts.length === 0) {
					throw new NodeOperationError(this.getNode(), 'Enter at least one hostname', {
						itemIndex,
					});
				}

				const results = await sslCheckerBatch(hosts, options);
				for (const host of hosts) {
					const result = results.get(host);
					if (!result || result instanceof Error) {
						returnData.push({
							json: { host, error: result instanceof Error ? result.message : 'No result returned' },
							pairedItem: { item: itemIndex },
						});
					} else {
						returnData.push({
							json: { host, ...result },
							pairedItem: { item: itemIndex },
						});
					}
				}
				continue;
			}

			const host = (this.getNodeParameter('host', itemIndex) as string).trim();
			if (!host) {
				throw new NodeOperationError(this.getNode(), 'Hostname is required', { itemIndex });
			}

			try {
				const result = await sslChecker(host, options);
				returnData.push({
					json: { host, ...result },
					pairedItem: { item: itemIndex },
				});
			} catch (error) {
				const nodeError = error instanceof Error ? error : new Error(String(error));
				if (this.continueOnFail()) {
					returnData.push({
						json: { host, error: nodeError.message },
						pairedItem: { item: itemIndex },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), nodeError, { itemIndex });
			}
		}

		return [returnData];
	}
}