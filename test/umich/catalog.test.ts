import { describe, it, expect } from 'vitest'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
import { DayOfWeek, EnrollmentStats, Section } from '../../src/entities'
import { UMichCatalog } from '../../src/umich/catalog'
import * as dotenv from 'dotenv'

dotenv.config()
dayjs.extend(utc)
dayjs.extend(timezone)

const client = new UMichCatalog(process.env['UMICH_CLIENT_ID']!, process.env['UMICH_CLIENT_SECRET']!)

describe("test catalog", () => {
  it("should fetch full sections in course schedule", async () => {
    const course = 'MATH 116'
    const sectionCode = '112'
    const schedule = await client.fetchCourseSchedule('Winter 2023', course)
    const section = await client.fetchSection('Winter 2023', course, sectionCode)

    expect(schedule!.sections[sectionCode]).toEqual(section)
  })

  it("should handle courses with unscheduled midterm exams", async () => {
    const course = 'EECS 203'
    const sectionCode = '099'
    const schedule = await client.fetchCourseSchedule('Fall 2023', course)
    const section = await client.fetchSection('Fall 2023', course, sectionCode)

    expect(schedule!.sections[sectionCode]).toEqual(section)
  })

  // check the return values from all three methods against expected full value
  it('should fetch and parse sections correctly across all three endpoints', async () => {
    const correct: Section & EnrollmentStats = {
      code: '025',
      capacity: 33,
      enrollOpen: true,
      enrolled: 31,
      seatsOpen: 2,
      classNumber: 21181,
      component: 'LAB',
      instructors: [{id: 'mipeng', name: 'Michael Peng'}],
      meetings: [{
        days: new Set([DayOfWeek.Wednesday]),
        startDate: dayjs.utc('2023-01-04').tz('America/New_York').toDate(),
        endDate: dayjs.utc('2023-04-18').tz('America/New_York').toDate(),
        startTime: [14, 30],
        endTime: [16, 30],
        location: {
          code: '1005 DOW',
          lat: 42.2930064,
          lon: -83.7154285
        }
      }]
    }

    const section = await client.fetchSection('Winter 2023', 'EECS 280', '025')
    const allSections = await client.fetchCourseSchedule('Winter 2023', 'EECS 280')
    const klass = await client.fetchClass('Winter 2023', 21181)

    expect(section).toStrictEqual(correct)
    expect(allSections!.sections['025']).toStrictEqual(correct)
    expect(klass!.section).toStrictEqual(correct)
    expect(klass!.course).toStrictEqual('EECS 280')
  })

  it('should handle custom start and end dates properly', async () => {
    const schedule = await client.fetchCourseSchedule('Winter 2023', 'SLAVIC 290')
    expect(schedule!.code).toStrictEqual('SLAVIC 290')
    expect(schedule!.enrollmentGroups.length).toStrictEqual(11)

    const section005 = schedule!.sections['005']
    expect(section005.classNumber).toBe(31244)
    expect(section005.meetings.length).toBe(1)
    expect(section005.meetings[0].days).toStrictEqual(new Set([DayOfWeek.Wednesday]))
    expect(section005.meetings[0].startDate).toStrictEqual(dayjs.utc('2023-03-06').tz('America/New_York').toDate())
    expect(section005.meetings[0].endDate).toStrictEqual(dayjs.utc('2023-04-18').tz('America/New_York').toDate())
    expect(section005.meetings[0].location).toStrictEqual({code: 'REMOTE', lat: undefined, lon: undefined})
    expect(section005.instructors).toStrictEqual([{
      id: 'mburak',
      name: 'Mariana Burak'
    }])
  })

  it('should detect courses with no description', async () => {
    const comm = await client.fetchCourseInfo('Fall 2023', 'COMM 360')
    expect(comm).not.toBeNull()
    expect(comm?.description).toBeUndefined()

    const comms = await client.fetchCourseInfo('Fall 2023', 'COMMS 111')
    expect(comms).toBeNull()
  })
})
