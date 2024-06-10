#!/usr/bin/env python3

from pathlib import Path
from queryInterface import performQuery

materialShortKey = 'some.ncmat'
queryString = "some"
databasePath = Path(__file__).parent.resolve() / "test_db.pb.gz"
queryResult = performQuery(queryString, databasePath)

materialFound = False
for result in queryResult:
  if result['entry']['data']['title'] == materialShortKey:
    materialFound = True

import sys
if materialFound:
    sys.exit(0)  # Exit successfully if material is found
else:
    print(f"Error in {Path(__file__)}: Material '{materialShortKey}' not found.", file=sys.stderr)
    sys.exit(1)  # Exit with an error if material is not found
