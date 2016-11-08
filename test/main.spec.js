import test from 'tape'
import { SphereClient } from 'sphere-node-sdk'
import PriceCsvParser from 'main'

/* eslint-disable no-console */
const logger = {
  trace: console.log,
  debug: console.log,
  info: console.log,
  error: console.error,
}
/* eslint-enable no-console */

let PROJECT_KEY

if (process.env.CI === 'true')
  PROJECT_KEY = process.env.SPHERE_PROJECT_KEY
else
  PROJECT_KEY = process.env.npm_config_projectkey

const options = {
  sphereClientConfig: {
    config: {
      project_key: PROJECT_KEY,
      client_id: '*********',
      client_secret: '*********',
    },
    rest: {
      config: {},
      GET: (endpoint, callback) => {
        callback(null, { statusCode: 200 }, { results: [] })
      },
      POST: (endpoint, payload, callback) => {
        callback(null, { statusCode: 200 })
      },
      PUT: () => {},
      DELETE: () => (/* endpoint, callback */) => {},
      PAGED: () => (/* endpoint, callback */) => {},
      _preRequest: () => {},
      _doRequest: () => {},
    },
  },
}

test('PriceCsvParser module is a class', (t) => {
  t.equal(typeof PriceCsvParser, 'function', 'PriceCsvParser is a class')

  t.end()
})

test(`PriceCsvParser
  should initialize default values`, (t) => {
  const priceCsvParser = new PriceCsvParser(logger, options)
  const expected = SphereClient
  const actual = priceCsvParser.client.constructor

  t.equal(
    actual,
    expected,
    'productType import module is an instanceof SphereClient'
  )
  t.end()
})

test(`PriceCsvParser
  should parse csv file`, (t) => {
  const priceCsvParser = new PriceCsvParser(logger, options)
  priceCsvParser.parse('output.csv')
  t.end()
})
