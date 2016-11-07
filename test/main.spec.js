import test from 'tape'
import priceCsvParser from 'main'

test('priceCsvParser module is a function', (t) => {
  t.equal(typeof priceCsvParser, 'function')

  t.end()
})
