import CsvParserPrice from 'main'
import fs from 'fs'
import path from 'path'
import sinon from 'sinon'
import StreamTest from 'streamtest'

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
  should initialize default values`, () => {
  const csvParserPrice = new CsvParserPrice(apiClientConfig)

  // logger
  expect(Object.keys(csvParserPrice.logger))
    .toEqual(['error', 'warn', 'info', 'verbose'])
  Object.keys(csvParserPrice.logger).forEach((key) => {
    expect(typeof csvParserPrice.logger[key]).toBe('function')
  })

  // config
  expect(csvParserPrice.batchSize).toBe(CONSTANTS.standardOption.batchSize)
})

describe('CsvParserPrice::parse', () => {
  test('should accept a stream and output a stream', (done) => {
    const csvParserPrice = new CsvParserPrice(apiClientConfig)
    const readStream = fs.createReadStream(
      path.join(__dirname, 'helpers/sample.csv')
    )

    sinon.stub(csvParserPrice, 'getCustomFieldDefinition').returns(
      Promise.resolve(customTypeSample)
    )

    const outputStream = StreamTest['v2'].toText((error, result) => {
      const prices = JSON.parse(result)
      expect(prices.length).toBe(2)
      expect(prices[0][CONSTANTS.header.sku]).toBeTruthy()
      done()
    })
    csvParserPrice.parse(readStream, outputStream)
  })

  test('should group prices by variants sku', (done) => {
    const csvParserPrice = new CsvParserPrice(apiClientConfig, logger)
    const readStream = fs.createReadStream(
      path.join(__dirname, 'helpers/sample.csv')
    )

    sinon.stub(csvParserPrice, 'getCustomFieldDefinition').returns(
      Promise.resolve(customTypeSample)
    )

    const outputStream = StreamTest['v2'].toText((error, result) => {
      const prices = JSON.parse(result)
      expect(prices.length).toBe(2)
      expect(prices[0].prices.length).toBe(2)
      expect(prices[1].prices.length).toBe(1)
      expect(prices[0][CONSTANTS.header.sku]).toBeTruthy()
      done()
    })
    csvParserPrice.parse(readStream, outputStream)
  })
})


describe('CsvParserPrice::transformPriceData', () => {
  test('should transform price values to the expected type', () => {
    const csvParserPrice = new CsvParserPrice(apiClientConfig, logger)
    const result = csvParserPrice.transformPriceData(priceSample())

    expect(result.value.centAmount).toBe(4200)
  })

  test('should process object and build valid price object', (done) => {
    const csvParserPrice = new CsvParserPrice(apiClientConfig, logger)

    sinon.stub(csvParserPrice, 'getCustomFieldDefinition').returns(
      Promise.resolve(customTypeSample)
    )

    csvParserPrice.transformCustomData(priceSample(), 2).then((result) => {
      expect(result.custom).toEqual({
        type: { id: '53 45 4c 57 59 4e 2e' },
        fields: {
          booleantype: true,
          localizedstringtype: { de: 'Merkel', nl: 'Selwyn' },
          moneytype: { centAmount: 1200, currencyCode: 'EUR' },
          numbertype: 12,
          settype: [ 1, 2, 3, 5 ],
          stringtype: 'nac',
        },
      })
      done()
    })
  })
})

describe('CsvParserPrice::renameHeaders', () => {
  test(`should rename customerGroup.groupName to customerGroup.id
    for compatibility with product price import module`, () => {
    const csvParserPrice = new CsvParserPrice(apiClientConfig, logger)
    const modifiedPriceSample = priceSample()
    delete modifiedPriceSample.customType
    delete modifiedPriceSample.customField
    delete modifiedPriceSample.value

    const result = csvParserPrice.renameHeaders(modifiedPriceSample)

    expect(result.customerGroup.groupName).toBeFalsy()
    expect(result.customerGroup.id).toBe('customer-group')
  })

  test(`should rename channel.key to channel.id
      for compatibility with product price import module`, () => {
    const csvParserPrice = new CsvParserPrice(apiClientConfig, logger)
    const modifiedPriceSample = priceSample()
    delete modifiedPriceSample.customType
    delete modifiedPriceSample.customField
    delete modifiedPriceSample.value

    const result = csvParserPrice.renameHeaders(modifiedPriceSample)

    expect(result.channel.key).toBeFalsy()
    expect(result.channel.id).toBe('my-channel')
  })
})

describe('CsvParserPrice::processCustomField', () => {
  test('should build custom object', (done) => {
    const csvParserPrice = new CsvParserPrice(apiClientConfig, logger)

    sinon.stub(csvParserPrice, 'getCustomFieldDefinition').returns(
      Promise.resolve(customTypeSample)
    )

    csvParserPrice.processCustomField(priceSample(), 2).then((result) => {
      expect(result.fields).toBeTruthy()
      expect(result.type).toBeTruthy()
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
      expect(result).toEqual(expected)
      done()
    })
  })

  test('should build report errors on data', (done) => {
    const csvParserPrice = new CsvParserPrice(apiClientConfig, logger)
    const modifiedPriceSample = priceSample()

    modifiedPriceSample.customField.settype = '1,\'2\',3,4'
    sinon.stub(csvParserPrice, 'getCustomFieldDefinition').returns(
      Promise.resolve(customTypeSample)
    )

    csvParserPrice.processCustomField(modifiedPriceSample, 2).then((result) => {
      done.fail()
      expect(result).toBeFalsy()
      done()
    }, (error) => {
      expect(error.length).toBe(1)
      expect(error[0].message)
      .toBe('[row 2: liqui 63 69 ty] - The number \'2\' isn\'t valid')
      done()
    })
  })
})

test(`CsvParserPrice::deleteMovedData
  should delete leftover data if present`, () => {
  const csvParserPrice = new CsvParserPrice(apiClientConfig, logger)

  const result = csvParserPrice.deleteMovedData(priceSample())

  expect(result.customField).toBeFalsy()
  expect(result.customType).toBeFalsy()
})
