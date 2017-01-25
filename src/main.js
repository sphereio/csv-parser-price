import csv from 'csv-parser'
import highland from 'highland'
import JSONStream from 'JSONStream'
import memoize from 'lodash.memoize'
import npmlog from 'npmlog'
import { unflatten } from 'flat'

import { createAuthMiddlewareForClientCredentialsFlow } from '@commercetools/sdk-middleware-auth'
import { createClient } from '@commercetools/sdk-client'
import { createHttpMiddleware } from '@commercetools/sdk-middleware-http'
import { createRequestBuilder } from '@commercetools/api-request-builder'

import CONSTANTS from './constants'
import mapCustomFields from './map-custom-fields'
import pkg from '../package.json'

export default class CsvParserPrice {
  constructor (apiClientCredentials, logger, config = {}) {
    this.client = createClient({
      middlewares: [
        createAuthMiddlewareForClientCredentialsFlow(apiClientCredentials),
        createHttpMiddleware({}),
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
      // Sort by SKU so later when reducing prices we don't have to search
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
      .flatMap(data => highland(this.processData(data, rowIndex)))
      .doto(() => this.logger.verbose(`Converted row ${rowIndex}`))
      .stopOnError(error => this.logger.error(error))
      .reduce({ prices: [] }, (data, currentPrice) => {
        /*
          This reduces all price objects to one object that is acceptable
          by the price-importer in product-import.
          It also groups all price object by sku
          Each price object looks like this:
          {
            "sku": "testing",
            prices: [{
              value: {
                "centAmount": 3400,
                "currencyCode": "EUR"
              }
            }]
          }
          {
            "sku": "testing",
            prices: [{
              value: {
                "centAmount": 300,
                "currencyCode": "EUR"
              }
            }]
          }
          Resulting object:
          {
            "prices": [
              {
                "sku": "testing",
                prices: [{
                  value: {
                    "centAmount": 3400,
                    "currencyCode": "EUR"
                  }
                }, {
                  value: {
                    "centAmount": 300,
                    "currencyCode": "EUR"
                  }
                }]
              }
            ]
          }
        */

        const previousPrice = data.prices[data.prices.length - 1]

        if (previousPrice && previousPrice.sku === currentPrice.sku)
          previousPrice.prices.push(...currentPrice.prices)
        else
          data.prices.push(currentPrice)

        return data
      })
      .doto((data) => {
        const numberOfPrices = Number(JSON.stringify(data.prices.length)) + 1
        this.logger.info(`Done with conversion of ${numberOfPrices} prices`)
      })
      .pipe(JSONStream.stringify(false))
      .pipe(output)
  }

  processData (data, rowIndex) {
    return new Promise((resolve, reject) => {
      if (data.value && data.value.centAmount)
        data.value.centAmount = parseInt(data.value.centAmount, 10)

      // Rename groupName to ID for compatibility with price import module
      if (data.customerGroup && data.customerGroup.groupName) {
        data.customerGroup.id = data.customerGroup.groupName
        delete data.customerGroup.groupName
      }

      // Rename channel key to ID for compatibility with price import module
      if (data.channel && data.channel.key) {
        data.channel.id = data.channel.key
        delete data.channel.key
      }

      const price = {
        sku: data[CONSTANTS.header.sku],
        prices: [data],
      }

      if (data.customType) {
        this.logger.verbose('Found custom type')

        return this.processCustomFields(data, rowIndex)
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

  processCustomFields (data, rowIndex) {
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
      // TODO: replace with .byKey
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
