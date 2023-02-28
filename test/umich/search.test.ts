import { describe, expect, it } from "vitest";
import { UMichCatalog } from "../../src";

const client = new UMichCatalog(process.env['UMICH_CLIENT_ID']!, process.env['UMICH_CLIENT_SECRET']!, 2420)

describe('umich course search', () => {
  it('can discover courses by class name', async () => {
    const courses = await client.searchCourses('22167')
    expect(courses).toEqual(['EECS 280'])
  })

  it('can discover courses by prefix of course code, case insensitive', async () => {
    const courses = await client.searchCourses('TchnclCm 3')
    expect(courses).toEqual([
      'TCHNCLCM 300', 'TCHNCLCM 380'
    ])

    const courses2 = await client.searchCourses('digital3')
    expect(courses2).toEqual([
      'DIGITAL 333', 'DIGITAL 334', 'DIGITAL 346', 'DIGITAL 357',
      'DIGITAL 366', 'DIGITAL 376'
    ])
  })
})
