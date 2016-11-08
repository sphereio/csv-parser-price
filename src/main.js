import fs from 'fs'
import csv from 'csv-parser'
import JSONStream from 'JSONStream'
import highland from 'highland'
import _ from 'lodash'
import { unflatten } from 'flat'
import transform from 'stream-transform'
import { SphereClient } from 'sphere-node-sdk'
import CONS from './constants'

var stream = require('stream'),
    util = require('util');
let count = 0
function StringifyStream(options) {
  if (!(this instanceof StringifyStream))
    return new StringifyStream(options);

  options = options || {};
  options.objectMode = true;

  stream.Transform.call(this,options);
}

util.inherits(StringifyStream, stream.Transform)

StringifyStream.prototype._transform = function(d,e,callback) {
  console.log()
  console.log()
  console.log(count++)
  this.push(JSON.stringify(d,null,2));
  callback();
};

export default class PriceCsvParser {
  constructor (logger, { sphereClientConfig = {} }) {
    this.client = new SphereClient(sphereClientConfig)
    this.logger = logger
    this.encoding = 'utf-8'
    this.batchProcessing = '10'
    this.error = []
  }

  parse (filePath) {
    let count = 1
    highland(
      fs.createReadStream(filePath, { encoding: this.encoding })
    )
    .through(csv())
    .map(data => unflatten(data))
    .flatMap(data => highland(this.processData(data)))
    .pipe(StringifyStream())
    .pipe(process.stdout)
    // .on('data', function(err, data) {
    //   console.log(err, count++)
    // })
    // highland(
    // )
    // .batch(this.batchProcessing)
    // .pipe(transform((chunk, cb) => {
    //   return this.processData(chunk, cb)
    // }, { parallel: 1 }))
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

  mapData (data) {
    const price = data
    price.value.centAmount = parseInt(price.value.centAmount, 10)

    this.getCustomTypeDefinition(price.customType).then((result) => {
      const customTypeDefinition = result.body
      this.mapCustomFields(price)
    })
  }

  // mapFieldTypes: ({fieldDefinitions, typeDefinitionKey, rowIndex, key, value, langHeader}) ->
  //   result = undefined
  //   _.each fieldDefinitions, (fieldDefinition) =>
  //     if fieldDefinition.name is key
  //       switch fieldDefinition.type.name
  //         when 'Number' then result = @mapNumber value,typeDefinitionKey,rowIndex
  //         when 'Boolean' then result = @mapBoolean value,typeDefinitionKey,rowIndex
  //         when 'Money' then result = @mapMoney value,typeDefinitionKey,rowIndex
  //         when 'LocalizedString' then result = @mapLocalizedString value, typeDefinitionKey, rowIndex,langHeader
  //         when 'Set' then result = @mapSet value,typeDefinitionKey,rowIndex,fieldDefinition.type.elementType
  //         else result = value
  //   result
  mapCustomFields (price, customType) {
    price.custom = {
      type: {
        id: customType.id,
      },
      fields: {},
    }
    _.each(price.customField, (value, key) => {
      _.each(customType.fieldDefinitions, (fieldDefinition) => {
        if (fieldDefinition.name === key) {
          switch (fieldDefinition.type.name) {
            case 'Number':
              price.custom.fields[key] = parseInt()
              break;
          }
        }
      })
    })
  }
}


function mapCustomFields (data) {

}
