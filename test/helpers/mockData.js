exports.mockPriceObj = function mockPriceObj () {
  return {
    'variant-id': '123',
    'variant-sku': 'my-price',
    'variant-key': 'my-price-key',
    value: { currencyCode: 'EUR', centAmount: '4200' },
    country: 'DE',
    customerGroup: { groupName: 'customer-group' },
    channel: { key: 'my-channel' },
    validFrom: '2016-11-01T08:01:19+0000',
    validUntil: '2016-12-01T08:03:10+0000',
    customType: 'custom-type',
    customField: {
      foo: '12',
      bar: 'nac',
      current: 'true',
      name: { nl: 'Selwyn', de: 'Merkel' },
      status: 'Ready',
      price: 'EUR 1200',
      priceset: '1,2,3,5',
    },
  }
}

exports.mockCustomTypeDef = function mockCustomTypeDef () {
  return {
    id: '795962e6-c0cc-4b4d-84fc-7d8aaed390c0',
    key: 'custom-type',
    fieldDefinitions: [
      {
        name: 'bar',
        type: {
          name: 'String',
        },
      },
      {
        name: 'foo',
        type: {
          name: 'Number',
        },
      },
      {
        name: 'current',
        type: {
          name: 'Boolean',
        },
      },
      {
        name: 'name',
        type: {
          name: 'LocalizedString',
        },
      },
      {
        name: 'price',
        type: {
          name: 'Money',
        },
      },
      {
        name: 'priceset',
        type: {
          name: 'Set',
          elementType: {
            name: 'Number',
          },
        },
      },
    ],
  }
}
