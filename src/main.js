import JSONStream from 'JSONStream'
import _ from 'underscore'
import csv from 'csv-parser'
import { unflatten } from 'flat'
import highland from 'highland'
import { SphereClient } from 'sphere-node-sdk'

import CONSTANTS from './constants'
import MapCustomFields from './map-custom-fields'

export default class CsvParserPrice {
  constructor (logger, apiClientConfig, config = {}) {
    this.client = new SphereClient(apiClientConfig)
    this.encoding = 'utf-8'
    this.error = []
    this.logger = logger
    this.mapCustomFields = MapCustomFields()

    this.config = config
    this.batchProcessing =
      this.config.batchSize || CONSTANTS.standardOption.batchSize
    this.delimiter =
      this.config.delimiter || CONSTANTS.standardOption.delimiter
    this.strictMode =
      this.config.strictMode || CONSTANTS.standardOption.strictMode
  }

  parse (input, output) {
    this.logger.info('Starting convertion')
    let rowIndex = 1

    highland(input)
      .through(csv({
        separator: this.delimiter,
        strict: this.strictMode,
      }))
      .stopOnError(error => this.logger.error(error))
      .doto(() => {
        this.logger.verbose(`Parsed row ${rowIndex}`)
        rowIndex += 1
      })
      .map(unflatten)
      .flatMap(data => highland(this.processData(data, rowIndex)))
      .doto(() => this.logger.verbose(`Converted row ${rowIndex}`))
      .stopOnError(error => this.logger.error(error))
      .reduce({ prices: [] }, (a, b) => {
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
        if (a.prices.length) {
          const _price = _.find(a.prices, price => price.sku === b.sku)
          if (!_price)
            a.prices.push(b)
          else
            _price.prices.push(...b.prices)
        } else
          a.prices.push(b)
        return a
      })
      .doto((data) => {
        const numberOfPrices = Number(JSON.stringify(data.prices.length)) + 1
        this.logger.info(`Done with convertion of ${numberOfPrices} prices`)
      })
      .pipe(JSONStream.stringify(false))
      .pipe(output)
  }

  processData (data, rowIndex) {
    const _data = _.clone(data)
    return new Promise((resolve, reject) => {
      if (_data.value && _data.value.centAmount)
        _data.value.centAmount = parseInt(_data.value.centAmount, 10)

      // Rename groupName to ID for compatibility with price import module
      if (_data.customerGroup && _data.customerGroup.groupName) {
        _data.customerGroup.id = _data.customerGroup.groupName
        delete _data.customerGroup.groupName
      }

      // Rename channel key to ID for compatibility with price import module
      if (_data.channel && _data.channel.key) {
        _data.channel.id = _data.channel.key
        delete _data.channel.key
      }

      const price = {
        sku: _data[CONSTANTS.header.sku],
        prices: [_data],
      }

      if (data.customType) {
        this.logger.verbose('Found custom type')

        return this.processCustomFields(data, rowIndex)
          .then((customTypeObj) => {
            _data.custom = customTypeObj
            price.prices = [_data]
            resolve(this.cleanOldData(price))
          })
          .catch(reject)
      }

      return resolve(this.cleanOldData(price))
    })
  }

  // eslint-disable-next-line class-methods-use-this
  cleanOldData (data) {
    this.logger.warn('Cleaning leftover data')

    const priceObj = data.prices[0]
    if (priceObj.customType)
      delete priceObj.customType
    if (priceObj.customField)
      delete priceObj.customField
    if (priceObj['variant-id'])
      delete priceObj['variant-id']
    if (priceObj[CONSTANTS.header.sku])
      delete priceObj[CONSTANTS.header.sku]
    if (priceObj['variant-key'])
      delete priceObj['variant-key']
    return data
  }

  processCustomFields (data, rowIndex) {
    this.logger.verbose(`Found custom type at row ${rowIndex}`)

    return this.getCustomTypeDefinition(data.customType).then((result) => {
      this.logger.info(`Got custom type ${result.body}`)

      const customTypeDefinition = result.body
      const customTypeObj = this.mapCustomFields.parse(
        data.customField, customTypeDefinition, rowIndex
      )
      if (customTypeObj.error.length)
        return Promise.reject(customTypeObj.error)
      return customTypeObj.data
    })
  }
}

// Easiest way now to wrap the getCustomTypeDefinition in the memoize method
// - Abi
CsvParserPrice.prototype.getCustomTypeDefinition = _.memoize(
  function _getCustomTypeDefinition (customTypeKey) {
    return this.client.types.byKey(customTypeKey).fetch()
  }
)
