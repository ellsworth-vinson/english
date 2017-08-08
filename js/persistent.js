PersistentObject = function() {
    let __name = null;
    let __data = null;
    let __init_fn = null;
    let self = this;

    this.setName = function(name) {
        __name = name;
    };

    this.setInitFunc = function(init_fn) {
        __init_fn = init_fn;
    };

    this.recreate = function() {
        __data = __init_fn(__data);
        __data['id'] = __name;
        self.save();
        return self;
    };

    this.clear = function () {
        __data = {};
        __data['id'] = __name;
        self.save();
        return self;
    };

    this.deleteByName = function() {
        saveInLocalStorage(__name, undefined);
    };

    this.get = function() {
        if (__data === null)
            try {
                __data = getFromLocalStorage(__name);
            } catch (ex) {
                console.log(ex);
                __data = undefined;
            }
        if (!self.check(__data)) {
            self.recreate();
        }
        return __data;
    };

    this.reset = function () {
        __data = null;
        let data = self.get();
        data['id'] = __name;
        self.save();
    };

    this.save = function () {
        saveInLocalStorage(__name, JSON.stringify(self.get()));
    };

    this.check = function (data) {
        return data !== undefined && data !== null && data['id'] !== undefined && data.id === __name;
    };

    let saveInLocalStorage = function(key, value) {
        if (typeof(Storage) !== "undefined") {
            if (value === undefined || value === null)
                localStorage.removeItem(key);
            else
                localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
        } else {
            console.log("Sorry! No Web Storage support..");
        }
    };

    let getFromLocalStorage = function(key) {
        if (typeof(Storage) !== "undefined") {
            let result = localStorage.getItem(key);
            return result === undefined || result === null ? undefined : JSON.parse(result);
        } else {
            console.log("Sorry! No Web Storage support..");
            return null;
        }
    }
};

