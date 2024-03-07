import { trieCreate, trieSet, trieSuggest, Trie } from '@smikhalevski/trie'
import { readFile } from 'fs/promises'
import { join } from 'path'

interface CourseEntry {
  school: string
  classNumber: number
  subject: string
  courseCode: string
  instructor: string | null
}

export default class SearchEngine {
  private static readonly spaceRegex = /\s+/g
  private readonly index: Trie<CourseEntry>
  private readonly classNumberMap: Map<number, CourseEntry[]> = new Map()

  private constructor (catalogList: CourseEntry[]) {
    this.index = trieCreate<CourseEntry>()
    for (const entry of catalogList) {
      trieSet(this.index, entry.courseCode.toLowerCase().replaceAll(SearchEngine.spaceRegex, ''), entry)
      if (this.classNumberMap.has(entry.classNumber)) {
        this.classNumberMap.get(entry.classNumber)?.push(entry)
      } else {
        this.classNumberMap.set(entry.classNumber, [entry])
      }
    }
  }

  static async create (term: number): Promise<SearchEngine> {
    const dirname = import.meta.dirname
    const file = await readFile(join(dirname, 'soc', `${term}.json`), { encoding: 'utf-8' })
    const catalogList: CourseEntry[] = JSON.parse(file)
    return new SearchEngine(catalogList)
  }

  async runSearch (query: string): Promise<string[]> {
    const normalizedQuery = query.toLowerCase().replaceAll(SearchEngine.spaceRegex, '')
    const suggestions = trieSuggest(this.index, normalizedQuery) ?? []
    const suggestedEntries = suggestions.map(item => item.value).filter(it => it !== undefined) as CourseEntry[]

    const queryNumber = parseInt(query, 10)
    const matchedEntries: CourseEntry[] = isNaN(queryNumber) ? [] : (this.classNumberMap.get(queryNumber) ?? [])

    return suggestedEntries.concat(matchedEntries).map(it => it.courseCode)
  }
}
