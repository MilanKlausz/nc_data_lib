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
    with pathlib.Path(jsonfile).open('wt') as fh:
        json.dump(db, fh )
    #print(f"Wrote {jsonfile}")
    return outfolder

if __name__=='__main__':
    create_DB('./autogen_db')
