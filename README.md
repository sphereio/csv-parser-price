[![commercetools logo][commercetools-icon]][commercetools]

# CSV Parser Price
[![Travis Build Status][travis-icon]][travis]
[![Codecov Coverage Status][codecov-icon]][codecov]
[![David Dependencies Status][david-icon]][david]
[![David devDependencies Status][david-dev-icon]][david-dev]

Convert [commercetools price](https://dev.commercetools.com/http-api-projects-products.html#price) CSV data to JSON. See [this CSV with example data](test/helpers/sample.csv) for the expected headers and data.

## Usage
`npm install @commercetools/csv-parser-price --global`

### CLI
```
Usage: csvparserprice [options]
Convert commercetools price CSV data to JSON.

Options:
  --help, -h        Show help text.                                    [boolean]
  --version, -v     Show version number.                               [boolean]
  --inputFile, -i   Path to input CSV file.                   [default: "stdin"]
  --outputFile, -o  Path to output JSON file.                [default: "stdout"]
  --batchSize, -b   Number of CSV rows to handle simultaneously.  [default: 100]
  --delimiter, -d   Used CSV delimiter.                           [default: ","]
  --strictMode, -s  Parse CSV strictly.                          [default: true]
  --projectKey, -p  API project key.                                  [required]
  --host            HTTP client host parameter.
  --protocol        HTTP client protocol parameter.
  --accessToken     HTTP client access token.
  --logLevel        Logging level: error, warn, info or verbose.
                                                               [default: "info"]
```
When running with `--outputFile` set, logging information is shown directly otherwise it goes to `csvparserprice.log` with the exception of fatal errors.

### JS
```js
const fs = require('fs');
const CsvParserPrice = require('csv-parser-price');

const apiCredentials = {
    project_key: process.env.CM_PROJECT_KEY,
    client_id: '*********',
    client_secret: '*********'
};

const csvParserPrice = new CsvParserPrice(
  {
    config: apiCredentials
  },
  {
    error: console.error,
    warn: console.warn,
    info: console.log,
    verbose: console.log,
  },
  {
    strictMode: true
  }
);

csvParserPrice.parse(
  fs.createReadStream('./input.csv'),
  fs.createWriteStream('./output.json')
);
```
Errors on the level `error` come from events that are fatal and thus stop the stream of data.

## Configuration
`CsvParserPrice` accepts three objects as arguments:
- API client config (_required_)
  - See the [SDK client documentation](http://sphereio.github.io/sphere-node-sdk/classes/SphereClient.html) for more information.
- Logger takes object with four functions (_optional_)
- Config (_optional_)
  - `batchSize`: number of CSV rows to handle simultaneously. (_default_: `100`)
  - `delimiter`: the used CSV delimiter (_default_: `,`)
  - `strictMode`: wether to parse the CSV strictly (_default_: `true`)

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for info on contributing.

[commercetools]: https://commercetools.com/
[commercetools-icon]: https://cdn.rawgit.com/commercetools/press-kit/master/PNG/72DPI/CT%20logo%20horizontal%20RGB%2072dpi.png
[travis]: https://travis-ci.org/commercetools/csv-parser-price
[travis-icon]: https://img.shields.io/travis/commercetools/csv-parser-price/master.svg?style=flat-square
[codecov]: https://codecov.io/gh/commercetools/csv-parser-price
[codecov-icon]: https://img.shields.io/codecov/c/github/commercetools/csv-parser-price.svg?style=flat-square
[david]: https://david-dm.org/commercetools/csv-parser-price
[david-icon]: https://img.shields.io/david/commercetools/csv-parser-price.svg?style=flat-square
[david-dev]: https://david-dm.org/commercetools/csv-parser-price?type=dev
[david-dev-icon]: https://img.shields.io/david/dev/commercetools/csv-parser-price.svg?style=flat-square
