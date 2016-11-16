'use strict'

import fs from 'fs'
import cli from 'args'

import CONS from './constants'
import getApiCredentials from './get-api-credentials'
import PriceCsvParser from './main'

process.title = 'csvparserprice'

const args = cli
  .option(
    ['i', 'inputFile'],
    'File to get CSV from.',
    process.stdin,
    (arg) => {
      if (typeof arg === 'string')
        return fs.createReadStream(String(arg))

      return arg
    }
  )
  .option(
    ['o', 'outputFile'],
    'File to output JSON to.',
    process.stdout,
    (arg) => {
      if (typeof arg === 'string')
        return fs.createWriteStream(String(arg))

      return arg
    }
  )
  .option(
    'delimiter',
    'The delimiter that is used in the csv.',
    CONS.standards.delimiter
  )
  .option(
    'host',
    'HTTP client host parameter to connect to the API.'
  )
  .option(
    'protocol',
    'HTTP client protocol parameter to connect to the API.'
  )
  .option(
    'accessToken',
    'HTTP client access token to authenticate to the API.'
  )
  .parse(process.argv)

const priceCsvParser = new PriceCsvParser(
  {
    trace: process.stdout,
    debug: process.stdout,
    info: process.stdout,
    error: process.stderr,
  },
  {
    sphereClientConfig: {
      config: getApiCredentials('CSV_PARSER_PRICE'),
      host: args.host,
      protocol: args.protocol,
      access_token: args.accessToken,
    },
  },
  {
    delimiter: args.delimiter,
  }
)

priceCsvParser.parse(args.inputFile, args.outputFile, process.stderr)
