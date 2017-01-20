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
  }
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
  const outputStream = StreamTest['v2'].toText((err, result) => {
    const prices = JSON.parse(result).prices
    t.equal(prices.length, 2, 'All prices from the csv is parsed')
    t.ok(prices[0].sku, 'Sku exists on price object')
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
  const outputStream = StreamTest['v2'].toText((err, result) => {
    const prices = JSON.parse(result).prices
    t.equal(prices.length, 2, 'All prices from the csv is parsed')
    t.equal(prices[0].prices.length, 2, 'price with similar skus are grouped')
    t.equal(prices[1].prices.length, 1, 'price with similar skus are grouped')
    t.ok(prices[0].sku, 'Sku exists on price object')
    t.end()
  })
  csvParserPrice.parse(readStream, outputStream)
})

test(`CsvParserPrice::processData
  should process object and build valid price object`, (t) => {
  const csvParserPrice = new CsvParserPrice(apiClientConfig, logger)

  sinon.stub(csvParserPrice, 'getCustomTypeDefinition').returns(
    Promise.resolve({ body: customTypeSample })
  )

  csvParserPrice.processData(priceSample(), 2).then((result) => {
    t.ok(result)
    t.ok(result.sku)
    t.equal(result.prices.length, 1, 'One price object is built')
    const price = result.prices[0]
    t.equal(price.country, 'DE', 'Price country parsed successfully')
    t.deepEqual(price.value, {
      currencyCode: 'EUR',
      centAmount: 4200,
    }, 'Money object built successfully')
    t.notOk(price.customType, 'customType field is removed')
    t.notOk(price.customField, 'customField field is removed')
    t.notOk(price[CONSTANTS.header.sku], 'variant-sku field is removed')
    t.deepEqual(
      price.custom,
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

test(`CsvParserPrice::processData
  should process object and build valid price object`, (t) => {
  const csvParserPrice = new CsvParserPrice(apiClientConfig, logger)
  const modifiedPriceSample = priceSample()
  delete modifiedPriceSample.customType
  delete modifiedPriceSample.customField

  sinon.stub(csvParserPrice, 'getCustomTypeDefinition').returns(
    Promise.resolve({ body: customTypeSample })
  )

  csvParserPrice.processData(modifiedPriceSample, 2).then((result) => {
    t.ok(result)
    t.ok(result.sku)
    t.equal(result.prices.length, 1, 'One price object is built')
    const price = result.prices[0]
    t.equal(price.country, 'DE', 'Price country parsed successfully')
    t.deepEqual(price.value, {
      currencyCode: 'EUR',
      centAmount: 4200,
    }, 'Money object built successfully')
    t.notOk(price.custom, 'Custom fields obj should not be present')
    t.end()
  })
})

test(`CsvParserPrice::processData
  should process object and build valid price object
  if centAmount is not present`, (t) => {
  const csvParserPrice = new CsvParserPrice(apiClientConfig, logger)
  const modifiedPriceSample = priceSample()
  delete modifiedPriceSample.customType
  delete modifiedPriceSample.customField
  delete modifiedPriceSample.value

  sinon.stub(csvParserPrice, 'getCustomTypeDefinition').returns(
    Promise.resolve({ body: customTypeSample })
  )

  csvParserPrice.processData(modifiedPriceSample, 2).then((result) => {
    t.ok(result)
    t.ok(result.sku)
    t.equal(result.prices.length, 1, 'One price object is built')
    const price = result.prices[0]
    t.equal(price.country, 'DE', 'Price country parsed successfully')
    t.notOk(price.value)
    t.notOk(price.custom, 'Custom fields obj should not be present')
    t.end()
  })
})

test(`CsvParserPrice::processData
  should rename customerGroup.groupName to customerGroup.id
  for compatibility with product price import module`, (t) => {
  const csvParserPrice = new CsvParserPrice(apiClientConfig, logger)
  const modifiedPriceSample = priceSample()
  delete modifiedPriceSample.customType
  delete modifiedPriceSample.customField
  delete modifiedPriceSample.value

  csvParserPrice.processData(modifiedPriceSample, 2).then((result) => {
    t.false(result.prices[0].customerGroup.groupName, 'Group name is deleted')
    t.equal(
      result.prices[0].customerGroup.id, 'customer-group',
      'Customer group ID has group name value'
    )
    t.end()
  })
})

test(`CsvParserPrice::processData
  should rename channel.key to channel.id
  for compatibility with product price import module`, (t) => {
  const csvParserPrice = new CsvParserPrice(apiClientConfig, logger)
  const modifiedPriceSample = priceSample()
  delete modifiedPriceSample.customType
  delete modifiedPriceSample.customField
  delete modifiedPriceSample.value

  csvParserPrice.processData(modifiedPriceSample, 2).then((result) => {
    t.false(result.prices[0].channel.key, 'Channel key is deleted')
    t.equal(
      result.prices[0].channel.id, 'my-channel',
      'Channel ID has channel key value'
    )
    t.end()
  })
})

test(`CsvParserPrice::processCustomFields
  should build custom object`, (t) => {
  const csvParserPrice = new CsvParserPrice(apiClientConfig, logger)

  sinon.stub(csvParserPrice, 'getCustomTypeDefinition').returns(
    Promise.resolve({ body: customTypeSample })
  )

  csvParserPrice.processCustomFields(priceSample(), 2).then((result) => {
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

test(`CsvParserPrice::processCustomFields
  should build report errors on data`, (t) => {
  const csvParserPrice = new CsvParserPrice(apiClientConfig, logger)
  const modifiedPriceSample = priceSample()

  modifiedPriceSample.customField.settype = '1,\'2\',3,4'
  sinon.stub(csvParserPrice, 'getCustomTypeDefinition').returns(
    Promise.resolve({ body: customTypeSample })
  )

  csvParserPrice.processCustomFields(modifiedPriceSample, 2).then((result) => {
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

test(`CsvParserPrice::cleanOldData
  should delete old data if present`, (t) => {
  const csvParserPrice = new CsvParserPrice(apiClientConfig, logger)
  const modifiedPriceSample = priceSample()
  delete modifiedPriceSample[CONSTANTS.header.sku]
  const refinedPrice = {
    sku: modifiedPriceSample[CONSTANTS.header.sku],
    prices: [modifiedPriceSample],
  }
  t.ok(refinedPrice.prices[0].customField, 'customField field is not cleaned')
  t.ok(refinedPrice.prices[0].customType, 'customType field is not cleaned')
  const result = csvParserPrice.cleanOldData(refinedPrice)
  t.notOk(result.prices[0].customType, 'customType field is removed')
  t.notOk(result.prices[0].customField, 'customField field is removed')
  t.notOk(
    result.prices[0][CONSTANTS.header.sku],
    'variant-sku field is removed'
  )
  t.end()
})
