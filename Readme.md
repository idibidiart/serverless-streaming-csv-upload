

# Advantages Over Streaming and Parsing Very Large CSV Files on Server

## Storing and Parsing on Server

1. requires slicing the CSV file and re-assembling on the server (i.e. streaming to keep memory usage constant per file per unit of time)

2. requires server to write from memory buffer to filesystem to reconstruct the file using sequential write. to enable resume, the server tells client which slice (bye range) to send next based on current file size on disk. this would most likely use a shared filesystem, so the server may remain stateless (i.e. more hardware)

3. requires user to re-select the file fort upload in order to resume from if it was interrupted

4. parsing is cpu bound, not suited for node, if that's gonna be your choice

5. after file is completely on server, worker processes are needed to read and parse the file as a stream and insert the data into db, then unlink the file when done. such worker processes must be able to recover from failure and resume stream parsing the file, inserting the data into db, and making sure to unlink file when done.


## How this works:

1. does not require uploading files to the server. All file(s) are stored temporarily in IndexedDB and up to 1Gb can be parsed in slices and into dedicated, temporary object stores in IndexedDB (1 per file.) The File itself is never loaded into memory in full. Files are cleaned up almost instantly after they’ve been parsed and converted to raw chunks of data in IndexedDB. Status: Done.

2. worker threads in the browser grab the sliced file pieces from IndexedDB and converts to JSON with row's number as primary key, so that row ranges can be requested by the server and served by client on demand. Status: Todo.

3. files do not need to be re-uploaded to resume transfer of data to server, it happens automatically when app is running. Status: Todo.

3. no fault-tolerant processes needed on the servers -- everything remains stateless and simple on the servers

### Running

in project folder, run: python -m SimpleHTTPServer 8080

open localhost:8080/demo.html

[Download this CSV file to test with (~1Gb)](https://www.dropbox.com/s/re91c6y9ekbxost/article_category.csv?dl=0)

 
 ## Video demo

 This demo shows how fast you can process ~1GB large CSV file into chunks of 20Mb each. Reason for this particular chunk size is Firefox has a limit of 50Mb per object (other than File objects) and Chrome has a 50 items limit per object store. So this gives us up to 1Gb in total file size. MS Edge has 20Gb limit on desktop and a good amount on mobile. Safari is in the same ballpark. The thing to note about sizes is that the files are only stored till they're parsed, which happens in less than a second in most cases, and the raw CSV chunked data is stored until it's inserted into the db, which can happen pretty quickly over a websockets. 

 ![video](https://www.youtube.com/watch?v=HyZoUJAftmA) 

 Todo:

 Add a web worker thread of a pool of worker threads to respond to server request for row ranges and convert the matching chunk(s) into a range of rows to send to the server, where they can be inserted directly into a database or thrown on a real time ingestion and analytics pipeline (Kafka/Samza et al)

   