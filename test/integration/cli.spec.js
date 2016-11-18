import test from 'tape'
import { exec } from 'child_process'

let PROJECT_KEY
if (process.env.CI === 'true')
  PROJECT_KEY = process.env.SPHERE_PROJECT_KEY
else
  PROJECT_KEY = process.env.npm_config_projectkey

// Since the CLI keeps listening to stdin we need to close it manually
test.onFinish(() => process.exit(0))

test('CLI help flag', (t) => {
  exec('csvparserprice --help', (error, stdout, stderr) => {
    t.true(String(stdout).match(/help/), 'outputs help text')
    t.false(error && stderr, 'returns no error')
    t.end()
  })
})

test('CLI takes input from file', (t) => {
  const csvFilePath = './test/helpers/simple-sample.csv'

  exec(`csvparserprice -p ${PROJECT_KEY} --inputFile ${csvFilePath}`,
    (error, stdout, stderr) => {
      t.true(stdout.match(/prices/), 'outputs \'prices\'')
      t.false(error && stderr, 'returns no error')
      t.end()
    })
})

test('CLI given a non-existant input file', (t) => {
  exec('csvparserprice -i nope.csv', (error) => {
    t.true(error, 'returns error')
    t.end()
  })
})

test('CLI exits on faulty CSV format', (t) => {
  const csvFilePath = './test/helpers/faulty-sample.csv'

  // eslint-disable-next-line max-len
  exec(`csvparserprice -i ${csvFilePath} -p ${PROJECT_KEY}`, (error, stdout, stderr) => {
    t.equal(error.code, 1, 'returns process error exit code')
    t.false(stdout, 'returns no stdout data')
    t.equal(
      stderr,
      'Row length does not match headers',
      'returns CSV parsing error on stderr'
    )
    t.end()
  })
})

test('CLI exits on parsing errors', (t) => {
  const csvFilePath = './test/helpers/sample.csv'

  // eslint-disable-next-line max-len
  exec(`csvparserprice -i ${csvFilePath} -p ${PROJECT_KEY}`, (error, stdout, stderr) => {
    t.equal(error.code, 1, 'returns process error exit code')
    t.false(stdout, 'returns no stdout data')
    t.true(
      stderr.match(/types\/key=custom-type' not found/),
      'returns SDK error on stderr')
    t.end()
  })
})
