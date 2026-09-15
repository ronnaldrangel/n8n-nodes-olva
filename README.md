# n8n-nodes-olva

Nodo custom de [n8n](https://n8n.io) para consumir la **Olva API** (`api.olva-api.lat`):
tracking, agencias, ubicaciones y envíos de Olva Courier.

Disponible en **npm** como `n8n-nodes-olva` (Community Node oficial).

## Requisitos

- n8n self-hosted (v1.x+) o n8n Cloud
- Una API key de la Olva API (`olva_…`) — se genera en `https://olva-api.lat/dashboard`

## Instalación (vía npm — recomendada)

1. En n8n ve a **Settings → Community nodes → Install Community Node**.
2. Busca `n8n-nodes-olva` (o pega el nombre exacto) e instálalo.
3. Espera a que n8n se reinicie o recargue los nodos.
4. El nodo **Olva API** aparecerá en el panel.

También puedes instalarlo por línea de comandos en tu instancia self-hosted:

```bash
# En el directorio de instalación de n8n (Docker o local):
# Usa N8N_CUSTOM_EXTENSIONS apuntando al paquete instalado globalmente:
npm install -g n8n-nodes-olva
export N8N_CUSTOM_EXTENSIONS="$(npm root -g)/n8n-nodes-olva/dist"
# Reinicia n8n
```

## Instalación manual (desde el código)

1. Compila el paquete:

   ```bash
   npm install
   npm run build
   ```

2. Copia la carpeta a los custom extensions de n8n:

   ```bash
   # Linux / macOS
   mkdir -p ~/.n8n/custom
   cp -r dist ~/.n8n/custom/n8n-nodes-olva

   # O apunta N8N_CUSTOM_EXTENSIONS a la carpeta dist
   export N8N_CUSTOM_EXTENSIONS=/ruta/a/n8n-nodes-olva/dist
   ```

3. Reinicia n8n. El nodo **Olva API** aparecerá en el panel.

## Credencial

- **Base URL**: `https://api.olva-api.lat`
- **API Key**: tu `olva_…`
- El botón **Test** valida contra `GET /validate`.

## Recursos y operaciones

| Recurso | Operaciones | Endpoint |
|---|---|---|
| Agencia | `list`, `search` | `GET /agencies`, `GET /agencies/search` |
| Ubicación | `departments`, `provinces`, `districts` | `GET /locations/departments(/…/provinces(/…/districts))` |
| Catálogo | `headquarters`, `ubigeos`, `articleCategories`, `standardSizes` | `GET /catalog/*` |
| Tracking | `track`, `trackBatch` | `POST /track`, `POST /track/batch` |
| Envío | `create`, `createBulk`, `list`, `get` | `POST /shipments`, `POST /shipments/bulk`, `GET /shipments`, `GET /shipments/:id` |
| Cuenta | `quote`, `person` | `POST /quotes`, `GET /person/:docType/:docNumber` |

## Registrar envíos

El recurso **Envío** envía al body el JSON tal como lo escribas, así que acepta los
mismos campos que la API (`sender`, `recipient`, `origin`, `destination`, `package`,
`whoPays`, `deliveryType`).

- `sender.email` y `recipient.email`: Olva los usa para avisar del registro. Sin
  ellos no hay correo.
- `confirm` (default `true`): confirma el envío en Olva, genera la guía y dispara los
  correos. Con `false` solo se cotiza el carrito (`status: "DRAFT"`).
- `pin`: clave de seguridad de 4 dígitos para retiro en tienda (`deliveryType: "O"`).
  Si se omite, la API la genera y la devuelve en `securityPin`.
- `whoPays: "ONLINE"` no registra ni notifica: devuelve `status: "PENDING_PAYMENT"`
  porque el pago se completa en el checkout de Olva.

La respuesta incluye `registrationNumber`, `cost`, `igv`, `label` (PDF en base64),
`securityPin`, `emails` y `notificationTriggered`.

> El campo **Idempotency-Key** solo aplica a *Registrar envío*. En el lote todavía no
> se usa: la API comparte una sola clave para todo el lote, así que un reintento con
> esa cabecera devolvería datos cruzados.

## Desarrollo

```bash
npm run typecheck   # verificación de tipos
npm run build       # tsc + copia de recursos JSON
npm publish         # publicar en npm
```
