import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Meeting } from '../../src/entities'
import { AllSectionsSectionJson } from '../../src/umich/api_types'
import { allClusters } from '../../src/umich/clusters'
import { parseMeeting } from '../../src/umich/datetime'
import { arrayify } from '../../src/umich/util'

function buildMeetingsMap (sections: AllSectionsSectionJson[]): { [code: string]: Meeting[] } {
  const mapping: { [code: string]: Meeting[] } = {}
  for (const section of sections) {
    const rawMeetings = arrayify(section.Meeting ?? [])
    mapping[section.SectionNumber] = rawMeetings
      .map(meet => ({ ...meet, StartDate: '09/01/2022', EndDate: '12/19/2022', Location: 'ARR', TopicDescr: '' }))
      .map(parseMeeting)
      .filter(it => it !== null) as Meeting[]
  }
  return mapping
}

describe('enrollment group generation', () => {
  it('should compute the correct clusters for a variety of popular courses', () => {
    const files = readdirSync(join(import.meta.dirname, 'atlas-samples'))
    for (const file of files) {
      const expectedClusterList = JSON.parse(readFileSync(join(import.meta.dirname, 'atlas-samples', file), { encoding: 'utf-8' })).map((cluster: any[]) => cluster.filter(section => !section.includes('MID')))
      let sections = JSON.parse(readFileSync(join(import.meta.dirname, 'soc-samples', file), { encoding: 'utf-8' })).getSOCSectionsResponse.Section
      if (!(sections instanceof Array)) sections = [sections]
      const meetingsMap = buildMeetingsMap(sections)
      expect(Array.from(allClusters(sections, meetingsMap)).sort()).toEqual(expectedClusterList.sort())
      // 'Failed on ' + file.split('.')[0].toUpperCase())
    }
  })
})
