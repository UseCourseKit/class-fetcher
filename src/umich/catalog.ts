import assert from 'assert'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import timezone from 'dayjs/plugin/timezone'
import type { CourseCatalog } from '../catalog'
import { CourseInfo, CourseSchedule, EnrollmentStats, Meeting, Section } from '../entities'
import { ClassInstructor, Instructor, AllSectionsSectionJson, SectionQuerySectionJson, FullMeetingElement, BaseSectionJson, ClassQuerySectionJson, FullInstructor } from './api_types'
import { allEnrollmentGroups } from './clusters'
import { parseMeeting } from './datetime'
import { CsvCatalogStore, StoredMeetingInfo } from './local_db'
import SearchEngine from './search'
import { arrayify } from './util'

dayjs.extend(customParseFormat)
dayjs.extend(timezone)

// We unfortunately cannot retrieve past term codes via the SOC API
export const termCodes = Object.freeze({
  'Winter 2023': 2420,
  'Fall 2022': 2410,
  'Winter 2022': 2370,
  'Fall 2021': 2360
})
const endpointPrefix = Object.freeze('https://gw.api.it.umich.edu/um/Curriculum/SOC')

export class UMichCatalog implements CourseCatalog {
  private accessToken: { value: string, expireAt: Date } | null = null
  private searcher: SearchEngine | null = null
  private localIndex: CsvCatalogStore

  constructor (
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly termCode: typeof termCodes[keyof typeof termCodes]) {
    this.localIndex = new CsvCatalogStore(termCode)
  }

  /**
   * Indexes the CSV file from the registrar for `searchCourses` and lookups when we are missing `startDate` and `endDate`.
   */
  async indexCatalogFile (): Promise<void> {
    if (this.searcher === null) {
      this.searcher = await SearchEngine.create(this.termCode)
    }
  }

  async searchCourses (query: string): Promise<string[]> {
    if (this.searcher === null) {
      this.searcher = await SearchEngine.create(this.termCode)
    }
    assert(this.searcher !== null)
    return await this.searcher.runSearch(query)
  }

  async fetchCourseSchedule (course: string): Promise<CourseSchedule | null> {
    const [subject, number] = course.split(/\s+/)
    const sections = await this.fetchCourseSections(subject, number)
    if (sections === null) return null
    // Because the Sections endpoint does not provide StartDate and EndDate for meetings
    // (and because we can't predict the StartDate and EndDate from the SessionDescr alone---see SOC research,)
    // we have to ask about each meeting in a separate request.
    const meetingsMap: {[code: string]: Meeting[]} = Object.fromEntries(
      await Promise.all(sections.map(
        async s => [s.SectionNumber, await this.resolveSectionMeetings(course, s)]))
    )
    const fullSections = await Promise.all(
      sections.map(async s => await this.elaborateSection(s, meetingsMap[s.SectionNumber])))
    const groups = allEnrollmentGroups(sections, meetingsMap)
    return {
      code: course,
      sections: Object.fromEntries(fullSections.map(sect => [sect.code, sect])),
      enrollmentGroups: groups
    }
  }

  private async elaborateSection (section: AllSectionsSectionJson, meetings: Meeting[]): Promise<Section> {
    return {
      ...parseBaseSection(section),
      code: section.SectionNumber.toString(),
      instructors: (arrayify(section.ClassInstructors) ?? []).map(parseClassInstructor) as Section['instructors'],
      meetings
    }
  }

  private async resolveSectionMeetings (course: string, section: AllSectionsSectionJson): Promise<Meeting[]> {
    // The meetings only need start and end dates. We'll rely on the CSV file for this.
    // If the CSV file doesn't have this, we use /Meetings
    try {
      const storedMeetings = await this.lookupClassStore(section.ClassNumber)
      if (storedMeetings.length === 0) throw new Error('no stored meetings')
      const rawPartialMeetings = arrayify(section.Meeting ?? [])
      if (rawPartialMeetings.length !== storedMeetings.length) { throw new Error(`different numbers of meetings between local CSV and API response for ${course}, ${section.SectionNumber}`) }

      return rawPartialMeetings.map((rawPartial, i) => parseMeeting({
        ...rawPartial,
        StartDate: dayjs(storedMeetings[i].startDate).format('MM/DD/YYYY'),
        EndDate: dayjs(storedMeetings[i].endDate).format('MM/DD/YYYY'),
        Location: storedMeetings[i].location,
        TopicDescr: storedMeetings[i].courseTitle
      })).filter(it => it !== null) as Meeting[]
    } catch (_: any) {
      const fullMeetings = await this.fetchSectionMeetings(course, section.SectionNumber.toString())
      assert(fullMeetings !== null)
      return fullMeetings
    }
  }

