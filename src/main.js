import JSONStream from 'JSONStream'
import _ from 'underscore'
import csv from 'csv-parser'
import { unflatten } from 'flat'
import highland from 'highland'
import { SphereClient } from 'sphere-node-sdk'

import CONS from './constants'
import MapCustomFields from './map-custom-fields'

export default class PriceCsvParser {
  constructor (logger, apiClientConfig = {}, config = {}) {
    this.client = new SphereClient(apiClientConfig)
    this.encoding = 'utf-8'
    this.error = []
    this.logger = logger
    this.mapCustomFields = MapCustomFields()

    this.config = config
    this.batchProcessing = this.config.batchSize || CONS.standards.batchSize
    this.delimiter = this.config.delimiter || CONS.standards.delimiter
    this.strictMode = this.config.strictMode || CONS.standards.strictMode
  }

  parse (input, output) {
    let rowIndex = 1

    highland(input)
      .through(csv({
        separator: this.delimiter,
        strict: this.strictMode,
      }))
      .stopOnError(error => output.emit('error', error))
      .doto(() => (rowIndex += 1))
      .map(unflatten)
      .flatMap(data => highland(this.processData(data, rowIndex)))
      .stopOnError(error => output.emit('error', error))
      .pipe(JSONStream.stringify('{ "prices": [\n', '\n,\n', '\n]}\n'))
      .pipe(output)
  }

  processData (data, rowIndex) {
    const _data = _.clone(data)
    return new Promise((resolve, reject) => {
      const price = {
        sku: _data[CONS.HEADER_SKU],
        prices: [_data],
      }

      if (data.customType)
        return this.processCustomFields(
          data,
          rowIndex
        )
        .then((customTypeObj) => {
          _data.custom = customTypeObj
          price.prices = [_data]
          resolve(price)
        })
        .catch(reject)

      return resolve(price)
    })
  }

  getCustomTypeDefinition (customTypeKey) {
    return this.client.types.byKey(customTypeKey).fetch()
  }

  processCustomFields (data, rowIndex) {
    return this.getCustomTypeDefinition(data.customType).then((result) => {
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
