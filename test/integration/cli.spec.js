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
  exec('csvparserprice -i ./test/integration/sample.csv', (error, stdout) => {
    t.true(stdout.match(/prices/), 'outputs \'prices\'')
    t.false(error, 'no error')
    t.end()
  })
})
