import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class OlvaApiApi implements ICredentialType {
  name = 'olvaApiApi';
  displayName = 'Olva API';
  documentationUrl = 'https://olva-api.lat/docs';
  properties: INodeProperties[] = [
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://api.olva-api.lat',
      description: 'URL base de la Olva API',
    },
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      description: 'API key (olva_…) generada en el dashboard',
    },
  ];

  // Botón "Test" de la credencial: valida contra GET /validate
  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.baseUrl}}',
      url: '/validate',
      method: 'GET',
      headers: {
        'x-api-key': '={{$credentials.apiKey}}',
      },
    },
  };
}