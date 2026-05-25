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
              kind: { type: 'string', enum: ['transfer'] },
              bank: { type: 'string' }
            }
          },
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
    '/health': {
      get: {
        summary: 'Legacy health endpoint',
        responses: {
          '200': { description: 'Service is running', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } } } } }
        }
      }
    },
    '/health/live': {
      get: {
        summary: 'Liveness probe',
        responses: {
          '200': { description: 'Process is alive', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } } } } }
        }
      }
    },
    '/health/ready': {
      get: {
        summary: 'Readiness probe',
        responses: {
          '200': {
            description: 'Dependencies are ready',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    checks: {
                      type: 'object',
                      additionalProperties: { type: 'string' },
                      example: { database: 'ok' }
                    }
                  }
                }
              }
            }
          },
          '503': {
            description: 'Dependencies are not ready',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'degraded' },
                    error: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/auth/otp/request': {
      post: {
        summary: 'Request WhatsApp OTP',
        requestBody: jsonBody({ phoneNumber: { type: 'string', example: '+56912345678' } }, ['phoneNumber']),
        responses: {
          '200': {
            description: 'OTP request accepted',
            content: {
              'application/json': {
                examples: {
                  existingUser: {
                    value: { sent: true, requiresRegistration: false }
                  },
                  newUser: {
                    value: { sent: true, requiresRegistration: true }
                  }
                }
              }
            }
          },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '500': { description: 'Provider delivery failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, examples: { whatsappWindowClosed: { value: { error: 'Unable to deliver OTP. Ensure the user has an open conversation window with the WhatsApp business number.' } } } } } }
        }
      }
    },
    '/auth/otp/verify': {
      post: {
        summary: 'Verify WhatsApp OTP and receive tokens',
        requestBody: jsonBody({
          phoneNumber: { type: 'string' },
          code: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          preferredName: { type: 'string' },
          email: { type: 'string' },
          countryOfResidence: { type: 'string' },
          preferredCurrency: { type: 'string', example: 'CLP' },
          preferredLanguage: { type: 'string', enum: ['es', 'en'], example: 'es' }
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
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          preferredName: { type: 'string' },
          email: { type: 'string' },
          countryOfResidence: { type: 'string' },
          preferredCurrency: { type: 'string', example: 'CLP' },
          preferredLanguage: { type: 'string', enum: ['es', 'en'], example: 'es' }
        }, ['firstName', 'lastName', 'preferredName', 'countryOfResidence', 'preferredCurrency', 'preferredLanguage']),
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
          queryParam('paymentMethodKind', 'string', 'cash, transfer, or card'),
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
    '/reports/expenses/yearly-monthly': {
      get: {
        summary: 'Yearly expenses grouped by month and currency',
        security: [{ bearerAuth: [] }],
        parameters: [queryParam('year', 'integer', 'Year in YYYY format')],
        responses: standardResponses({ data: { type: 'array', items: { type: 'object' } } })
      }
    },
    '/reports/expenses/monthly-daily': {
      get: {
        summary: 'Monthly expenses grouped by day and currency',
        security: [{ bearerAuth: [] }],
        parameters: [queryParam('month', 'string', 'Month in YYYY-MM format')],
        responses: standardResponses({ data: { type: 'array', items: { type: 'object' } } })
      }
    },
    '/reports/expenses/weekly-daily': {
      get: {
        summary: 'Weekly expenses grouped by day and currency',
        security: [{ bearerAuth: [] }],
        parameters: [queryParam('weekStart', 'string', 'Week start date in YYYY-MM-DD format (Monday recommended)')],
        responses: standardResponses({ data: { type: 'array', items: { type: 'object' } } })
      }
    },
    '/reports/incomes/yearly-monthly': {
      get: {
        summary: 'Yearly incomes grouped by month and currency',
        security: [{ bearerAuth: [] }],
        parameters: [queryParam('year', 'integer', 'Year in YYYY format')],
        responses: standardResponses({ data: { type: 'array', items: { type: 'object' } } })
      }
    },
    '/reports/incomes/monthly-daily': {
      get: {
        summary: 'Monthly incomes grouped by day and currency',
        security: [{ bearerAuth: [] }],
        parameters: [queryParam('month', 'string', 'Month in YYYY-MM format')],
        responses: standardResponses({ data: { type: 'array', items: { type: 'object' } } })
      }
    },
    '/reports/expenses/category-totals': {
      get: {
        summary: 'Expense totals by category/subcategory and currency for a period',
        security: [{ bearerAuth: [] }],
        parameters: [
          queryParam('from', 'string', 'ISO datetime lower bound'),
          queryParam('to', 'string', 'ISO datetime upper bound')
        ],
        responses: standardResponses({ data: { type: 'array', items: { type: 'object' } } })
      }
    },
    '/report-preferences': authenticatedPut('Update report preferences'),
    '/webhooks/whatsapp': {
      get: { summary: 'Verify WhatsApp webhook', responses: { '200': { description: 'Verified' }, '403': { description: 'Invalid token' } } },
      post: {
        summary: 'Receive WhatsApp webhook event',
        description: 'Validates Meta signature when enabled, extracts inbound messages/statuses, and forwards provider-neutral inbound text to application use cases.',
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
          '200': {
            description: 'Accepted',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { received: { type: 'boolean', example: true } } },
                examples: {
                  savedExpense: { value: { received: true } },
                  ignoredUnknownUser: { value: { received: true } }
                }
              }
            }
          },
          '401': {
            description: 'Invalid or missing Meta signature',
            content: { 'application/json': { examples: { invalidSignature: { value: { error: 'Invalid Meta webhook signature.' } } } } }
          }
        }
      }
    },
    '/webhooks/telegram': {
      post: {
        summary: 'Receive Telegram webhook event',
        description: 'Receives Telegram updates, supports account link with `/link +<phone>`, and forwards inbound text as provider-neutral messages.',
        parameters: [
          {
            name: 'x-telegram-bot-api-secret-token',
            in: 'header',
            required: false,
            schema: { type: 'string' },
            description: 'Required when TELEGRAM_WEBHOOK_SECRET_TOKEN is configured.'
          }
        ],
        responses: {
          '200': {
            description: 'Accepted',
            content: {
              'application/json': {
                examples: {
                  linked: { value: { received: true } },
                  ignoredNoText: { value: { received: true, ignored: true } }
                }
              }
            }
          },
          '401': {
            description: 'Invalid Telegram webhook secret',
            content: {
              'application/json': {
                examples: {
                  invalidSecret: { value: { error: 'Invalid Telegram webhook secret token.' } }
                }
              }
            }
          }
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
