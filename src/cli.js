'use strict'

import fs from 'fs'
import yargs from 'yargs'

import CONSTANTS from './constants'
import getApiCredentials from './get-api-credentials'
import PriceCsvParser from './main'

process.title = 'csvparserprice'

const args = yargs
  .usage(
    `\n
Usage: $0 [options]
Convert commercetools price CSV data to JSON.`
  )
  .showHelpOnFail(false)

  .option('help', {
    alias: 'h',
  })
  .help('help', 'Show help text.')

  .option('inputFile', {
    alias: 'i',
    default: 'stdin',
    describe: 'Path to CSV file.',
  })
  .coerce('inputFile', (arg) => {
    if (arg !== 'stdin')
      return fs.createReadStream(String(arg))

    return process.stdin
  })

  .option('outputFile', {
    alias: 'o',
    default: 'stdout',
    describe: 'Input CSV file.',
  })
  .coerce('outputFile', (arg) => {
    if (arg !== 'stdout')
      return fs.createWriteStream(String(arg))

    return process.stdout
  })

  .option('delimiter', {
    alias: 'd',
    default: CONSTANTS.standards.delimiter,
    describe: 'Used CSV delimiter.',
  })

  .option('strictMode', {
    alias: 's',
    default: CONSTANTS.standards.strictMode,
    describe: 'Parse CSV strictly.',
  })

  .option('projectKey', {
    alias: 'p',
    describe: 'API project key.',
  })

  .option('host', {
    describe: 'HTTP client host parameter.',
  })

  .option('protocol', {
    describe: 'HTTP client protocol parameter.',
  })

  .option('accessToken', {
    describe: 'HTTP client access token.',
  })
  .argv

// Handle an error by logging and exiting the process
args.outputFile
  .on('error', (error) => {
    process.stderr.write(error.message)
    process.exit(1)
  })

getApiCredentials(args.projectKey, args.accessToken)
  .then(apiCredentials =>
    new PriceCsvParser(
      {
        trace: process.stdout,
        debug: process.stdout,
        info: process.stdout,
        error: process.stderr,
      },
      {
        apiClientConfig: {
          config: apiCredentials,
          host: args.host,
          protocol: args.protocol,
          access_token: args.accessToken,
        },
      },
      {
        delimiter: args.delimiter,
      }
    )
  )
  .then((priceCsvParser) => {
    priceCsvParser.parse(args.inputFile, args.outputFile)
  })
