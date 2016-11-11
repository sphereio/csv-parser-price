#!/usr/bin/env node
process.title = 'csvparserprice';
'use strict';

import fs from 'fs'

import args from 'args'
import PriceCsvParser from './main.js'

const logger = {
  trace: process.stdout,
  debug: process.stdout,
  info: process.stdout,
  error: process.stderr,
}
const options = {
  sphereClientConfig: {
    config: {
      project_key: 'selwyn-forgery',
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
const priceCsvParser = new PriceCsvParser(logger, options)

args
  .option(['i', 'input'], 'File to get CSV from.', process.stdin)
  .option(['o', 'output'], 'File to output JSON to.', process.stdout)

const flags = args.parse(process.argv)

console.log(flags.output);
const outputFile = fs.createWriteStream(flags.output)

priceCsvParser.parse(process.stdin, outputFile)
