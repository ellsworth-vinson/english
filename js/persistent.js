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