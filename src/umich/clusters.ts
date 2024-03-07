import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat.js'
import { EnrollmentGroup, Meeting } from '../entities'
import { AllSectionsSectionJson } from './api_types'
import { meetingsOverlap } from './datetime'
import { parseCreditHours } from './util'
dayjs.extend(customParseFormat)

function sectionsOverlap (sec1Raw: AllSectionsSectionJson, sec2Raw: AllSectionsSectionJson, meetingsMap: { [code: string]: Meeting[] }): boolean {
  const sec1 = { ...sec1Raw, meetings: meetingsMap[sec1Raw.SectionNumber] }
  const sec2 = { ...sec2Raw, meetings: meetingsMap[sec2Raw.SectionNumber] }
  for (const meet1 of sec1.meetings) {
    for (const meet2 of sec2.meetings) {
      if (meetingsOverlap(meet1, meet2)) {
        return true
      }
    }
  }
  return false
}

export function allClusters (sections: AllSectionsSectionJson[], meetingsMap: { [code: string]: Meeting[] }): Set<string[]> {
  const sectionMap = Object.fromEntries(sections.map(sect => [sect.SectionNumber, sect]))
  const components = new Set(sections.map((s) => s.SectionType))
  // Ignore midterm exams
  components.delete('MID')

  // Precondition: prefix is not empty
  function findAllClustersWithEnrollment (prefix: Array<string | number>): string[][] {
    if (prefix.length === components.size) {
      return [prefix.map((s) => s.toString()).sort()]
    }
    const remainingComponents = [...components].filter((it) =>
      !prefix.some((p) => it === sectionMap[p].SectionType)
    )
    const comp = remainingComponents[0]
    const nextSections = sections
      .filter((s) =>
        s.SectionType === comp &&
        s.AssociatedClass === sectionMap[prefix[0]].AssociatedClass
      ).map(s => s.SectionNumber)
    // Special case: not all components required (PSYCH111:060)
    if (nextSections.length === 0) {
      return [prefix.map((s) => s.toString()).sort()]
    }
    return nextSections
      .filter((nextSection) =>
        !prefix.some((existing) => sectionsOverlap(sectionMap[existing], sectionMap[nextSection], meetingsMap))
      )
      .flatMap((nextSection) =>
        findAllClustersWithEnrollment(prefix.concat([nextSection]))
      )
  }

  // If someone chose to enroll in this section, what other sections would they automatically enroll in?
  function buildEnrollPrefix (enroll: AllSectionsSectionJson) {
    const out = [enroll.SectionNumber]
    if (enroll.AutoEnrollSection1 != null) {
      // loose equal: "950" == 950
      // ok wtf ENGR100:101 (auto enroll section has a conflict)
      const cand = sections.filter((s) =>
        s.SectionNumber == enroll.AutoEnrollSection1 &&
        components.has(s.SectionType) &&
        !sectionsOverlap(enroll, s, meetingsMap)
      )
      if (cand.length > 0) {
        out.push(cand[0].SectionNumber)
      }
    }
    if (enroll.AutoEnrollSection2 != null) {
      const cand = sections.filter((s) =>
        s.SectionNumber == enroll.AutoEnrollSection2 &&
        components.has(s.SectionType) &&
        out.every(existing => !sectionsOverlap(sectionMap[existing], s, meetingsMap))
      )
      if (cand.length > 0) {
        out.push(cand[0].SectionNumber)
      }
    }
    return out
  }

  // enrollment classes
  return new Set(
    sections.filter((s) => s.EnrollmentClassType === 'E').flatMap((ec) =>
      findAllClustersWithEnrollment(buildEnrollPrefix(ec))
    )
  )
}

export function allEnrollmentGroups (sections: AllSectionsSectionJson[], meetingsMap: { [code: string]: Meeting[] }): EnrollmentGroup[] {
  const rawSectionLookup = Object.fromEntries(sections.map(json => [json.SectionNumber, json]))
  const groups = Array.from(allClusters(sections, meetingsMap)).map((cluster) => {
    const creditCounts = cluster.map(sectNum => parseCreditHours(rawSectionLookup[sectNum].CreditHours))
    for (let i = 1; i < creditCounts.length; ++i) {
      if (creditCounts[0][0] !== creditCounts[i][0] || creditCounts[0][1] !== creditCounts[i][1]) {
        console.warn(`credit count mismatch in cluster ${cluster}: ${creditCounts}`)
      }
    }
    return {
      sections: new Set(cluster),
      minCredits: creditCounts[0][0],
      maxCredits: creditCounts[0][1]
    } as EnrollmentGroup
  })
  return groups
}
