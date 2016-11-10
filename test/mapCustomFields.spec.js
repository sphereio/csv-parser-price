import test from 'tape'
import MapCustomFields from 'mapCustomFields'
import customType from './helpers/customTypeDefinition.mock.json'

test('MapCustomFields should exist', (t) => {
  t.ok(MapCustomFields)
  t.end()
})

test('MapCustomFields should be instatianted with methods', (t) => {
  t.equal(typeof MapCustomFields, 'function', 'MapCustomFields is a function')
  const mapCustomFields = MapCustomFields()
  t.ok(mapCustomFields.mapBoolean, 'mapBoolean method exists')
  t.ok(mapCustomFields.parse, 'parse method exists')
  t.ok(mapCustomFields.mapMoney, 'mapMoney method exists')
  t.ok(mapCustomFields.mapSet, 'mapSet method exists')
  t.ok(mapCustomFields.mapNumber, 'mapNumber method exists')
  t.notOk(mapCustomFields.isValidValue, 'isValidValue is a private method')
  t.end()
})

test(`MapCustomFields::mapBoolean
  should exists`, (t) => {
  const mapCustomFields = MapCustomFields()
  t.ok(mapCustomFields.mapBoolean)
  t.end()
})

test(`MapCustomFields::parse
  should return valid customfields object`, (t) => {
  const mapCustomFields = MapCustomFields()
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

test(`MapCustomFields::parse
  should return errors with customfields object`, (t) => {
  const mapCustomFields = MapCustomFields()
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
    money: 'ABI 1200',
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
    '[row 1: my-category] - Parsed currency \'ABI\' is not valid',
    '[row 1: my-category] - The number qw isn\'t valid',
    '[row 1: my-category] - The number \'2\' isn\'t valid',
    '[row 1: my-category] - The number v isn\'t valid',
    '[row 1: my-category] - The number t isn\'t valid',
  ]
  t.deepEqual(result.data, expected)
  t.deepEqual(result.error, expectedErrorArray, errMsg)
  t.end()
})

test(`MapCustomFields::mapBoolean
  should return boolean value when passed in`, (t) => {
  const mapCustomFields = MapCustomFields()
  const result = mapCustomFields.mapBoolean('true')

  t.notOk(result.error, 'There is no error')
  t.equal(result.data, true, 'String value `true` is converted to boolean')
  t.end()
})

test(`MapCustomFields::mapBoolean
  should return no error or data when value is empty`, (t) => {
  const mapCustomFields = MapCustomFields()
  const result = mapCustomFields.mapBoolean('')

  t.notOk(result.error, 'There is no error')
  t.notOk(result.data, 'No data is returned')
  t.end()
})

test(`MapCustomFields::mapBoolean
  should return error when value is not valid boolean`, (t) => {
  const mapCustomFields = MapCustomFields()
  const result = mapCustomFields.mapBoolean('{"ok":"yes"}')

  t.ok(result.error, 'There are errors with input')
  t.notOk(result.data, 'No data is returned')
  t.end()
})

test(`MapCustomFields::mapBoolean
  should return error when invalid value is passed in`, (t) => {
  const mapCustomFields = MapCustomFields()
  const result = mapCustomFields.mapBoolean('abi')

  t.ok(result.error, 'There are errors with input')
  t.notOk(result.data, 'No data is returned')
  t.end()
})

test(`MapCustomFields::mapMoney
  should exists`, (t) => {
  const mapCustomFields = MapCustomFields()
  t.ok(mapCustomFields.mapMoney)
  t.end()
})

test(`MapCustomFields::mapMoney
  should return money object when passed in`, (t) => {
  const mapCustomFields = MapCustomFields()
  const result = mapCustomFields.mapMoney('EUR 1400')

  t.notOk(result.error, 'There is no error')
  const expected = { centAmount: 1400, currencyCode: 'EUR' }
  t.deepEqual(result.data, expected, 'Money is parsed successfully')
  t.end()
})

test(`MapCustomFields::mapMoney
  should return error when invalid value is passed in`, (t) => {
  const mapCustomFields = MapCustomFields()
  const result = mapCustomFields.mapMoney('abi')

  t.ok(result.error, 'There is error')
  t.notOk(result.data, 'No data is returned')
  t.end()
})

test(`MapCustomFields::mapMoney
  should return no error or data when value is empty`, (t) => {
  const mapCustomFields = MapCustomFields()
  const result = mapCustomFields.mapMoney('')

  t.notOk(result.error, 'There is no error')
  t.notOk(result.data, 'No data is returned')
  t.end()
})

test(`MapCustomFields::mapMoney
  should return error when invalid curr is passed in`, (t) => {
  const mapCustomFields = MapCustomFields()
  const result = mapCustomFields.mapMoney('ABI 200')

  t.ok(result.error, 'There is error with input')
  t.equal(
    result.error,
    'Parsed currency \'ABI\' is not valid',
    'Parsed currency is not valid'
  )
  t.notOk(result.data, 'No data is returned')
  t.end()
})

test(`MapCustomFields::mapNumber
  should exists`, (t) => {
  const mapCustomFields = MapCustomFields()
  t.ok(mapCustomFields.mapNumber)
  t.end()
})

test(`MapCustomFields::mapNumber
  should return boolean value when passed in`, (t) => {
  const mapCustomFields = MapCustomFields()
  const result = mapCustomFields.mapNumber('1400')

  t.notOk(result.error, 'There is no error')
  t.equal(result.data, 1400, 'Number of type `number`')
  t.end()
})

test(`MapCustomFields::mapNumber
  should return error when invalid value is passed in`, (t) => {
  const mapCustomFields = MapCustomFields()
  const result = mapCustomFields.mapNumber('abi')

  t.ok(result.error, 'There are errors with input')
  t.notOk(result.data, 'No data is returned')
  t.end()
})

test(`MapCustomFields::mapNumber
  should return no error or data when value is empty`, (t) => {
  const mapCustomFields = MapCustomFields()
  const result = mapCustomFields.mapNumber('')

  t.notOk(result.error, 'There is no error')
  t.notOk(result.data, 'No data is returned')
  t.end()
})


test(`MapCustomFields::mapSet
  should exists`, (t) => {
  const mapCustomFields = MapCustomFields()
  t.ok(mapCustomFields.mapSet)
  t.end()
})

test(`MapCustomFields::mapSet
  should format all values to money`, (t) => {
  const mapCustomFields = MapCustomFields()
  const elementType = { name: 'Number' }
  const result = mapCustomFields.mapSet('1,2,3,4', elementType)

  t.equal(result.error.length, 0, 'There is no error')
  const expected = [1, 2, 3, 4]
  t.deepEqual(result.data, expected, 'Values are all Numbers')
  t.end()
})

test(`MapCustomFields::mapSet
  should format all values to money`, (t) => {
  const mapCustomFields = MapCustomFields()
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

test(`MapCustomFields::mapSet
  should return error if values in set is invalid`, (t) => {
  const mapCustomFields = MapCustomFields()
  const elementType = { name: 'Boolean' }
  const moneySet = 'true, false, false, abi'
  const result = mapCustomFields.mapSet(moneySet, elementType)
  t.equal(result.error.length, 1, 'There is error with input')
  t.deepEqual(result.error[0], 'The value \'abi\' is not a valid boolean value')
  t.equal(result.data.length, 3, 'Other non-error input are returned')
  t.end()
})

test(`MapCustomFields::mapSet
  should return error if elementType in set is not supported`, (t) => {
  const mapCustomFields = MapCustomFields()
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

test(`MapCustomFields::mapSet
  should parse all values as a string`, (t) => {
  const mapCustomFields = MapCustomFields()
  const elementType = { name: 'String' }
  const moneySet = 'shoe, monitor, abi'
  const result = mapCustomFields.mapSet(moneySet, elementType)

  t.ok(result.error, 'There is no error with input')
  const expected = ['shoe', 'monitor', 'abi']
  t.deepEqual(result.data, expected, 'All values are of type String')
  t.end()
})
