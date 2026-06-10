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
      },
      BankOption: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid', nullable: true },
          name: { type: 'string', example: 'Banco de Crédito e Inversiones' },
          isDefault: { type: 'boolean', example: true }
        }
      },
      PaymentMethodOption: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid', nullable: true },
          code: { type: 'string', example: 'credit_card' },
          name: { type: 'string', example: 'Tarjeta de crédito' },
          kind: { type: 'string', enum: ['cash', 'card', 'transfer'] },
          cardType: { type: 'string', enum: ['credit', 'debit'], nullable: true },
          isDefault: { type: 'boolean', example: true }
        }
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
        summary: 'Request Telegram OTP (fallback flow)',
        description: 'Fallback flow for Telegram-linked users. Primary web authentication uses /auth/register and /auth/login.',
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
    '/auth/register': {
      post: {
        summary: 'Create web account',
        description: 'Primary registration flow. Creates a user with phone number + password. Telegram is optional; if telegramChatId is provided it is linked automatically after registration.',
        requestBody: jsonBody({
          phoneNumber: { type: 'string', example: '+56912345678' },
          password: { type: 'string', example: 'correct-horse-battery' },
          firstName: { type: 'string', example: 'Vanessa' },
          lastName: { type: 'string', example: 'Salas' },
          preferredName: { type: 'string', example: 'Vane' },
          email: { type: 'string', example: 'vane@example.com' },
          countryOfResidence: { type: 'string', example: 'Chile' },
          preferredCurrency: { type: 'string', example: 'CLP' },
          preferredLanguage: { type: 'string', enum: ['es', 'en'], example: 'es' },
          telegramChatId: { type: 'string', example: '123456789' }
        }, ['phoneNumber', 'password', 'firstName', 'lastName', 'preferredName', 'countryOfResidence', 'preferredCurrency']),
        responses: {
          '201': {
            description: 'Account created and session started',
            content: {
              'application/json': {
                examples: {
                  created: {
                    value: {
                      accessToken: '<jwt-access-token>',
                      refreshToken: '<jwt-refresh-token>',
                      user: { id: 'user-id', phoneNumber: '+56912345678', preferredName: 'Vane' }
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Validation or business rule error',
            content: {
              'application/json': {
                examples: {
                  validationError: { value: { error: 'Validation failed.' } },
                  alreadyRegistered: { value: { error: 'Phone number is already registered. Please log in.' } }
                }
              }
            }
          }
        }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Sign in from the web',
        description: 'Primary login flow using phone number + password. Telegram is optional; if telegramChatId is provided the backend links that chat after successful authentication.',
        requestBody: jsonBody({
          phoneNumber: { type: 'string', example: '+56912345678' },
          password: { type: 'string', example: 'correct-horse-battery' },
          telegramChatId: { type: 'string', example: '123456789' }
        }, ['phoneNumber', 'password']),
        responses: {
          '200': {
            description: 'Session created',
            content: {
              'application/json': {
                examples: {
                  signedIn: {
                    value: {
                      accessToken: '<jwt-access-token>',
                      refreshToken: '<jwt-refresh-token>',
                      user: { id: 'user-id', phoneNumber: '+56912345678', preferredName: 'Vane' }
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Validation or credential error',
            content: {
              'application/json': {
                examples: {
                  invalidCredentials: { value: { error: 'Invalid phone number or password.' } },
                  validationError: { value: { error: 'Validation failed.' } }
                }
              }
            }
          }
        }
      }
    },
    '/auth/magic-link/request': {
      post: {
        summary: 'Send email magic link',
        description: 'Sends a one-time sign-in link to the email already configured on the account identified by phone number.',
        requestBody: jsonBody({
          phoneNumber: { type: 'string', example: '+56912345678' }
        }, ['phoneNumber']),
        responses: {
          '200': {
            description: 'Magic link sent',
            content: {
              'application/json': {
                examples: {
                  sent: {
                    value: {
                      sent: true,
                      expiresAt: '2026-06-03T18:00:00.000Z',
                      email: 'va****@example.com'
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Validation or account state error',
            content: {
              'application/json': {
                examples: {
                  missingAccount: { value: { error: 'No account found for that phone number.' } },
                  missingEmail: { value: { error: 'This account has no email configured. Sign in with your password and add an email in Settings first.' } },
                  providerError: { value: { error: 'Could not send magic link email.' } }
                }
              }
            }
          }
        }
      }
    },
    '/auth/magic-link/consume': {
      post: {
        summary: 'Consume email magic link',
        description: 'Consumes a one-time email sign-in token and returns a browser session.',
        requestBody: jsonBody({
          token: { type: 'string', example: '5f50d30e-7f96-4ad2-b16f-2a38e8576b95' }
        }, ['token']),
        responses: {
          '200': {
            description: 'Session created',
            content: {
              'application/json': {
                examples: {
                  signedIn: {
                    value: {
                      accessToken: '<jwt-access-token>',
                      refreshToken: '<jwt-refresh-token>',
                      user: { id: 'user-id', phoneNumber: '+56912345678', preferredName: 'Vane' }
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
                  invalidToken: { value: { error: 'Invalid or expired magic link token.' } }
                }
              }
            }
          }
        }
      }
    },
    '/auth/telegram/registration-link': {
      post: {
        summary: 'Create Telegram deep link for web-first registration',
        description: 'Optional convenience flow. Generates a Telegram deep link so a web user can link a chat without typing chat_id manually.',
        requestBody: jsonBody({
          phoneNumber: { type: 'string', example: '+56912345678' }
        }, ['phoneNumber']),
        responses: {
          '200': {
            description: 'Deep link generated',
            content: {
              'application/json': {
                examples: {
                  success: {
                    value: {
                      phoneNumber: '+56912345678',
                      botUrl: 'https://t.me/AlphaExpensesTrackerBot?start=<registration-token>'
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Validation or configuration error',
            content: {
              'application/json': {
                examples: {
                  invalidPhone: { value: { error: 'Validation failed.' } },
                  missingUsername: { value: { error: 'Telegram bot username is not configured.' } }
                }
              }
            }
          }
        }
      }
    },
    '/auth/otp/verify': {
      post: {
        summary: 'Verify Telegram OTP and receive tokens (fallback flow)',
        description: 'Fallback flow for Telegram-driven login/registration. Primary web auth uses /auth/register and /auth/login.',
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
          paymentMethodOptionId: { type: 'string', format: 'uuid' },
          bankOptionId: { type: 'string', format: 'uuid' },
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
    '/expenses/{expenseId}': {
      put: {
        summary: 'Update manual expense',
        description: 'Updates an existing tenant-scoped expense, including date, concept, category, payment method, and amount.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'expenseId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Expense UUID' }
        ],
        requestBody: jsonBody({
          date: { type: 'string', format: 'date-time' },
          amount: { type: 'number', example: 33000 },
          currency: { type: 'string', example: 'CLP' },
          concept: { type: 'string', example: 'Natacion' },
          categoryId: { type: 'string', format: 'uuid' },
          subcategoryId: { type: 'string', format: 'uuid' },
          paymentMethodOptionId: { type: 'string', format: 'uuid' },
          bankOptionId: { type: 'string', format: 'uuid' },
          paymentMethod: { $ref: '#/components/schemas/PaymentMethod' }
        }, ['date', 'amount', 'currency', 'concept', 'categoryId', 'paymentMethod']),
        responses: withUnauthorized({
          '200': {
            description: 'Expense updated',
            content: {
              'application/json': {
                examples: {
                  updated: {
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
                  invalidPayload: { value: { error: 'Validation failed.' } }
                }
              }
            }
          },
          '404': {
            description: 'Expense not found',
            content: {
              'application/json': {
                examples: {
                  missingExpense: { value: { error: 'Expense not found.' } }
                }
              }
            }
          }
        })
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
    '/incomes/{incomeId}': {
      put: {
        summary: 'Update income',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'incomeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Income UUID' }
        ],
        requestBody: jsonBody({
          date: { type: 'string', format: 'date-time' },
          amount: { type: 'number', example: 1200000 },
          currency: { type: 'string', example: 'CLP' },
          concept: { type: 'string', example: 'Sueldo' }
        }, ['date', 'amount', 'currency', 'concept']),
        responses: withUnauthorized({
          '200': { description: 'Income updated', content: { 'application/json': { schema: { type: 'object' } } } },
          '404': { description: 'Income not found', content: { 'application/json': { examples: { missingIncome: { value: { error: 'Income not found.' } } } } } }
        })
      }
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
    '/banks': {
      get: {
        summary: 'List available banks (system defaults + tenant custom)',
        security: [{ bearerAuth: [] }],
        responses: withUnauthorized(standardResponses({ data: { type: 'array', items: { $ref: '#/components/schemas/BankOption' } } }))
      },
      post: {
        summary: 'Create custom bank option',
        security: [{ bearerAuth: [] }],
        requestBody: jsonBody({
          name: { type: 'string', example: 'Caja Los Andes' }
        }, ['name']),
        responses: withUnauthorized(standardResponses({ data: { $ref: '#/components/schemas/BankOption' } }))
      }
    },
    '/banks/{bankOptionId}': {
      put: {
        summary: 'Update custom bank option',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'bankOptionId',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        requestBody: jsonBody({
          name: { type: 'string', example: 'Banco personal' }
        }, ['name']),
        responses: withUnauthorized({
          '200': {
            description: 'Bank updated',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/BankOption' } } }
              }
            }
          },
          '400': {
            description: 'Default bank options cannot be modified.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: { defaultBank: { value: { error: 'Default bank options cannot be modified.' } } }
              }
            }
          },
          '404': {
            description: 'Bank option not found.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: { missingBank: { value: { error: 'Bank option not found.' } } }
              }
            }
          }
        })
      },
      delete: {
        summary: 'Delete custom bank option',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'bankOptionId',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: withUnauthorized({
          '200': {
            description: 'Bank deleted',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { data: { type: 'object', properties: { deleted: { type: 'boolean', example: true } } } } }
              }
            }
          },
          '400': {
            description: 'Default or in-use bank options cannot be deleted.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  inUseBank: { value: { error: 'Bank option is in use by existing expenses.' } },
                  defaultBank: { value: { error: 'Default bank options cannot be deleted.' } }
                }
              }
            }
          },
          '404': {
            description: 'Bank option not found.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: { missingBank: { value: { error: 'Bank option not found.' } } }
              }
            }
          }
        })
      }
    },
    '/payment-method-options': {
      get: {
        summary: 'List payment method options (system defaults + tenant custom)',
        security: [{ bearerAuth: [] }],
        responses: withUnauthorized(standardResponses({ data: { type: 'array', items: { $ref: '#/components/schemas/PaymentMethodOption' } } }))
      },
      post: {
        summary: 'Create custom payment method option',
        security: [{ bearerAuth: [] }],
        requestBody: jsonBody({
          name: { type: 'string', example: 'Tarjeta empresa' },
          kind: { type: 'string', enum: ['cash', 'card', 'transfer'] },
          cardType: { type: 'string', enum: ['credit', 'debit'] }
        }, ['name', 'kind']),
        responses: withUnauthorized(standardResponses({ data: { $ref: '#/components/schemas/PaymentMethodOption' } }))
      }
    },
    '/payment-method-options/{paymentMethodOptionId}': {
      put: {
        summary: 'Update custom payment method option',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'paymentMethodOptionId',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        requestBody: jsonBody({
          name: { type: 'string', example: 'Tarjeta empresa' },
          kind: { type: 'string', enum: ['cash', 'card', 'transfer'] },
          cardType: { type: 'string', enum: ['credit', 'debit'] }
        }, ['name', 'kind']),
        responses: withUnauthorized({
          '200': {
            description: 'Payment method updated',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/PaymentMethodOption' } } }
              }
            }
          },
          '400': {
            description: 'Default payment method options cannot be modified.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: { defaultMethod: { value: { error: 'Default payment method options cannot be modified.' } } }
              }
            }
          },
          '404': {
            description: 'Payment method option not found.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: { missingMethod: { value: { error: 'Payment method option not found.' } } }
              }
            }
          }
        })
      },
      delete: {
        summary: 'Delete custom payment method option',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'paymentMethodOptionId',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: withUnauthorized({
          '200': {
            description: 'Payment method deleted',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { data: { type: 'object', properties: { deleted: { type: 'boolean', example: true } } } } }
              }
            }
          },
          '400': {
            description: 'Default or in-use payment method options cannot be deleted.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  inUseMethod: { value: { error: 'Payment method option is in use by existing expenses.' } },
                  defaultMethod: { value: { error: 'Default payment method options cannot be deleted.' } }
                }
              }
            }
          },
          '404': {
            description: 'Payment method option not found.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: { missingMethod: { value: { error: 'Payment method option not found.' } } }
              }
            }
          }
        })
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
