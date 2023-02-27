import { describe, it, expect } from 'bun:test'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { DayOfWeek, EnrollmentStats, Section } from '../../src/entities'
import { UMichCatalog } from '../../src/umich/catalog'

dayjs.extend(utc)
dayjs.extend(timezone)

const client = new UMichCatalog(Bun.env['UMICH_CLIENT_ID']!, Bun.env['UMICH_CLIENT_SECRET']!, 2420)

describe("test catalog", () => {
  it("should fetch full sections in course schedule", async () => {
    const course = 'MATH 116'
    const sectionCode = '112'
    const schedule = await client.fetchCourseSchedule(course)
    const section = await client.fetchSection(course, sectionCode)

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
      instructors: [{id: 'mipeng', name: 'Peng'}],
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

    const section = await client.fetchSection('EECS 280', '025')
    const allSections = await client.fetchCourseSchedule('EECS 280')
    const klass = await client.fetchClass(21181)

    expect(section).toStrictEqual(correct)
    expect(allSections!.sections['025']).toStrictEqual(correct)
    expect(klass!.section).toStrictEqual(correct)
    expect(klass!.course).toStrictEqual('EECS 280')
  })

  it('should handle custom start and end dates properly', async () => {
    const schedule = await client.fetchCourseSchedule('SLAVIC 290')
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
      name: 'Burak'
    }])
  })
})
