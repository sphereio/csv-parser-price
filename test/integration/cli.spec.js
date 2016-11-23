import fs from 'fs'
import test from 'tape'
import tmp from 'tmp'
import { exec } from 'child_process'

const binPath = './bin/csvparserprice.js'

let PROJECT_KEY
if (process.env.CI === 'true')
  PROJECT_KEY = process.env.SPHERE_PROJECT_KEY
else
  PROJECT_KEY = process.env.npm_config_projectkey

test('CLI help flag', (t) => {
  exec(`${binPath} --help`, (error, stdout, stderr) => {
    t.true(String(stdout).match(/help/), 'outputs help text')
    t.false(error && stderr, 'returns no error')
    t.end()
  })
})

test('CLI takes input from file', (t) => {
  const csvFilePath = './test/helpers/simple-sample.csv'

  exec(`${binPath} -p ${PROJECT_KEY} --inputFile ${csvFilePath}`,
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

  exec(`${binPath} -p ${PROJECT_KEY} -i ${csvFilePath} -o ${jsonFilePath}`,
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

  exec(`${binPath} -i ${csvFilePath} -p ${PROJECT_KEY}`,
    (error, stdout, stderr) => {
      t.equal(error.code, 1, 'returns process error exit code')
      t.false(stdout, 'returns no stdout data')
      t.equal(
        stderr,
        'Row length does not match headers',
        'returns CSV parsing error on stderr'
      )
      t.end()
    }
  )
})

test('CLI exits on parsing errors', (t) => {
  const csvFilePath = './test/helpers/sample.csv'

  exec(`${binPath} -i ${csvFilePath} -p ${PROJECT_KEY}`,
    (error, stdout, stderr) => {
      t.equal(error.code, 1, 'returns process error exit code')
      t.false(stdout, 'returns no stdout data')
      t.true(
        stderr.match(/types\/key=custom-type' not found/),
        'returns SDK error on stderr')
      t.end()
    }
  )
})
