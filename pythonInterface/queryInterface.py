#!/usr/bin/env python3

import subprocess
import json
from os import environ
from pathlib import Path

def performQuery(queryString, dbPath=None, dbChecksumPath=None):
  env = environ.copy()
  env['NODE_ENV'] = 'test'
  #env['DEFAULT_SERVER_BASE_URL'] = 'https://milanklausz.github.io/nc_data_lib/'

  inputsJson = json.dumps({k: v for k, v in (
    ("queryString", queryString),
    ("dbPath", str(dbPath)),
    ("dbChecksumPath", str(dbChecksumPath))
    ) if v != str(None)})
  command = [ "node", f"{Path(__file__).parent.resolve() / 'performQuery.js'}", inputsJson ]
  try:
    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env)
    if result.stderr:
      print(f"Error: {result.stderr}")
    else:
      return json.loads(result.stdout) # Parse the JSON string into a Python object

  except Exception as e:
    print(f"An error occurred: {e}")


if __name__ == "__main__":
  # Example usage
  queryString = "carbon"
  dbBasePath = Path(__file__).parent.resolve() / "../database/autogen_db"
  dbPath = dbBasePath / "db.json"
  dbChecksumPath = dbBasePath / "db_checksum.json"
  queryResult = performQuery(queryString, dbPath, dbChecksumPath)

  # print('Result: ', queryResult)
  shortResults = [ [e['entry']['data']['title'], e['entry']['type'], e['score']] for e in queryResult]
  print('Short result: ', shortResults)
