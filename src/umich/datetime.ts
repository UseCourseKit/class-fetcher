import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat.js'
import utc from 'dayjs/plugin/utc.js'
import { DayOfWeek, Meeting } from '../entities.js'
import { SectionQueryMeetingElement } from './api_types.js'
import { findLocation } from './buildings'

dayjs.extend(customParseFormat)
dayjs.extend(utc)

const dayNames = Object.freeze({
  Mo: DayOfWeek.Monday,
  Tu: DayOfWeek.Tuesday,
  We: DayOfWeek.Wednesday,
  Th: DayOfWeek.Thursday,
  Fr: DayOfWeek.Friday,
  Sa: DayOfWeek.Saturday,
  Su: DayOfWeek.Sunday
})

export function parseMeeting ({ Days, Times, StartDate, EndDate, Location }: SectionQueryMeetingElement): Meeting | null {
  if (Days === 'TBA' || Times === 'TBA') { return null }
  const [start, end] = Times.split(' - ').map((s) => dayjs(s, 'h:mmA'))
  const [startDate, endDate] = [StartDate, EndDate].map(d => dayjs.utc(d, 'MM/DD/YYYY'))
  const latLon = Location !== undefined ? findLocation(Location) : null
  return {
    days: new Set(Object.entries(dayNames).filter(([name, _]) => Days.includes(name)).map(pair => pair[1])),
    startTime: [start.hour(), start.minute()],
    endTime: [end.hour(), end.minute()],
    location: Location === undefined
      ? undefined
      : {
          code: Location,
          lat: latLon === null ? undefined : latLon[1],
          lon: latLon === null ? undefined : latLon[0]
        },
    startDate: startDate.toDate(),
    endDate: endDate.toDate()
  }
}

export function meetingsOverlap (m1: Meeting, m2: Meeting) {
  if (m1 == null || m2 == null) return false
  // No overlap in dates
  if (m2.startDate.getTime() > m1.endDate.getTime() || m1.startDate.getTime() > m2.endDate.getTime()) {
    return false
  }
  for (const day of Object.values(dayNames)) {
    if (m1.days.has(day) && m2.days.has(day)) {
      const start1 = m1.startTime[0] * 60 + m1.startTime[1]
      const end1 = m1.endTime[0] * 60 + m1.endTime[1]
      const start2 = m2.startTime[0] * 60 + m2.startTime[1]
      const end2 = m2.endTime[0] * 60 + m2.endTime[1]
      // const between = (a: number, less: number, more: number) => a > less && a < more
      if (start1 === start2) return true
      if (end1 === end2) return true
      if (start2 < end1 && end2 > start1)
      // if (
      //   between(start1, start2, end2) || between(end1, start2, end2) ||
      //   between(start2, start1, end1) || between(end2, start1, end1)
      {
        return true
      }
    }
  }
  return false
}
