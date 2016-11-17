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
    ['d', 'delimiter'],
    'The delimiter that is used in the csv.',
    CONS.standards.delimiter
  )
  .option(
    ['p', 'projectKey'],
    'The project key from the API.'
  )
  .option(
    'host',
    'HTTP client host parameter to connect to the API.'
  )
  // .option(
  //   'protocol',
  //   'HTTP client protocol parameter to connect to the API.'
  // )
  .option(
    'accessToken',
    'HTTP client access token to authenticate to the API.'
  )
  .parse(process.argv)

// Handle an error by logging and exiting the process
args.outputFile
  .on('error', (error) => {
    process.stderr.write(error.message)
    process.exit(1)
  })

getApiCredentials(args.projectKey, args.accessToken)
  .then((sphereCredentials) => {
    return new PriceCsvParser(
      {
        trace: process.stdout,
        debug: process.stdout,
        info: process.stdout,
        error: process.stderr,
      },
      {
        sphereClientConfig: {
          config: sphereCredentials,
          host: args.host,
          protocol: args.protocol,
          access_token: args.accessToken,
        },
      },
      {
        delimiter: args.delimiter,
      }
    )
  })
  .then((priceCsvParser) => {
    priceCsvParser.parse(args.inputFile, args.outputFile)
  })
