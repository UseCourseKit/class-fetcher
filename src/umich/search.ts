import MiniSearch from 'minisearch'

interface CourseEntry {
  school: string
  classNumber: number
  subject: string
  courseCode: string
  instructor: string | null
}

export default class SearchEngine {
  private constructor (private readonly engine: MiniSearch<CourseEntry>) {}

  static async create (term: number): Promise<SearchEngine> {
    const engine = new MiniSearch<CourseEntry>({
      fields: ['classNumber', 'courseCode', 'instructor'],
      storeFields: ['courseCode']
    })
    engine.addAll(((await import(`./soc/${term}.json`)).default as any[]).map((item, i) => ({...item, id: i})))
    return new SearchEngine(engine)
  }

  async runSearch (query: string): Promise<string[]> {
    return this.engine.search(query).map(result => result.courseCode)
  }
}
