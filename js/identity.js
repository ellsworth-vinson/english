const IdentitySingleton = (function () {
    let instance;

    const IdentityObject = function () {
        let listeners = [];

        this.getIdentities = function () {
            if (!this.check()) this.recreate();
            let result = [];
            for (let key in this.get().identity) {
                result.push({id: key, sel: this.get().identity[key]});
            }
            return result;
        };

        this.getCurrent = function () {
            if (!this.check()) this.recreate();
            for (let key in this.get().identity)
                if (this.get().identity[key]) return key;
            return '';
        };
        this.setCurrent = function (value) {
            if (!this.check()) this.recreate();
            let ids = this.get().identity;
            for (let key in ids) ids[key] = false;
            ids[value] = true;
            this.save();
        };
        this.delete = function (identity) {
            if (!this.check()) this.recreate();
            let ids = this.get().identity;
            if (ids.hasOwnProperty(identity))
                delete ids[identity];
            let key;
            for (key in ids)
                if (ids[key]) {
                    return;
                }
            if (key !== undefined) ids[key] = true;
            this.save(identity);
        };
        this.save = function (identity) {
            IdentityObject.prototype.save.call(this);
            for (let key in listeners) listeners[key](identity);
        };
        this.check = function () {
            let data = this.get();
            if (!IdentityObject.prototype.check.call(this, data)) {
                return false;
            }
            return typeof data === 'object'
                && data.hasOwnProperty('identity')
                && typeof data['identity'] === 'object';
        };
        this.addListener = function (listener) {
            listeners.push(listener);
        }
    };
    IdentityObject.prototype = new PersistentObject();

    function createInstance() {
        let obj = new IdentityObject();
        obj.setName("https://github.com/ellsworth-vinson/english");
        obj.setInitFunc(function (data) {
            return {identity: {}};
        });
        return obj;
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


IdentityUIHelper = function (el) {

    let identityEl;
    let identityEls;
    let saveEl;
    let delEl;

    let create = function (el) {
        let sn = document.createElement('span');
        sn.innerHTML = 'select: ';
        el.appendChild(sn);
        identityEls = document.createElement("select");
        identityEls.onchange = function () {
            let opt = identityEls.options.item(identityEls.selectedIndex);
            if (opt !== undefined) {
                IdentitySingleton.getInstance().setCurrent(opt.value);
                identityEl.value = opt.value;
            }
        };
        el.appendChild(identityEls);

        sn = document.createElement('span');
        sn.innerHTML = ' edit: ';
        el.appendChild(sn);
        identityEl = document.createElement("input");
        identityEl.type = 'text';
        identityEl.maxlength = 50;
        el.appendChild(identityEl);
        identityEl.onchange = function () {
            change();
        };
        el.appendChild(identityEl);
        fill();

        saveEl = document.createElement('button');
        saveEl.innerHTML = 'Save';
        //el.appendChild(saveEl);

        delEl = document.createElement('img');
        delEl.className = 'del';
        delEl.onclick = function () {
            if (window.confirm("Do you want to delete id?")) del();
        };
        el.appendChild(delEl);
    };

    let fill = function () {
        while (identityEls.options.length > 0) identityEls.remove(0);
        [].forEach.call(IdentitySingleton.getInstance().getIdentities(), function (obj) {
            let opt = document.createElement('option');
            opt.text = obj.id;
            opt.value = obj.id;
            if (obj.sel) {
                opt.selected = true;
            }
            identityEls.add(opt);
        });
        identityEl.value = IdentitySingleton.getInstance().getCurrent();
    };

    let change = function () {
        IdentitySingleton.getInstance().setCurrent(identityEl.value);
        fill();
    };

    let del = function () {
        IdentitySingleton.getInstance().delete(identityEl.value);
        fill();
    };

    create(el);
};