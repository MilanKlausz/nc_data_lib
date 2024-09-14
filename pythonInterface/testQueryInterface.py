#!/usr/bin/env python3

from pathlib import Path
from queryInterface import performQuery
import sys

def materialIsInResult(queryResult, materialShortKey):
  return any(entry['entry']['data']['title'] == materialShortKey for entry in queryResult)

def findMaterialInLocalDatabase():
  materialShortKey = 'some.ncmat'
  queryString = "some"
  dbBasePath = Path(__file__).parent.resolve() / ".." / "test-helpers"
  dbPath =  dbBasePath / "test_db.json"
  dbChecksumPath =  dbBasePath / "test_db_checksum.json"

  queryResult = performQuery(queryString, dbPath, dbChecksumPath)
  materialFound = materialIsInResult(queryResult, materialShortKey)
  if not materialFound:
    print(f"Error in {Path(__file__)}: Material '{materialShortKey}' not found.", file=sys.stderr)
    sys.exit(1)  # Exit with an error if material is not found

def findMaterialOnlineDatabase():
  materialShortKey = 'AlN_sg186_AluminumNitride.ncmat'
  queryString = "AlN_sg186_AluminumNitride"
  queryResult = performQuery(queryString)
  materialFound = materialIsInResult(queryResult, materialShortKey)
  if not materialFound:
    print(f"Error in {Path(__file__)}: Material '{materialShortKey}' not found.", file=sys.stderr)
    sys.exit(1)  # Exit with an error if material is not found

findMaterialInLocalDatabase()
findMaterialOnlineDatabase()
sys.exit(0)  # Exit successfully if material is found
