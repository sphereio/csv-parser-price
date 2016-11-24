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

Object.keys(CONSTANTS).forEach((key) => {
  Object.freeze(CONSTANTS[key])
})

export default CONSTANTS
