const {
  uncurryThis,
  ObjectDefineProperties,
  FunctionPrototypeApply,
  FunctionPrototypeBind,
  FunctionPrototypeSymbolHasInstance,
  Symbol,
  SymbolToPrimitive,
  SymbolToStringTag,
  RangeError,
  TypeError,
  Number,
  NumberIsFinite,
  NumberIsInteger,
  NumberIsNaN,
  MathFloor,
  MathTrunc,
  Date,
  DateNow,
  DatePrototypeGetTime,
  String,
  StringPrototypeMatch,
  StringPrototypePadEnd,
  StringPrototypePadStart,
  PrimitivesIsString,
  InstancesIsDate,
  TypesIsPlainObject,
  TypesToNumber
} = require('@darkwolf/primordials')
const Duration = require('@darkwolf/duration')
const {
  NEGATIVE_CHAR,
  SEPARATOR_CHAR,
  NANOSECONDS_PER_MILLISECOND,
  NANOSECONDS_PER_SECOND,
  MILLISECONDS_PER_SECOND,
  DAYS_PER_WEEK,
  DAYS_PER_YEAR,
  MONTHS_PER_YEAR,
  UNIT,
  isDuration: DurationIsDuration,
  getUnitIndex: DurationGetUnitIndex,
  wrapSlots,
  convert: DurationConvert,
  slotsToDuration: DurationSlotsToDuration,
  slotsToParts: DurationSlotsToParts,
  convertToSlots: DurationConvertToSlots,
  partsToDuration: DurationPartsToDuration,
  partsToSlots: DurationPartsToSlots,
  dateToSlots: DurationDateToSlots,
  toSlots: DurationToSlots
} = Duration

const DurationPrototypeToSlots = uncurryThis(Duration.prototype.toSlots)
const DurationPrototypeConvertTo = uncurryThis(Duration.prototype.convertTo)

const secondsSymbol = Symbol('seconds')
const nanosecondsSymbol = Symbol('nanoseconds')
const addSymbol = Symbol('add')
const subtractSymbol = Symbol('subtract')
const convertToSymbol = Symbol('convertTo')
const toStringSymbol = Symbol('toString')
const valueOfSymbol = Symbol('valueOf')

const DAYS_PER_LEAP_YEAR = DAYS_PER_YEAR + 1

const EPOCH_YEAR = 1970

const ROUNDING_MODE = 'floor'

const EPOCH = '1970-01-01T00:00:00Z'

const toAmount = (value, unit) => {
  value = TypesToNumber(value)
  if (!NumberIsFinite(value)) {
    throw new RangeError(`The ${unit} must be a finite number`)
  }
  return value || 0
}

const toDateAmount = (value, unit) => {
  value = toAmount(value, unit)
  return value ? MathTrunc(value) || 0 : 0
}

const toFields = value => {
  if (!TypesIsPlainObject(value)) {
    throw new TypeError('The fields must be a plain object')
  }
  let {
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond
  } = value
  year = toDateAmount(year, 'year')
  month = toDateAmount(month, 'month')
  day = toAmount(day, 'day')
  const fields = {
    year,
    month,
    day
  }
  if (hour !== undefined) {
    fields.hour = toAmount(hour, 'hour')
  }
  if (minute !== undefined) {
    fields.minute = toAmount(minute, 'minute')
  }
  if (second !== undefined) {
    fields.second = toAmount(second, 'second')
  }
  if (millisecond !== undefined) {
    fields.millisecond = toAmount(millisecond, 'millisecond')
  }
  if (microsecond !== undefined) {
    fields.microsecond = toAmount(microsecond, 'microsecond')
  }
  if (nanosecond !== undefined) {
    fields.nanosecond = toAmount(nanosecond, 'nanosecond')
  }
  return fields
}

const now = (unit, options) => {
  if (unit === undefined) {
    unit = UNIT
  }
  const timestamp = DateNow()
  return DurationConvert(timestamp, 'millisecond', unit, options)
}

const _isLeapYear = value => value % 4 === 0 && value % 100 !== 0 || value % 400 === 0
const isLeapYear = value => NumberIsInteger(value) && _isLeapYear(value)

const _getDaysInYear = year => _isLeapYear(year) ? DAYS_PER_LEAP_YEAR : DAYS_PER_YEAR
const getDaysInYear = year => {
  year = toDateAmount(year, 'year')
  return _getDaysInYear(year)
}

