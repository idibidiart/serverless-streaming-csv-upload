

## Advantages over storing and parsing file on server

### Storing and Parsing on Server

1. requires slicing the CSV file and re-assembling on the server (i.e. streaming to keep memory usage constant per file per unit of time)

2. requires server to write from memory buffer to filesystem to reconstruct the file using sequential write. to enable resume, the server tells client which slice (bye range) to send next based on current file size on disk. this would most likely use a shared filesystem, so the server may remain stateless (i.e. more hardware)

3. requires user to re-select the file fort upload in order to resume from if it was interrupted

4. parsing is cpu bound, not suited for node, if that's gonna be your choice

5. after file is completely on server, worker processes are needed to read and parse the file as a stream and insert the data into db, then unlink the file when done. such worker processes must be able to recover from failure and resume stream parsing the file, inserting the data into db, and making sure to unlink file when done.


How this works:

1. does not require uploading files to the server. All file(s) are stored temporarily in IndexedDB and up to 1Gb can be parsed in slices and into dedicated, temporary object stores in IndexedDB (1 per file.) The File itself is never loaded into memory in full. Files are cleaned up almost instantly after they’ve been parsed and converted to raw chunks of data in IndexedDB. Status: Done.

2. worker threads in the browser grab the sliced file pieces from IndexedDB and converts to JSON with row's number as primary key, so that row ranges can be requested by the server and served by client on demand. Status: Todo.

3. files do not need to be re-uploaded to resume transfer of data to server, it happens automatically when app is running. Status: Todo.

3. no fault-tolerant processes needed on the servers -- everything remains stateless and simple on the servers