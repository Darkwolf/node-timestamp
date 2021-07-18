# Timestamp
## Install
`npm i --save @darkwolf/timestamp`
## Usage
```javascript
// ECMAScript
import Timestamp from '@darkwolf/timestamp'
// CommonJS
const Timestamp = require('@darkwolf/timestamp')

const now = new Timestamp()

`${new Timestamp('1970-01-01T00:00:00Z')}` // => '1970-01-01T00:00:00.000000000Z'
`${new Timestamp('2038-01-19T03:14:07Z')}` // => '2038-01-19T03:14:07.000000000Z'
`${new Timestamp('1900-12-31T23:59:59.999999999Z')}` // => '1900-12-31T23:59:59.999999999Z'
`${new Timestamp('2021-07-13T23:59:59.999999999Z')}` // => '2021-07-13T23:59:59.999999999Z'
`${Timestamp.from({
  year: 2021,
  month: 7,
  day: 13,
  hour: 23,
  minute: 59,
  second: 59,
  millisecond: 999,
  microsecond: 999,
  nanosecond: 999
})}` // => 'P1Y1Q1M1W1DT23H59M59.999999999S'
```
## [API Documentation](https://github.com/Darkwolf/node-timestamp/blob/master/docs/API.md)
## Contact Me
#### GitHub: [@PavelWolfDark](https://github.com/PavelWolfDark)
#### Telegram: [@PavelWolfDark](https://t.me/PavelWolfDark)
#### Email: [PavelWolfDark@gmail.com](mailto:PavelWolfDark@gmail.com)
