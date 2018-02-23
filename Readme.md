

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
 
[![video](https://img.youtube.com/vi/HyZoUJAftmA/0.jpg)](https://www.youtube.com/watch?v=HyZoUJAftmA) 

## Browser IndexedDB Storage Limnits

 This demo shows how fast you can process ~1GB large CSV file into chunks of fileSize/50. Reason for this chunk size is two fold: 1) you don't want to open the whole file in memory when processing, and 2) Chrome has a 50 items limit per object store (need to check in with IDB lead from Google about this limit.) Also,Firefox has a limit of 50Mb per object (before asking user for permission -- but this limit does not apply to File objects.) So this gives us up to 2.5Gb (2Gb is ma limit per domain for Firefox) as total maximum for file chunk storage. MS Edge has 20Gb limit (assuming disk volume size >= 12GB) Safari should work for File object storage of any size and chunk object size of at least 50MB. So we must limit to 2Gb total size for the temporary file chunk storage. That's preyy good for a stream processing buffer on the client machine. The thing to note about this limit is that the file chunks are stored only until they're processed and streamed to the server, which can happen pretty quickly over a websockets. So this storage does not take up permenant space on the users machines. Furthermore, most cases, Excel/CSV file size is about 100Mb-200Mb at most. 
 
 ## Todo:

 1. Add a web worker thread of a pool of worker threads to respond to server request for row ranges and convert the matching chunk(s) into a range of rows to send to the server, where they can be inserted directly into a database or thrown on a real time ingestion and analytics pipeline (Kafka/Samza et al)

2. Make sure total number of files being stored/processed/streamed does not add up to more than 2G in size.
   