export enum DayOfWeek {
  Monday = 'Mon',
  Tuesday = 'Tue',
  Wednesday = 'Wed',
  Thursday = 'Thu',
  Friday = 'Fri',
  Saturday = 'Sat',
  Sunday = 'Sun',
}

export interface Meeting {
  days: Set<DayOfWeek>
  startTime: [number, number]
  endTime: [number, number]
  startDate: Date
  endDate: Date
  location?: {
    code: string
    lat?: number
    lon?: number
  }
}

export interface Section {
  /**
   * Identifier of the section.
   *
   * @example "001" // for UMich
   * @example "B1" // for BU
   */
  code: string
  /**
   * Course component of the section.
   * Example: "LEC", "DIS", "LAB"
   */
  component: string
  /**
   * Unique identifier number for this specific class section.
   * Example: 10442
   */
  classNumber: number
  instructors: Array<{ id: string, name: string }>
  meetings: Meeting[]
}

export interface EnrollmentStats {
  capacity: number
  enrolled: number
  seatsOpen: number
  enrollOpen: boolean
}

export interface EnrollmentGroup {
  sections: Set<string>
  minCredits: number
  maxCredits: number
}

export interface CourseSchedule<EnrollStats extends boolean = false> {
  /**
   * Unique identifier of the course, often including the subject and a catalog number.
   *
   * @example "EECS 280"
   */
  code: string
  sections: { [code: string]: (EnrollStats extends true ? (Section & EnrollmentStats) : Section) }
  enrollmentGroups: EnrollmentGroup[]
}

export interface CourseInfo {
  code: string
  subject: string
  // Non-number example: CS 61A
  catalogNumber: string
  title: string
  description?: string
}
