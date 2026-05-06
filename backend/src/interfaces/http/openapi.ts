export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Expenses Tracker API',
    version: '0.1.0'
  },
  servers: [{ url: 'http://localhost:3000' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { error: { type: 'string' } }
      },
      PaymentMethod: {
        oneOf: [
          { type: 'object', required: ['kind'], properties: { kind: { type: 'string', enum: ['cash'] } } },
          {
            type: 'object',
            required: ['kind'],
            properties: {
              kind: { type: 'string', enum: ['card'] },
              bank: { type: 'string' },
              cardType: { type: 'string', enum: ['credit', 'debit'] }
            }
          }
        ]
      }
    }
  },
  paths: {
    '/auth/otp/request': {
      post: {
        summary: 'Request WhatsApp OTP',
        requestBody: jsonBody({ phoneNumber: { type: 'string', example: '+56912345678' } }, ['phoneNumber']),
        responses: standardResponses({ sent: { type: 'boolean' } })
      }
    },
    '/auth/otp/verify': {
      post: {
        summary: 'Verify WhatsApp OTP and receive tokens',
        requestBody: jsonBody({
          phoneNumber: { type: 'string' },
          code: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          countryOfResidence: { type: 'string' },
          preferredCurrency: { type: 'string', example: 'CLP' }
        }, ['phoneNumber', 'code']),
        responses: standardResponses({
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          user: { type: 'object' }
        })
      }
    },
    '/auth/refresh': {
      post: {
        summary: 'Refresh JWT session',
        requestBody: jsonBody({ refreshToken: { type: 'string' } }, ['refreshToken']),
        responses: standardResponses({
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          user: { type: 'object' }
        })
      }
    },
    '/me': {
      get: authenticatedGet('Current user').get,
      put: {
        summary: 'Update current user profile',
        security: [{ bearerAuth: [] }],
        requestBody: jsonBody({
          name: { type: 'string' },
          email: { type: 'string' },
          countryOfResidence: { type: 'string' },
          preferredCurrency: { type: 'string', example: 'CLP' }
        }, ['name', 'countryOfResidence', 'preferredCurrency']),
        responses: standardResponses({ data: { type: 'object' } })
      }
    },
    '/expenses': {
      get: {
        summary: 'List expenses with filters',
        security: [{ bearerAuth: [] }],
        parameters: [
          queryParam('from', 'string', 'ISO datetime lower bound'),
          queryParam('to', 'string', 'ISO datetime upper bound'),
          queryParam('categoryId', 'string', 'Category UUID'),
          queryParam('currency', 'string', 'Currency code such as CLP'),
          queryParam('paymentMethodKind', 'string', 'cash or card'),
          queryParam('limit', 'integer', 'Maximum rows, 1-200')
        ],
        responses: standardResponses({ data: { type: 'array', items: { type: 'object' } } })
      },
      post: authenticatedPost('Create manual expense').post
    },
    '/expenses/recent': authenticatedGet('List recent expenses'),
    '/incomes': {
      get: {
        summary: 'List incomes with filters',
        security: [{ bearerAuth: [] }],
        parameters: [
          queryParam('from', 'string', 'ISO datetime lower bound'),
          queryParam('to', 'string', 'ISO datetime upper bound'),
          queryParam('currency', 'string', 'Currency code such as CLP'),
          queryParam('limit', 'integer', 'Maximum rows, 1-200')
        ],
        responses: standardResponses({ data: { type: 'array', items: { type: 'object' } } })
      },
      post: authenticatedPost('Create income').post
    },
    '/categories': {
      get: {
        summary: 'List categories and subcategories',
        security: [{ bearerAuth: [] }],
        responses: standardResponses({ data: { type: 'array', items: { type: 'object' } } })
      },
      post: {
        summary: 'Create category or subcategory',
        security: [{ bearerAuth: [] }],
        requestBody: jsonBody({
          name: { type: 'string' },
          parentId: { type: 'string', description: 'Optional parent category UUID for subcategories.' }
        }, ['name']),
        responses: standardResponses({ data: { type: 'object' } })
      }
    },
    '/budgets/monthly': {
      get: {
        summary: 'List monthly budgets',
        security: [{ bearerAuth: [] }],
        parameters: [
          queryParam('month', 'string', 'Budget month in YYYY-MM format')
        ],
        responses: standardResponses({ data: { type: 'array', items: { type: 'object' } } })
      },
      put: {
        summary: 'Create or update monthly budget',
        security: [{ bearerAuth: [] }],
        requestBody: jsonBody({
          month: { type: 'string', example: '2026-05' },
          categoryId: { type: 'string' },
          subcategoryId: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string', example: 'CLP' }
        }, ['month', 'categoryId', 'amount', 'currency']),
        responses: standardResponses({ data: { type: 'object' } })
      }
    },
    '/reports': authenticatedGet('Generate report for query period'),
    '/report-preferences': authenticatedPut('Update report preferences'),
    '/webhooks/whatsapp': {
      get: { summary: 'Verify WhatsApp webhook', responses: { '200': { description: 'Verified' }, '403': { description: 'Invalid token' } } },
      post: {
        summary: 'Receive WhatsApp webhook event',
        parameters: [
          {
            name: 'x-hub-signature-256',
            in: 'header',
            required: false,
            schema: { type: 'string', example: 'sha256=...' },
            description: 'Required when WHATSAPP_APP_SECRET is configured.'
          }
        ],
        responses: {
          '200': { description: 'Accepted' },
          '401': { description: 'Invalid or missing Meta signature' }
        }
      }
    }
  }
};

function jsonBody(properties: Record<string, unknown>, required: string[] = []) {
  return {
    required: true,
    content: {
      'application/json': {
        schema: { type: 'object', required, properties }
      }
    }
  };
}

function standardResponses(properties: Record<string, unknown>) {
  return {
    '200': { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties } } } },
    '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
  };
}

function authenticatedGet(summary: string) {
  return { get: { summary, security: [{ bearerAuth: [] }], responses: standardResponses({ data: { type: 'object' } }) } };
}

function authenticatedPost(summary: string) {
  return { post: { summary, security: [{ bearerAuth: [] }], responses: standardResponses({ data: { type: 'object' } }) } };
}

function authenticatedPut(summary: string) {
  return { put: { summary, security: [{ bearerAuth: [] }], responses: standardResponses({ data: { type: 'object' } }) } };
}

function authenticatedCollection(summary: string) {
  return {
    get: { summary, security: [{ bearerAuth: [] }], responses: standardResponses({ data: { type: 'array', items: { type: 'object' } } }) },
    post: { summary, security: [{ bearerAuth: [] }], responses: standardResponses({ data: { type: 'object' } }) },
    put: { summary, security: [{ bearerAuth: [] }], responses: standardResponses({ data: { type: 'object' } }) }
  };
}

function queryParam(name: string, type: string, description: string) {
  return { name, in: 'query', required: false, schema: { type }, description };
}