const _getDaysInMonths = year => [31, _isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const getDaysInMonths = year => {
  year = toDateAmount(year, 'year')
  return _getDaysInMonths(year)
}

const daysInMonths = _getDaysInMonths(EPOCH_YEAR)

const _normalizeYearMonth = (year, month) => {
  if (month < 1 || month > MONTHS_PER_YEAR) {
    year += MathFloor(month / MONTHS_PER_YEAR)
    month %= MONTHS_PER_YEAR
    if (!month) {
      year--
    }
    if (month < 1) {
      month += MONTHS_PER_YEAR
    }
  }
  return {
    year,
    month
  }
}
const normalizeYearMonth = (year, month) => {
  year = toDateAmount(year, 'year')
  month = toDateAmount(month, 'month')
  return _normalizeYearMonth(year, month)
}

const _getDaysInMonth = (year, month) => {
  const days = daysInMonths[month - 1]
  return _isLeapYear(year) && month === 2 ? days + 1 : days
}
const getDaysInMonth = (year, month) => {
  const fields = normalizeYearMonth(year, month)
  return _getDaysInMonth(fields.year, fields.month)
}

const _yearToDays = year => (year - EPOCH_YEAR) * DAYS_PER_YEAR +
  MathFloor((year - 1969) / 4) - MathFloor((year - 1901) / 100) + MathFloor((year - 1601) / 400)
const yearToDays = year => {
  year = toDateAmount(year, 'year')
  return _yearToDays(year)
}

const _daysToYear = days => {
  let year = MathFloor(days / DAYS_PER_YEAR) + EPOCH_YEAR
  if (days < 0) {
    while (_yearToDays(year) < days) {
      year++
    }
  } else {
    while (_yearToDays(year) > days) {
      year--
    }
  }
  return year
}
const daysToYear = days => {
  days = toAmount(days, 'days')
  return _daysToYear(days)
}

const dayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]

const _getDayOfYear = (year, month, day) => {
  const dayOfYear = dayCount[month - 1] + day
  return month > 2 && _isLeapYear(year) ? dayOfYear + 1 : dayOfYear
}
const getDayOfYear = (year, month, day) => {
  const fields = normalizeDate(year, month, day)
  return _getDayOfYear(fields.year, fields.month, fields.day)
}

const _dateToDays = (year, month, day) => _yearToDays(year) + _getDayOfYear(year, month, day) - 1
const dateToDays = (year, month, day) => {
  const fields = normalizeYearMonth(year, month)
  day = toDateAmount(day, 'day')
  return _dateToDays(fields.year, fields.month, day)
}

const _getDayOfWeek = (year, month, day) => {
  const days = _dateToDays(year, month, day) + 4
  let dayOfWeek = MathFloor(days % DAYS_PER_WEEK)
  if (dayOfWeek < 0) {
    dayOfWeek += DAYS_PER_WEEK
  }
  return dayOfWeek > 0 ? dayOfWeek : DAYS_PER_WEEK
}
const getDayOfWeek = (year, month, day) => {
  const fields = normalizeDate(year, month, day)
  return _getDayOfWeek(fields.year, fields.month, fields.day)
}

const _dayOfYearToDate = (year, dayOfYear) => {
  let month = 1
  let day = dayOfYear
  if (dayOfYear > dayCount[2] && _isLeapYear(year)) {
    dayOfYear--
    while (dayCount[month] < dayOfYear) {
      day = dayOfYear - dayCount[month]
      month++
    }
    if (month === 2) {
      day++
    }
  } else {
    while (dayCount[month] < dayOfYear) {
      day = dayOfYear - dayCount[month]
      month++
    }
  }
  return {
    year,
    month,
    day
  }
}
const dayOfYearToDate = (year, dayOfYear) => {
  year = toDateAmount(year, 'year')
  dayOfYear = toDateAmount(dayOfYear, 'dayOfYear')
  const days = _yearToDays(year) + dayOfYear - 1
  return _daysToDate(days)
}

const _daysToDate = days => {
  let year = _daysToYear(days)
  days = days - _yearToDays(year) + 1
  if (days < 1) {
    year--
    days += _getDaysInYear(year)
  }
  const dayOfYear = MathFloor(days)
  const fields = _dayOfYearToDate(year, dayOfYear)
  return {
    year,
    month: fields.month,
    day: fields.day
  }
}
const daysToDate = days => {
  days = toAmount(days, 'days')
  return _daysToDate(days)
}

const _normalizeDate = (year, month, day) => {
  const fields = _normalizeYearMonth(year, month)
  const days = _dateToDays(fields.year, fields.month, day)
  return _daysToDate(days)
}
const normalizeDate = (year, month, day) => {
  year = toDateAmount(year, 'year')
  month = toDateAmount(month, 'month')
  day = toDateAmount(day, 'day')
  return _normalizeDate(year, month, day)
}

