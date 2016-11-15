import test from 'tape'
import { spawn } from 'child_process'
import cli from '../../bin/csvparserprice'

test('CLI should exist', (t) => {
  t.ok(cli)
  t.end()
})

// fail when given no inputFile
// output JSON on input
// write a file?

test('CLI help output', (t) => {
  const csvparserprice = spawn('csvparserprice', ['help'])

  csvparserprice.on(
    'data',
    data => t.true(String(data).match(/help/), 'logs help text')
  )
  csvparserprice.on(
    'close',
    signal => t.false(signal, 'exits with success signal')
  )
  t.end()
})

test.only('CLI exits with errors given no input', (t) => {
  const csvparserprice = spawn('csvparserprice')

  csvparserprice.on(
    'data',
    data => t.true(String(data).match(/help/), 'logs help text')
  )
  csvparserprice.on(
    'close',
    signal => t.true(signal, 'exits with error signal')
  )
  t.end()
})
