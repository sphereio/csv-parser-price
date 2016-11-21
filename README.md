[![commercetools logo][commercetools-icon]][commercetools]

# CSV Parser Price
[![Travis Build Status][travis-icon]][travis]
[![Codecov Coverage Status][codecov-icon]][codecov]
[![David Dependencies Status][david-icon]][david]
[![David devDependencies Status][david-dev-icon]][david-dev]

Convert [commercetools price](https://dev.commercetools.com/http-api-projects-products.html#price) CSV data to JSON.

## Usage

### CLI
```
Usage: csvparserprice [options]
Convert commercetools price CSV data to JSON.

Options:
  --help, -h        Show help text.                                  [boolean]
  --inputFile, -i   Path to CSV file.                       [default: "stdin"]
  --outputFile, -o  Input CSV file.                        [default: "stdout"]
  --delimiter, -d   Used CSV delimiter.                         [default: ","]
  --strictMode, -s  Parse CSV strictly.                        [default: true]
  --projectKey, -p  API project key.
  --host            HTTP client host parameter.
  --protocol        HTTP client protocol parameter.
  --accessToken     HTTP client access token.
```
### JS
```js
```

## Configuration


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
