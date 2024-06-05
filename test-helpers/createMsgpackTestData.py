#!/usr/bin/env python3

import json
import pathlib
import msgpack

json_file_path = './test_db.json'
with open(json_file_path, 'r') as file:
    db = json.load(file)

msgpackfile = './test_db.msgpack'
with pathlib.Path(msgpackfile).open('wb') as fh:
  msgpack.pack(db, fh)
