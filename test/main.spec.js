import fs from 'fs'
import path from 'path'
import sinon from 'sinon'
import { SphereClient } from 'sphere-node-sdk'
import StreamTest from 'streamtest'
import test from 'tape'
import PriceCsvParser from 'main'

import { mockPriceObj, mockCustomTypeDef } from './helpers/mock-data'
import CONSTANTS from '../src/constants'

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

const apiClientConfig = {
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
}

test('PriceCsvParser module is a class', (t) => {
  t.equal(typeof PriceCsvParser, 'function', 'PriceCsvParser is a class')

  t.end()
})

test(`PriceCsvParser
  should initialize default values`, (t) => {
  const priceCsvParser = new PriceCsvParser(logger, apiClientConfig)

  t.equal(
    priceCsvParser.client.constructor,
    SphereClient,
    'productType import module is an instanceof SphereClient'
  )

  t.equal(
    priceCsvParser.batchProcessing,
    CONSTANTS.standards.batchSize,
    'batchSize should be set to the standard value'
  )

  t.equal(
    priceCsvParser.delimiter,
    CONSTANTS.standards.delimiter,
    'delimiter should be set to the standard value'
  )

  t.equal(
    priceCsvParser.strictMode,
    CONSTANTS.standards.strictMode,
    'strictMode should be set to the standard value'
  )

  t.end()
})

test(`PriceCsvParser
  should throw when options is invalid`, (t) => {
  // eslint-disable-next-line no-new
  t.throws(() => { new PriceCsvParser(logger, {}) })
  t.end()
})

test(`PriceCsvParser::parse
  should accept a stream and output a stream`, (t) => {
  const priceCsvParser = new PriceCsvParser(logger, apiClientConfig)
  const readStream = fs.createReadStream(
    path.join(__dirname, 'helpers/sample.csv')
  )
  const outputStream = StreamTest['v2'].toText((err, result) => {
    const prices = JSON.parse(result).prices
    t.equal(prices.length, 2, 'All prices from the csv is parsed')
    t.ok(prices[0].sku, 'Sku exists on price object')
    t.end()
  })
  priceCsvParser.parse(readStream, outputStream)
})

test(`PriceCsvParser::processData
  should process object and build valid price object`, (t) => {
  const priceCsvParser = new PriceCsvParser(logger, apiClientConfig)
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
  const priceCsvParser = new PriceCsvParser(logger, apiClientConfig)
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
  const priceCsvParser = new PriceCsvParser(logger, apiClientConfig)
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
  const priceCsvParser = new PriceCsvParser(logger, apiClientConfig)
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
