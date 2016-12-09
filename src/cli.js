import fs from 'fs'
import log from 'npmlog'
import PrettyError from 'pretty-error'
import yargs from 'yargs'

import CONSTANTS from './constants'
import CsvParserPrice from './main'
import getApiCredentials from './get-api-credentials'
import { version } from '../package.json'

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

  .option('version', {
    alias: 'v',
    type: 'boolean',
  })
  .version('version', 'Show version number.', () => version)

  .option('inputFile', {
    alias: 'i',
    default: 'stdin',
    describe: 'Path to input CSV file.',
  })
  .coerce('inputFile', (arg) => {
    if (arg !== 'stdin')
      return fs.createReadStream(String(arg))

    return process.stdin
  })

  .option('outputFile', {
    alias: 'o',
    default: 'stdout',
    describe: 'Path to output JSON file.',
  })
  .coerce('outputFile', (arg) => {
    if (arg !== 'stdout')
      return fs.createWriteStream(String(arg))

    // No output file given, log to file to not disturb stdout/stderr
    log.stream = fs.createWriteStream('csvparserprice.log')

    return process.stdout
  })

  .option('batchSize', {
    alias: 'b',
    default: CONSTANTS.standardOption.batchSize,
    describe: 'Number of CSV rows to handle simultaneously.',
  })

  .option('delimiter', {
    alias: 'd',
    default: CONSTANTS.standardOption.delimiter,
    describe: 'Used CSV delimiter.',
  })

  .option('strictMode', {
    alias: 's',
    default: CONSTANTS.standardOption.strictMode,
    describe: 'Parse CSV strictly.',
  })

  .option('projectKey', {
    alias: 'p',
    describe: 'API project key.',
    demand: true,
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

  .option('logLevel', {
    default: 'info',
    describe: 'Logging level: error, warn, info or verbose.',
  })
  .coerce('logLevel', (arg) => {
    log.level = arg
  })
  .argv

const errorHandler = (error) => {
  const errorFormatter = new PrettyError()
  let formattedError

  if (log.level === 'verbose')
    formattedError = errorFormatter.render(error)
  else
    formattedError = error.message

  process.stderr.write(formattedError)
  process.stderr.write('\n')
  log.error('', formattedError)
  process.exit(1)
}

getApiCredentials(args.projectKey, args.accessToken)
  .then(apiCredentials =>
    new CsvParserPrice(
      {
        config: apiCredentials,
        host: args.host,
        protocol: args.protocol,
        access_token: args.accessToken,
      },
      {
        error: errorHandler,
        warn: message => log.warn('', message),
        info: message => log.info('', message),
        verbose: message => log.verbose('', message),
      },
      {
        delimiter: args.delimiter,
      }
    )
  )
  .then((csvParserPrice) => {
    csvParserPrice.parse(args.inputFile, args.outputFile)
  })
