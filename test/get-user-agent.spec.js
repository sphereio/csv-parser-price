import userAgent from 'user-agent'
import test from 'tape'

import modulePackage from '../package.json'

test('userAgent should exist', (t) => {
  t.ok(userAgent)
  t.end()
})

test('userAgent should return an user agent', (t) => {
  const nameRegex = encodeURI(modulePackage.name)
  const versionRegex = encodeURI(modulePackage.version)

  t.true(userAgent.match(/node-sdk/), 'contains SDK')
  t.true(userAgent.match(nameRegex), 'contains module name')
  t.true(userAgent.match(versionRegex), 'contains module version')
  t.end()
})
