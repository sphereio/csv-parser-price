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
      .batch(this.batchSize)
      .stopOnError(error => this.logger.error(error))
      .doto(() => {
        this.logger.verbose(`Parsed row ${rowIndex}`)
        rowIndex += 1
      })
      .flatMap(highland)
      // Unflatten object keys with a dot to nested values
      .map(unflatten)
      .map(this.transformPriceData)
      .map(this.renameHeaders)
      .flatMap(data => highland(this.transformCustomData(data, rowIndex)))
      .map(this.deleteMovedData)
      .doto(() => this.logger.verbose(`Converted row ${rowIndex}`))
      .stopOnError(error => this.logger.error(error))
      .reduce([], this.mergeBySku)
      .doto((data) => {
        const numberOfPrices = Number(JSON.stringify(data.length)) + 1
        this.logger.info(`Done with conversion of ${numberOfPrices} prices`)
      })
      .pipe(JSONStream.stringify(false))
      .pipe(output)
  }

  // Transform price values to the type the API expects
  // eslint-disable-next-line class-methods-use-this
  transformPriceData (price) {
    return mapValues(price, (value) => {
      if (value.centAmount)
        return {
          centAmount: Number(value.centAmount),
        }

      return value
    })
  }

  transformCustomData (price, rowIndex) {
    if (price.customType) {
      this.logger.verbose('Found custom type')

      return this.processCustomField(price, rowIndex)
        // Using arrow without body trips up babel transform-object-rest-spread
        // eslint-disable-next-line arrow-body-style
        .then((customTypeObj) => {
          return {
            ...price,
            custom: customTypeObj,
          }
        })
    }

    return Promise.resolve(price)
  }

  // Rename for compatibility with price import module
  // eslint-disable-next-line class-methods-use-this
  renameHeaders (price) {
    const newPrice = Object.assign(price)

    if (newPrice.customerGroup && newPrice.customerGroup.groupName) {
      newPrice.customerGroup.id = newPrice.customerGroup.groupName
      delete newPrice.customerGroup.groupName
    }

    if (newPrice.channel && newPrice.channel.key) {
      newPrice.channel.id = newPrice.channel.key
      delete newPrice.channel.key
    }

    return newPrice
  }

  // eslint-disable-next-line class-methods-use-this
  mergeBySku (prices, currentPrice) {
    const previousPrice = prices[prices.length - 1]
    const sku = CONSTANTS.header.sku

    if (previousPrice && previousPrice[sku] === currentPrice[sku])
      previousPrice.prices.push(currentPrice)
    else
      prices.push({
        [sku]: currentPrice[sku],
        prices: [currentPrice],
      })

    return prices
  }

  // eslint-disable-next-line class-methods-use-this
  deleteMovedData (price) {
    const newPrice = Object.assign(price)

    if (newPrice.customField)
      delete newPrice.customField
    if (newPrice.customType)
      delete newPrice.customType

    return newPrice
  }

  // Convert custom type value to the expected native type
  processCustomField (data, rowIndex) {
    this.logger.verbose(`Found custom type at row ${rowIndex}`)

    return this.getCustomTypeDefinition(data.customType).then((customType) => {
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

// Easiest way to wrap the getCustomTypeDefinition in the memoize method
CsvParserPrice.prototype.getCustomTypeDefinition = memoize(
  function _getCustomTypeDefinition (customTypeKey) {
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
