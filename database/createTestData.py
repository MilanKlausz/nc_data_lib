#!/usr/bin/env python3

import json
import pathlib

json_file_path = '../test-helpers/test_db.json'
with open(json_file_path, 'r') as file:
    db = json.load(file)

from material_database_pb2 import Database
# Convert your data to the Database message format
database_message = Database()
for material_data in db:
    material = database_message.materials.add()
    material.key = material_data["key"]
    material.shortkey = material_data["shortkey"]
    material.safekey = material_data["safekey"]
    material.ncmat_header.extend(material_data["ncmat_header"])
    material.dump = material_data.get("dump", "")  # Default to empty string if not found
    material.ncmat_contents = material_data.get("ncmat_contents", "")  # Default to empty string if not found
    material.plot_filename_xsect = material_data.get("plot_filename_xsect", "")  # Default to empty string if not found
    material.extra_keywords = material_data.get("extra_keywords", "")  # Default to empty string if not found
    # print(material)

# Serialize the Database message to bytes
serialized_database_bytes = database_message.SerializeToString()
# Compress the serialized bytes
from io import BytesIO
buffer = BytesIO()
import gzip
with gzip.GzipFile(fileobj=buffer, mode='wb') as gzip_file:
    gzip_file.write(serialized_database_bytes)
# Write the compressed bytes to file
pbfile = '../test-helpers/test_db.pb.gz'
with pathlib.Path(pbfile).open('wb') as fh:
  fh.write(buffer.getvalue())
