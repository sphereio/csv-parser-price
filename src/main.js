import fs from 'fs'
import stream from 'stream'
import util from 'util'

import _ from 'underscore'
import csv from 'csv-parser'
import { unflatten } from 'flat'
import highland from 'highland'
import { SphereClient } from 'sphere-node-sdk'

import CONS from './constants'
import MapCustomFields from './mapCustomFields'

function StringifyStream (options) {
  if (!(this instanceof StringifyStream))
    return new StringifyStream(options)

  options = options || {}
  options.objectMode = true

  stream.Transform.call(this, options)
}
util.inherits(StringifyStream, stream.Transform)
StringifyStream.prototype._transform = function (data, error, callback) {
  this.push(JSON.stringify(data, null, 2))
  callback()
}

export default class PriceCsvParser {
  constructor (logger, { sphereClientConfig = {} }) {
    this.client = new SphereClient(sphereClientConfig)
    this.logger = logger
    this.encoding = 'utf-8'
    this.batchProcessing = '10'
    this.mapCustomFields = MapCustomFields()
    this.error = []
  }

  parse (filePath) {
    let rowIndex = 1

    highland(fs.createReadStream(filePath, { encoding: this.encoding }))
      .through(csv())
      .doto(() => rowIndex += 1)
      .map(unflatten)
      .flatMap(data => highland(this.processData(data, rowIndex)))
      .stopOnError(e => console.log(e, '======='))
      .pipe(StringifyStream())
      .pipe(process.stdout)
  }

  processData (data, rowIndex) {
    const _data = _.clone(data)
    return new Promise((resolve) => {
      const price = {
        sku: _data[CONS.HEADER_SKU],
      }

      this.processCustomFields(data, rowIndex).then((customTypeObj) => {
        _data.custom = customTypeObj
        price.prices = [_data]
        resolve(price)
      })
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
