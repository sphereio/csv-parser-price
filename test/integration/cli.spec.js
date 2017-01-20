import { exec } from 'child_process'
import fs from 'fs'
import test from 'tape'
import tmp from 'tmp'
import { version } from '../../package.json'

import { createAuthMiddlewareForClientCredentialsFlow } from '@commercetools/sdk-middleware-auth'
import { createClient } from '@commercetools/sdk-client'
import { createRequestBuilder } from '@commercetools/api-request-builder'
import { createHttpMiddleware } from '@commercetools/sdk-middleware-http'

const binPath = './bin/csvparserprice.js'

// TODO: replace with package call
const apiClientCredentials = {
  projectKey: process.env.CT_PROJECT_KEY,
  credentials: {
    clientId: process.env.CT_CLIENT_ID,
    clientSecret: process.env.CT_CLIENT_SECRET,
  }
}

// TODO: replace with package call
const getApiClient = createClient({
  middlewares: [
    createAuthMiddlewareForClientCredentialsFlow(apiClientCredentials),
    createHttpMiddleware(),
  ],
})

test('CLI help flag', (t) => {
  exec(`${binPath} --help`, (error, stdout, stderr) => {
    t.true(String(stdout).match(/help/), 'outputs help text')
    t.false(error && stderr, 'returns no error')
    t.end()
  })
})

test('CLI version flag', (t) => {
  exec(`${binPath} --version`, (error, stdout, stderr) => {
    t.equal(stdout, `${version}\n`, 'outputs current version number')
    t.false(error && stderr, 'returns no error')
    t.end()
  })
})

test('CLI takes input from file', (t) => {
  const csvFilePath = './test/helpers/simple-sample.csv'

  exec(`${binPath} -p ${apiClientCredentials.projectKey} --inputFile ${csvFilePath}`,
    (error, stdout, stderr) => {
      t.true(stdout.match(/prices/), 'outputs data including \'prices\'')
      t.false(error && stderr, 'returns no error')
      t.end()
    }
  )
})

test('CLI writes output to file', (t) => {
  const csvFilePath = './test/helpers/simple-sample.csv'
  const jsonFilePath = tmp.fileSync().name

  exec(`${binPath} -p ${apiClientCredentials.projectKey} -i ${csvFilePath} -o ${jsonFilePath}`,
    (cliError, stdout, stderr) => {
      t.false(cliError && stderr, 'returns no CLI error')

      fs.readFile(jsonFilePath, { encoding: 'utf8' }, (error, data) => {
        t.true(data.match(/prices/), 'writes data including \'prices\'')
        t.false(error, 'returns no FS error')
        t.end()
      })
    }
  )
})

test('CLI given a non-existant input file', (t) => {
  exec(`${binPath} -i nope.csv`, (error) => {
    t.true(error, 'returns error')
    t.end()
  })
})

test('CLI exits on faulty CSV format', (t) => {
  const csvFilePath = './test/helpers/faulty-sample.csv'
  const jsonFilePath = tmp.fileSync().name

  exec(`${binPath} -p ${apiClientCredentials.projectKey} -i ${csvFilePath} -o ${jsonFilePath}`,
    (error, stdout, stderr) => {
      t.equal(error.code, 1, 'returns process error exit code')
      t.false(stdout, 'returns no stdout data')
      t.true(
        stderr.match(/Row length does not match headers/),
        'returns CSV parsing error on stderr'
      )
      t.end()
    }
  )
})

test.only('CLI exits on parsing errors', (t) => {
  const csvFilePath = './test/helpers/missing-type-sample.csv'
  const jsonFilePath = tmp.fileSync().name

  exec(`${binPath} -p ${apiClientCredentials.projectKey} -i ${csvFilePath} -o ${jsonFilePath}`,
    (error, stdout, stderr) => {
      t.equal(error.code, 1, 'returns process error exit code')
      t.false(stdout, 'returns no stdout data')
      t.true(
        stderr.match(/types\/key=.+ not found/),
        'returns SDK error on stderr')
      t.end()
    }
  )
})

// TODO: fix the getApiClient and deletion of type
test('CLI exits on type mapping errors', (t) => {
  const csvFilePath = './test/helpers/sample.csv'
  const jsonFilePath = tmp.fileSync().name

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

  const getTypeByKeyUri = createRequestBuilder().types
    // TODO: replace with .byKey
    .where('key = "custom-type"')
    .build({ projectKey: process.env.CT_PROJECT_KEY })

  getApiClient(apiClientCredentials.projectKey)
    // Clean up and create new custom type
    .then(client =>
      // this.client.execute({
      //   uri: getTypeByKeyUri,
      //   method: 'GET',
      // })
      client.types.byKey('custom-type').delete(1)
        // Ignore rejection, we want to create the type either way
        .catch(() => true)
        .then(() => client.types.create(customTypePayload))
    )
    .then(() => {
      exec(`${binPath} -p ${apiClientCredentials.projectKey} -i ${csvFilePath} -o ${jsonFilePath}`,
        (error, stdout, stderr) => {
          t.equal(error.code, 1, 'returns process error exit code')
          t.false(stdout, 'returns no stdout data')
          t.true(
            stderr.match(/row 2: custom-type.+ valid/),
            'returns mapping error on stderr')
          t.end()
        }
        )
    })
})

test('CLI logs stack trace on verbose level', (t) => {
  const csvFilePath = './test/helpers/missing-type-sample.csv'

  exec(`${binPath} -p ${apiClientCredentials.projectKey} -i ${csvFilePath} --logLevel verbose`,
    (error, stdout, stderr) => {
      t.equal(error.code, 1, 'returns process error exit code')
      t.false(stdout, 'returns no stdout data')
      t.true(
        stderr.match(/process._tickCallback/),
        'returns stack trace error on stderr')
      t.end()
    }
  )
})