const _slotsToFields = (slots, options) => {
  let {
    smallestUnit,
    roundingMode
  } = options
  const unitIndex = DurationGetUnitIndex(smallestUnit)
  if (unitIndex > 5) {
    smallestUnit = 'day'
  }
  let {
    days,
    hours: hour,
    minutes: minute,
    seconds: second,
    milliseconds: millisecond,
    microseconds: microsecond,
    nanoseconds: nanosecond
  } = DurationSlotsToParts(slots, {
    largestUnit: 'day',
    smallestUnit,
    rounding: true,
    roundingMode
  })
  if (slots.seconds < 0 || slots.nanoseconds < 0) {
    days--
    const timeSlots = DurationPartsToSlots({
      days: 1,
      hours: hour,
      minutes: minute,
      seconds: second,
      milliseconds: millisecond,
      microseconds: microsecond,
      nanoseconds: nanosecond
    })
    const parts = DurationSlotsToParts(timeSlots, {
      largestUnit: 'day',
      smallestUnit,
      rounding: true
    })
    days += parts.days
    hour = parts.hours
    minute = parts.minutes
    second = parts.seconds
    millisecond = parts.milliseconds
    microsecond = parts.microseconds
    nanosecond = parts.nanoseconds
  }
  const fields = _daysToDate(days)
  if (hour !== undefined) {
    fields.hour = hour
  }
  if (minute !== undefined) {
    fields.minute = minute
  }
  if (second !== undefined) {
    fields.second = second
  }
  if (millisecond !== undefined) {
    fields.millisecond = millisecond
  }
  if (microsecond !== undefined) {
    fields.microsecond = microsecond
  }
  if (nanosecond !== undefined) {
    fields.nanosecond = nanosecond
  }
  return fields
}
const slotsToFields = (slots, options) => {
  if (options === undefined) {
    options = {
      smallestUnit: 'nanosecond',
      roundingMode: ROUNDING_MODE
    }
  } else {
    if (!TypesIsPlainObject(options)) {
      throw new TypeError('The options must be a plain object')
    }
    let {
      smallestUnit,
      roundingMode
    } = options
    if (smallestUnit === undefined) {
      smallestUnit = 'nanosecond'
    }
    if (roundingMode === undefined) {
      roundingMode = ROUNDING_MODE
    }
    options = {
      smallestUnit,
      roundingMode
    }
  }
  return _slotsToFields(slots, options)
}

const _fieldsToSlots = fields => {
  const {
    year,
    month
  } = _normalizeYearMonth(fields.year, fields.month)
  const {
    day,
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond
  } = fields
  const days = _dateToDays(year, month, day)
  return DurationPartsToSlots({
    days,
    hours: hour,
    minutes: minute,
    seconds: second,
    milliseconds: millisecond,
    microseconds: microsecond,
    nanoseconds: nanosecond
  })
}
const fieldsToSlots = fields => {
  fields = toFields(fields)
  return _fieldsToSlots(fields)
}

const _fieldsToTimestamp = (fields, unit, options) => {
  const {
    year,
    month
  } = _normalizeYearMonth(fields.year, fields.month)
  const {
    day,
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond
  } = fields
  const days = _dateToDays(year, month, day)
  return DurationPartsToDuration({
    days,
    hours: hour,
    minutes: minute,
    seconds: second,
    milliseconds: millisecond,
    microseconds: microsecond,
    nanoseconds: nanosecond
  }, unit, options)
}
const fieldsToTimestamp = (fields, unit, options) => {
  fields = toFields(fields)
  return _fieldsToTimestamp(fields, unit, options)
}

const _normalizeFields = fields => {
  const slots = _fieldsToSlots(fields)
  return _slotsToFields(slots, {
    smallestUnit: 'nanosecond',
    roundingMode: ROUNDING_MODE
  })
}
const normalizeFields = fields => {
  fields = toFields(fields)
  return _normalizeFields(fields)
}

const _parseTimestampToFields = string => {
  const match = StringPrototypeMatch(string, /^([+-]?\d{4,9})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.(\d{1,3})(\d{1,3})?(\d{1,3})?)?Z$/)
  if (!match) {
    return null
  }
  let [
    input,
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond
  ] = match
  year = Number(year) || 0
  month = Number(month)
  day = Number(day)
  hour = Number(hour)
  minute = Number(minute)
  second = Number(second)
  const fields = {
    year,
    month,
    day,
    hour,
    minute,
    second
  }
  if (millisecond !== undefined) {
    millisecond = StringPrototypePadEnd(millisecond, 3, 0)
    fields.millisecond = Number(millisecond)
  }
  if (microsecond !== undefined) {
    microsecond = StringPrototypePadEnd(microsecond, 3, 0)
    fields.microsecond = Number(microsecond)
  }
  if (nanosecond !== undefined) {
    nanosecond = StringPrototypePadEnd(nanosecond, 3, 0)
    fields.nanosecond = Number(nanosecond)
  }
  return fields
}
const parseTimestampToFields = string => {
  string = String(string)
  return _parseTimestampToFields(string)
}

const _parseTimestamp = (string, unit, options) => {
  const fields = _parseTimestampToFields(string)
  if (!fields) {
    return NaN
  }
  const slots = _fieldsToSlots(fields)
  return DurationSlotsToDuration(slots, unit, options)
}
const parseTimestamp = (string, unit, options) => {
  string = String(string)
  return _parseTimestamp(string, unit, options)
}

const _parseDateToFields = string => {
  const match = StringPrototypeMatch(string, /^([+-]?\d{4,9})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)
  if (!match) {
    return null
  }
  let [
    input,
    year,
    month,
    day
  ] = match
  year = Number(year) || 0
  month = Number(month)
  day = Number(day)
  return {
    year,
    month,
    day
  }
}
const parseDateToFields = string => {
  string = String(string)
  return _parseDateToFields(string)
}

const _parseDate = (string, unit, options) => {
  const fields = _parseDateToFields(string)
  if (!fields) {
    return NaN
  }
  const slots = _fieldsToSlots(fields)
  return DurationSlotsToDuration(slots, unit, options)
}
const parseDate = (string, unit, options) => {
  string = String(string)
  return _parseDate(string, unit, options)
}