  private async fetchCourseSections (subject: string, number: string): Promise<AllSectionsSectionJson[] | null> {
    const res = await this.get(
      `/Terms/${this.termCode}/Schools/UM/Subjects/${subject}/CatalogNbrs/${number}/Sections?IncludeAllSections=Y`
    )
    const json: any = await res.json()
    const sectionsRaw = json.getSOCSectionsResponse.Section
    if (sectionsRaw === undefined) return null
    return arrayify(sectionsRaw) as AllSectionsSectionJson[]
  }

  // Strategy for handling hidden sections with fetchSection and fetchClass:
  // If the section/class number lookup fails, try to look up all sections with IncludeAllSections=Y.
  // Find the section and its AllSectionsMeetingElements, then try to resolve the meetings
  // First solution: Use the /Sections/XXX/Meetings endpoint
  // Second solution: Use the dates in soc/XXXX.csv
  private async fetchSectionMeetings (course: string, section: string): Promise<Meeting[] | null> {
    const [subject, number] = course.split(/\s+/)
    const res = await this.get(
      `/Terms/${this.termCode}/Schools/UM/Subjects/${subject}/CatalogNbrs/${number}/Sections/${section}/Meetings`
    )
    const json: any = await res.json()
    const meetings: FullMeetingElement[] = arrayify(json?.getSOCMeetingsResponse?.Meeting)
    if (meetings.length === 0) return null
    return meetings.map(parseMeeting).filter(it => it !== null) as Meeting[]
  }

  private async fetchSectionInstructors (course: string, section: string): Promise<Section['instructors'] | null> {
    const [subject, number] = course.split(/\s+/)
    const res = await this.get(
      `/Terms/${this.termCode}/Schools/UM/Subjects/${subject}/CatalogNbrs/${number}/Sections/${section}/Instructors`
    )
    const json: any = await res.json()
    const instructorsRaw: FullInstructor[] = arrayify(json?.getSOCInstructorsResponse?.Instructor)
    if (instructorsRaw.length === 0) return null
    return instructorsRaw.map(parseFullInstructor).filter(it => it !== null) as Section['instructors']
  }

  private async lookupClassStore (classNumber: number): Promise<StoredMeetingInfo[]> {
    return this.localIndex.lookupByClassNumber(classNumber)
  }

  async fetchSection (course: string, sectionCode: string): Promise<Section | null> {
    const [subject, number] = course.split(/\s+/)
    const res = await this.get(
      `/Terms/${this.termCode}/Schools/UM/Subjects/${subject}/CatalogNbrs/${number}/Sections/${sectionCode}`
    )
    const json: any = await res.json()
    const section = json.getSOCSectionDetailResponse
    if (section !== undefined && 'SectionType' in section) {
      const baseSection = parseBaseSection(section as SectionQuerySectionJson)
      return {
        ...baseSection,
        code: sectionCode,
        instructors: arrayify((section as SectionQuerySectionJson).Instructor).map(parseFullInstructor).filter(it => it !== null) as Section['instructors'],
        meetings: arrayify((section as SectionQuerySectionJson).Meeting).map(parseMeeting).filter(it => it !== null) as Meeting[]
      }
    }
    // The section is possibly hidden. We can gather its information by using more specific endpoints: Instructors and Meetings.
    // Combine that with a query for all sections in this class (with hidden sections)
    // (By the way, we can't tell from the raw response whether the hidden section exists)
    const [rawSections, instructors, meetings] = await Promise.all([
      this.fetchCourseSections(subject, number),
      this.fetchSectionInstructors(course, sectionCode),
      this.fetchSectionMeetings(course, sectionCode)
    ])
    if (meetings === null || meetings.length === 0) return null
    if (rawSections === null) return null

    const rawSection = rawSections.find(sect => sect.SectionNumber.toString() === sectionCode)
    if (rawSection === undefined) return null

    return {
      ...parseBaseSection(rawSection),
      code: sectionCode,
      instructors: instructors ?? [],
      meetings
    }
  }

