import sqlite3
import pandas as pd

filename = input('Enter the filename of the original CSV file from ro.umich.edu >>')
soc_raw = pd.read_csv(filename)

term_code = input('Enter the term code >>')

soc_raw['SubjectCode'] = soc_raw['Subject'].apply(lambda x: x[x.index('(')+1:x.index(')')])
soc_raw['CourseCode'] = soc_raw['SubjectCode'] + soc_raw['Catalog Nbr']

soc_out = soc_raw.rename(columns={
    'Acad Group': 'school',
    'Class Nbr': 'classNumber',
    'SubjectCode': 'subject',
    'CourseCode': 'courseCode',
    'Instructor': 'instructor'
})[['school', 'classNumber', 'subject', 'courseCode', 'instructor']]

outfilename = f'{term_code}.json'
soc_out.to_json(outfilename, orient='records')

with sqlite3.connect(f'{term_code}.sqlite3') as db:
  db.execute('DROP TABLE IF EXISTS sections')
  soc_raw.to_sql(name='sections', con=db, index=None)
  db.execute('CREATE INDEX class_number_lookup ON sections(`Class Nbr`)')