const _parseTimeToFields = string => {
  const match = StringPrototypeMatch(string, /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.(\d{1,3})(\d{1,3})?(\d{1,3})?)?)?$/)
  if (!match) {
    return null
  }
  let [
    input,
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond
  ] = match
  hour = Number(hour)
  minute = Number(minute)
  const fields = {
    hour,
    minute
  }
  if (second !== undefined) {
    fields.second = Number(second)
  }
  if (millisecond !== undefined) {
    millisecond = StringPrototypePadEnd(millisecond, 3, 0)
    fields.millisecond = Number(millisecond)
  }
  if (microsecond !== undefined) {
    microsecond = StringPrototypePadEnd(microsecond, 3, 0)
    fields.microsecond = Number(microsecond)
  }
  if (nanosecond !== undefined) {
    nanosecond = StringPrototypePadEnd(nanosecond, 3, 0)
    fields.nanosecond = Number(nanosecond)
  }
  return fields
}
const parseTimeToFields = string => {
  string = String(string)
  return _parseTimeToFields(string)
}

const _parseTime = (string, unit, options) => {
  const fields = _parseTimeToFields(string)
  if (!fields) {
    return NaN
  }
  return DurationPartsToDuration({
    hours: fields.hour,
    minutes: fields.minute,
    seconds: fields.second,
    milliseconds: fields.millisecond,
    microseconds: fields.microsecond,
    nanoseconds: fields.nanosecond
  }, unit, options)
}
const parseTime = (string, unit, options) => {
  string = String(string)
  return _parseTime(string, unit, options)
}

const _parseDateTimeToFields = string => {
  const match = StringPrototypeMatch(string, /^([+-]?\d{4,9})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.(\d{1,3})(\d{1,3})?(\d{1,3})?)?)?$/)
  if (!match) {
    return null
  }
  let [
    input,
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond
  ] = match
  year = Number(year) || 0
  month = Number(month)
  day = Number(day)
  hour = Number(hour)
  minute = Number(minute)
  const fields = {
    year,
    month,
    day,
    hour,
    minute
  }
  if (second !== undefined) {
    fields.second = Number(second)
  }
  if (millisecond !== undefined) {
    millisecond = StringPrototypePadEnd(millisecond, 3, 0)
    fields.millisecond = Number(millisecond)
  }
  if (microsecond !== undefined) {
    microsecond = StringPrototypePadEnd(microsecond, 3, 0)
    fields.microsecond = Number(microsecond)
  }
  if (nanosecond !== undefined) {
    nanosecond = StringPrototypePadEnd(nanosecond, 3, 0)
    fields.nanosecond = Number(nanosecond)
  }
  return fields
}
const parseDateTimeToFields = string => {
  string = String(string)
  return _parseDateTimeToFields(string)
}

const _parseDateTime = (string, unit, options) => {
  const fields = _parseDateTimeToFields(string)
  if (!fields) {
    return NaN
  }
  const slots = _fieldsToSlots(fields)
  return DurationSlotsToDuration(slots, unit, options)
}
const parseDateTime = (string, unit, options) => {
  string = String(string)
  return _parseDateTime(string, unit, options)
}

const _parseToFields = string => {
  let result = _parseTimestampToFields(string)
  if (!result) {
    result = _parseDateToFields(string)
    if (!result) {
      result = _parseDateTimeToFields(string)
    }
  }
  return result
}
const parseToFields = string => {
  string = String(string)
  return _parseToFields(string)
}

const _parse = (string, unit, options) => {
  let result = _parseTimestamp(string, unit, options)
  if (NumberIsNaN(result)) {
    result = _parseDate(string, unit, options)
    if (NumberIsNaN(result)) {
      result = _parseDateTime(string, unit, options)
    }
  }
  return result
}
const parse = (string, unit, options) => {
  string = String(string)
  return _parse(string, unit, options)
}

const timestampToSlots = timestamp => {
  let slots = null
  if (PrimitivesIsString(timestamp)) {
    const fields = _parseToFields(timestamp)
    if (fields) {
      slots = _fieldsToSlots(fields)
    }
  }
  if (!slots) {
    timestamp = TypesToNumber(timestamp)
    if (!NumberIsFinite(timestamp)) {
      throw new RangeError('The timestamp must be a finite number')
    }
    slots = DurationConvertToSlots(timestamp, 'second')
  }
  return slots
}

const toSlots = input => {
  if (isTimestamp(input)) {
    return {
      seconds: input[secondsSymbol],
      nanoseconds: input[nanosecondsSymbol]
    }
  }
  return DurationIsDuration(input) ? DurationPrototypeToSlots(input) :
    InstancesIsDate(input) ? DurationDateToSlots(input) :
    TypesIsPlainObject(input) ? fieldsToSlots(input) : timestampToSlots(input)
}

