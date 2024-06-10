#!/usr/bin/env python3

import NCrystal as NC
import pathlib

def createDBEntry( filelistentry, *, plotfolder = None ):
    e = Entry( filelistentry,
               plotfolder = plotfolder )
    d = {}
    d['key'] = e.key
    d['shortkey'] = e.shortkey
    d['safekey'] = e.safekey
    d['ncmat_header'] = e.ncmat_header
    d['dump'] = e.dump
    d['ncmat_contents'] = e.textData.rawData
    d['plot_filename_xsect'] = e.plot_filename_xsect
    d['extra_keywords'] = ''
    return d

class Entry:

    @property
    def loaded_mat( self ): return self.__mat
    @property
    def key( self ): return self.__key
    @property
    def shortkey( self ): return self.__shortkey
    @property
    def safekey( self ): return self.__safekey
    @property
    def filelistentry( self ): return self.__fe
    @property
    def ncmat_header( self ): return self.__ncmathdr
    @property
    def textData( self ): return self.__td
    @property
    def dump( self ): return self.__dump
    @property
    def plot_filename_xsect( self ): return self.__plot_xsect_file

    def __init__( self, filelistentry, *, plotfolder = None ):
        key = filelistentry.fullKey
        shortkey = ( filelistentry.fullKey
                     if not filelistentry.fullKey.startswith('stdlib::')
                     else filelistentry.fullKey[len('stdlib::'):] )
        #Fixme: we need to check against clashes. Perhaps also better use some
        #generic urlencode function or some such?
        self.__safekey = key.replace('/','_').replace(':','_').replace('.','d')
        self.__key = key
        self.__shortkey = shortkey
        if plotfolder is None:
            plotfolder = pathlib.Path('.').absolute()

        self.__mat = NC.load(key)
        self.__fe = filelistentry
        self.__td = NC.createTextData(key)
        self.__ncmathdr = [ e for e in self.__td
                           if (e and (e[0]=='@' or  e.startswith('#') ) ) ]
        i = [ i for i,e in enumerate(self.__ncmathdr) if e[0]=='@' ][0]
        self.__ncmathdr = [ e[1:] for e in self.__ncmathdr[0:i] ]
        while all( (not e or e.startswith(' ')) for e in self.__ncmathdr ):
            self.__ncmathdr = [ e[1:] for e in self.__ncmathdr ]
        while not self.__ncmathdr[0].strip():
            self.__ncmathdr = self.__ncmathdr[1:]
        while not self.__ncmathdr[-1].strip():
            self.__ncmathdr = self.__ncmathdr[:-1]

        import subprocess
        p = subprocess.run(['nctool','-d',key],
                           capture_output=True,check=True)
        self.__dump = p.stdout.decode()

        #Generate plots:
        self.__mat.plot(do_show=False)
        import matplotlib.pyplot as plt

        self.__plot_xsect_file = '%s.png'%self.__safekey
        plt.savefig(plotfolder.joinpath(self.__plot_xsect_file))
        plt.close()

def generate_checksum(file_path):
    import hashlib
    with open(file_path, 'rb') as file:
        file_content = file.read()
    file_hash = hashlib.sha256()
    file_hash.update(file_content)
    return file_hash.hexdigest()

def create_DB_contents( plotfolder ):
    plotfolder = pathlib.Path(plotfolder)
    if plotfolder.exists():
        raise RuntimeError(f'Plot folder already exists: {plotfolder}')
    plotfolder.mkdir(parents=True)
    db = []
    for fe in NC.browseFiles():
        # if not ( fe.name.startswith('Ac')
        #          or 'gasmix::BF3' in fe.fullKey ):
        #     continue
        print(f"Processing {fe.fullKey}")
        db.append( createDBEntry( fe, plotfolder = plotfolder ) )
    return db

def create_DB( outfolder ):
    outfolder = pathlib.Path(outfolder)
    if outfolder.exists():
        raise RuntimeError(f'Folder already exists: {outfolder}')
    outfolder.mkdir(parents=True)
    jsonfile = outfolder / 'db.json'
    plotfolder = outfolder / 'plots'
    db = create_DB_contents(plotfolder)
    import pprint
    pprint.pprint(db)
    import json
    # with pathlib.Path(jsonfile).open('wt') as fh:
    #     json.dump(db, fh )
    #print(f"Wrote {jsonfile}")

    # from google.protobuf import json_format
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
    # Serialize the Database message to bytes
    serialized_database_bytes = database_message.SerializeToString()
    # Compress the serialized bytes
    from io import BytesIO
    buffer = BytesIO()
    import gzip
    with gzip.GzipFile(fileobj=buffer, mode='wb') as gzip_file:
        gzip_file.write(serialized_database_bytes)
    # Write the compressed bytes to file
    pbfile = outfolder / 'db.pb.gz'
    with pathlib.Path(pbfile).open('wb') as fh:
      fh.write(buffer.getvalue())

    # Save the checksum of the autogen_db file and a timestamp to a separate file
    import datetime
    now = datetime.datetime.now()
    timestamp = now.strftime('%Y-%m-%d %H:%M:%S')
    checksum = generate_checksum(pbfile)
    checksum_file = outfolder / 'db_checksum.json'
    with open(checksum_file, 'wt') as fh:
        json.dump({'checksum': checksum, 'timestamp': timestamp}, fh )
    return outfolder

if __name__=='__main__':
    currentDir = pathlib.Path(__file__).resolve().parent
    dbPath = currentDir.parent.joinpath( 'database', 'autogen_db')
    create_DB(dbPath)
