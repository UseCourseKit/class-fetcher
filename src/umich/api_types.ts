type MaybeArray<T> = T | T[]

export interface BaseSectionJson {
  SectionType: string
  SessionDescr: string
  InstructionMode: string
  EnrollmentStatus: 'Open' | 'Wait List' | 'Closed'
  EnrollmentTotal: number
  EnrollmentCapacity: number
  AvailableSeats: number
  WaitTotal: number
  WaitCapacity: number
  CreditHours: number | string
  ClassNumber: number
  ClassTopic: string
  EnrollmentClassType: 'N' | 'E'
}

export interface SectionBasedSectionJson extends BaseSectionJson {
  AssociatedClass: number
  AutoEnrollSection1: number | string | null
  AutoEnrollSection2: number | string | null
}

export interface AllSectionsSectionJson extends SectionBasedSectionJson {
  SectionNumber: string | number
  Meeting?: MaybeArray<AllSectionsMeetingElement>
  ClassInstructors?: MaybeArray<ClassInstructor>
}

export interface SectionQuerySectionJson extends SectionBasedSectionJson {
  CourseDescr: string
  Meeting: MaybeArray<SectionQueryMeetingElement>
  Instructor: MaybeArray<FullInstructor>
}

export interface ClassQuerySectionJson extends BaseSectionJson {
  CourseDescr: string
  SubjectCode: string
  CatalogNumber: string | number
  SectionNumber: string | number
  Meeting: MaybeArray<SectionQueryMeetingElement & Pick<AllSectionsMeetingElement, 'Instructors'>>
  Instructor: MaybeArray<Instructor>
}

export interface Instructor {
  InstructorName: string
  Uniqname: string
}

export interface FullInstructor extends Instructor {
  FirstName: string
  LastName: string
}

export interface ClassInstructor {
  InstrUniqname: string
  InstrName: string
}

// The abbreviated meeting details from the list-all-sections endpoint
export interface AllSectionsMeetingElement {
  MeetingNumber: number
  Days: string
  Times: string
  /**
   * Actually contains the location where the section takes place
   */
  ClassMtgTopic: string
  // Example: "Hamerink,John Douglas ; de Peralta,Tracy Lynn" or "Staff"
  Instructors: string
}

export interface SectionQueryMeetingElement {
  MeetingNumber: number
  Days: string
  Times: string
  StartDate: string
  EndDate: string
  // Location can be formatted like "MH3302" or "3302 MH"
  Location: string
  // Don't count on this containing the location. That is only the case if we look up by class number
  TopicDescr: string
}

export interface FullMeetingElement extends SectionQueryMeetingElement {
  InstructorName: string
}