StorageHelper = function () {
    var __isLocation = true;

    window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
    if (window.File && window.FileReader && window.FileList && window.Blob) {
    } else {
        alert('The File APIs are not fully supported in this browser.');
    }

    this.setLocation = function(isLocation) {
        __isLocation = isLocation;
    }


    this.createUI = function (rootUIEl) {
        let span = document.createElement('span');
        span.innerHTML = 'File storage:';
        rootUIEl.appendChild(span);
        let use = document.createElement('input');
        use.type = 'checkbox';
        use.innerHTML = 'use';
        rootUIEl.appendChild(use);

    }

    this.loadFile = function (url, callback) {
        if (__isLocation) {
            let fileName = fixedEncodeURIComponent(url);
            readUrl(fileName, function (locallyUrl, err) {
                if (err === DOMException.NOT_FOUND_ERR) {
                    downloadFile(url, function (blob) {
                        writeFile(blob, fileName, function (err) {
                            if (err !== DOMException.NOT_FOUND_ERR) {
                                readUrl(fileName, function (locallyUrl, err) {
                                    callback({data: locallyUrl, err: err});
                                });
                            } else callback({err: err});
                        });
                    });
                } else {
                    callback({data: locallyUrl, err: err});
                }
            });
        } else {
            callback({data: url});
        }
    };

    this.loadText = function (url, callback) {
        if (__isLocation) {
            let fileName = fixedEncodeURIComponent(url);
            readFile(fileName, function (text, err) {
                if (err === DOMException.NOT_FOUND_ERR) {
                    downloadFile(url, function (blob) {
                        writeFile(blob, fileName, function (err) {
                            if (err !== DOMException.NOT_FOUND_ERR) {
                                readFile(fileName, function (text, err) {
                                    callback({data: text, err: err});
                                });
                            } else callback({data: text, err: err});
                        });
                    });
                } else {
                    callback({data: text, err: err});
                }
            });
        } else {
            send(url, 'GET', function (text) {
                callback({data: text});
            });
        }
    };

    var writeFile = function(blob, url, callback) {
        window.requestFileSystem(window.TEMPORARY, blob.size, function (fs) {
            fs.root.getFile(url, { create: true }, function (fileEntry) {
                fileEntry.createWriter((fileWriter)=>fileWriter.truncate(0));
                fileEntry.createWriter(function (fileWriter) {
                    fileWriter.onwriteend = function(e) {
                        if (callback !== undefined) callback();
                    };
                    fileWriter.seek(0);
                    fileWriter.write(blob);
                }, function (err) {
                    callback(err.code);
                });
            }, function (err) {
                callback(err.code);
            });
        });
    };

    var removeFile = function (fn, callback) {
        window.requestFileSystem(window.TEMPORARY, 0, function (fs) {
            fs.root.getFile(fn, { create: true }, function (fileEntry) {
                fileEntry.remove(function() {
                    callback(fn);
                    console.log('File removed.');
                }, errorHandler);
            }, errorHandler);
        });
    };

    var readUrl = function (fn, callback) {
        window.requestFileSystem(window.TEMPORARY, 0, function (fs) {
            fs.root.getFile(fn, { create: false }, function (fileEntry) {
                callback(fileEntry.toURL());
            }, function (err) {
                callback(null, err.code);
            });
        });

    }

    var readFile = function (fn, callback) {
        window.requestFileSystem(window.TEMPORARY, 0, function (fs) {
            fs.root.getFile(fn, { create: false }, function (fileEntry) {
                fileEntry.file(function (file) {
                    var reader = new FileReader();
                    reader.onloadend = function (evt) {
                        if (callback !== undefined) callback(this.result);
                    };
                    reader.readAsText(file);
                }, function (err) {
                    callback(null, err.code);
                });

            }, function (err) {
                callback(null, err.code);
            });
        });

    };

    var errorHandler = function(e) {
        var msg = '';

        switch (e.code) {
            case DOMException.QUOTA_EXCEEDED_ERR:
                msg = 'QUOTA_EXCEEDED_ERR';
                break;
            case DOMException.NOT_FOUND_ERR:
                msg = 'NOT_FOUND_ERR';
                break;
            case DOMException.SECURITY_ERR:
                msg = 'SECURITY_ERR';
                break;
            case DOMException.INVALID_MODIFICATION_ERR:
                msg = 'INVALID_MODIFICATION_ERR';
                break;
            case DOMException.INVALID_STATE_ERR:
                msg = 'INVALID_STATE_ERR';
                break;
            default:
                msg = e;
                break;
        };

        console.log('Error: ' + msg);
    }
};

function getHTTPObject() {
    if (typeof XMLHttpRequest != 'undefined') {
        return new XMLHttpRequest();
    } try {
        return new ActiveXObject("Msxml2.XMLHTTP");
    } catch (e) {
        try {
            return new ActiveXObject("Microsoft.XMLHTTP");
        } catch (e) {}
    }
    return false;
}

//method is GET or POST
function send(query, method, callback, data) {
    var http = getHTTPObject();
    http.overrideMimeType("application/json");
    http.open(method, query, true);
    http.onreadystatechange = function () {
        if (http.readyState == 4 && http.status == "200") {
            try {
                //let jsonresponse = JSON.parse(http.responseText);
                callback(http.responseText);
            } catch (ex) {
                callback({});
            }
        }
    }
    if (typeof data === 'string')
        http.send(data);
    else
        http.send();
}

function downloadFile(url, success) {
    var http = getHTTPObject();
    http.open('GET', url, true);
    http.responseType = 'blob';
    http.onreadystatechange = function () {
        if (http.readyState == 4 && http.status == 200) {
            if (success) success(http.response);
        }
    };
    http.send(null);
}

function fixedEncodeURIComponent (str) {
    return encodeURIComponent(str).replace(/[!'():*]/g, function(c) {
        return '%' + c.charCodeAt(0).toString(16);
    });
}