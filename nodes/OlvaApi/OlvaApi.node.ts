import type { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

const BASE_DEFAULT = 'https://api.olva-api.lat';

// Recurso → operaciones disponibles
const RESOURCES = [
  { value: 'agencia', name: 'Agencia', description: 'Catálogo y búsqueda de agencias' },
  { value: 'ubicacion', name: 'Ubicación', description: 'Departamentos, provincias y distritos' },
  { value: 'catalogo', name: 'Catálogo', description: 'Sedes, ubigeos, categorías y tamaños' },
  { value: 'tracking', name: 'Tracking', description: 'Rastreo de envíos' },
  { value: 'shipment', name: 'Envío', description: 'Registrar y consultar envíos' },
  { value: 'cuenta', name: 'Cuenta', description: 'Cotización y consulta de personas' },
];

const OPERATIONS: Record<string, { value: string; name: string }[]> = {
  agencia: [
    { value: 'list', name: 'Listar' },
    { value: 'search', name: 'Buscar' },
  ],
  ubicacion: [
    { value: 'departments', name: 'Departamentos' },
    { value: 'provinces', name: 'Provincias de un departamento' },
    { value: 'districts', name: 'Distritos de una provincia' },
  ],
  catalogo: [
    { value: 'headquarters', name: 'Sedes de origen' },
    { value: 'ubigeos', name: 'Ubigeos' },
    { value: 'articleCategories', name: 'Categorías de artículos' },
    { value: 'standardSizes', name: 'Tamaños estándar' },
  ],
  tracking: [
    { value: 'track', name: 'Rastrear una guía' },
    { value: 'trackBatch', name: 'Rastrear lote (≤50)' },
  ],
  shipment: [
    { value: 'create', name: 'Registrar envío' },
    { value: 'createBulk', name: 'Registrar envíos en lote' },
    { value: 'list', name: 'Listar envíos' },
    { value: 'get', name: 'Detalle de un envío' },
  ],
  cuenta: [
    { value: 'quote', name: 'Cotizar' },
    { value: 'person', name: 'Consultar persona (DNI/RUC)' },
  ],
};

export class OlvaApi implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Olva API',
    name: 'olvaApi',
    group: ['transform'],
    version: 1,
    description: 'Consume la Olva API: tracking, agencias, ubicaciones y envíos',
    defaults: { name: 'Olva API' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{ name: 'olvaApiApi', required: true }],
    properties: [
      {
        displayName: 'Recurso',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: RESOURCES,
        default: 'tracking',
      },
      {
        displayName: 'Operación',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: Object.keys(OPERATIONS) } },
        options: Object.values(OPERATIONS).flat(),
        default: 'track',
      },
      // ---- Agencias ----
      {
        displayName: 'Texto de búsqueda',
        name: 'q',
        type: 'string',
        default: '',
        description: 'Búsqueda libre por nombre, distrito o dirección',
        displayOptions: { show: { resource: ['agencia'], operation: ['list', 'search'] } },
      },
      {
        displayName: 'Departamento',
        name: 'departamento',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['agencia'], operation: ['list', 'search'] } },
      },
      {
        displayName: 'Provincia',
        name: 'provincia',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['agencia'], operation: ['list', 'search'] } },
      },
      {
        displayName: 'Solo aéreas',
        name: 'aereo',
        type: 'boolean',
        default: false,
        displayOptions: { show: { resource: ['agencia'], operation: ['search'] } },
      },
      {
        displayName: 'Cerca de (lat,lng)',
        name: 'near',
        type: 'string',
        default: '',
        placeholder: '-12.1211,-77.0298',
        description: 'Filtra agencias dentro de radius_km de un punto',
        displayOptions: { show: { resource: ['agencia'], operation: ['search'] } },
      },
      {
        displayName: 'Radio (km)',
        name: 'radius_km',
        type: 'number',
        default: 50,
        displayOptions: { show: { resource: ['agencia'], operation: ['search'] } },
      },
      // ---- Ubicaciones ----
      {
        displayName: 'Departamento',
        name: 'depId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['ubicacion'], operation: ['provinces', 'districts'] } },
      },
      {
        displayName: 'Provincia',
        name: 'provId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['ubicacion'], operation: ['districts'] } },
      },
      // ---- Tracking ----
      {
        displayName: 'N° de guía',
        name: 'orderNumber',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['tracking'], operation: ['track', 'trackBatch'] } },
      },
      {
        displayName: 'Año de emisión (2 dígitos)',
        name: 'orderCode',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['tracking'], operation: ['track'] } },
      },
      {
        displayName: 'Números de guía',
        name: 'orderNumbers',
        type: 'string',
        required: true,
        default: '',
        placeholder: '1234567890, 9876543210',
        description: 'Hasta 50 guías separadas por coma',
        displayOptions: { show: { resource: ['tracking'], operation: ['trackBatch'] } },
      },
      // ---- Cuenta ----
      {
        displayName: 'Origen (ubigeo)',
        name: 'origin',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['cuenta'], operation: ['quote'] } },
      },
      {
        displayName: 'Destino (ubigeo)',
        name: 'destination',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['cuenta'], operation: ['quote'] } },
      },
      {
        displayName: 'Tipo de entrega',
        name: 'deliveryType',
        type: 'options',
        options: [
          { value: 'O', name: 'Oficina / tienda' },
          { value: 'D', name: 'Domicilio' },
        ],
        default: 'O',
        displayOptions: { show: { resource: ['cuenta'], operation: ['quote'] } },
      },
      {
        displayName: 'Tipo de envío',
        name: 'shipmentType',
        type: 'options',
        options: [
          { value: 1, name: 'Sobre / documento' },
          { value: 2, name: 'Paquete (requiere dimensiones)' },
        ],
        default: 1,
        displayOptions: { show: { resource: ['cuenta'], operation: ['quote'] } },
      },
      {
        displayName: 'Peso (kg)',
        name: 'weight',
        type: 'number',
        default: 1,
        displayOptions: { show: { resource: ['cuenta'], operation: ['quote'] } },
      },
      {
        displayName: 'Largo / Ancho / Alto (cm)',
        name: 'dimensions',
        type: 'string',
        default: '',
        placeholder: '20,15,10',
        description: 'Requerido si el tipo de envío es "Paquete": largo, ancho y alto separados por coma',
        displayOptions: { show: { resource: ['cuenta'], operation: ['quote'] } },
      },
      {
        displayName: 'Tipo de documento',
        name: 'docType',
        type: 'options',
        options: [
          { value: 'dni', name: 'DNI' },
          { value: 'ruc', name: 'RUC' },
        ],
        default: 'dni',
        displayOptions: { show: { resource: ['cuenta'], operation: ['person'] } },
      },
      {
        displayName: 'Número de documento',
        name: 'docNumber',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['cuenta'], operation: ['person'] } },
      },
      {
        displayName: 'Envío (JSON)',
        name: 'shipmentJson',
        type: 'json',
        default: '{\n  "sender": { "documentType": "dni", "documentNumber": "", "phone": "", "email": "" },\n  "recipient": { "documentNumber": "", "fullName": "", "phone": "", "email": "" },\n  "origin": { "headquarterId": "43" },\n  "destination": { "agencyCode": "" },\n  "package": { "weightKg": 1, "shipmentType": 2, "declaredValue": 50, "articleId": 396, "lengthCm": 20, "widthCm": 15, "heightCm": 10 },\n  "whoPays": "DESTINATION",\n  "deliveryType": "O",\n  "pin": "4821",\n  "confirm": true\n}',
        description:
          'Contrato de registro de envío (JSON). Con "confirm": true (por defecto) se registra la guía en Olva y se envían los correos al remitente y destinatario. "pin" es la clave de 4 dígitos para entrega en tienda (se genera si se omite).',
        displayOptions: { show: { resource: ['shipment'], operation: ['create'] } },
      },
      {
        displayName: 'Envíos (JSON array)',
        name: 'shipmentsJson',
        type: 'json',
        default: '[\n  { "sender": { "documentType": "dni", "documentNumber": "", "phone": "", "email": "" }, "recipient": { "documentNumber": "", "fullName": "", "phone": "", "email": "" }, "origin": { "headquarterId": "43" }, "destination": { "agencyCode": "" }, "package": { "weightKg": 1, "shipmentType": 1, "articleId": 396 }, "whoPays": "DESTINATION", "deliveryType": "O", "confirm": true }\n]',
        description:
          'Array de envíos (hasta 25). Cada ítem se registra y notifica igual que una llamada individual; un fallo no aborta el lote.',
        displayOptions: { show: { resource: ['shipment'], operation: ['createBulk'] } },
      },
      {
        displayName: 'Idempotency-Key',
        name: 'idempotencyKey',
        type: 'string',
        default: '',
        description:
          'Evita guías duplicadas en reintentos. Solo para "Registrar envío": el lote aún no aísla la clave por ítem.',
        displayOptions: { show: { resource: ['shipment'], operation: ['create'] } },
      },
      {
        displayName: 'Envío ID',
        name: 'shipmentId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['shipment'], operation: ['get'] } },
      },
      {
        displayName: 'Página',
        name: 'page',
        type: 'number',
        default: 1,
        displayOptions: { show: { resource: ['shipment'], operation: ['list'] } },
      },
      {
        displayName: 'Límite',
        name: 'limit',
        type: 'number',
        default: 20,
        description: 'Resultados por página (máximo 100)',
        displayOptions: { show: { resource: ['shipment'], operation: ['list'] } },
      },
      {
        displayName: 'Estado',
        name: 'status',
        type: 'options',
        options: [
          { value: '', name: 'Todos' },
          { value: 'REGISTERED', name: 'Registrado' },
          { value: 'DRAFT', name: 'Borrador (sin confirmar)' },
          { value: 'PENDING_PAYMENT', name: 'Pendiente de pago' },
        ],
        default: '',
        displayOptions: { show: { resource: ['shipment'], operation: ['list'] } },
      },
      {
        displayName: 'Buscar',
        name: 'q',
        type: 'string',
        default: '',
        description: 'Busca por número de guía (queda vacío hasta que Olva asigne la guía)',
        displayOptions: { show: { resource: ['shipment'], operation: ['list'] } },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const credentials = await this.getCredentials('olvaApiApi');
    const baseUrl = String((credentials.baseUrl as string) || BASE_DEFAULT).replace(/\/$/, '');
    const apiKey = credentials.apiKey as string;

    const resource = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;

    let url = '';
    let method: 'GET' | 'POST' = 'GET';
    let body: unknown = null;
    let query: Record<string, string> = {};
    const headers: Record<string, string> = {
      'x-api-key': apiKey,
      Accept: 'application/json',
    };

    // ---- Agencia ----
    if (resource === 'agencia') {
      const q = this.getNodeParameter('q', 0, '') as string;
      const departamento = this.getNodeParameter('departamento', 0, '') as string;
      const provincia = this.getNodeParameter('provincia', 0, '') as string;

      if (operation === 'list') {
        url = `${baseUrl}/agencies`;
        query = { q, department: departamento, province: provincia };
      } else {
        url = `${baseUrl}/agencies/search`;
        const aereo = this.getNodeParameter('aereo', 0, false) as boolean;
        const near = this.getNodeParameter('near', 0, '') as string;
        const radius_km = this.getNodeParameter('radius_km', 0, 50) as number;
        query = { q, departamento, provincia, aereo: String(aereo), near, radius_km: String(radius_km) };
      }
    }

    // ---- Ubicación ----
    if (resource === 'ubicacion') {
      if (operation === 'departments') {
        url = `${baseUrl}/locations/departments`;
      } else {
        const depId = this.getNodeParameter('depId', 0) as string;
        if (operation === 'provinces') {
          url = `${baseUrl}/locations/departments/${encodeURIComponent(depId)}/provinces`;
        } else {
          const provId = this.getNodeParameter('provId', 0) as string;
          url = `${baseUrl}/locations/departments/${encodeURIComponent(depId)}/provinces/${encodeURIComponent(provId)}/districts`;
        }
      }
    }

    // ---- Tracking ----
    if (resource === 'tracking') {
      if (operation === 'track') {
        const orderNumber = this.getNodeParameter('orderNumber', 0) as string;
        const orderCode = this.getNodeParameter('orderCode', 0, '') as string;
        url = `${baseUrl}/track`;
        method = 'POST';
        body = { orderNumber, orderCode: orderCode || undefined };
      } else {
        const raw = this.getNodeParameter('orderNumbers', 0) as string;
        const shipments = raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((orderNumber) => ({ orderNumber }));
        url = `${baseUrl}/track/batch`;
        method = 'POST';
        body = { shipments };
      }
    }

    // ---- Catálogo ----
    if (resource === 'catalogo') {
      const paths: Record<string, string> = {
        headquarters: '/catalog/headquarters',
        ubigeos: '/catalog/ubigeos',
        articleCategories: '/catalog/article-categories',
        standardSizes: '/catalog/standard-sizes',
      };
      url = `${baseUrl}${paths[operation]}`;
    }

    // ---- Envío ----
    if (resource === 'shipment') {
      if (operation === 'create') {
        const raw = this.getNodeParameter('shipmentJson', 0) as string;
        try {
          body = JSON.parse(raw);
        } catch {
          throw new NodeOperationError(this.getNode(), 'El campo "Envío (JSON)" no es un JSON válido');
        }
        const idem = this.getNodeParameter('idempotencyKey', 0, '') as string;
        if (idem) headers['Idempotency-Key'] = idem;
        url = `${baseUrl}/shipments`;
        method = 'POST';
      } else if (operation === 'createBulk') {
        const raw = this.getNodeParameter('shipmentsJson', 0) as string;
        let list: unknown;
        try {
          list = JSON.parse(raw);
        } catch {
          throw new NodeOperationError(this.getNode(), 'El campo "Envíos (JSON array)" no es un JSON válido');
        }
        url = `${baseUrl}/shipments/bulk`;
        method = 'POST';
        body = { shipments: list };
      } else if (operation === 'get') {
        const id = this.getNodeParameter('shipmentId', 0) as string;
        url = `${baseUrl}/shipments/${encodeURIComponent(id)}`;
      } else {
        const page = this.getNodeParameter('page', 0, 1) as number;
        const limit = this.getNodeParameter('limit', 0, 20) as number;
        const status = this.getNodeParameter('status', 0, '') as string;
        const q = this.getNodeParameter('q', 0, '') as string;
        url = `${baseUrl}/shipments`;
        query = { page: String(page), limit: String(limit), status, q };
      }
    }

    // ---- Cuenta ----
    if (resource === 'cuenta') {
      if (operation === 'quote') {
        const origin = this.getNodeParameter('origin', 0) as string;
        const destination = this.getNodeParameter('destination', 0) as string;
        const deliveryType = this.getNodeParameter('deliveryType', 0, 'O') as string;
        const shipmentType = this.getNodeParameter('shipmentType', 0, 1) as number;
        const weight = this.getNodeParameter('weight', 0, 1) as number;
        const dimensions = (this.getNodeParameter('dimensions', 0, '') as string)
          .split(',')
          .map((n) => Number(n.trim().replace(',', '.')))
          .filter((n) => Number.isFinite(n));

        url = `${baseUrl}/quotes`;
        method = 'POST';
        const quoteBody: Record<string, unknown> = {
          origin,
          destination,
          delivery_type: deliveryType,
          shipment_type: shipmentType,
          weight,
        };
        if (Number(shipmentType) === 2 && dimensions.length === 3) {
          quoteBody.length = dimensions[0];
          quoteBody.width = dimensions[1];
          quoteBody.height = dimensions[2];
        }
        body = quoteBody;
      } else {
        const docType = this.getNodeParameter('docType', 0, 'dni') as string;
        const docNumber = this.getNodeParameter('docNumber', 0) as string;
        url = `${baseUrl}/person/${encodeURIComponent(docType)}/${encodeURIComponent(docNumber)}`;
      }
    }

    // Construir query string (solo valores no vacíos)
    const qs = Object.entries(query)
      .filter(([, v]) => v !== '' && v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    if (qs) url = `${url}?${qs}`;

    if (body !== null) headers['Content-Type'] = 'application/json';

    const response = await this.helpers.httpRequestWithAuthentication.call(this, 'olvaApiApi', {
      url,
      method,
      headers,
      body: body !== null ? JSON.stringify(body) : undefined,
      json: true,
    });

    return [this.helpers.returnJsonArray(response as INodeExecutionData['json'])];
  }
}
