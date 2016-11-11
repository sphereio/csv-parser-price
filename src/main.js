import fs from 'fs'
import stream from 'stream'
import util from 'util'

import _ from 'lodash'
import csv from 'csv-parser'
import { unflatten } from 'flat'
import highland from 'highland'
import JSONStream from 'JSONStream'
import { SphereClient } from 'sphere-node-sdk'
import transform from 'stream-transform'

import CONS from './constants'

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
    this.error = []
  }

  parse (filePath) {
    let rowIndex = 1

    highland(fs.createReadStream(filePath, { encoding: this.encoding }))
      .through(csv())
      .doto(() => rowIndex += 1)
      .map(unflatten)
      .pipe(StringifyStream())
      .pipe(process.stdout)
  }

  processData (data) {
    return new Promise((resolve, reject) => {
      const price = {
        sku: data[CONS.HEADER_SKU],
        prices: [data],
      }
      resolve(price)
    })
  }

  static getCustomTypeDefinition (customTypeKey) {
    return _.memoize(this.client.type.byKey(customTypeKey).fetch())
  }

  processCustomFields (data) {
    this.getCustomTypeDefinition(price.customType).then((result) => {
      const customTypeDefinition = result.body
      this.mapCustomFields(price)
    })
  }
}
