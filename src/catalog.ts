import type { CourseInfo, CourseSchedule, EnrollmentStats, Section } from './entities'

export interface CourseCatalog<WithEnrollStats extends boolean = false> {
  searchCourses: (term: string, query: string) => Promise<string[]>
  fetchCourseInfo: (term: string, code: string) => Promise<CourseInfo | null>
  fetchCourseSchedule: (term: string, code: string) => Promise<CourseSchedule<WithEnrollStats> | null>
  fetchClass: ((term: string, classNumber: number) => Promise<{ section: (WithEnrollStats extends true ? (Section & EnrollmentStats) : Section), course: string } | null>)
  fetchSection: ((term: string, courseCode: string, sectionCode: string) => Promise<(WithEnrollStats extends true ? (Section & EnrollmentStats) : Section) | null>)
}