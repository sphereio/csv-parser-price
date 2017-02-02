import { createAuthMiddlewareForClientCredentialsFlow }
from '@commercetools/sdk-middleware-auth'
import { createClient } from '@commercetools/sdk-client'
import { createRequestBuilder } from '@commercetools/api-request-builder'
import { createHttpMiddleware } from '@commercetools/sdk-middleware-http'

import { exec } from 'child_process'
import fs from 'fs'
import tmp from 'tmp'
import CONSTANTS from '../src/constants'
import { version } from '../package.json'


const binPath = './bin/csvparserprice.js'

// TODO: replace with package call
const config = {
  host: CONSTANTS.host.auth,
  projectKey: process.env.CT_PROJECT_KEY,
  credentials: {
    clientId: process.env.CT_CLIENT_ID,
    clientSecret: process.env.CT_CLIENT_SECRET,
  },
}

const client = createClient({
  middlewares: [
    createAuthMiddlewareForClientCredentialsFlow(config),
    createHttpMiddleware({
      host: CONSTANTS.host.api,
    }),
  ],
})

test('CLI help flag', (done) => {
  exec(`${binPath} --help`, (error, stdout, stderr) => {
    expect(String(stdout).match(/help/)).toBeTruthy()
    expect(error && stderr).toBeFalsy()
    done()
  })
})

test('CLI version flag', (done) => {
  exec(`${binPath} --version`, (error, stdout, stderr) => {
    expect(stdout).toBe(`${version}\n`)
    expect(error && stderr).toBeFalsy()
    done()
  })
})

test('CLI takes input from file', (done) => {
  const csvFilePath = './test/helpers/simple-sample.csv'

  exec(`${binPath} -p ${config.projectKey} --inputFile ${csvFilePath}`,
    (error, stdout, stderr) => {
      expect(stdout.match(/prices/)).toBeTruthy()
      expect(error && stderr).toBeFalsy()
      done()
    },
  )
})

test('CLI writes output to file', (done) => {
  const csvFilePath = './test/helpers/simple-sample.csv'
  const jsonFilePath = tmp.fileSync().name

  // eslint-disable-next-line max-len
  exec(`${binPath} -p ${config.projectKey} -i ${csvFilePath} -o ${jsonFilePath}`,
    (cliError, stdout, stderr) => {
      expect(cliError && stderr).toBeFalsy()

      fs.readFile(jsonFilePath, { encoding: 'utf8' }, (error, data) => {
        expect(data.match(/prices/)).toBeTruthy()
        expect(error).toBeFalsy()
        done()
      })
    },
  )
})

test('CLI given a non-existant input file', (done) => {
  exec(`${binPath} -i nope.csv`, (error) => {
    expect(error).toBeTruthy()
    done()
  })
})

test('CLI exits on faulty CSV format', (done) => {
  const csvFilePath = './test/helpers/faulty-sample.csv'
  const jsonFilePath = tmp.fileSync().name

  // eslint-disable-next-line max-len
  exec(`${binPath} -p ${config.projectKey} -i ${csvFilePath} -o ${jsonFilePath}`,
    (error, stdout, stderr) => {
      expect(error.code).toBe(1)
      expect(stdout).toBeFalsy()
      expect(stderr.match(/Row length does not match headers/)).toBeTruthy()
      done()
    },
  )
})

test('CLI exits on parsing errors', (done) => {
  const csvFilePath = './test/helpers/missing-type-sample.csv'
  const jsonFilePath = tmp.fileSync().name

  // eslint-disable-next-line max-len
  exec(`${binPath} -p ${config.projectKey} -i ${csvFilePath} -o ${jsonFilePath}`,
    (error, stdout, stderr) => {
      expect(error.code).toBe(1)
      expect(stdout).toBeFalsy()
      expect(stderr.match(/No type with key .+ found/)).toBeTruthy()
      done()
    },
  )
})

describe('CLI handles API calls correctly', () => {
  beforeAll(() => {
    const customTypePayload = {
      key: 'custom-type',
      name: { nl: 'selwyn' },
      resourceTypeIds: ['product-price'],
      fieldDefinitions: [
        {
          type: { name: 'Boolean' },
          name: 'foo',
          label: { en: 'said the barman' },
          required: true,
        },
      ],
    }

    // Clean up and create new custom type
    return client.execute({
      uri: `/${config.projectKey}/types/key=${customTypePayload.key}?version=1`,
      method: 'DELETE',
    })
      // Ignore rejection, we want to create the type either way
      .catch(() => true)
      .then(() => client.execute({
        uri: createRequestBuilder().types.build({
          projectKey: process.env.CT_PROJECT_KEY,
        }),
        body: customTypePayload,
        method: 'POST',
      }))
  })

  test('CLI exits on type mapping errors', (done) => {
    const csvFilePath = './test/helpers/sample.csv'
    const jsonFilePath = tmp.fileSync().name

    // eslint-disable-next-line max-len
    exec(`${binPath} -p ${config.projectKey} -i ${csvFilePath} -o ${jsonFilePath}`,
      (error, stdout, stderr) => {
        expect(error.code).toBe(1)
        expect(stdout).toBeFalsy()
        expect(stderr.match(/row 2: custom-type.+ valid/)).toBeTruthy()
        done()
      },
    )
  })
})

test('CLI logs stack trace on verbose level', (done) => {
  const csvFilePath = './test/helpers/faulty-sample.csv'

  // eslint-disable-next-line max-len
  exec(`${binPath} -p ${config.projectKey} -i ${csvFilePath} --logLevel verbose`,
    (error, stdout, stderr) => {
      expect(error.code).toBe(1)
      expect(stdout).toBeFalsy()
      expect(stderr.match(/\.js:\d+:\d+/)).toBeTruthy()
      done()
    },
  )
})