const toTimestamp = (input, unit, options) => {
  if (unit === undefined) {
    unit = UNIT
  }
  if (isTimestamp(input)) {
    return DurationSlotsToDuration({
      seconds: input[secondsSymbol],
      nanoseconds: input[nanosecondsSymbol]
    }, unit, options)
  }
  if (DurationIsDuration(input)) {
    return DurationPrototypeConvertTo(input, unit, options)
  }
  if (InstancesIsDate(input)) {
    const timestamp = DatePrototypeGetTime(input)
    if (NumberIsNaN(timestamp)) {
      throw new RangeError('The value of the date must be a finite number')
    }
    return DurationConvert(timestamp, 'millisecond', unit, options)
  }
  if (TypesIsPlainObject(input)) {
    return fieldsToTimestamp(input, unit, options)
  }
  if (PrimitivesIsString(input)) {
    const timestamp = _parse(input, unit, options)
    if (!NumberIsNaN(timestamp)) {
      return timestamp
    }
  }
  const timestamp = TypesToNumber(input)
  if (!NumberIsFinite(timestamp)) {
    throw new RangeError('The timestamp must be a finite number')
  }
  return DurationConvert(timestamp, 'second', unit, options)
}

const between = (timestamp1, timestamp2, unit, options) => {
  const slots1 = toSlots(timestamp1)
  const slots2 = toSlots(timestamp2)
  const seconds = slots2.seconds - slots1.seconds
  const nanoseconds = slots2.nanoseconds - slots1.nanoseconds
  return DurationSlotsToDuration({
    seconds,
    nanoseconds
  }, unit, options)
}

const compare = (timestamp1, timestamp2) => {
  const {
    seconds: seconds1,
    nanoseconds: nanoseconds1
  } = toSlots(timestamp1)
  const {
    seconds: seconds2,
    nanoseconds: nanoseconds2
  } = toSlots(timestamp2)
  return seconds1 === seconds2 && nanoseconds1 === nanoseconds2 ? 0 :
    seconds1 >= seconds2 && nanoseconds1 >= nanoseconds2 ? 1 : -1
}

const of = (amount, unit) => {
  const slots = DurationConvertToSlots(amount, unit)
  return new Timestamp(slots.seconds, slots.nanoseconds)
}
const ofNanoseconds = nanoseconds => of(nanoseconds, 'nanosecond')
const ofNanos = ofNanoseconds
const ofMicroseconds = microseconds => of(microseconds, 'microsecond')
const ofMicros = ofMicroseconds
const ofMilliseconds = milliseconds => of(milliseconds, 'millisecond')
const ofMillis = ofMilliseconds
const ofSeconds = seconds => of(seconds, 'second')
const ofMinutes = minutes => of(minutes, 'minute')
const ofHours = hours => of(hours, 'hour')
const ofDays = days => of(days, 'day')
const ofWeeks = weeks => of(weeks, 'week')
const ofMonths = months => of(months, 'month')
const ofQuarters = quarters => of(quarters, 'quarter')
const ofYears = years => of(years, 'year')

const _fromFields = fields => {
  const slots = _fieldsToSlots(fields)
  return new Timestamp(slots.seconds, slots.nanoseconds)
}
const fromFields = fields => {
  fields = toFields(fields)
  return _fromFields(fields)
}

const from = input => {
  const slots = toSlots(input)
  return new Timestamp(slots.seconds, slots.nanoseconds)
}

class Timestamp {
  constructor(...args) {
    const {length} = args
    if (!length) {
      const timestamp = DateNow()
      const seconds = MathFloor(timestamp / MILLISECONDS_PER_SECOND)
      const nanoseconds = (timestamp - seconds * MILLISECONDS_PER_SECOND) * NANOSECONDS_PER_MILLISECOND
      this[secondsSymbol] = seconds
      this[nanosecondsSymbol] = nanoseconds
    } else if (length === 1) {
      const [timestamp] = args
      const slots = timestampToSlots(timestamp)
      this[secondsSymbol] = slots.seconds
      this[nanosecondsSymbol] = slots.nanoseconds
    } else {
      let [seconds, nanoseconds] = args
      const slots = wrapSlots({
        seconds,
        nanoseconds
      })
      this[secondsSymbol] = slots.seconds
      this[nanosecondsSymbol] = slots.nanoseconds
    }
  }

  get seconds() {
    return this[secondsSymbol]
  }

  get nanoseconds() {
    return this[nanosecondsSymbol]
  }

  get isZero() {
    return this[secondsSymbol] === 0 && this[nanosecondsSymbol] === 0
  }

  get isNegative() {
    return this[secondsSymbol] < 0 || this[nanosecondsSymbol] < 0
  }

  get sign() {
    const seconds = this[secondsSymbol]
    const nanoseconds = this[nanosecondsSymbol]
    return (seconds > 0 || nanoseconds > 0) ? 1 : (seconds < 0 || nanoseconds < 0) ? -1 : 0
  }

  withSeconds(seconds) {
    return new Timestamp(seconds, this[nanosecondsSymbol])
  }

  withNanoseconds(nanoseconds) {
    return new Timestamp(this[secondsSymbol], nanoseconds)
  }

  [addSymbol](...args) {
    let slots = null
    if (args.length > 1) {
      const [amount, unit] = args
      slots = DurationConvertToSlots(amount, unit)
    } else {
      const [input] = args
      slots = DurationToSlots(input)
    }
    const seconds = this[secondsSymbol] + slots.seconds
    const nanoseconds = this[nanosecondsSymbol] + slots.nanoseconds
    return new Timestamp(seconds, nanoseconds)
  }

  add(...args) {
    return FunctionPrototypeApply(this[addSymbol], this, args)
  }

