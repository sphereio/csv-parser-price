import CsvParserPrice from 'main'
import fs from 'fs'
import path from 'path'
import sinon from 'sinon'
import StreamTest from 'streamtest'
import test from 'tape'

import CONSTANTS from '../src/constants'
import priceSample from './helpers/price-sample'
import customTypeSample from './helpers/custom-type-sample.json'

const logger = {
  error: () => {},
  warn: () => {},
  info: () => {},
  verbose: () => {},
}

// TODO: replace with package call (sdk-middleware-auth-password)
const apiClientConfig = {
  projectKey: process.env.CT_PROJECT_KEY,
  credentials: {
    clientId: process.env.CT_CLIENT_ID,
    clientSecret: process.env.CT_CLIENT_SECRET,
  },
}

test(`CsvParserPrice
  should initialize default values`, (t) => {
  const csvParserPrice = new CsvParserPrice(apiClientConfig)

  // logger
  t.deepEqual(
    Object.keys(csvParserPrice.logger),
    ['error', 'warn', 'info', 'verbose'],
    'logger should have expected keys'
  )
  Object.keys(csvParserPrice.logger).forEach((key) => {
    t.equal(typeof csvParserPrice.logger[key], 'function')
  })

  // config
  t.equal(
    csvParserPrice.batchSize,
    CONSTANTS.standardOption.batchSize,
    'parser option should be set to the standard value'
  )

  t.end()
})

test(`CsvParserPrice::parse
  should accept a stream and output a stream`, (t) => {
  const csvParserPrice = new CsvParserPrice(apiClientConfig)
  const readStream = fs.createReadStream(
    path.join(__dirname, 'helpers/sample.csv')
  )

  sinon.stub(csvParserPrice, 'getCustomFieldDefinition').returns(
    Promise.resolve(customTypeSample)
  )

  const outputStream = StreamTest['v2'].toText((error, result) => {
    const prices = JSON.parse(result)
    t.equal(prices.length, 2, 'All prices from the csv are parsed')
    t.ok(prices[0][CONSTANTS.header.sku], 'Sku exists on price object')
    t.end()
  })
  csvParserPrice.parse(readStream, outputStream)
})

test(`CsvParserPrice::parse
  should group prices by variants sku`, (t) => {
  const csvParserPrice = new CsvParserPrice(apiClientConfig, logger)
  const readStream = fs.createReadStream(
    path.join(__dirname, 'helpers/sample.csv')
  )

  sinon.stub(csvParserPrice, 'getCustomFieldDefinition').returns(
    Promise.resolve(customTypeSample)
  )

  const outputStream = StreamTest['v2'].toText((error, result) => {
    const prices = JSON.parse(result)
    t.equal(prices.length, 2, 'All prices from the csv is parsed')
    t.equal(prices[0].prices.length, 2, 'price with similar skus are grouped')
    t.equal(prices[1].prices.length, 1, 'price with similar skus are grouped')
    t.ok(prices[0][CONSTANTS.header.sku], 'Sku exists on price object')
    t.end()
  })
  csvParserPrice.parse(readStream, outputStream)
})

test(`CsvParserPrice::transformPriceData
  should transform price values to the expected type`, (t) => {
  const csvParserPrice = new CsvParserPrice(apiClientConfig, logger)
  const result = csvParserPrice.transformPriceData(priceSample())

  t.equal(result.value.centAmount, 4200)
  t.end()
})

test(`CsvParserPrice::transformCustomData
  should process object and build valid price object`, (t) => {
  const csvParserPrice = new CsvParserPrice(apiClientConfig, logger)

  sinon.stub(csvParserPrice, 'getCustomFieldDefinition').returns(
    Promise.resolve(customTypeSample)
  )

  csvParserPrice.transformCustomData(priceSample(), 2).then((result) => {
    t.deepEqual(
      result.custom,
      {
        type: { id: '53 45 4c 57 59 4e 2e' },
        fields: {
          booleantype: true,
          localizedstringtype: { de: 'Merkel', nl: 'Selwyn' },
          moneytype: { centAmount: 1200, currencyCode: 'EUR' },
          numbertype: 12,
          settype: [ 1, 2, 3, 5 ],
          stringtype: 'nac',
        },
      },
      'Price custom fields object is built')
    t.end()
  })
})

test(`CsvParserPrice::renameHeaders
  should rename customerGroup.groupName to customerGroup.id
  for compatibility with product price import module`, (t) => {
  const csvParserPrice = new CsvParserPrice(apiClientConfig, logger)
  const modifiedPriceSample = priceSample()
  delete modifiedPriceSample.customType
  delete modifiedPriceSample.customField
  delete modifiedPriceSample.value

  const result = csvParserPrice.renameHeaders(modifiedPriceSample)

  t.false(result.customerGroup.groupName, 'Group name is deleted')
  t.equal(
    result.customerGroup.id, 'customer-group',
    'Customer group ID has group name value'
  )
  t.end()
})

test(`CsvParserPrice::renameHeaders
  should rename channel.key to channel.id
  for compatibility with product price import module`, (t) => {
  const csvParserPrice = new CsvParserPrice(apiClientConfig, logger)
  const modifiedPriceSample = priceSample()
  delete modifiedPriceSample.customType
  delete modifiedPriceSample.customField
  delete modifiedPriceSample.value

  const result = csvParserPrice.renameHeaders(modifiedPriceSample)

  t.false(result.channel.key, 'Channel key is deleted')
  t.equal(
    result.channel.id, 'my-channel',
    'Channel ID has channel key value'
  )
  t.end()
})

test(`CsvParserPrice::processCustomField
  should build custom object`, (t) => {
  const csvParserPrice = new CsvParserPrice(apiClientConfig, logger)

  sinon.stub(csvParserPrice, 'getCustomFieldDefinition').returns(
    Promise.resolve(customTypeSample)
  )

  csvParserPrice.processCustomField(priceSample(), 2).then((result) => {
    t.ok(result.fields, 'Custom fields object is present')
    t.ok(result.type, 'CustomObject is present')
    const expected = {
      type: {
        id: '53 45 4c 57 59 4e 2e',
      },
      fields: {
        booleantype: true,
        localizedstringtype: { de: 'Merkel', nl: 'Selwyn' },
        moneytype: { centAmount: 1200, currencyCode: 'EUR' },
        numbertype: 12,
        settype: [ 1, 2, 3, 5 ],
        stringtype: 'nac',
      },
    }
    t.deepEqual(result, expected)
    t.end()
  })
})

test(`CsvParserPrice::processCustomField
  should build report errors on data`, (t) => {
  const csvParserPrice = new CsvParserPrice(apiClientConfig, logger)
  const modifiedPriceSample = priceSample()

  modifiedPriceSample.customField.settype = '1,\'2\',3,4'
  sinon.stub(csvParserPrice, 'getCustomFieldDefinition').returns(
    Promise.resolve(customTypeSample)
  )

  csvParserPrice.processCustomField(modifiedPriceSample, 2).then((result) => {
    t.fail()
    t.notOk(result)
    t.end()
  }, (error) => {
    t.equal(error.length, 1, 'Errors with data are reported')
    t.equal(
      error[0].message,
      '[row 2: liqui 63 69 ty] - The number \'2\' isn\'t valid'
    )
    t.end()
  })
})

test(`CsvParserPrice::deleteMovedData
  should delete leftover data if present`, (t) => {
  const csvParserPrice = new CsvParserPrice(apiClientConfig, logger)

  const result = csvParserPrice.deleteMovedData(priceSample())

  t.notOk(result.customField, 'removed customField')
  t.notOk(result.customType, 'removed customField')
  t.end()
})
