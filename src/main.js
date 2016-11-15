import JSONStream from 'JSONStream'
import _ from 'underscore'
import csv from 'csv-parser'
import { unflatten } from 'flat'
import highland from 'highland'
import { SphereClient } from 'sphere-node-sdk'

import CONS from './constants'
import MapCustomFields from './mapCustomFields'

export default class PriceCsvParser {
  constructor (logger, { sphereClientConfig = {} }, config) {
    this.client = new SphereClient(sphereClientConfig)
    this.logger = logger
    this.encoding = 'utf-8'
    this.batchProcessing = '10'
    this.mapCustomFields = MapCustomFields()
    this.error = []
    this.config = config
  }

  parse (input, output, errors) {
    let rowIndex = 1
    errors.write('hey')

    highland(input)
      .through(csv({
        separator: this.config.delimiter || CONS.standards.delimiter,
      }))
      .doto(() => (rowIndex += 1))
      .map(unflatten)
      .flatMap(data => highland(this.processData(data, rowIndex)))
      .pipe(JSONStream.stringify('{ "prices": [\n', '\n,\n', '\n]}\n'))
      .pipe(output)
  }

  processData (data, rowIndex) {
    const _data = _.clone(data)
    return new Promise((resolve) => {
      const price = {
        sku: _data[CONS.HEADER_SKU],
        prices: [_data],
      }

      if (data.customType)
        return this.processCustomFields(
          data,
          rowIndex
        ).then((customTypeObj) => {
          _data.custom = customTypeObj
          price.prices = [_data]
          resolve(price)
        })
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