  async fetchClass (classNumber: number): Promise<{ section: Section, course: string } | null> {
    const res = await this.get(`/Terms/${this.termCode}/Classes/${classNumber}`)
    const json: any = await res.json()
    const section: ClassQuerySectionJson = json.getSOCSectionListByNbrResponse.ClassOffered
    if (section === undefined) return null
    const sectionInfo = parseBaseSection(section)
    const course = `${section.SubjectCode} ${section.CatalogNumber}`

    return {
      section: {
        ...sectionInfo,
        code: section.SectionNumber.toString(),
        instructors: (arrayify(section.Instructor) ?? []).map(parseInstructor).filter(it => it !== null) as Section['instructors'],
        meetings: (arrayify(section.Meeting) ?? [])
          .map(it => ({ ...it, Location: it.TopicDescr }))
          .map(parseMeeting)
          .filter(it => it !== null) as Meeting[]
      },
      course
    }
  }

  async fetchCourseInfo (code: string): Promise<CourseInfo | null> {
    const [subject, number] = code.split(/\s+/)
    const description = await this.fetchCourseDescription(subject, number)
    if (description === null) { return null }
    const split = splitDescription(description)
    return {
      code,
      subject,
      catalogNumber: number,
      description: split.details ?? undefined,
      title: split.title
    }
  }

  async fetchCourseDescription (subject: string, number: string | number): Promise<string | null> {
    const res = await this.get(
      `/Terms/${this.termCode}/Schools/UM/Subjects/${subject}/CatalogNbrs/${number}`
    )
    const json: any = await res.json()
    const descr: string = json.getSOCCourseDescrResponse.CourseDescr
    return descr === 'No Course Description found.' ? null : descr
  }

  private async refreshTokenIfNeeded (): Promise<void> {
    if (this.accessToken === null || this.accessToken.expireAt.getTime() <= Date.now()) {
      await this.requestToken()
    }
  }

  private async requestToken (): Promise<void> {
    const res = await fetch(
      'https://gw.api.it.umich.edu/um/oauth2/token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: 'umscheduleofclasses'
        }).toString()
      })
    const json: any = await res.json()
    this.accessToken = {
      value: json.access_token,
      expireAt: dayjs().add(json.expires_in, 'second').toDate()
    }
  }

  private async get (url: string): Promise<Response> {
    await this.refreshTokenIfNeeded()
    assert(this.accessToken !== null, 'Did not get access token after refreshTokenIfNeeded')
    const res = await fetch(endpointPrefix + url, {
      headers: {
        Authorization: `Bearer ${this.accessToken.value}`,
        Accept: 'application/json'
      }
    })
    if (!res.ok) {
      throw new Error(`fetch failed: ${res.statusText}`)
    }
    return res
  }
}

export function parseBaseSection (sectionJson: BaseSectionJson): Omit<Section & EnrollmentStats, 'code' | 'instructors' | 'meetings'> {
  return {
    component: sectionJson.SectionType,
    enrolled: sectionJson.EnrollmentTotal,
    capacity: sectionJson.EnrollmentCapacity,
    seatsOpen: sectionJson.AvailableSeats,
    enrollOpen: sectionJson.EnrollmentStatus === 'Open',
    classNumber: sectionJson.ClassNumber
  }
}

export function splitDescription (description: string): { title: string, details: string | null } {
  const knownSeparators = ['---', '\n']
  for (const sep of knownSeparators) {
    const sepIndex = description.indexOf(sep)
    if (sepIndex !== -1) {
      return {
        title: description.substring(0, sepIndex).trim(),
        details: description.substring(sepIndex + sep.length).trim()
      }
    }
  }
  return { title: description, details: null }
}

function parseClassInstructor (instr: ClassInstructor): Section['instructors'][number] | null {
  const tokens = /^(?<last>.+),(?<first>\w+).*$/.exec(instr.InstrName)

  if (tokens?.groups === undefined || tokens?.groups.first === undefined || tokens?.groups.last === undefined) {
    return null
  }
  return {
    id: instr.InstrUniqname.toLowerCase(),
    name: tokens.groups.last
  }
}

function parseFullInstructor (instr: FullInstructor): Section['instructors'][number] | null {
  if (instr.FirstName.length === 0 && instr.LastName.length === 0) {
    // Hidden sections with "Staff" as the instructor
    return null
  }
  return {
    id: instr.Uniqname.toLowerCase(),
    name: instr.LastName
  }
}

function parseInstructor (instr: Instructor): Section['instructors'][number] | null {
  return parseClassInstructor({
    InstrUniqname: instr.Uniqname,
    InstrName: instr.InstructorName
  })
}
