// An oddity of the SOC API is that all arrays with one non-array element get reduced to just that element
// Use this liberally to account for edge cases where some singular value in one sample response suddenly becomes
// multiple in another.
export function arrayify<T> (possiblyArray: T | T[] | undefined): T[] {
  if (possiblyArray === undefined) { return [] }
  return Array.isArray(possiblyArray) ? possiblyArray : [possiblyArray]
}
// Another oddity of the SOC API is that SectionNumber can be both `100` and `"007"`
// Use this liberally on numbers that might be left-padded with zeros.
export function integrify (possiblyString: number | string): number {
  return typeof possiblyString === 'string' ? parseInt(possiblyString, 10) : possiblyString
}

export function parseCreditHours (creditHours: number | string) {
  return (typeof creditHours === 'string' && creditHours.includes('-'))
    ? creditHours.split(' - ').map(i => parseInt(i, 10))
    : [creditHours, creditHours]
}
