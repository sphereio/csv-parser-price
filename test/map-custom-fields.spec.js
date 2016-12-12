import mapCustomFields from 'map-custom-fields'
import test from 'tape'

import customType from './helpers/custom-type-definition.mock.json'

test('mapCustomFields should exist', (t) => {
  t.ok(mapCustomFields)
  t.end()
})

test('mapCustomFields should have methods', (t) => {
  t.equal(typeof mapCustomFields, 'object', 'mapCustomFields is an object')

  t.ok(mapCustomFields.mapBoolean, 'mapBoolean method exists')
  t.ok(mapCustomFields.parse, 'parse method exists')
  t.ok(mapCustomFields.mapMoney, 'mapMoney method exists')
  t.ok(mapCustomFields.mapSet, 'mapSet method exists')
  t.ok(mapCustomFields.mapNumber, 'mapNumber method exists')
  t.notOk(mapCustomFields.isValidValue, 'isValidValue is a private method')
  t.end()
})

test(`mapCustomFields::mapBoolean
  should exists`, (t) => {
  t.ok(mapCustomFields.mapBoolean)
  t.end()
})

test(`mapCustomFields::parse
  should return valid customfields object`, (t) => {
  const data = {
    numbertype: '123',
    stringtype: 'nac',
    booleantype: 'true',
    localizedstringtype: {
      nl: 'Selwyn',
      de: 'Merkel',
    },
    enumtype: 'Ready',
    money: 'EUR 1200',
    settype: '1,2,3,5',
  }

  const result = mapCustomFields.parse(data, customType, 1)

  t.equal(result.error.length, 0, 'There is no error')
  const expected = {
    fields: {
      booleantype: true,
      enumtype: 'Ready',
      localizedstringtype: {
        de: 'Merkel',
        nl: 'Selwyn',
      },
      money: {
        centAmount: 1200,
        currencyCode: 'EUR',
      },
      numbertype: 123,
      settype: [ 1, 2, 3, 5 ],
      stringtype: 'nac',
    },
    type: {
      id: '123456789',
    },
  }
  const testMsg = 'Data is parsed successfully'
  t.deepEqual(result.data, expected, testMsg)
  t.end()
})

test(`mapCustomFields::parse
  should return errors with customfields object`, (t) => {
  const data = {
    numbertype: 'invalid',
    unsupportedType: 'okay',
    stringtype: undefined,
    booleantype: 'abi§',
    localizedstringtype: {
      nl: 'Selwyn',
      de: 'Merkel',
    },
    enumtype: 'Ready',
    money: 'ABI',
    settype: 'qw,\'2\',v,t',
  }

  const result = mapCustomFields.parse(data, customType, 1)

  t.equal(result.error.length, 8, 'There are errors with data')
  const expected = {
    fields: {
      enumtype: 'Ready',
      localizedstringtype: {
        de: 'Merkel',
        nl: 'Selwyn',
      },
    },
    type: {
      id: '123456789',
    },
  }
  const errMsg = 'All errors are returned'
  const expectedErrorArray = [
    '[row 1: my-category] - The number invalid isn\'t valid',
    // eslint-disable-next-line max-len
    '[row 1: my-category] - \'unsupported\' type is not supported! Kindly raise an issue for this',
    '[row 1: my-category] - The value \'abi§\' is not a valid boolean value',
    '[row 1: my-category] - Invalid money - Cannot parse money ABI',
    '[row 1: my-category] - The number qw isn\'t valid',
    '[row 1: my-category] - The number \'2\' isn\'t valid',
    '[row 1: my-category] - The number v isn\'t valid',
    '[row 1: my-category] - The number t isn\'t valid',
  ]
  t.deepEqual(result.data, expected)
  t.deepEqual(
    result.error.map(error => error.message),
    expectedErrorArray,
    errMsg
  )
  t.end()
})

test(`mapCustomFields::mapBoolean
  should return boolean value when passed in`, (t) => {
  const result = mapCustomFields.mapBoolean('true')

  t.notOk(result.error, 'There is no error')
  t.equal(result.data, true, 'String value `true` is converted to boolean')
  t.end()
})

test(`mapCustomFields::mapBoolean
  should return no error or data when value is empty`, (t) => {
  const result = mapCustomFields.mapBoolean('')

  t.notOk(result.error, 'There is no error')
  t.notOk(result.data, 'No data is returned')
  t.end()
})

test(`mapCustomFields::mapBoolean
  should return error when value is not valid boolean`, (t) => {
  const result = mapCustomFields.mapBoolean('{"ok":"yes"}')

  t.ok(result.error, 'There are errors with input')
  t.notOk(result.data, 'No data is returned')
  t.end()
})

