import test from 'tape'
import { exec } from 'child_process'
import cli from '../../bin/csvparserprice'

// Since the CLI keeps listening to stdin we need to close it manually
test.onFinish(() => process.exit(0))

test('CLI should exist', (t) => {
  t.ok(cli)
  t.end()
})

test('CLI should name process', (t) => {
  t.equal(process.title, 'csvparserprice')
  t.end()
})

test('CLI help output', (t) => {
  exec('csvparserprice --help', (error, stdout) => {
    t.true(String(stdout).match(/help/), 'outputs help text')
    t.false(error, 'no error')
    t.end()
  })
})

test('CLI takes input from file', (t) => {
  const csvFilePath = './test/helpers/simple-sample.csv'

  exec(`csvparserprice -i ${csvFilePath}`, (error, stdout) => {
    t.true(stdout.match(/prices/), 'outputs \'prices\'')
    t.false(error, 'no error')
    t.end()
  })
})

test('CLI returns error given a non-existant input file', (t) => {
  exec('csvparserprice -i nope.csv', (error) => {
    t.true(error, 'returns error')
    t.end()
  })
})

test('CLI exits on faulty CSV format', (t) => {
  const csvFilePath = './test/helpers/faulty-sample.csv'

  exec(`csvparserprice -i ${csvFilePath}`, (error, stdout, stderr) => {
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

  exec(`csvparserprice -i ${csvFilePath}`, (error, stdout, stderr) => {
    t.equal(error.code, 1, 'returns process error exit code')
    t.false(stdout, 'returns no stdout data')
    t.true(
      stderr.match(/types\/key=custom-type' not found/),
      'returns SDK error on stderr')
    t.end()
  })
})
