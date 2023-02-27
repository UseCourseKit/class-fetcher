import { Database, Statement } from 'bun:sqlite'
import { join } from 'path'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import dayjs from 'dayjs'

dayjs.extend(utc)
dayjs.extend(timezone)

export interface StoredMeetingInfo {
  classNumber: number
  school: string
  fullSubject: string
  subject: string
  catalogNumber: string
  section: number
  courseTitle: string
  component: string
  startDate: Date
  endDate: Date
  location: string
  instructor: string | null
}

interface CsvRow {
  Term: string
  Session: string
  'Acad Group': string
  'Class Nbr': string
  Subject: string
  'Catalog Nbr': string
  Section: string
  'Course Title': string
  Component: string
  Codes: string
  M: string
  T: string
  W: string
  TH: string
  F: string
  S: string
  SU: string
  'Start Date': string
  'End Date': string
  Time: string
  Location: string
  Instructor: string
  Units: string
  SubjectCode: string
  CourseCode: string
}

// The CSV repeats a lot of strings (like "Engineering", "Literature, Sci, and the Arts", etc.)
// Storing the repeated strings in one place reduces memory footprint by a lot.
const stringStore = new Map<string, string>()

function storedCopy (str: string): string {
  if (!stringStore.has(str)) {
    stringStore.set(str, str)
  }
  return stringStore.get(str)!
}

export function parseCsvRow (row: CsvRow): StoredMeetingInfo {
  return {
    classNumber: parseInt(row['Class Nbr']),
    school: storedCopy(row['Acad Group']),
    fullSubject: storedCopy(row.Subject),
    subject: storedCopy(row.SubjectCode),
    catalogNumber: row['Catalog Nbr'].trim(),
    section: parseInt(row.Section),
    courseTitle: row['Course Title'],
    component: storedCopy(row.Component),
    startDate: dayjs(row['Start Date']).tz('America/New_York').toDate(),
    endDate: dayjs(row['End Date']).tz('America/New_York').toDate(),
    instructor: row.Instructor === '' ? null : row.Instructor,
    location: row.Location
  }
}

export class CsvCatalogStore {
  private db: Database
  private lookupQuery: Statement

  constructor(term: number) {
    this.db = new Database(join(import.meta.dir, 'soc', `${term}.sqlite3`), {readonly: true})
    this.lookupQuery = this.db.query('SELECT * FROM sections WHERE `Class Nbr` = ?1;')
  }

  lookupByClassNumber (classNumber: number): StoredMeetingInfo[] {
    const rows: CsvRow[] = this.lookupQuery.all(classNumber.toString()) as any[]
    return rows.map(parseCsvRow)
  }
}
