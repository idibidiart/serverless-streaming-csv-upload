;(function() {

  // Author: @marcfawzi
  //
  // everything is in ES5 for now, no Babel

  // based on v1.0 of IndexedDB API 
  // v2.0 of IndexedDB API is only available in Chrome as of Feb 2018
  // will consider upgrading when all browsers support v2.0 which wills simplify things in some places

      var dbGlobals = {}; 
      dbGlobals.db = null; // The database object will eventually be stored here.    
      dbGlobals.name = "localFileStorage"; // The name of the database.
      dbGlobals.version = null;    
      dbGlobals.fileStoreName = "fileObjects"; 
      dbGlobals.dataStoreName = "fileDataObjects"
      dbGlobals.empty = true; 
      dbGlobals.readyFiles = [] // Todo: prune as files are removed 

      // ---------------------------------------------------------------------------------------------------

      function requiredFeaturesSupported() {

        if (!document.getElementById('fileSelectorHidden').files) {
          document.getElementById('bodyElement').innerHTML = "<h3>File API is not fully supported - upgrade your browser to the latest version.</h3>";
          return false;
        }

        if (!window.indexedDB) {
          if (window.mozIndexedDB) {
            window.indexedDB = window.mozIndexedDB;
          } else if (window.webkitIndexedDB) {
            window.indexedDB = webkitIndexedDB;
            IDBCursor = webkitIDBCursor;
            IDBDatabaseException = webkitIDBDatabaseException;
            IDBRequest = webkitIDBRequest;
            IDBKeyRange = webkitIDBKeyRange;
            IDBTransaction = webkitIDBTransaction;
          } else {
            document.getElementById('bodyElement').innerHTML = "<h3>IndexedDB is not supported - upgrade your browser to the latest version.</h3>";
            return false;
          }
        } 
        if (!window.indexedDB.deleteDatabase) { // Not all implementations of IndexedDB support this method, thus we test for it here.
          document.getElementById('bodyElement').innerHTML = "<h3>The required version of IndexedDB is not supported.</h3>";
          return false;
        }
        return true;
      } 

      // ---------------------------------------------------------------------------------------------------    

      if (requiredFeaturesSupported()) {
        // Add event listeners for the four database related buttonss
        document.getElementById('openButton').addEventListener('click', openDB, false);
        document.getElementById('storeButton').addEventListener('click', browse, false);
        document.getElementById('deleteButton').addEventListener('click', deleteDB, false);

        // Add an event listener for the file <input> element so the user can select some files to store in the database
        document.getElementById('fileSelectorHidden').addEventListener('change', handleFileSelection, false); 
      } 

      // ---------------------------------------------------------------------------------------------------

      function browse() {
        document.getElementById('fileSelector').style.display = "none";
        if (!dbGlobals.db) {
          displayMessage("<p>The database hasn't been opened/created yet.</p>");
          console.log("db is null in browse");
          return;
        }

        document.getElementById('fileSelector').style.display = "block"; // Now that we have a valid database, allow the user to put file(s) in it.

        var message = "<p>Using the below <strong>Browse</strong> button, select one or more files to store in the database.</p>";
        displayMessage(message);
      } 

      // ---------------------------------------------------------------------------------------------------

      function openDB() {  
        document.getElementById('fileSelector').style.display = "none";   
        try {
          var openRequest = window.indexedDB.open(dbGlobals.name) 

          openRequest.onerror = function(evt) {
            console.log("openRequest.onerror fired in openDB - error: " + (evt.target.error ? evt.target.error : evt.target.errorCode));
          } 
          openRequest.onupgradeneeded = openDB_onupgradeneeded; // Called if the database doesn't exist or the database version values don't match.
          openRequest.onsuccess = openDB_onsuccess; // Attempts to open an existing database (that has a correctly matching version value).        
          openRequest.onblocked = openDB_onblocked; // Called if the database is opened via another process, or similar.  
        } catch (ex) {
            console.log("window.indexedDB.open exception in openDB - " + ex.message);
        }
      }

      // ---------------------------------------------------------------------------------------------------

      function openDB_onupgradeneeded(evt) {

        displayMessage("<p>Your request has been queued.</p>"); 
        // Normally, this will instantly be blown away be the next displayMessage().
        
        var db = dbGlobals.db = evt.target.result; 

        // A successfully opened database results in a database object
        if (!db) {
          console.log("db sis null in openDB_onupgradeneeded");
          return;
        }

        dbGlobals.version = db.version

        if (!db.objectStoreNames.contains(dbGlobals.fileStoreName)) {	
          try {
              var objectStore = db.createObjectStore(dbGlobals.fileStoreName, { keyPath: "name", autoIncrement: false });  		
              console.log("The File store has been created.") 
          } catch (ex) {
              console.log("Exception in openDB_onupgradeneeded - " + ex.message)
              return;
          }
        }
      } 

      // ---------------------------------------------------------------------------------------------------

      function openDB_onsuccess(evt) {
        displayMessage("<p>Your request has been queued.</p>"); 
        // Normally, this will be instantly blown away by the next displayMessage

        // A successfully opened database results in a database object
        var db = dbGlobals.db = evt.target.result; 

        if (!db) {
          console.log("db is null in openDB_onsuccess");
          return;
        } 

        dbGlobals.version = db.version

        var message = "<p>The database has been opened.</p>"
        displayMessage(message)
      }

      // ---------------------------------------------------------------------------------------------------

      function openDB_onblocked(evt) {
          var message = "<p>The database is being used by another window and cannot be opened - error code: " + (evt.target.error ? evt.target.error : evt.target.errorCode) + "</p>";
          message += "</p>If this page is open in other browser windows, close these windows.</p>";
          displayMessage(message);
        }

      // ---------------------------------------------------------------------------------------------------

      function handleFileSelection(evt) {

        var files = evt.target.files; // The files selected by the user (as a File or FileList object).
        if (files.length === 0) {
          displayMessage("<p>At least one selected file is invalid - do not select any folders.</p><p>Please reselect and try again.</p>");
          return;
        }

        var db = dbGlobals.db;
        if (!db) {
          console.log("db is null in handleFileSelection");
          return;
        } 

        try {
          var transaction = db.transaction(dbGlobals.fileStoreName, (IDBTransaction.READ_WRITE ? IDBTransaction.READ_WRITE : 'readwrite')); // This is either successful or it throws an exception. Note that the ternary operator is for browsers that only support the READ_WRITE value.
        } catch (ex) {
            console.log("exception in handleFileSelection - " + ex.message);
            return;
        }

        try {
          var objectStore = transaction.objectStore(dbGlobals.fileStoreName)

          for (var i=0; i < files.length; i++) {
            var addRequest = objectStore.add(files[i])
          }

          addRequest.onsuccess = function(evt) {
            displayObjectStore("<p><strong>File(s) added to store:</strong></p>")
          }

        } catch (ex) {
            console.log("exception in handleFileSelection - " + ex.message);
            return;
        }
        
        transaction.onerror = function(evt) {
          console.log("transaction.onerror fired in handleFileSelection - error: " + 
                      (evt.target.error ? evt.target.error : evt.target.errorCode));
        }

        transaction.onabort = function(evt) {
          displayObjectStore("<p> Aborted. Cannot add a file while it's waitin to be streamed to the server." + 
          "Wait for it to finish (you'll be notified.) To abort, choose a file from the Imaginary menu and click Cancel (WIP)</p>" +
          "<p><strong>File(s) added to the store:</strong></p>"
        )
          console.log("transaction.onabort fired in handleFileSelection");
        }

        transaction.oncomplete = function(evt) {

          var db = dbGlobals.db

          db.close()

          var openRequest = window.indexedDB.open(dbGlobals.name, ++dbGlobals.version)
          var reader = {}

          openRequest.onupgradeneeded = function(evt) {
            db = dbGlobals.db = evt.target.result

            for (var i = 0; i < files.length; i++) {
              try {
                db.createObjectStore(files[i].name, { keyPath: "ID", autoIncrement: true })
                reader[files[i].name] = new FileReader()
                console.log("The File Data store has been created for " + files[i].name)
              } catch (ex) {
                  console.log("Exception in handleFileSelection " + ex.message)
                  return
              }
            }
          }

          openRequest.onsuccess = function(evt) {

            db = dbGlobals.db = evt.target.result
            
            for (var i=0; i < files.length; i++) {
              sliceAndRead(files[i])
            }
          }
          
          var filePos = {}, fileDone = {}, fileCount = {}, reader = {}

          var sliceAndRead = function(file) {

            filePos[file.name] = filePos[file.name] || 0
            fileCount[file.name] = fileCount[file.name] || 0
            fileDone[file.name] = fileDone[file.name] || false

            reader[file.name] = new FileReader()

            reader[file.name].onload = reader[file.name].onload || 
                function(evt) {
                  var chunkAsText = evt.target.result
          
                  try {
                    var transaction = db.transaction(file.name, (IDBTransaction.READ_WRITE ? IDBTransaction.READ_WRITE : 'readwrite')); // This is either successful or it throws an exception. Note that the ternary operator is for browsers that only support the READ_WRITE value.
                  } catch (ex) {
                      console.log("exception in handleFileSelection - " + ex.message);
                      return;
                  }
                  var objectStore = transaction.objectStore(file.name)
          
                  var addRequest = objectStore.add({data: chunkAsText})
          
                  dbGlobals.readyFiles.push(file.name)
          
                  if (fileDone[file.name]) {
                    displayObjectStore("<p><strong>File(s) added to store:</strong></p>")
                    console.log("finished processing " + file.name)
                    document.getElementById("fileSelectorHidden").value = ""
                  }
                }

            var chunk

            if (file.slice)
                chunk = file.slice(filePos[file.name], filePos[file.name] + Math.min(20971520, (file.size - filePos[file.name])))
            else
                chunk = file.mozSlice(filePos[file.name], filePos[file.name] + Math.min(20971520, (file.size - filePos[file.name])))

            reader[file.name].readAsText(chunk)

            if (filePos[file.name] + 20971520 < file.size) {
              filePos[file.name] = ++fileCount[file.name] * 20971520
              console.log(filePos[file.name])
              setImmediate(function() { sliceAndRead(file) })
            } else {
              fileDone[file.name] = true
            }
          }

          console.log("transaction.oncomplete fired in handleFileSelection");
        }

        document.getElementById('fileSelector').style.display = "none"; 
        // An attempt has already been made to select file(s) so hide the "file picker" dialog box.
      } 

      // --------------------------------------------------------------------------------------------------

      function displayObjectStore(message) {
          message = message || ""

          var db = dbGlobals.db

          try {
            var transaction = db.transaction(dbGlobals.fileStoreName, (IDBTransaction.READ_ONLY ? IDBTransaction.READ_ONLY : 'readonly')); 
          } catch (ex) {
              console.log("exception in parseStoredFiles - " + ex.message)
              return
          } 

          var objectStore = transaction.objectStore(dbGlobals.fileStoreName)

          var cursorRequest = objectStore.openCursor();
        
              var fileListHTML = "<ul style='margin: -0.5em 0 1em -1em;'>"; 
            
              cursorRequest.onsuccess = function(evt) {
                console.log("cursorRequest.onsuccess fired in displayObjectStore");
        
                var cursor = evt.target.result
        
                if (cursor) {
                  // If we're here, there's at least one object in the database's object store
                  dbGlobals.empty = false

                  fileListHTML += "<li>" + cursor.value.name + (dbGlobals.readyFiles.includes(cursor.value.name) ? " << <strong>ready for streaming</strong>" : "")
                  fileListHTML += "<p style='margin: 0 0 0 0.75em;'>" + cursor.value.lastModifiedDate + "</p>"
                  fileListHTML += "<p style='margin: 0 0 0 0.75em;'>" + cursor.value.size + " bytes</p>"
                  
                  // Move to the next object (that is, file) in the object store, or if none left go to else            
                  cursor.continue()
                } else {
                  fileListHTML += "</ul>";
                  displayMessage(message + fileListHTML);
                }
        
                if (dbGlobals.empty) {
                  displayMessage("<p>The database is empty. There's nothing to display.</p>");
                }
              }
              
              cursorRequest.onerror = function(evt) {
                console.log("cursorRequest.onerror fired in displayObjectStore - error code: " + 
                            (evt.target.error ? evt.target.error : evt.target.errorCode));
              }
      }

      // ---------------------------------------------------------------------------------------------------

      function deleteDB() {
        document.getElementById('fileSelector').style.display = "none"; 
        
        displayMessage("<p>Your request has been queued.</p>"); 
        // This normally gets instantly blown away by the next displayMessage().

        var db = dbGlobals.db

        if (db) {
          db.close()
        } 
        try {
          
          var deleteRequest = window.indexedDB.deleteDatabase(dbGlobals.name); 

          deleteRequest.onerror = function(evt) {
            console.log("deleteRequest.onerror fired in deleteDB - " + (evt.target.error ? evt.target.error : evt.target.errorCode));
          }

          deleteRequest.onsuccess = function(evt) {
            dbGlobals.db = null;
            dbGlobals.empty = true;
            displayMessage("<p>The database has been deleted.</p>")
          }
        }
        catch (ex) {
          console.log("Exception in deleteDB - " + ex.message);
        }

      }

      // ---------------------------------------------------------------------------------------------------

      function displayMessage(message) {
          document.querySelector('.messages .live').innerHTML = message;
      }
})() 


