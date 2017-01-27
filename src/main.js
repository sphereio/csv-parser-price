import csv from 'csv-parser'
import highland from 'highland'
import JSONStream from 'JSONStream'
import mapValues from 'lodash.mapvalues'
import memoize from 'lodash.memoize'
import npmlog from 'npmlog'
import { unflatten } from 'flat'

import { createAuthMiddlewareForClientCredentialsFlow }
  from '@commercetools/sdk-middleware-auth'
import { createClient } from '@commercetools/sdk-client'
import { createHttpMiddleware } from '@commercetools/sdk-middleware-http'
import { createRequestBuilder } from '@commercetools/api-request-builder'

import CONSTANTS from './constants'
import mapCustomFields from './map-custom-fields'

export default class CsvParserPrice {
  constructor (apiClientCredentials, logger, config = {}) {
    this.client = createClient({
      middlewares: [
        createAuthMiddlewareForClientCredentialsFlow(apiClientCredentials),
        createHttpMiddleware(),
      ],
    })

    this.logger = logger || {
      error: npmlog.error.bind(this, ''),
      warn: npmlog.warn.bind(this, ''),
      info: npmlog.info.bind(this, ''),
      verbose: npmlog.verbose.bind(this, ''),
    }

    this.config = config
    this.batchSize =
      this.config.batchSize || CONSTANTS.standardOption.batchSize
    this.delimiter =
      this.config.delimiter || CONSTANTS.standardOption.delimiter
    this.strictMode =
      this.config.strictMode || CONSTANTS.standardOption.strictMode
  }

  // Main function taking in stream of CSV prices streaming out JSON prices
  // parse :: Stream -> Stream
  parse (input, output) {
    this.logger.info('Starting conversion')
    let rowIndex = 1

    highland(input)
      // Parse CSV return each row as object
      .through(csv({
        separator: this.delimiter,
        strict: this.strictMode,
      }))
      // Sort by SKU so later when reducing prices we can easily group by SKU
      .sortBy((a, b) => a['variant-sku'].localeCompare(b['variant-sku']))
      // Limit amount of rows to be handled at the same time
      // Returns an array aka 'batch' of given rows
      .batch(this.batchSize)
      .stopOnError(error => this.logger.error(error))
      .doto(() => {
        this.logger.verbose(`Parsed row ${rowIndex}`)
        rowIndex += 1
      })
      // Flatten batch of rows
      .flatMap(highland)
      // Unflatten object keys with a dot to nested values
      .map(unflatten)
      .map(this.transformPriceData)
      .map(this.renameHeaders)
      .flatMap(data => highland(this.processData(data, rowIndex)))
      .doto(() => this.logger.verbose(`Converted row ${rowIndex}`))
      .stopOnError(error => this.logger.error(error))
      .reduce({ prices: [] }, this.mergeBySku)
      .doto((data) => {
        const numberOfPrices = Number(JSON.stringify(data.prices.length)) + 1
        this.logger.info(`Done with conversion of ${numberOfPrices} prices`)
      })
      .pipe(JSONStream.stringify(false))
      .pipe(output)
  }

  // Transform price values to the type the API expects
  // transformPriceData :: Object -> Object
  // eslint-disable-next-line class-methods-use-this
  transformPriceData (price) {
    return mapValues(price, (value) => {
      if (value.centAmount)
        return Object.assign({}, {
          centAmount: Number(value.centAmount),
        })

      return value
    })
  }

  // Rename names for compatibility with price import module
  // renameHeaders :: Object -> Object
  // eslint-disable-next-line class-methods-use-this
  renameHeaders (price) {
    const newPrice = Object.assign(price)

    // Rename groupName to ID
    if (newPrice.customerGroup && newPrice.customerGroup.groupName) {
      newPrice.customerGroup.id = newPrice.customerGroup.groupName
      delete newPrice.customerGroup.groupName
    }

    // Rename channel key to ID
    if (newPrice.channel && newPrice.channel.key) {
      newPrice.channel.id = newPrice.channel.key
      delete newPrice.channel.key
    }

    return newPrice
  }

  // Reduce iterator to merge price objects with the same SKU
  // mergeBySku :: (Object, Object) -> Object
  // eslint-disable-next-line class-methods-use-this
  mergeBySku (data, currentPrice) {
    const previousPrice = data.prices[data.prices.length - 1]

    if (previousPrice && previousPrice.sku === currentPrice.sku)
      previousPrice.prices.push(...currentPrice.prices)
    else
      data.prices.push(currentPrice)

    return data
  }

  // Fill in references and convert values to their expected type
  // processData :: (Object, Number) -> Promise -> Object
  processData (data, rowIndex) {
    return new Promise((resolve, reject) => {
      const price = {
        sku: data[CONSTANTS.header.sku],
        prices: [data],
      }

      if (data.customType) {
        this.logger.verbose('Found custom type')

        return this.processCustomField(data, rowIndex)
          .then((customTypeObj) => {
            data.custom = customTypeObj
            price.prices = [data]
            resolve(this.cleanOldData(price))
          })
          .catch(reject)
      }

      return resolve(this.cleanOldData(price))
    })
  }

  // Delete leftover data
  // cleanOldData :: Object -> Object
  // eslint-disable-next-line class-methods-use-this
  cleanOldData (data) {
    this.logger.verbose('Cleaning leftover data')

    const priceObj = data.prices[0]
    if (priceObj.customType)
      delete priceObj.customType
    if (priceObj.customField)
      delete priceObj.customField
    if (priceObj[CONSTANTS.header.sku])
      delete priceObj[CONSTANTS.header.sku]
    return data
  }

  // Convert custom type value to the expected native type
  // processCustomField :: (Object, Number) -> Promise -> Object
  processCustomField (data, rowIndex) {
    this.logger.verbose(`Found custom type at row ${rowIndex}`)

    return this.getCustomFieldDefinition(data.customType).then((customType) => {
      this.logger.info(`Got custom type ${customType}`)

      const customTypeObj = mapCustomFields.parse(
        data.customField, customType, rowIndex
      )
      if (customTypeObj.error.length)
        return Promise.reject(customTypeObj.error)

      return customTypeObj.data
    })
  }
}

// Easiest way to wrap the getCustomFieldDefinition in the memoize method
// getCustomFieldDefinition :: Function -> String -> Promise -> Object
CsvParserPrice.prototype.getCustomFieldDefinition = memoize(
  function _getCustomFieldDefinition (customTypeKey) {
    const getTypeByKeyUri = createRequestBuilder().types
      .where(`key = "${customTypeKey}"`)
      .build({ projectKey: process.env.CT_PROJECT_KEY })

    return this.client.execute({
      uri: getTypeByKeyUri,
      method: 'GET',
    })
      .then((response) => {
        if (response.body.count === 0)
          return Promise.reject(
            new Error(`No type with key '${customTypeKey}' found`)
          )

        return response.body.results[0]
      })
  }
)
