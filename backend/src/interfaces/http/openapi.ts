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
        summary: 'Request Telegram OTP',
        requestBody: jsonBody({
          phoneNumber: { type: 'string', example: '+56912345678' },
          telegramChatId: { type: 'string', example: '123456789' }
        }, ['phoneNumber']),
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
          '500': { description: 'Provider delivery failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, examples: { telegramNotLinked: { value: { error: 'Telegram chat is not linked. Open the bot and send /link +<your-phone-number>, then request OTP again.' } } } } } }
        }
      }
    },
    '/auth/otp/verify': {
      post: {
        summary: 'Verify Telegram OTP and receive tokens',
        requestBody: jsonBody({
          phoneNumber: { type: 'string' },
          code: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          preferredName: { type: 'string' },
          email: { type: 'string' },
          countryOfResidence: { type: 'string' },
          preferredCurrency: { type: 'string', example: 'CLP' },
          preferredLanguage: { type: 'string', enum: ['es', 'en'], example: 'es' },
          telegramChatId: { type: 'string', example: '123456789' }
        }, ['phoneNumber', 'code']),
        responses: {
          '200': {
            description: 'OTP verified',
            content: {
              'application/json': {
                examples: {
                  verified: {
                    value: {
                      accessToken: '<jwt-access-token>',
                      refreshToken: '<jwt-refresh-token>',
                      user: { id: 'user-id', phoneNumber: '+56912345678' }
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Validation or OTP verification error',
            content: {
              'application/json': {
                examples: {
                  invalidCode: { value: { error: 'Invalid verification code.' } },
                  expiredCode: { value: { error: 'Verification code expired.' } }
                }
              }
            }
          }
        }
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
    '/auth/telegram/link-token': {
      post: {
        summary: 'Create one-time Telegram link token',
        requestBody: jsonBody({ chatId: { type: 'string', example: '123456789' } }, ['chatId']),
        responses: standardResponses({
          token: { type: 'string' },
          expiresAt: { type: 'string', format: 'date-time' }
        })
      }
    },
    '/auth/telegram/consume-link-token': {
      post: {
        summary: 'Consume Telegram link token',
        requestBody: jsonBody({ token: { type: 'string' } }, ['token']),
        responses: {
          '200': {
            description: 'Link token consumed',
            content: {
              'application/json': {
                examples: {
                  linkedUser: {
                    value: {
                      telegramChatId: '123456789',
                      phoneNumber: '+56982439041',
                      linkedUser: true,
                      accessToken: '<jwt-access-token>',
                      refreshToken: '<jwt-refresh-token>',
                      user: {
                        id: 'user-id',
                        phoneNumber: '+56982439041',
                        preferredName: 'Vane'
                      }
                    }
                  },
                  unlinkedUser: {
                    value: {
                      telegramChatId: '123456789',
                      phoneNumber: '+56982439041',
                      linkedUser: false
                    }
                  },
                  unlinkedChatOnly: {
                    value: {
                      telegramChatId: '123456789',
                      linkedUser: false
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Invalid or expired token',
            content: {
              'application/json': {
                examples: {
                  invalidToken: { value: { error: 'Invalid or expired link token.' } }
                }
              }
            }
          }
        }
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
        responses: withUnauthorized(standardResponses({ data: { type: 'array', items: { type: 'object' } } }))
      },
      post: {
        summary: 'Create manual expense',
        description: 'Creates a tenant-scoped expense. Backend normalizes category persistence to root category + optional subcategory.',
        security: [{ bearerAuth: [] }],
        requestBody: jsonBody({
          date: { type: 'string', format: 'date-time' },
          amount: { type: 'number', example: 33000 },
          currency: { type: 'string', example: 'CLP' },
          concept: { type: 'string', example: 'Natacion' },
          categoryId: { type: 'string', format: 'uuid' },
          subcategoryId: { type: 'string', format: 'uuid' },
          paymentMethod: { $ref: '#/components/schemas/PaymentMethod' }
        }, ['date', 'amount', 'currency', 'concept', 'categoryId', 'paymentMethod']),
        responses: {
          ...withUnauthorized({
            '201': {
              description: 'Expense created',
              content: {
                'application/json': {
                  examples: {
                    created: {
                      value: {
                        id: '2e0ddc9e-5dbd-4f84-8df2-7f77f0c0f2d7',
                        concept: 'Natacion',
                        amount: 33000,
                        currency: 'CLP'
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': {
                  examples: {
                    invalidPayload: { value: { error: 'Validation failed.' } },
                    invalidCategory: { value: { error: 'No category is available for this tenant.' } }
                  }
                }
              }
            }
          })
        }
      }
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
        responses: withUnauthorized(standardResponses({ data: { type: 'array', items: { type: 'object' } } }))
      },
      post: authenticatedPost('Create income').post
    },
    '/categories': {
      get: {
        summary: 'List categories and subcategories',
        security: [{ bearerAuth: [] }],
        responses: withUnauthorized(standardResponses({ data: { type: 'array', items: { type: 'object' } } }))
      },
      post: {
        summary: 'Create category or subcategory',
        security: [{ bearerAuth: [] }],
        requestBody: jsonBody({
          name: { type: 'string' },
          parentId: { type: 'string', description: 'Optional parent category UUID for subcategories.' }
        }, ['name']),
        responses: withUnauthorized(standardResponses({ data: { type: 'object' } }))
      }
    },
    '/budgets': {
      get: {
        summary: 'List permanent budgets (applied every month)',
        security: [{ bearerAuth: [] }],
        responses: withUnauthorized(standardResponses({ data: { type: 'array', items: { type: 'object' } } }))
      },
      put: {
        summary: 'Create or update permanent budget',
        security: [{ bearerAuth: [] }],
        requestBody: jsonBody({
          categoryId: { type: 'string' },
          subcategoryId: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string', example: 'CLP' }
        }, ['categoryId', 'amount', 'currency']),
        responses: withUnauthorized(standardResponses({ data: { type: 'object' } }))
      }
    },
    '/budgets/monthly': {
      get: {
        deprecated: true,
        summary: 'Legacy alias of GET /budgets',
        description: 'Deprecated compatibility route. Use GET /budgets. Route may be disabled when LEGACY_BUDGETS_ENDPOINTS_ENABLED=false.',
        security: [{ bearerAuth: [] }],
        responses: withUnauthorized(standardResponses({ data: { type: 'array', items: { type: 'object' } } }))
      },
      put: {
        deprecated: true,
        summary: 'Legacy alias of PUT /budgets',
        description: 'Deprecated compatibility route. Use PUT /budgets. Route may be disabled when LEGACY_BUDGETS_ENDPOINTS_ENABLED=false.',
        security: [{ bearerAuth: [] }],
        requestBody: jsonBody({
          categoryId: { type: 'string' },
          subcategoryId: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string', example: 'CLP' }
        }, ['categoryId', 'amount', 'currency']),
        responses: withUnauthorized(standardResponses({ data: { type: 'object' } }))
      }
    },
    '/reports': authenticatedGet('Generate report for query period'),
    '/reports/expenses/yearly-monthly': {
      get: {
        summary: 'Yearly expenses grouped by month and currency',
        security: [{ bearerAuth: [] }],
        parameters: [queryParam('year', 'integer', 'Year in YYYY format')],
        responses: withUnauthorized(standardResponses({ data: { type: 'array', items: { type: 'object' } } }))
      }
    },
    '/reports/expenses/monthly-daily': {
      get: {
        summary: 'Monthly expenses grouped by day and currency',
        security: [{ bearerAuth: [] }],
        parameters: [queryParam('month', 'string', 'Month in YYYY-MM format')],
        responses: withUnauthorized(standardResponses({ data: { type: 'array', items: { type: 'object' } } }))
      }
    },
    '/reports/expenses/weekly-daily': {
      get: {
        summary: 'Weekly expenses grouped by day and currency',
        security: [{ bearerAuth: [] }],
        parameters: [queryParam('weekStart', 'string', 'Week start date in YYYY-MM-DD format (Monday recommended)')],
        responses: withUnauthorized(standardResponses({ data: { type: 'array', items: { type: 'object' } } }))
      }
    },
    '/reports/incomes/yearly-monthly': {
      get: {
        summary: 'Yearly incomes grouped by month and currency',
        security: [{ bearerAuth: [] }],
        parameters: [queryParam('year', 'integer', 'Year in YYYY format')],
        responses: withUnauthorized(standardResponses({ data: { type: 'array', items: { type: 'object' } } }))
      }
    },
    '/reports/incomes/monthly-daily': {
      get: {
        summary: 'Monthly incomes grouped by day and currency',
        security: [{ bearerAuth: [] }],
        parameters: [queryParam('month', 'string', 'Month in YYYY-MM format')],
        responses: withUnauthorized(standardResponses({ data: { type: 'array', items: { type: 'object' } } }))
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
        responses: withUnauthorized(standardResponses({ data: { type: 'array', items: { type: 'object' } } }))
      }
    },
    '/report-preferences': authenticatedPut('Update report preferences'),
    '/webhooks/telegram': {
      post: {
        summary: 'Receive Telegram webhook event',
        description: 'Receives Telegram updates, supports account link with `/link +<phone>`, and forwards inbound text as provider-neutral messages (including create/edit intents interpreted by backend).',
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
                  ignoredNoText: { value: { received: true, ignored: true } },
                  processedCreateOrEdit: { value: { received: true } }
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
    '200': {
      description: 'OK',
      content: {
        'application/json': {
          schema: { type: 'object', properties },
          examples: {
            success: { value: Object.fromEntries(Object.keys(properties).map((key) => [key, sampleForKey(key)])) }
          }
        }
      }
    },
    '400': {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
          examples: {
            validationError: { value: { error: 'Validation failed.' } }
          }
        }
      }
    }
  };
}

function authenticatedGet(summary: string) {
  return {
    get: {
      summary,
      security: [{ bearerAuth: [] }],
      responses: withUnauthorized(standardResponses({ data: { type: 'object' } }))
    }
  };
}

function authenticatedPost(summary: string) {
  return {
    post: {
      summary,
      security: [{ bearerAuth: [] }],
      responses: withUnauthorized(standardResponses({ data: { type: 'object' } }))
    }
  };
}

function authenticatedPut(summary: string) {
  return {
    put: {
      summary,
      security: [{ bearerAuth: [] }],
      responses: withUnauthorized(standardResponses({ data: { type: 'object' } }))
    }
  };
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

function withUnauthorized(responses: Record<string, unknown>) {
  return {
    ...responses,
    '401': {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
          examples: {
            missingToken: { value: { error: 'Unauthorized' } }
          }
        }
      }
    }
  };
}

function sampleForKey(key: string) {
  if (key === 'data') return {};
  if (key === 'accessToken' || key === 'refreshToken' || key === 'token') return '<token>';
  if (key === 'expiresAt') return '2026-06-01T12:00:00.000Z';
  if (key === 'telegramChatId') return '123456789';
  return true;
}
