#!/usr/bin/env python3

import subprocess
import json
from os import environ
from pathlib import Path

def performQuery(queryString, databasePath):
  env = environ.copy()
  env['NODE_ENV'] = 'test'

  inputsJson = json.dumps({"queryString": queryString, "databasePath": str(databasePath)})
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
  databasePath = Path(__file__).parent.resolve() / "../database/autogen_db/db.json"
  queryResult = performQuery(queryString, databasePath)

  # print('Result: ', queryResult)
  shortResults = [ [e['entry']['data']['title'], e['entry']['type'], e['score']] for e in queryResult]
  print('Short result: ', shortResults)
