import type { CourseInfo, CourseSchedule, Section } from './entities'

export interface CourseCatalog {
  searchCourses: (query: string) => Promise<string[]>
  fetchCourseInfo: (code: string) => Promise<CourseInfo | null>
  fetchCourseSchedule: (code: string) => Promise<CourseSchedule | null>
  fetchClass: ((classNumber: number) => Promise<{ section: Section, course: string } | null>)
  fetchSection: ((courseCode: string, sectionCode: string) => Promise<Section | null>)
}
