import type { CourseInfo, CourseSchedule, Section } from './entities'

export interface CourseCatalog {
  searchCourses: (term: string, query: string) => Promise<string[]>
  fetchCourseInfo: (term: string, code: string) => Promise<CourseInfo | null>
  fetchCourseSchedule: (term: string, code: string) => Promise<CourseSchedule | null>
  fetchClass: ((term: string, classNumber: number) => Promise<{ section: Section, course: string } | null>)
  fetchSection: ((term: string, courseCode: string, sectionCode: string) => Promise<Section | null>)
}