test(`mapCustomFields::mapBoolean
  should return error when invalid value is passed in`, (t) => {
  const result = mapCustomFields.mapBoolean('abi')

  t.ok(result.error, 'There are errors with input')
  t.notOk(result.data, 'No data is returned')
  t.end()
})

test(`mapCustomFields::mapMoney
  should exists`, (t) => {
  t.ok(mapCustomFields.mapMoney)
  t.end()
})

test(`mapCustomFields::mapMoney
  should return money object when passed in`, (t) => {
  const result = mapCustomFields.mapMoney('EUR 1400')

  t.notOk(result.error, 'There is no error')
  const expected = { centAmount: 1400, currencyCode: 'EUR' }
  t.deepEqual(result.data, expected, 'Money is parsed successfully')
  t.end()
})

test(`mapCustomFields::mapMoney
  should return error when invalid value is passed in`, (t) => {
  const result = mapCustomFields.mapMoney('abi')

  t.ok(result.error, 'There is error')
  t.notOk(result.data, 'No data is returned')
  t.end()
})

test(`mapCustomFields::mapMoney
  should return no error or data when value is empty`, (t) => {
  const result = mapCustomFields.mapMoney('')

  t.notOk(result.error, 'There is no error')
  t.notOk(result.data, 'No data is returned')
  t.end()
})

test(`mapCustomFields::mapNumber
  should exists`, (t) => {
  t.ok(mapCustomFields.mapNumber)
  t.end()
})

test(`mapCustomFields::mapNumber
  should return boolean value when passed in`, (t) => {
  const result = mapCustomFields.mapNumber('1400')

  t.notOk(result.error, 'There is no error')
  t.equal(result.data, 1400, 'Number of type `number`')
  t.end()
})

test(`mapCustomFields::mapNumber
  should return error when invalid value is passed in`, (t) => {
  const result = mapCustomFields.mapNumber('abi')

  t.ok(result.error, 'There are errors with input')
  t.notOk(result.data, 'No data is returned')
  t.end()
})

test(`mapCustomFields::mapNumber
  should return no error or data when value is empty`, (t) => {
  const result = mapCustomFields.mapNumber('')

  t.notOk(result.error, 'There is no error')
  t.notOk(result.data, 'No data is returned')
  t.end()
})


test(`mapCustomFields::mapSet
  should exists`, (t) => {
  t.ok(mapCustomFields.mapSet)
  t.end()
})

test(`mapCustomFields::mapSet
  should format all values to money`, (t) => {
  const elementType = { name: 'Number' }
  const result = mapCustomFields.mapSet('1,2,3,4', elementType)

  t.equal(result.error.length, 0, 'There is no error')
  const expected = [1, 2, 3, 4]
  t.deepEqual(result.data, expected, 'Values are all Numbers')
  t.end()
})

test(`mapCustomFields::mapSet
  should format all values to money`, (t) => {
  const elementType = { name: 'Money' }
  const moneySet = 'EUR 1200,USD 40,NGN 200'
  const result = mapCustomFields.mapSet(moneySet, elementType)

  t.equal(result.error.length, 0, 'There is no error')
  const expected = [{
    currencyCode: 'EUR',
    centAmount: 1200,
  }, {
    currencyCode: 'USD',
    centAmount: 40,
  }, {
    currencyCode: 'NGN',
    centAmount: 200,
  }]
  t.deepEqual(result.data, expected, 'Values are all money object')
  t.end()
})

test(`mapCustomFields::mapSet
  should return error if values in set is invalid`, (t) => {
  const elementType = { name: 'Boolean' }
  const moneySet = 'true, false, false, abi'
  const result = mapCustomFields.mapSet(moneySet, elementType)
  t.equal(result.error.length, 1, 'There is error with input')
  t.deepEqual(result.error[0], 'The value \'abi\' is not a valid boolean value')
  t.equal(result.data.length, 3, 'Other non-error input are returned')
  t.end()
})

test(`mapCustomFields::mapSet
  should return error if elementType in set is not supported`, (t) => {
  const elementType = { name: 'unsupportedType' }
  const moneySet = 'true, false, false, abi'
  const result = mapCustomFields.mapSet(moneySet, elementType)

  t.equal(result.error.length, 4, 'There is error with input')
  t.deepEqual(
    result.error[0],
    '\'unsupportedType\' type is not supported! Kindly raise an issue for this'
  )
  t.end()
})

test(`mapCustomFields::mapSet
  should parse all values as a string`, (t) => {
  const elementType = { name: 'String' }
  const moneySet = 'shoe, monitor, abi'
  const result = mapCustomFields.mapSet(moneySet, elementType)

  t.ok(result.error, 'There is no error with input')
  const expected = ['shoe', 'monitor', 'abi']
  t.deepEqual(result.data, expected, 'All values are of type String')
  t.end()
})