  addNanoseconds(nanoseconds) {
    return this[addSymbol](nanoseconds, 'nanosecond')
  }

  addMicroseconds(microseconds) {
    return this[addSymbol](microseconds, 'microsecond')
  }

  addMilliseconds(milliseconds) {
    return this[addSymbol](milliseconds, 'millisecond')
  }

  addSeconds(seconds) {
    return this[addSymbol](seconds, 'second')
  }

  addMinutes(minutes) {
    return this[addSymbol](minutes, 'minute')
  }

  addHours(hours) {
    return this[addSymbol](hours, 'hour')
  }

  addDays(days) {
    return this[addSymbol](days, 'day')
  }

  addWeeks(weeks) {
    return this[addSymbol](weeks, 'week')
  }

  addMonths(months) {
    return this[addSymbol](months, 'month')
  }

  addQuarters(quarters) {
    return this[addSymbol](quarters, 'quarter')
  }

  addYears(years) {
    return this[addSymbol](years, 'year')
  }

  [subtractSymbol](...args) {
    let slots = null
    if (args.length > 1) {
      const [amount, unit] = args
      slots = DurationConvertToSlots(amount, unit)
    } else {
      const [input] = args
      slots = DurationToSlots(input)
    }
    const seconds = this[secondsSymbol] - slots.seconds
    const nanoseconds = this[nanosecondsSymbol] - slots.nanoseconds
    return new Timestamp(seconds, nanoseconds)
  }

  subtract(...args) {
    return FunctionPrototypeApply(this[subtractSymbol], this, args)
  }

  subtractNanoseconds(nanoseconds) {
    return this[subtractSymbol](nanoseconds, 'nanosecond')
  }

  subtractMicroseconds(microseconds) {
    return this[subtractSymbol](microseconds, 'microsecond')
  }

  subtractMilliseconds(milliseconds) {
    return this[subtractSymbol](milliseconds, 'millisecond')
  }

  subtractSeconds(seconds) {
    return this[subtractSymbol](seconds, 'second')
  }

  subtractMinutes(minutes) {
    return this[subtractSymbol](minutes, 'minute')
  }

  subtractHours(hours) {
    return this[subtractSymbol](hours, 'hour')
  }

  subtractDays(days) {
    return this[subtractSymbol](days, 'day')
  }

  subtractWeeks(weeks) {
    return this[subtractSymbol](weeks, 'week')
  }

  subtractMonths(months) {
    return this[subtractSymbol](months, 'month')
  }

  subtractQuarters(quarters) {
    return this[subtractSymbol](quarters, 'quarter')
  }

  subtractYears(years) {
    return this[subtractSymbol](years, 'year')
  }

  round(options) {
    if (options === undefined) {
      options = {}
    } else if (!TypesIsPlainObject(options)) {
      throw new TypeError('The options must be a plain object')
    }
    let {
      roundingMode
    } = options
    if (roundingMode === undefined) {
      roundingMode = ROUNDING_MODE
    }
    const parts = DurationSlotsToParts({
      seconds: this[secondsSymbol],
      nanoseconds: this[nanosecondsSymbol]
    }, {
      ...options,
      rounding: true,
      roundingMode
    })
    const slots = DurationPartsToSlots(parts)
    return new Timestamp(slots.seconds, slots.nanoseconds)
  }

  between(input) {
    const slots = toSlots(input)
    const seconds = slots.seconds - this[secondsSymbol]
    const nanoseconds = slots.nanoseconds - this[nanosecondsSymbol]
    return new Duration(seconds, nanoseconds)
  }

  compare(input) {
    const {
      seconds: secondsSlot,
      nanoseconds: nanosecondsSlot
    } = toSlots(input)
    const seconds = this[secondsSymbol]
    const nanoseconds = this[nanosecondsSymbol]
    return seconds === secondsSlot && nanoseconds === nanosecondsSlot ? 0 :
      seconds >= secondsSlot && nanoseconds >= nanosecondsSlot ? 1 : -1
  }

  [convertToSymbol](unit, options) {
    return DurationSlotsToDuration({
      seconds: this[secondsSymbol],
      nanoseconds: this[nanosecondsSymbol]
    }, unit, options)
  }

  convertTo(unit, options) {
    return this[convertToSymbol](unit, options)
  }

  toNanoseconds(options) {
    return this[convertToSymbol]('nanosecond', options)
  }

  toMicroseconds(options) {
    return this[convertToSymbol]('microsecond', options)
  }

  toMilliseconds(options) {
    return this[convertToSymbol]('millisecond', options)
  }

  toSeconds(options) {
    return this[convertToSymbol]('second', options)
  }

  toMinutes(options) {
    return this[convertToSymbol]('minute', options)
  }

  toHours(options) {
    return this[convertToSymbol]('hour', options)
  }

  toDays(options) {
    return this[convertToSymbol]('day', options)
  }

  toWeeks(options) {
    return this[convertToSymbol]('week', options)
  }

  toMonths(options) {
    return this[convertToSymbol]('month', options)
  }

  toQuarters(options) {
    return this[convertToSymbol]('quarter', options)
  }

  toYears(options) {
    return this[convertToSymbol]('year', options)
  }