// setImmediate.js ... works great with just setTimeout but this is a little faster
// You may remove this if you wish to use setTimeout(fn,0) 

;(function (global, undefined) {
  "use strict";

  if (global.setImmediate) {
      return;
  }

  var nextHandle = 1; // Spec says greater than zero
  var tasksByHandle = {};
  var currentlyRunningATask = false;
  var doc = global.document;
  var registerImmediate;

  function setImmediate(callback) {
    // Callback can either be a function or a string
    if (typeof callback !== "function") {
      callback = new Function("" + callback);
    }
    // Copy function arguments
    var args = new Array(arguments.length - 1);
    for (var i = 0; i < args.length; i++) {
        args[i] = arguments[i + 1];
    }
    // Store and register the task
    var task = { callback: callback, args: args };
    tasksByHandle[nextHandle] = task;
    registerImmediate(nextHandle);
    return nextHandle++;
  }

  function clearImmediate(handle) {
      delete tasksByHandle[handle];
  }

  function run(task) {
      var callback = task.callback;
      var args = task.args;
      switch (args.length) {
      case 0:
          callback();
          break;
      case 1:
          callback(args[0]);
          break;
      case 2:
          callback(args[0], args[1]);
          break;
      case 3:
          callback(args[0], args[1], args[2]);
          break;
      default:
          callback.apply(undefined, args);
          break;
      }
  }

  function runIfPresent(handle) {
      // From the spec: "Wait until any invocations of this algorithm started before this one have completed."
      // So if we're currently running a task, we'll need to delay this invocation.
      if (currentlyRunningATask) {
          // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
          // "too much recursion" error.
          setTimeout(runIfPresent, 0, handle);
      } else {
          var task = tasksByHandle[handle];
          if (task) {
              currentlyRunningATask = true;
              try {
                  run(task);
              } finally {
                  clearImmediate(handle);
                  currentlyRunningATask = false;
              }
          }
      }
  }

  function installNextTickImplementation() {
      registerImmediate = function(handle) {
          process.nextTick(function () { runIfPresent(handle); });
      };
  }

  function canUsePostMessage() {
      // The test against `importScripts` prevents this implementation from being installed inside a web worker,
      // where `global.postMessage` means something completely different and can't be used for this purpose.
      if (global.postMessage && !global.importScripts) {
          var postMessageIsAsynchronous = true;
          var oldOnMessage = global.onmessage;
          global.onmessage = function() {
              postMessageIsAsynchronous = false;
          };
          global.postMessage("", "*");
          global.onmessage = oldOnMessage;
          return postMessageIsAsynchronous;
      }
  }

  function installPostMessageImplementation() {
      // Installs an event handler on `global` for the `message` event: see
      // * https://developer.mozilla.org/en/DOM/window.postMessage
      // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages

      var messagePrefix = "setImmediate$" + Math.random() + "$";
      var onGlobalMessage = function(event) {
          if (event.source === global &&
              typeof event.data === "string" &&
              event.data.indexOf(messagePrefix) === 0) {
              runIfPresent(+event.data.slice(messagePrefix.length));
          }
      };

      if (global.addEventListener) {
          global.addEventListener("message", onGlobalMessage, false);
      } else {
          global.attachEvent("onmessage", onGlobalMessage);
      }

      registerImmediate = function(handle) {
          global.postMessage(messagePrefix + handle, "*");
      };
  }

  function installMessageChannelImplementation() {
      var channel = new MessageChannel();
      channel.port1.onmessage = function(event) {
          var handle = event.data;
          runIfPresent(handle);
      };

      registerImmediate = function(handle) {
          channel.port2.postMessage(handle);
      };
  }

  function installReadyStateChangeImplementation() {
      var html = doc.documentElement;
      registerImmediate = function(handle) {
          // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
          // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
          var script = doc.createElement("script");
          script.onreadystatechange = function () {
              runIfPresent(handle);
              script.onreadystatechange = null;
              html.removeChild(script);
              script = null;
          };
          html.appendChild(script);
      };
  }

  function installSetTimeoutImplementation() {
      registerImmediate = function(handle) {
          setTimeout(runIfPresent, 0, handle);
      };
  }

  // If supported, we should attach to the prototype of global, since that is where setTimeout et al. live.
  var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
  attachTo = attachTo && attachTo.setTimeout ? attachTo : global;

  // Don't get fooled by e.g. browserify environments.
  if ({}.toString.call(global.process) === "[object process]") {
      // For Node.js before 0.9
      installNextTickImplementation();

  } else if (canUsePostMessage()) {
      // For non-IE10 modern browsers
      installPostMessageImplementation();

  } else if (global.MessageChannel) {
      // For web workers, where supported
      installMessageChannelImplementation();

  } else if (doc && "onreadystatechange" in doc.createElement("script")) {
      // For IE 6–8
      installReadyStateChangeImplementation();

  } else {
      // For older browsers
      installSetTimeoutImplementation();
  }

  attachTo.setImmediate = setImmediate;
  attachTo.clearImmediate = clearImmediate;
}(typeof self === "undefined" ? typeof global === "undefined" ? this : global : self));
