import test from 'tape'
import getApiCredentials from 'get-api-credentials'

let PROJECT_KEY
if (process.env.CI === 'true')
  PROJECT_KEY = process.env.SPHERE_PROJECT_KEY
else
  PROJECT_KEY = process.env.npm_config_projectkey

test('getApiCredentials should exist', (t) => {
  t.ok(getApiCredentials)
  t.end()
})

test('getApiCredentials should use project key', (t) => {
  getApiCredentials(PROJECT_KEY)
    .then((credentials) => {
      t.true(credentials)
      t.end()
    })
    .catch(t.fail)
})

test('getApiCredentials should use access token', (t) => {
  getApiCredentials(PROJECT_KEY, 'cotter-access-token')
    .then((credentials) => {
      t.true(credentials)
      t.end()
    })
    .catch(t.fail)
})