  toSlots() {
    return {
      seconds: this[secondsSymbol],
      nanoseconds: this[nanosecondsSymbol]
    }
  }

  toFields(options) {
    return slotsToFields({
      seconds: this[secondsSymbol],
      nanoseconds: this[nanosecondsSymbol]
    }, options)
  }

  toDuration() {
    return new Duration(this[secondsSymbol], this[nanosecondsSymbol])
  }

  toDate() {
    const milliseconds = DurationSlotsToDuration({
      seconds: this[secondsSymbol],
      nanoseconds: this[nanosecondsSymbol]
    }, 'millisecond')
    return new Date(milliseconds)
  }

  [toStringSymbol]() {
    const {
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond
    } = _slotsToFields({
      seconds: this[secondsSymbol],
      nanoseconds: this[nanosecondsSymbol]
    }, {
      smallestUnit: 'nanosecond',
      roundingMode: ROUNDING_MODE
    })
    return `${year < 0 ? `${NEGATIVE_CHAR}${StringPrototypePadStart(-year, 4, 0)}` : `${StringPrototypePadStart(year, 4, 0)}`}-${
      StringPrototypePadStart(month, 2, 0)}-${
      StringPrototypePadStart(day, 2, 0)}T${
      StringPrototypePadStart(hour, 2, 0)}:${
      StringPrototypePadStart(minute, 2, 0)}:${
      StringPrototypePadStart(second, 2, 0)}${SEPARATOR_CHAR}${
      StringPrototypePadStart(millisecond, 3, 0)}${
      StringPrototypePadStart(microsecond, 3, 0)}${
      StringPrototypePadStart(nanosecond, 3, 0)}Z`
  }

  toString() {
    return this[toStringSymbol]()
  }

  toJSON() {
    return this[toStringSymbol]()
  }

  toDateString() {
    const {
      year,
      month,
      day
    } = _slotsToFields({
      seconds: this[secondsSymbol],
      nanoseconds: this[nanosecondsSymbol]
    }, {
      smallestUnit: 'day',
      roundingMode: ROUNDING_MODE
    })
    return `${
      year < 0 ? `${NEGATIVE_CHAR}${StringPrototypePadStart(-year, 4, 0)}` : `${StringPrototypePadStart(year, 4, 0)}`
    }-${StringPrototypePadStart(month, 2, 0)}-${StringPrototypePadStart(day, 2, 0)}`
  }

  toTimeString(options) {
    if (options === undefined) {
      options = {}
    } else if (!TypesIsPlainObject(options)) {
      throw new TypeError('The options must be a plain object')
    }
    let {
      smallestUnit
    } = options
    if (smallestUnit === undefined) {
      smallestUnit = 'second'
    } else {
      const unitIndex = DurationGetUnitIndex(smallestUnit)
      if (unitIndex > 4) {
        smallestUnit = 'minute'
      }
    }
    const {
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond
    } = _slotsToFields({
      seconds: this[secondsSymbol],
      nanoseconds: this[nanosecondsSymbol]
    }, {
      smallestUnit,
      roundingMode: ROUNDING_MODE
    })
    let result = `${StringPrototypePadStart(hour, 2, 0)}:${StringPrototypePadStart(minute, 2, 0)}`
    if (second !== undefined) {
      result += `:${StringPrototypePadStart(second, 2, 0)}`
      if (millisecond !== undefined) {
        result += `${SEPARATOR_CHAR}${StringPrototypePadStart(millisecond, 3, 0)}`
        if (microsecond !== undefined) {
          result += `${StringPrototypePadStart(microsecond, 3, 0)}`
          if (nanosecond !== undefined) {
            result += `${StringPrototypePadStart(nanosecond, 3, 0)}`
          }
        }
      }
    }
    return result
  }

  toDateTimeString(options) {
    if (options === undefined) {
      options = {}
    } else if (!TypesIsPlainObject(options)) {
      throw new TypeError('The options must be a plain object')
    }
    let {
      smallestUnit
    } = options
    if (smallestUnit === undefined) {
      smallestUnit = 'second'
    } else {
      const unitIndex = DurationGetUnitIndex(smallestUnit)
      if (unitIndex > 4) {
        smallestUnit = 'minute'
      }
    }
    const {
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond
    } = _slotsToFields({
      seconds: this[secondsSymbol],
      nanoseconds: this[nanosecondsSymbol]
    }, {
      smallestUnit,
      roundingMode: ROUNDING_MODE
    })
    let result = `${year < 0 ? `${NEGATIVE_CHAR}${StringPrototypePadStart(-year, 4, 0)}` : `${StringPrototypePadStart(year, 4, 0)}`}-${
      StringPrototypePadStart(month, 2, 0)}-${
      StringPrototypePadStart(day, 2, 0)}T${
      StringPrototypePadStart(hour, 2, 0)}:${
      StringPrototypePadStart(minute, 2, 0)}`
    if (second !== undefined) {
      result += `:${StringPrototypePadStart(second, 2, 0)}`
      if (millisecond !== undefined) {
        result += `${SEPARATOR_CHAR}${StringPrototypePadStart(millisecond, 3, 0)}`
        if (microsecond !== undefined) {
          result += `${StringPrototypePadStart(microsecond, 3, 0)}`
          if (nanosecond !== undefined) {
            result += `${StringPrototypePadStart(nanosecond, 3, 0)}`
          }
        }
      }
    }
    return result
  }

