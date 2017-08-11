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

    this.resetProgressBar = function () {
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

StoreHelper = function () {
    let self = this;
    let __isLocationFileSystem = false;
    let __fs;
    let PROGRESS_CONTEXT = {
        urls: {},
        resetProgressBar: function () {
            PROGRESS_CONTEXT.urls = {};
        }
    };
    let FILE_CONTEXT = {};

    window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
    window.resolveLocalFileSystemURL = window.resolveLocalFileSystemURL || window.webkitResolveLocalFileSystemURL;
    if (window.File && window.FileReader && window.FileList && window.Blob) {
    } else {
        alert('The File APIs are not fully supported in this browser.');
    }

    let createFileSystem = function(callback) {
        if (__fs) {
            callback(__fs);
            return;
        }

        navigator.webkitTemporaryStorage.queryUsageAndQuota (
            function(usedBytes, grantedBytes) {
                //console.log('usedBytes: ', usedBytes, ' of ', grantedBytes, 'bytes');
                window.requestFileSystem(TEMPORARY, grantedBytes, function (filesystem) {
                    __fs = filesystem;
                    callback(__fs);
                }, function (err) {
                    callback();
                    console.log('error: ' + err);
                });
            },
            function(e) { console.log('Error', e);  }
        );
    };

    let getFileContext = function(url) {
        if (!FILE_CONTEXT[url]) {
            FILE_CONTEXT[url] = {
                pathListener: [],
                textListener: [],
                text: undefined,
                path: undefined
            };
        }
        return FILE_CONTEXT[url];
    };

    this.init = function (callback) {
        createFileSystem(function (fs) {
            if (fs) callback();
        })
    };

    this.resetProgressBar = function () {
        PROGRESS_CONTEXT.resetProgressBar();
        let el =  document.getElementById('progressbar');
        el.style.display = 'none';
        el.setAttribute('value', '0');
        el.setAttribute('max', '0');
    };
    
    this.useLocationFileSystem = function(value) {
        __isLocationFileSystem = value === undefined || value === null ? false : value;
    }

    let pathNotify = function (ctx) {
        for (let i in ctx.pathListener) {
            ctx.pathListener[i](ctx.path);
        }
        ctx.pathListener = [];
    };

    let textNotify = function (ctx) {
        for (let i in ctx.textListener) {
            ctx.textListener[i](ctx.text);
        }
        ctx.textListener = [];
    };

    this.getPath = function (url, callback) {
        if (__isLocationFileSystem) {
            let normalUrl = fixedEncodeURIComponent(url);
            let ctx = getFileContext(normalUrl);
            if (ctx.path) {
                callback(ctx.path);
                return;
            }
            if (ctx.pathListener.length > 0) {
                ctx.pathListener.push(callback);
                return;
            }
            ctx.pathListener.push(callback);
            readPath(normalUrl, function (filePath) {
                if (!filePath) {
                    downloadFile(url, function (blob) {
                        writeFile(blob, normalUrl, function (path) {
                            ctx.path = path;
                            pathNotify(ctx);
                        });
                    });
                } else {
                    ctx.path = filePath;
                    pathNotify(ctx);
                }
            });
        } else {
            callback(url);
        }
    };

    this.getText = function (url, callback) {
        if (__isLocationFileSystem) {
            let normalUrl = fixedEncodeURIComponent(url);
            let ctx = getFileContext(normalUrl);
            if (ctx.text) {
                callback(ctx.text);
                return;
            }
            if (!ctx.path) {
                this.getPath(url, function () {
                    self.getText(url, callback);
                });
                return;
            }
            if (ctx.textListener.length > 0) {
                ctx.textListener.push(callback);
                return;
            }
            ctx.textListener.push(callback);
            readText(normalUrl, function (text) {
                ctx.text = text;
                textNotify(ctx);
            });
        } else {
            loadText(url, function (text) {
                callback(text);
            });
        }
    };

    this.purge = function(callback) {
        createFileSystem(function (fs) {
            var dirReader = fs.root.createReader();
            dirReader.readEntries(function (entries) {
                for (var i = 0, entry; entry = entries[i]; ++i) {
                    if (entry.isDirectory) {
                        entry.removeRecursively(function () {}, errorHandler);
                    } else {
                        entry.remove(function () {
                        }, errorHandler);
                    }
                }
                if (callback) callback();
                console.log('Local storage emptied.');
            }, errorHandler);
        });
    };

    let writeFile = function(blob, filePath, callback) {
        createFileSystem(function (fs) {
            fs.root.getFile(filePath, { create: true }, function (fileEntry) {
                fileEntry.createWriter((fileWriter)=>fileWriter.truncate(0));
                fileEntry.createWriter(function (fileWriter) {
                    fileWriter.onwriteend = function() {
                        if (callback !== undefined) callback(fileEntry.toURL());
                    };
                    fileWriter.seek(0);
                    fileWriter.write(blob);
                }, function (err) {
                    errorHandler(err);
                });
            }, function (err) {
                errorHandler(err);
            });
        });
    };

    let readPath = function (filePath, callback) {
        createFileSystem(function (fs) {
            if (!fs) callback(null, new Error('The filesystem is undefined'));
            fs.root.getFile(filePath, { create: false }, function (fileEntry) {
                callback(fileEntry.toURL());
            }, function (err) {
                if (err.code === DOMException.NOT_FOUND_ERR) callback(undefined)
                else errorHandler(err);
            });
        });
    }

    let readText = function (fn, callback) {
        createFileSystem(function (fs) {
            if (!fs) callback(null, new DOMException('the filesystem is undefined'));
            fs.root.getFile(fn, { create: false }, function (fileEntry) {
                fileEntry.file(function (file) {
                    let reader = new FileReader();
                    reader.onloadend = function () {
                        if (callback) callback(this.result);
                    };
                    reader.readAsText(file);
                }, function (err) {
                    errorHandler(err);
                });

            }, function (err) {
                errorHandler(err);
            });
        });

    };

    let errorHandler = function(e) {
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
        }
        console.log('Error: ' + msg);
        createErrorUI(msg, e)
    };

    let createErrorUI = function (msg, err) {
        let div = document.getElementById('error_div_persistent_id')
            ? document.getElementById('error_div_persistent_id')
            : document.createElement('div');
        div.id = 'error_div_persistent_id';
        div.className = 'error';
        div.align = 'right'
        let closeEl = document.getElementById('error_img_persistent_id')
            ? document.getElementById('error_img_persistent_id')
            : document.createElement('img');
        closeEl.id = 'error_img_persistent_id';
        closeEl.className = "error";
        closeEl.style.display = 'block';
        closeEl.onclick = function () {
            this.parentNode.style.display = 'none';
        };
        div.appendChild(closeEl);
        let text = document.getElementById('error_text_persistent_id')
            ? document.getElementById('error_text_persistent_id')
            : document.createElement('textarea');
        text.id = 'error_text_persistent_id';
        text.className = "error";
        text.innerHTML = msg + '\n' + err;
        div.appendChild(text);
        div.style.display = 'block';
        document.body.appendChild(div);
        if (UITools) UITools.hideLoading();
    };

    let downloadFile = function(url, success) {
        var http = getHTTPObject();
        http.open('GET', url, true);
        http.responseType = 'blob';
        http.onprogress = function(event) {
            let ctx = PROGRESS_CONTEXT.urls[url];
            ctx.l = event.loaded;
            ctx.t = event.total;
            let loaded = 0;
            let total = 0;
            for (let u in PROGRESS_CONTEXT.urls) {
                loaded += parseInt(PROGRESS_CONTEXT.urls[u].l);
                total += parseInt(PROGRESS_CONTEXT.urls[u].t);
            }
            let el =  document.getElementById('progressbar');
            el.setAttribute('value', loaded > total ? 0 : loaded);
            el.setAttribute('max', total);
            el.style.display = 'block';
            //console.log( 'Загружено на сервер ' + loaded + ' байт из ' + total );
        };
        http.onloadstart = function () {
            if (!PROGRESS_CONTEXT.urls[url]) {
                PROGRESS_CONTEXT.urls[url] = {l: 0, t: 0};
            }
        };
        http.onreadystatechange = function () {
            if (http.readyState == 4 && http.status == 200) {
                if (success) success(http.response);
            }
        };
        http.send();
    };

    function loadText(query, callback) {
        var http = getHTTPObject();
        http.overrideMimeType("application/json");
        http.open('GET', query, true);
        http.onreadystatechange = function () {
            if (http.readyState == 4 && http.status == "200") {
                callback(http.responseText);
            }
        }
        http.send();
    }

    let fixedEncodeURIComponent = function(str) {
        return encodeURIComponent(str).replace(/[!'():*]/g, function(c) {
            return '%' + c.charCodeAt(0).toString(16);
        });
    };

    let getHTTPObject = function() {
        if (typeof XMLHttpRequest !== 'undefined') {
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
};

const StoreSingleton = (function () {
    let instance;

    function createInstance() {
        return new StoreHelper();
    }

    return {
        getInstance: function () {
            if (!instance) {
                instance = createInstance();
            }
            return instance;
        }
    };
})();