import test from 'tape'
import sinon from 'sinon'
import { SphereClient } from 'sphere-node-sdk'
import PriceCsvParser from 'main'
import { mockPriceObj, mockCustomTypeDef } from './helpers/mockData'

const logger = {
  trace: process.stdout,
  debug: process.stdout,
  info: process.stdout,
  error: process.stderr,
}

let PROJECT_KEY

if (process.env.CI === 'true')
  PROJECT_KEY = process.env.SPHERE_PROJECT_KEY
else
  PROJECT_KEY = process.env.npm_config_projectkey

const options = {
  sphereClientConfig: {
    config: {
      project_key: PROJECT_KEY,
      client_id: '*********',
      client_secret: '*********',
    },
    rest: {
      config: {},
      GET: (endpoint, callback) => {
        callback(null, { statusCode: 200 }, { results: [] })
      },
      POST: (endpoint, payload, callback) => {
        callback(null, { statusCode: 200 })
      },
      PUT: () => {},
      DELETE: () => (/* endpoint, callback */) => {},
      PAGED: () => (/* endpoint, callback */) => {},
      _preRequest: () => {},
      _doRequest: () => {},
    },
  },
}

test('PriceCsvParser module is a class', (t) => {
  t.equal(typeof PriceCsvParser, 'function', 'PriceCsvParser is a class')

  t.end()
})

test(`PriceCsvParser
  should initialize default values`, (t) => {
  const priceCsvParser = new PriceCsvParser(logger, options)
  const expected = SphereClient
  const actual = priceCsvParser.client.constructor

  t.equal(
    actual,
    expected,
    'productType import module is an instanceof SphereClient'
  )
  t.end()
})

// test(`PriceCsvParser
//   should parse csv file`, (t) => {
//   const priceCsvParser = new PriceCsvParser(logger, options)
//   priceCsvParser.parse('output.csv')
//   t.end()
// })

test(`PriceCsvParser::processData
  should process object and build valid price object`, (t) => {
  const priceCsvParser = new PriceCsvParser(logger, options)
  const _mockPriceObj = mockPriceObj()
  const _mockCustomTypeDef = mockCustomTypeDef()
  sinon.stub(priceCsvParser, 'getCustomTypeDefinition').returns(
    Promise.resolve({ body: _mockCustomTypeDef })
  )
  priceCsvParser.processData(_mockPriceObj, 2).then((result) => {
    t.ok(result)
    t.ok(result.sku)
    t.equal(result.prices.length, 1, 'One price object is built')
    const price = result.prices[0]
    t.equal(price.country, 'DE', 'Price country parsed successfully')
    t.deepEqual(price.value, {
      currencyCode: 'EUR',
      centAmount: '4200',
    }, 'Money object built successfully')
    t.deepEqual(price.custom, {
      type: { id: '795962e6-c0cc-4b4d-84fc-7d8aaed390c0' },
      fields: {
        foo: 12,
        bar: 'nac',
        current: true,
        name: { nl: 'Selwyn', de: 'Merkel' },
        price: { currencyCode: 'EUR', centAmount: 1200 },
        priceset: [ 1, 2, 3, 5 ],
      },
    }, 'Price custom fields object is built')
    t.end()
  })
})

test(`PriceCsvParser::processData
  should process object and build valid price object`, (t) => {
  const priceCsvParser = new PriceCsvParser(logger, options)
  const _mockPriceObj = mockPriceObj()
  delete _mockPriceObj.customType
  delete _mockPriceObj.customField
  const _mockCustomTypeDef = mockCustomTypeDef()
  sinon.stub(priceCsvParser, 'getCustomTypeDefinition').returns(
    Promise.resolve({ body: _mockCustomTypeDef })
  )
  priceCsvParser.processData(_mockPriceObj, 2).then((result) => {
    t.ok(result)
    t.ok(result.sku)
    t.equal(result.prices.length, 1, 'One price object is built')
    const price = result.prices[0]
    t.equal(price.country, 'DE', 'Price country parsed successfully')
    t.deepEqual(price.value, {
      currencyCode: 'EUR',
      centAmount: '4200',
    }, 'Money object built successfully')
    t.notOk(price.custom, 'Custom fields obj should not be present')
    t.end()
  })
})

test(`PriceCsvParser::processCustomFields
  should build custom object`, (t) => {
  const priceCsvParser = new PriceCsvParser(logger, options)
  const _mockPriceObj = mockPriceObj()
  const _mockCustomTypeDef = mockCustomTypeDef()
  sinon.stub(priceCsvParser, 'getCustomTypeDefinition').returns(
    Promise.resolve({ body: _mockCustomTypeDef })
  )
  priceCsvParser.processCustomFields(_mockPriceObj, 2).then((result) => {
    t.ok(result.fields, 'Custom fields object is present')
    t.ok(result.type, 'CustomObject is present')
    const expected = {
      type: {
        id: '795962e6-c0cc-4b4d-84fc-7d8aaed390c0',
      },
      fields: {
        foo: 12,
        bar: 'nac',
        current: true,
        name: { nl: 'Selwyn', de: 'Merkel' },
        price: { currencyCode: 'EUR', centAmount: 1200 },
        priceset: [ 1, 2, 3, 5 ],
      },
    }
    t.deepEqual(result, expected)
    t.end()
  })
})

test(`PriceCsvParser::processCustomFields
  should build report errors on data`, (t) => {
  const priceCsvParser = new PriceCsvParser(logger, options)
  const _mockPriceObj = mockPriceObj()
  const _mockCustomTypeDef = mockCustomTypeDef()
  _mockPriceObj.customField.priceset = '1,\'2\',3,4'
  sinon.stub(priceCsvParser, 'getCustomTypeDefinition').returns(
    Promise.resolve({ body: _mockCustomTypeDef })
  )
  priceCsvParser.processCustomFields(_mockPriceObj, 2).then((result) => {
    t.fail()
    t.notOk(result)
    t.end()
  }, (error) => {
    t.equal(error.length, 1, 'Errors with data are reported')
    t.equal(error[0], '[row 2: custom-type] - The number \'2\' isn\'t valid')
    t.end()
  })
})