  [valueOfSymbol]() {
    return this[secondsSymbol] + (this[nanosecondsSymbol] / NANOSECONDS_PER_SECOND)
  }

  valueOf() {
    return this[valueOfSymbol]()
  }

  [SymbolToPrimitive](hint) {
    return hint === 'string' ? this[toStringSymbol]() : this[valueOfSymbol]()
  }
}

const isTimestamp = FunctionPrototypeBind(FunctionPrototypeSymbolHasInstance, null, Timestamp)

ObjectDefineProperties(Timestamp, {
  NEGATIVE_CHAR: {
    value: NEGATIVE_CHAR
  },
  SEPARATOR_CHAR: {
    value: SEPARATOR_CHAR
  },
  DAYS_PER_LEAP_YEAR: {
    value: DAYS_PER_LEAP_YEAR
  },
  EPOCH_YEAR: {
    value: EPOCH_YEAR
  },
  UNIT: {
    value: UNIT
  },
  ROUNDING_MODE: {
    value: ROUNDING_MODE
  },
  EPOCH: {
    value: EPOCH
  },
  isTimestamp: {
    value: isTimestamp
  },
  now: {
    value: now
  },
  isLeapYear: {
    value: isLeapYear
  },
  getDaysInYear: {
    value: getDaysInYear
  },
  getDaysInMonths: {
    value: getDaysInMonths
  },
  normalizeYearMonth: {
    value: normalizeYearMonth
  },
  getDaysInMonth: {
    value: getDaysInMonth
  },
  yearToDays: {
    value: yearToDays
  },
  daysToYear: {
    value: daysToYear
  },
  getDayOfYear: {
    value: getDayOfYear
  },
  dateToDays: {
    value: dateToDays
  },
  getDayOfWeek: {
    value: getDayOfWeek
  },
  dayOfYearToDate: {
    value: dayOfYearToDate
  },
  daysToDate: {
    value: daysToDate
  },
  normalizeDate: {
    value: normalizeDate
  },
  slotsToFields: {
    value: slotsToFields
  },
  fieldsToSlots: {
    value: fieldsToSlots
  },
  fieldsToTimestamp: {
    value: fieldsToTimestamp
  },
  normalizeFields: {
    value: normalizeFields
  },
  parseTimestampToFields: {
    value: parseTimestampToFields
  },
  parseTimestamp: {
    value: parseTimestamp
  },
  parseDateToFields: {
    value: parseDateToFields
  },
  parseDate: {
    value: parseDate
  },
  parseTimeToFields: {
    value: parseTimeToFields
  },
  parseTime: {
    value: parseTime
  },
  parseDateTimeToFields: {
    value: parseDateTimeToFields
  },
  parseDateTime: {
    value: parseDateTime
  },
  parseToFields: {
    value: parseToFields
  },
  parse: {
    value: parse
  },
  timestampToSlots: {
    value: timestampToSlots
  },
  toSlots: {
    value: toSlots
  },
  toTimestamp: {
    value: toTimestamp
  },
  between: {
    value: between
  },
  compare: {
    value: compare
  },
  of: {
    value: of
  },
  ofNanoseconds: {
    value: ofNanoseconds
  },
  ofNanos: {
    value: ofNanos
  },
  ofMicroseconds: {
    value: ofMicroseconds
  },
  ofMicros: {
    value: ofMicros
  },
  ofMilliseconds: {
    value: ofMilliseconds
  },
  ofMillis: {
    value: ofMillis
  },
  ofSeconds: {
    value: ofSeconds
  },
  ofMinutes: {
    value: ofMinutes
  },
  ofHours: {
    value: ofHours
  },
  ofDays: {
    value: ofDays
  },
  ofWeeks: {
    value: ofWeeks
  },
  ofMonths: {
    value: ofMonths
  },
  ofQuarters: {
    value: ofQuarters
  },
  ofYears: {
    value: ofYears
  },
  fromFields: {
    value: fromFields
  },
  from: {
    value: from
  }
})
ObjectDefineProperties(Timestamp.prototype, {
  withNanos: {
    value: Timestamp.prototype.withNanoseconds
  },
  addNanos: {
    value: Timestamp.prototype.addNanoseconds
  },
  addMicros: {
    value: Timestamp.prototype.addMicroseconds
  },
  addMillis: {
    value: Timestamp.prototype.addMilliseconds
  },
  subtractNanos: {
    value: Timestamp.prototype.subtractNanoseconds
  },
  subtractMicros: {
    value: Timestamp.prototype.subtractMicroseconds
  },
  subtractMillis: {
    value: Timestamp.prototype.subtractMilliseconds
  },
  toNanos: {
    value: Timestamp.prototype.toNanoseconds
  },
  toMicros: {
    value: Timestamp.prototype.toMicroseconds
  },
  toMillis: {
    value: Timestamp.prototype.toMilliseconds
  },
  [SymbolToStringTag]: {
    value: 'Timestamp'
  }
})

module.exports = Timestamp
