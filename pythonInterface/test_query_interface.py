#!/usr/bin/env python3

from pathlib import Path
from queryInterface import performQuery

def materialIsInResult(queryResult, materialShortKey):
  return any(entry['entry']['data']['title'] == materialShortKey for entry in queryResult)

def test_find_material_in_local_database():
  materialShortKey = 'some.ncmat'
  queryString = "some"
  dbBasePath = Path(__file__).parent.resolve() / ".." / "test-helpers"
  dbPath =  dbBasePath / "test_db.json"
  dbChecksumPath =  dbBasePath / "test_db_checksum.json"

  queryResult = performQuery(queryString, dbPath, dbChecksumPath)
  assert materialIsInResult(queryResult, materialShortKey)
  assert not materialIsInResult(queryResult, "material_definetly_not_in_db")

def test_find_material_in_online_database():
  materialShortKey = 'AlN_sg186_AluminumNitride.ncmat'
  queryString = "AlN_sg186_AluminumNitride"
  queryResult = performQuery(queryString)
  assert materialIsInResult(queryResult, materialShortKey)
  assert not materialIsInResult(queryResult, "material_definetly_not_in_db")
