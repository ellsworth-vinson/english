PersistentObject = function() {
    let __name = null;
    let __data = null;
    let __init_fn = null;
    let self = this;

    this.setName = function(name) {
        __name = name;
    }

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

    this.get = function() {
        if (__data === null) __data = getFromLocalStorage(__name);
        if (!check(__data)) {
            self.recreate();
        }
        return __data;
    };

    this.save = function () {
        saveInLocalStorage(__name, JSON.stringify(self.get()));
    };

    let check = function (data) {
        return data !== null && data['id'] !== undefined && data.id === __name;
    };

    let saveInLocalStorage = function(key, value) {
        if (typeof(Storage) !== "undefined") {
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
        } else {
            console.log("Sorry! No Web Storage support..");
        }
    };

    let getFromLocalStorage = function(key) {
        if (typeof(Storage) !== "undefined") {
            return JSON.parse(localStorage.getItem(key));
        } else {
            console.log("Sorry! No Web Storage support..");
            return null;
        }
    }
};