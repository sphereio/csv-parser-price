import fs from 'fs'
import npmlog from 'npmlog'
import PrettyError from 'pretty-error'
import yargs from 'yargs'

import CONSTANTS from './constants'
import CsvParserPrice from './main'
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
    npmlog.stream = fs.createWriteStream('csvparserprice.log')

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

  // TODO: define this better
  .option('host', {
    describe: 'HTTP client host parameter.',
  })

  .option('accessToken', {
    describe: 'HTTP client access token.',
  })

  .option('logLevel', {
    default: 'info',
    describe: 'Logging level: error, warn, info or verbose.',
  })
  .coerce('logLevel', (arg) => {
    npmlog.level = arg
  })
  .argv

const logError = (error) => {
  const errorFormatter = new PrettyError()
  let formattedError

  if (npmlog.level === 'verbose')
    formattedError = errorFormatter.render(error)
  else
    formattedError = error.message

  process.stderr.write(formattedError)
  process.stderr.write('\n')
  npmlog.error('', formattedError)
}

const errorHandler = (errors) => {
  if (Array.isArray(errors))
    errors.forEach(logError)
  else
    logError(errors)

  process.exit(1)
}

// TODO: where is the accessToken gone?
const csvParserPrice = new CsvParserPrice(
  {
      projectKey: process.env.CT_PROJECT_KEY,
      credentials: {
        clientId: process.env.CT_CLIENT_ID,
        clientSecret: process.env.CT_CLIENT_SECRET,
      }
  },
  {
    error: errorHandler,
    warn: npmlog.warn.bind(this, ''),
    info: npmlog.info.bind(this, ''),
    verbose: npmlog.verbose.bind(this, ''),
  },
  {
    delimiter: args.delimiter,
  }
)

csvParserPrice.parse(args.inputFile, args.outputFile)
