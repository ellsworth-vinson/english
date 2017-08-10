const CONTEXTS = {
    am: {
    },
    br: {
    }
};

const SettingsSingleton = (function () {
    let instance;

    function createInstance() {
        return new PersistentObject();
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

const DataSingleton = (function () {
    let instance;

    function createInstance() {
        return new PersistentObject();
    }

    return {
        getInstance: function () {
            if (!instance) {
                instance = createInstance();
            }
            return instance;
        },
        isSelected: function(eng, notUseFilter2) {
            let datas = DataSingleton.getInstance().get();
            if (notUseFilter2 === undefined) notUseFilter2 = false;
            let skipFilter2 = (isAssigned(notUseFilter2) && notUseFilter2)
                || (!isAssignedProp(datas, 'filter2') || Object.keys(datas.filter2).length === 0);
            return skipFilter2
                ? getValueOfProp(datas.filter1, eng, false)
                : !datas.filter2.hasOwnProperty(eng);
        }
    };
})();

let __extImg;
let __collImg;
let __playStartImg;
let __playStopImg;
let audioTextUI;
let __filterUI;
let __contentUI;
let __audioContextBuffer = {};

const Context = function (data_sound_url, example_sound_url, data_url) {
    this.data_sound_url = data_sound_url;
    this.example_sound_url = example_sound_url;
    this.data_url = data_url;

    this.data_sound = null;
    this.example_sound = null;
    this.data = null;
    this.data_sound_sound_url = null;
    this.example_sound_sound_url = null;

    this.isLoaded = function () {
        return this.data_sound !== null && this.example_sound !== null && this.data !== null
            && this.data_sound_sound_url !== null && this.example_sound_sound_url !== null;
    }
};

function createPageNavigation() {
    let settings = SettingsSingleton.getInstance().get();
    let ctx = currentContext();
    let viewID = 'navigateid';
    let group = document.getElementById(viewID);
    clearElement(viewID);
    let allRows = ctx.data.lines.length;
    if (settings.mode === 'view') {
        for (let ind in ctx.data.lines) {
            let l = ctx.data.lines[ind];
            if (l.sel || !getValueOfProp(l, '__display', true)) allRows--;
        }
    }
    let count = Math.floor(allRows / settings.rows_of_page);
    if (allRows % settings.rows_of_page > 0) count++;
    if (settings.page_index >= count) {
        settings.page_index = count - 1;
        SettingsSingleton.getInstance().save();
    }
    for (let i = 0; i < count; i++) {
        let el = document.createElement("input");
        el.type = 'radio';
        el.name = 'page_navigation';
        el.value = i;
        el.checked = i === parseInt(settings.page_index);
        el.onchange = function () {
            SettingsSingleton.getInstance().get().page_index = this.value;
            SettingsSingleton.getInstance().save();
            recreatePage(SettingsSingleton.getInstance().get());
        };
        group.appendChild(el);
        let span = document.createElement("span");
        span.innerHTML = i + 1;
        group.appendChild(span);
    }
}

function createSettings() {
    let mode = document.getElementById('modeid').getAttribute('mode');
    let el = document.querySelector('input[name=page_navigation]:checked');
    let page_index = el === null ? 0 : parseInt(el.value);
    return {
        id: 'settings_dictionary',
        mode: mode,
        is_eng: document.getElementById('enid').checked,
        is_rus: document.getElementById('ruid').checked,
        phonetic: document.getElementById('amid').checked
            ? 'am'
            : document.getElementById('brid').checked
                ? 'br' : 'br',
        topic: document.getElementById('topicid').value,
        rows_of_page: document.getElementById('group1id').checked
            ? 10
            : document.getElementById('group2id').checked
                ? 25
                : document.getElementById('group3id').checked
                    ? 50
                    : 25,
        page_index: page_index,
        loop: document.getElementById("loopid").checked ? 100 : 0,
        delay: document.getElementById("delayid").selectedIndex,
        sort: document.getElementById("sortid").selectedIndex,
        scroll: document.getElementById("scrollid").checked,
        example: document.getElementById("exampleid").checked,
        storage: document.getElementById("selstorageid").checked
    };
}

function initControls() {
    let settings = SettingsSingleton.getInstance().get();
    document.getElementById('enid').checked = settings.is_eng;
    document.getElementById('ruid').checked = settings.is_rus;
    switch (settings.phonetic) {
        case 'am':
            document.getElementById('amid').checked = true;
            break;
        case 'br':
            document.getElementById('brid').checked = true;
            break;
    }
    document.getElementById("topicid").value = settings.topic;
    switch (settings.rows_of_page) {
        case 10:
            document.getElementById('group1id').checked = true;
            break;
        case 25:
            document.getElementById('group2id').checked = true;
            break;
        case 50:
            document.getElementById('group3id').checked = true;
            break;
    }
    document.getElementById("loopid").checked = settings.loop > 0;
    document.getElementById("delayid").selectedIndex = settings.delay;
    document.getElementById("sortid").selectedIndex = settings.sort;
    document.getElementById("scrollid").checked = settings.scroll;
    document.getElementById("exampleid").checked = settings.example;
    document.getElementById("selstorageid").checked = settings.storage;
}

function loadPage(urls, extImg, collImg, playStartImg, playStopImg, callback) {
    __extImg = extImg;
    __collImg = collImg;
    __playStartImg = playStartImg;
    __playStopImg = playStopImg;

    let settings = SettingsSingleton.getInstance().get();
    StoreSingleton.getInstance().resetProgressBar();

    for (let ctx in urls.lines) {
        if (!urls.lines.hasOwnProperty(ctx)) continue;
        let c = urls.lines[ctx];
        let ph = ['am', 'br'];
        for (let i = 0; i < ph.length; i++) {
            /** @namespace c.meta1_url */
            let snd_url = c.meta1_url.replace(/{ph}/g, ph[i]);
            /** @namespace c.meta2_url */
            let snd_example_url = c.meta2_url.replace(/{ph}/g, ph[i]);
            let data_url = c.data_url;
            let ctxObj = new Context(snd_url, snd_example_url, data_url);
            CONTEXTS[ph[i]][ctx] = ctxObj;
            if (ctxObj !== undefined) {
                loadFile(ctxObj);
            }
            if (settings.topic === undefined || settings.topic === "") {
                settings.topic = ctx;
            }
            //console.log(c + "," + ctx);
        }
    }

    const intervalid = setInterval(function () {
        let isLoaded = true;
        for (let pn in CONTEXTS) {
            let ln = CONTEXTS[pn];
            for (let c in ln) {
                if (!ln.hasOwnProperty(c)) continue;
                let ctx = ln[c];
                if (ctx !== undefined) isLoaded &= ctx.isLoaded();
            }
        }

        if (isLoaded) {
            StoreSingleton.getInstance().resetProgressBar();
            bindUIStorage();
            clearInterval(intervalid);
            createTopic(urls.lines);
            createUI();
            createPageNavigation();
            repaint();
            callback();
        }
    }, 1000);
}

function bindUIStorage() {
    let el = document.getElementById('actstorageid');
    el.onclick = function () {
        if (window.confirm("Do you want to purge all files?")) {
            StoreSingleton.getInstance().purge();
            if (SettingsSingleton.getInstance().get().storage) reloadHtml();
        }
    };
}

function createTopic(ctxs) {
    let topic = document.getElementById("topicid");
    let sortingCtx = [];
    for (let ctx in ctxs) {
        sortingCtx.push(ctx);
    }
    sortingCtx.sort(function (w1, w2) {
        return w1.localeCompare(w2);
    });

    for (let ind in sortingCtx) {
        const option = document.createElement("option");
        option.text = sortingCtx[ind];
        topic.add(option)
    }
    let settings = SettingsSingleton.getInstance().get();
    topic.value = settings.topic;
    if (topic.selectedIndex === -1) {
        settings.topic = topic.options.item(0).text;
        topic.selectedIndex = 0;
        SettingsSingleton.getInstance().save();
    }
}

function createUI(arg) {
    let settings = SettingsSingleton.getInstance().get();
    let ctx = currentContext();

    let sortingLines = [];
    if (settings.sort !== 0) {
        ctx.data.lines.forEach(function(line) {
            sortingLines.push(line);
        });
        sortingLines.sort(function (w1, w2) {
            switch (settings.sort) {
                case 1: /** @namespace w1.eng */
                    return w1.eng.localeCompare(w2.eng);
                case 2: /** @namespace w2.eng */
                    return w2.eng.localeCompare(w1.eng);
                case 3: /** @namespace ctx.data_sound.lines */
                    const trn1 = ctx.data_sound.lines[w1.eng] === undefined
                        || ctx.data_sound.lines[w1.eng][2] === undefined ? '' : ctx.data_sound.lines[w1.eng][2];
                    const trn2 = ctx.data_sound.lines[w2.eng] === undefined
                        || ctx.data_sound.lines[w2.eng][2] === undefined ? '' : ctx.data_sound.lines[w2.eng][2];
                    return trn1.localeCompare(trn2);
                case 4:
                    const trn11 = ctx.data_sound.lines[w1.eng] === undefined
                        || ctx.data_sound.lines[w1.eng][2] === undefined ? '' : ctx.data_sound.lines[w1.eng][2];
                    const trn22 = ctx.data_sound.lines[w2.eng] === undefined
                        || ctx.data_sound.lines[w2.eng][2] === undefined ? '' : ctx.data_sound.lines[w2.eng][2];
                    return trn22.localeCompare(trn11);
                case 5:
                    return 0.5 - Math.random();
            }
            return 0;
        });
    } else {
        sortingLines = ctx.data.lines;
    }

    let useOnlyFilter1 = getValueOfProp(arg, 'useOnlyFilter1', false);
    /** @namespace ctx.data_sound.sound_url */
    let builder = new ContextBuilder(ctx.data_sound.sound_url);
    builder.addRow('', true, false)
        .addCol({tx: 'eng', tg: 'eng'})
        .addCol({tx: '[eng]', tg: 'eng'})
        .addCol({tx: 'rus', tg: 'rus'})
        .toParent();
    for (let ind in sortingLines) {
        let l = sortingLines[ind];
        /** @namespace l.eng */
        /** @namespace l.rus */

        let isSel = DataSingleton.isSelected(l.eng, useOnlyFilter1);
        l.__display = !(settings.mode === 'view' && isSel);
        if (!l.__display) return;
        let eng = ctx.data_sound.lines[l.eng];
        let rus = ctx.data_sound.lines[l.rus];
        let eng_st = eng === undefined ? undefined : eng[0];
        let eng_ft = eng === undefined ? undefined : eng[1];
        let eng_tn = eng === undefined ? undefined : eng[2];
        let rus_st = rus === undefined ? undefined : rus[0];
        let rus_ft = rus === undefined ? undefined : rus[1];
        builder.addRow('', false, isSel)
            .addCol({tx: l.eng, tg: 'eng', st: eng_st, ft: eng_ft})
            .addCol({tx: '[' + eng_tn + ']', tg: 'eng', cl: 'grey'})
            .addCol({tx: l.rus, tg: 'rus', st: rus_st, ft: rus_ft, cl: 'grey'});
        /** @namespace l.examples */
        if (l.examples !== undefined) {
            builder.setFile(ctx.example_sound.sound_url);
            let addedHeader = false;
            l.examples.forEach(function (tuple) {
                isSel = DataSingleton.isSelected(tuple.eng, useOnlyFilter1);
                let display = !(settings.mode === 'view' && isSel);
                if (display) {
                    if (!addedHeader) {
                        builder.addRow('', true, false)
                            .addCol({tx: 'eng', tg: 'eng'})
                            .addCol({tx: '[eng]', tg: 'eng'})
                            .addCol({tx: 'rus', tg: 'rus'}).toParent();
                        addedHeader = true;
                    }
                    let ex_eng = ctx.example_sound.lines[tuple.eng];
                    let ex_rus = ctx.example_sound.lines[tuple.rus];
                    let ex_eng_st = ex_eng === undefined ? undefined : ex_eng[0];
                    let ex_eng_ft = ex_eng === undefined ? undefined : ex_eng[1];
                    let ex_eng_tn = eng === undefined ? undefined : ex_eng[2];
                    let ex_rus_st = ex_rus === undefined ? undefined : ex_rus[0];
                    let ex_rus_ft = ex_rus === undefined ? undefined : ex_rus[1];
                        builder.addRow(undefined, false, isSel)
                            .addCol({tx: tuple.eng, st: ex_eng_st, ft: ex_eng_ft, tg: 'eng'})
                            .addCol({tx: '[' + ex_eng_tn + ']', cl: 'grey', tg: 'eng'})
                            .addCol({tx: tuple.rus, st: ex_rus_st, ft: ex_rus_ft, tg: 'rus'}).toParent();
                }
            });
        }
        builder.toParent();
    }

    let rootRow = builder.build();
    audioTextUI = new SpeakingTextUI('container', rootRow,
        __extImg, __collImg, __playStartImg, __playStopImg, true, false,
        function (state) {
            let els = document.querySelectorAll('.ctl');
            els.forEach(function (el) {
                disabledElement(el, state);
            })
        });

    createExamplePlayer(rootRow);

    if (__filterUI === undefined || __filterUI === null) {
        const fel = clearFilterUI();
        __filterUI = document.createElement('textarea');
        __filterUI.wrap = 'soft';
        __filterUI.rows = 10;
        fel.appendChild(__filterUI);

        __contentUI = document.createElement('textarea');
        __contentUI.wrap = 'soft';
        __contentUI.rows = 10;
        fel.appendChild(__contentUI);
    }
}

function createExamplePlayer(rootRow) {
    let rowsExamplePlayer = [];
    for (let key1 in rootRow.rows) {
        let row1 = getValueOfProp(rootRow.rows, key1, null);
        if (isAssignedProp(row1, 'rows')) {
            for (let key2 in row1.rows) {
                let row2 = getValueOfProp(row1.rows, key2, null);
                if (!getValueOfProp(row2, 'head', false)) {
                    rowsExamplePlayer.push(row2)
                }
            }
        }
    }
    let container = clearElement("example_player_id");
    if (rowsExamplePlayer.length > 0) {
        let label = document.createElement('span');
        label.innerHTML = "play example:&nbsp";
        container.appendChild(label);
        container.appendChild(audioTextUI.createPlayer(rowsExamplePlayer));
    }
}

function clearFilterUI() {
    return clearElement('filter');
}

function loadFile(ctx) {
    if (isAssignedProp(__audioContextBuffer, ctx.data_sound_url)) {
        ctx.data_sound = __audioContextBuffer[ctx.data_sound_url];
    } else {
        StoreSingleton.getInstance().getText(ctx.data_sound_url, function (text) {
            ctx.data_sound = JSON.parse(text);
            __audioContextBuffer[ctx.data_sound_url] = ctx.data_sound;
            StoreSingleton.getInstance().getPath(ctx.data_sound.sound_url, function (path) {
                ctx.data_sound.sound_url = path;
                ctx.data_sound_sound_url = path;
            });
        });
    }

    if (isAssignedProp(__audioContextBuffer, ctx.example_sound)) {
        ctx.example_sound = __audioContextBuffer[ctx.example_sound];
    } else {
        StoreSingleton.getInstance().getText(ctx.example_sound_url, function (text) {
            ctx.example_sound = JSON.parse(text);
            __audioContextBuffer[ctx.example_sound] = ctx.example_sound;
            StoreSingleton.getInstance().getPath(ctx.example_sound.sound_url, function (path) {
                ctx.example_sound.sound_url = path;
                ctx.example_sound_sound_url = path;
            });
        });
    }

    if (isAssignedProp(__audioContextBuffer, ctx.data_url)) {
        ctx.data_url = __audioContextBuffer[ctx.data_url];
    } else {
        StoreSingleton.getInstance().getText(ctx.data_url, function (text) {
            /** @namespace ctx.data.lines */
            ctx.data = JSON.parse(text);
            __audioContextBuffer[ctx.data_url] = ctx.data;
        });
    }
}

function currentContext() {
    let settings = SettingsSingleton.getInstance().get();
    return CONTEXTS[settings.phonetic][settings.topic];
}

function repaint() {
    SettingsSingleton.getInstance().recreate();
    let settings = SettingsSingleton.getInstance().get();
    audioTextUI.setPageSize(settings.rows_of_page, settings.page_index);
    UITools.callLate(function () {
        audioTextUI.recreate();
        audioTextUI.setShowSelection(settings.mode === 'edit');
        repaintHideColumns(settings);
        repaintExample(settings);
        repaintDelay(settings);
        repaintLoop(settings);
        repaintScroll(settings);
    });
}

function repaintHideColumns(settings) {
    if (settings === undefined) settings = SettingsSingleton.getInstance().recreate().get();
    let vis = [];
    let hid = [];
    if (settings.is_eng) { vis.push('eng') } else { hid.push('eng') }
    if (settings.is_rus) { vis.push('rus') } else { hid.push('rus') }
    audioTextUI.hideColumns(vis, false);
    audioTextUI.hideColumns(hid, true);
}

function repaintExample(settings) {
    if (settings === undefined) settings = SettingsSingleton.getInstance().recreate().get();
    if (settings.example)
        audioTextUI.expandAll();
    else
        audioTextUI.collapseAll();
}

function repaintDelay(settings) {
    if (settings === undefined) settings = SettingsSingleton.getInstance().recreate().get();
    audioTextUI.setDelay(settings.delay);
}

function repaintLoop(settings) {
    if (settings === undefined) settings = SettingsSingleton.getInstance().recreate().get();
    audioTextUI.setLoop(settings.loop);
}

function repaintScroll(settings) {
    if (settings === undefined) settings = SettingsSingleton.getInstance().recreate().get();
    audioTextUI.setScroll(settings.scroll);
}

function recreatePage(settings) {
    if (settings === undefined) settings = SettingsSingleton.getInstance().recreate().get();
    createPageNavigation();
    UITools.callLate(function () {
        audioTextUI.setPageSize(settings.rows_of_page, settings.page_index);
        audioTextUI.recreate();
        repaint();
        if (settings.example) audioTextUI.expandAll();
    });
}

function recreate() {
    SettingsSingleton.getInstance().recreate();
    UITools.callLate(function () {
        clearElement('container');
        createUI();
        createPageNavigation();
        repaint();
    });
}

function reloadHtml() {
    SettingsSingleton.getInstance().recreate();
    StoreSingleton.getInstance().useLocationFileSystem(SettingsSingleton.getInstance().get().storage);
    SettingsSingleton.getInstance().save();
    location.reload(true);
}

function save(el) {
    let mode = el.getAttribute('mode');
    document.getElementById("filterid").disabled = true;
    if (mode === 'save') {
        SettingsSingleton.getInstance().recreate();
        SettingsSingleton.getInstance().save();
        document.getElementById("filterid").disabled = false;
    } else if (mode === 'edit' || mode === 'filter') {
        if (mode === 'filter') {
            __filterUI.value = '';
            DataSingleton.getInstance().clear();
        } else {
            el.value = 'Edit';
            el.setAttribute('mode', 'view');
            SettingsSingleton.getInstance().recreate();
            DataSingleton.getInstance().recreate();
        }
        DataSingleton.getInstance().save();
        clearElement("container");
        createUI();
        createPageNavigation();
        repaint();
        document.getElementById('filter').style.display = 'none';
        document.getElementById("filterid").disabled = false;
    } else {
        el.setAttribute('mode', 'edit');
        el.value = 'View';
        SettingsSingleton.getInstance().recreate();
        clearElement("container");
        createUI({ useOnlyFilter1: true });
        createPageNavigation();
        repaint();
        fillFilter2UI();
        document.getElementById('filter').style.display = 'block';
    }
}

function fillFilter2UI() {
    if (isAssigned(__filterUI)) {
        let ctx = DataSingleton.getInstance().get();
        let texts = '';
        for (let prop in ctx.filter2) {
            if (!ctx.filter2.hasOwnProperty(prop)) continue;
            if (texts.trim().length > 0) texts += '\n';
            texts += prop.trim();
        }
        __filterUI.value = texts;
    }
    if (isAssigned(__contentUI)) {
        let texts = '';
        let ctx = currentContext();
        ctx.data.lines.forEach(function(line) {
            if (texts !== '') texts += '\n';
            texts += line.eng.trim();
        });
        __contentUI.value = texts;
    }
}

SettingsSingleton.getInstance().setName('settings_dictionary');
SettingsSingleton.getInstance().setInitFunc(createSettings);

DataSingleton.getInstance().setName('data_dictionary');
DataSingleton.getInstance().setInitFunc(function (data) {
    let dataCtn = data === undefined || data === null ? { filter1:{}, filter2: {}} : data;
    if (!dataCtn.hasOwnProperty('filter1')) dataCtn.filter1 = {};
    if (!dataCtn.hasOwnProperty('filter2')) dataCtn.filter2 = {};
    if (audioTextUI === undefined) return dataCtn;
    let rows = audioTextUI.getAllRows();
    let selRows = {};
    rows.forEach(function (c) {
        let tx = c.cols[0].tx;
        selRows[tx] = getValueOfProp(c, 'sel', false) || getValueOfProp(selRows, tx, false);
        dataCtn.filter1[tx] = selRows[tx];
    });
    if (__filterUI !== undefined && __filterUI !== null) {
        if (isAssigned(__filterUI.value)) {
            let texts = __filterUI.value.split('\n');
            dataCtn.filter2 = {};
            if (!(texts.length === 0 || texts[0] === ''))
                texts.forEach(function (txt) {
                    dataCtn.filter2[txt] = true;
                });
        }
    }
    return dataCtn;
});

UITools.init('loading');