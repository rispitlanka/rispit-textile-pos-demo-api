import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'POS System API',
      version: '1.0.0',
      description: 'A comprehensive Point of Sale system API with authentication, product management, sales tracking, and reporting capabilities.',
      contact: {
        name: 'Rispit',
        email: 'info@rispit.com'
      },
      license: {
        name: 'ISC'
      }
    },
    servers: [
      {
        url: 'http://localhost:8080',
        description: 'Development server'
      },
      {
        url: 'https://rispit-pos-demo-api.onrender.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID'
            },
            username: {
              type: 'string',
              description: 'Username'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email address'
            },
            fullName: {
              type: 'string',
              description: 'Full name'
            },
            role: {
              type: 'string',
              enum: ['admin', 'cashier'],
              description: 'User role'
            },
            phone: {
              type: 'string',
              description: 'Phone number'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether user is active'
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              description: 'Last login timestamp'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Update timestamp'
            }
          }
        },
        Product: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Product ID'
            },
            name: {
              type: 'string',
              description: 'Product name'
            },
            description: {
              type: 'string',
              description: 'Product description'
            },
            price: {
              type: 'number',
              description: 'Product price'
            },
            cost: {
              type: 'number',
              description: 'Product cost'
            },
            stock: {
              type: 'number',
              description: 'Current stock quantity'
            },
            minStock: {
              type: 'number',
              description: 'Minimum stock level'
            },
            category: {
              type: 'string',
              description: 'Category ID'
            },
            barcode: {
              type: 'string',
              description: 'Product barcode'
            },
            images: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Product images URLs'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether product is active'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Update timestamp'
            }
          }
        },
        Category: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Category ID'
            },
            name: {
              type: 'string',
              description: 'Category name'
            },
            description: {
              type: 'string',
              description: 'Category description'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether category is active'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Update timestamp'
            }
          }
        },
        Customer: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Customer ID'
            },
            name: {
              type: 'string',
              description: 'Customer name'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Customer email'
            },
            phone: {
              type: 'string',
              description: 'Customer phone'
            },
            address: {
              type: 'string',
              description: 'Customer address'
            },
            loyaltyPoints: {
              type: 'number',
              description: 'Loyalty points'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether customer is active'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Update timestamp'
            }
          }
        },
        Sale: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Sale ID'
            },
            receiptNumber: {
              type: 'string',
              description: 'Receipt number'
            },
            customer: {
              type: 'string',
              description: 'Customer ID'
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  product: {
                    type: 'string',
                    description: 'Product ID'
                  },
                  productName: {
                    type: 'string',
                    description: 'Product name'
                  },
                  quantity: {
                    type: 'number',
                    description: 'Quantity sold'
                  },
                  price: {
                    type: 'number',
                    description: 'Price per unit'
                  },
                  total: {
                    type: 'number',
                    description: 'Total for this item'
                  },
                  variationCombinationId: {
                    type: 'string',
                    description: 'Variation combination ID (optional)'
                  },
                  variations: {
                    type: 'object',
                    description: 'Variation details',
                    additionalProperties: {
                      type: 'string'
                    }
                  },
                  displayName: {
                    type: 'string',
                    description: 'Formatted display name with variations'
                  },
                  hasVariations: {
                    type: 'boolean',
                    description: 'Whether this item has variations'
                  },
                  variationDetails: {
                    type: 'object',
                    description: 'Detailed variation information (only in single sale retrieval)',
                    properties: {
                      combinationId: {
                        type: 'string',
                        description: 'Variation combination ID'
                      },
                      combinationName: {
                        type: 'string',
                        description: 'Variation combination name'
                      },
                      sku: {
                        type: 'string',
                        description: 'SKU for this variation'
                      },
                      price: {
                        type: 'number',
                        description: 'Price for this variation'
                      },
                      stock: {
                        type: 'number',
                        description: 'Current stock for this variation'
                      },
                      isActive: {
                        type: 'boolean',
                        description: 'Whether this variation is active'
                      },
                      variations: {
                        type: 'object',
                        description: 'Variation key-value pairs',
                        additionalProperties: {
                          type: 'string'
                        }
                      },
                      variationTypes: {
                        type: 'array',
                        description: 'Available variation types for the product',
                        items: {
                          type: 'object',
                          properties: {
                            name: {
                              type: 'string',
                              description: 'Variation type name'
                            },
                            values: {
                              type: 'array',
                              items: {
                                type: 'string'
                              },
                              description: 'Available values for this variation type'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            subtotal: {
              type: 'number',
              description: 'Subtotal amount'
            },
            tax: {
              type: 'number',
              description: 'Tax amount'
            },
            discount: {
              type: 'number',
              description: 'Discount amount'
            },
            total: {
              type: 'number',
              description: 'Total amount'
            },
            paymentMethod: {
              type: 'string',
              enum: ['cash', 'card', 'mobile'],
              description: 'Payment method'
            },
            cashier: {
              type: 'string',
              description: 'Cashier ID'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            }
          }
        },
        Expense: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Expense ID'
            },
            description: {
              type: 'string',
              description: 'Expense description'
            },
            amount: {
              type: 'number',
              description: 'Expense amount'
            },
            category: {
              type: 'string',
              description: 'Expense category ID'
            },
            date: {
              type: 'string',
              format: 'date',
              description: 'Expense date'
            },
            receipt: {
              type: 'string',
              description: 'Receipt image URL'
            },
            createdBy: {
              type: 'string',
              description: 'User who created the expense'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            details: {
              type: 'string',
              description: 'Error details'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Success message'
            },
            data: {
              type: 'object',
              description: 'Response data'
            }
          }
        },
        ProductVariation: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Variation ID'
            },
            name: {
              type: 'string',
              description: 'Variation name (e.g., Size, Color)'
            },
            type: {
              type: 'string',
              enum: ['dropdown', 'radio', 'checkbox'],
              description: 'Variation input type'
            },
            values: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: {
                    type: 'string'
                  },
                  value: {
                    type: 'string',
                    description: 'Variation value (e.g., Large, Red)'
                  },
                  priceAdjustment: {
                    type: 'number',
                    description: 'Price adjustment for this value'
                  },
                  isActive: {
                    type: 'boolean',
                    description: 'Whether this value is active'
                  }
                }
              }
            },
            isActive: {
              type: 'boolean',
              description: 'Whether variation is active'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Update timestamp'
            }
          }
        },
        ExpenseCategory: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Category ID'
            },
            name: {
              type: 'string',
              description: 'Category name'
            },
            description: {
              type: 'string',
              description: 'Category description'
            },
            color: {
              type: 'string',
              description: 'Category color code'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether category is active'
            },
            order: {
              type: 'number',
              description: 'Display order'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Update timestamp'
            }
          }
        },
        Settings: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Settings ID'
            },
            storeName: {
              type: 'string',
              description: 'Store name'
            },
            storeAddress: {
              type: 'string',
              description: 'Store address'
            },
            storePhone: {
              type: 'string',
              description: 'Store phone number'
            },
            storeEmail: {
              type: 'string',
              description: 'Store email'
            },
            currency: {
              type: 'string',
              description: 'Default currency'
            },
            taxRate: {
              type: 'number',
              description: 'Default tax rate'
            },
            receiptFooter: {
              type: 'string',
              description: 'Receipt footer text'
            },
            logo: {
              type: 'string',
              description: 'Store logo URL'
            },
            theme: {
              type: 'object',
              properties: {
                primaryColor: {
                  type: 'string'
                },
                secondaryColor: {
                  type: 'string'
                },
                accentColor: {
                  type: 'string'
                }
              }
            },
            notifications: {
              type: 'object',
              properties: {
                lowStockAlert: {
                  type: 'boolean'
                },
                dailyReportEmail: {
                  type: 'boolean'
                },
                backupReminder: {
                  type: 'boolean'
                }
              }
            },
            loyaltyProgram: {
              type: 'object',
              properties: {
                enabled: {
                  type: 'boolean'
                },
                pointsPerDollar: {
                  type: 'number'
                },
                rewardThreshold: {
                  type: 'number'
                }
              }
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Update timestamp'
            }
          }
        },
        Return: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Return ID'
            },
            returnNumber: {
              type: 'string',
              description: 'Unique return number'
            },
            originalSale: {
              type: 'string',
              description: 'Original sale ID'
            },
            customer: {
              type: 'string',
              description: 'Customer ID'
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  product: {
                    type: 'string',
                    description: 'Product ID'
                  },
                  productName: {
                    type: 'string',
                    description: 'Product name'
                  },
                  quantity: {
                    type: 'number',
                    description: 'Quantity returned'
                  },
                  reason: {
                    type: 'string',
                    description: 'Reason for return'
                  },
                  condition: {
                    type: 'string',
                    enum: ['new', 'used', 'damaged'],
                    description: 'Product condition'
                  },
                  refundAmount: {
                    type: 'number',
                    description: 'Refund amount for this item'
                  },
                  variationCombinationId: {
                    type: 'string',
                    description: 'Variation combination ID (optional)'
                  },
                  variations: {
                    type: 'object',
                    description: 'Variation details',
                    additionalProperties: {
                      type: 'string'
                    }
                  },
                  displayName: {
                    type: 'string',
                    description: 'Formatted display name with variations'
                  },
                  hasVariations: {
                    type: 'boolean',
                    description: 'Whether this item has variations'
                  },
                  variationDetails: {
                    type: 'object',
                    description: 'Detailed variation information',
                    properties: {
                      combinationId: {
                        type: 'string',
                        description: 'Variation combination ID'
                      },
                      combinationName: {
                        type: 'string',
                        description: 'Variation combination name'
                      },
                      sku: {
                        type: 'string',
                        description: 'SKU for this variation'
                      },
                      price: {
                        type: 'number',
                        description: 'Price for this variation'
                      },
                      stock: {
                        type: 'number',
                        description: 'Current stock for this variation'
                      },
                      isActive: {
                        type: 'boolean',
                        description: 'Whether this variation is active'
                      },
                      variations: {
                        type: 'object',
                        description: 'Variation key-value pairs',
                        additionalProperties: {
                          type: 'string'
                        }
                      },
                      variationTypes: {
                        type: 'array',
                        description: 'Available variation types for the product',
                        items: {
                          type: 'object',
                          properties: {
                            name: {
                              type: 'string',
                              description: 'Variation type name'
                            },
                            values: {
                              type: 'array',
                              items: {
                                type: 'string'
                              },
                              description: 'Available values for this variation type'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            totalRefund: {
              type: 'number',
              description: 'Total refund amount'
            },
            refundMethod: {
              type: 'string',
              enum: ['cash', 'card', 'store_credit'],
              description: 'Refund method'
            },
            status: {
              type: 'string',
              enum: ['pending', 'approved', 'rejected', 'completed'],
              description: 'Return status'
            },
            processedBy: {
              type: 'string',
              description: 'Staff member who processed the return'
            },
            notes: {
              type: 'string',
              description: 'Additional notes'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Update timestamp'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './routes/*.js',
    './controllers/*.js',
    './models/*.js',
    './server.js'
  ]
};

const specs = swaggerJSDoc(options);

export { specs, swaggerUi };
