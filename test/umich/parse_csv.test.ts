import { describe, expect, it } from 'bun:test'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { CsvCatalogStore, parseCsvRow } from '../../src/umich/local_db'

dayjs.extend(utc)
dayjs.extend(timezone)

const eecs280Lab25 = {
  Term: 'Winter 2023',
  Session: 'Regular Academic Session',
  'Acad Group': 'Engineering',
  'Class Nbr': '21181',
  Subject: 'Electrical Engineering And Computer Science (EECS)',
  'Catalog Nbr': ' 280',
  Section: '25',
  'Course Title': 'Prog&Data Struct',
  Component: 'LAB',
  Codes: 'P RW',
  M: '',
  T: '',
  W: 'W',
  TH: '',
  F: '',
  S: '',
  SU: '',
  'Start Date': '01/04/2023',
  'End Date': '04/18/2023',
  Time: '230-430PM',
  Location: '1005 DOW',
  Instructor: 'Peng',
  Units: '4.00',
  'Unnamed: 23': '',
  SubjectCode: 'EECS',
  CourseCode: 'EECS 280'
}

const eecs280Lab25Info = {
  classNumber: 21181,
  school: 'Engineering',
  fullSubject: 'Electrical Engineering And Computer Science (EECS)',
  subject: 'EECS',
  catalogNumber: '280',
  section: 25,
  courseTitle: 'Prog&Data Struct',
  component: 'LAB',
  startDate: dayjs('01/04/2023').tz('America/New_York').toDate(),
  endDate: dayjs('04/18/2023').tz('America/New_York').toDate(),
  location: '1005 DOW',
  instructor: 'Peng'
}

const eecs583Lec = {
  Term: 'Winter 2023',
  Session: 'Regular Academic Session',
  'Acad Group': 'Engineering',
  'Class Nbr': '36703',
  Subject: 'Electrical Engineering And Computer Science (EECS)',
  'Catalog Nbr': ' 583',
  Section: '1',
  'Course Title': 'Advanced Compilers',
  Component: 'LEC',
  Codes: 'P  W',
  M: '',
  T: '',
  W: 'W',
  TH: '',
  F: '',
  S: '',
  SU: '',
  'Start Date': '01/04/2023',
  'End Date': '04/18/2023',
  Time: '1230-130PM',
  Location: '1005 DOW',
  Instructor: '',
  Units: '4.00',
  SubjectCode: 'EECS',
  CourseCode: 'EECS 583'
}

describe('parseCsvRow', () => {
  it('parses EECS 280 lab section 25 W23 correctly', () => {
    const row = parseCsvRow(eecs280Lab25)
    expect(row).toStrictEqual(eecs280Lab25Info)
  })

  it('parses EECS 583 lecture (with no instructor) correctly', () => {
    const row = parseCsvRow(eecs583Lec)
    expect(row).toStrictEqual({
      classNumber: 36703,
      school: 'Engineering',
      fullSubject: 'Electrical Engineering And Computer Science (EECS)',
      subject: 'EECS',
      catalogNumber: '583',
      section: 1,
      courseTitle: 'Advanced Compilers',
      component: 'LEC',
      startDate: dayjs('01/04/2023').tz('America/New_York').toDate(),
      endDate: dayjs('04/18/2023').tz('America/New_York').toDate(),
      location: '1005 DOW',
      instructor: null
    })
  })
})

describe('CsvCatalogStore', () => {
  it('loads winter 2023 successfully', async () => {
    const store = new CsvCatalogStore(2420)
    expect(store.lookupByClassNumber(eecs280Lab25Info.classNumber)).toStrictEqual([eecs280Lab25Info])
    expect(store.lookupByClassNumber(16143).length).toBe(2)
  })
})
