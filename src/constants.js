const CONSTANTS = {
  field: {
    integer: new RegExp(/^-?\d+$/),
    money: new RegExp(/^([A-Z]{3}) (-?\d+)$/),
  },

  header: {
    sku: 'variant-sku',
  },

  standardOption: {
    batchSize: 100,
    delimiter: ',',
    strictMode: true,
  },
}

Object.freeze(CONSTANTS)

export default CONSTANTS
