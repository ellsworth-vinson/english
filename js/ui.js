/**
 * Created by vns on 6/24/17.
 */

function SpeakingTextUI(ownID, context, expImgUrl, collImgUrl, playStartImgUrl, playStopImgUrl, hasNumber, isSelection, startStop) {
    var __context = context;
    var __playElements = [];
    var __textElements = {};
    var __audioContext = {};
    var __numberElements = [];
    var __selElements = [];
    var __delay = 0;
    var __loop = 0;
    var __currentPlayer = undefined;
    var __currentPage = 0;
    var __pageSize = 10;
    var __hasNumber = hasNumber;
    var __isSelection = isSelection;
    var __isScroll = false;
    var __self = this;

    this.show = function () {
        create();
    };

    this.expandAll = function () {
        [].forEach.call(__playElements, function (el) {
            expand(el);
        });
    };
    this.collapseAll = function () {
        [].forEach.call(__playElements, function (el) {
            collapse(el);
        });
    };

    this.hideColumns = function (tags, isHide) {
        let sel = '';
        let ts = Array.isArray(tags) ? tags : [tags];
        if (tags.length == 0) {
            return;
        }
        [].forEach.call(ts, function (t) {
            if (sel != '') sel += ',';
            sel += 'td[__ctag=' + t + '] ';
        });
        let els = document.querySelectorAll(sel);
        [].forEach.call(els, function (el) {
            el.style.display = isHide ? 'none' : '';
        });
    };

    this.getContext = function () {
        return context;
    }

    this.setDelay = function (delay) {
        __delay = delay * 1000;
    }

    this.setLoop = function (loop) {
        __loop = loop;
    }

    this.setPage = function(page) {
        __currentPage = page;
    };

    this.setPageSize = function(pageSize, pageIndex) {
        if (pageIndex !== undefined) __currentPage = pageIndex;
        __pageSize = pageSize;
    };

    this.setShowNumber = function (b) {
        __hasNumber = b;
        [].forEach.call(__numberElements, function (el) {
            el.style.display = __hasNumber ? '' : 'none';
        })
    };

    this.setShowSelection = function (b) {
        __isSelection = b;
        [].forEach.call(__selElements, function (el) {
            el.style.display = __isSelection ? '' : 'none';
        })
    };

    this.setScroll = function (scroll) {
        __isScroll = scroll;
    }

    this.setContext = function (context, pageSize) {
        __context = context;
        if (pageSize !== undefined) {
            __pageSize = pageSize;
        }
    }

    var reset = function () {
        clearElement(ownID);
        __playElements = [];
        __textElements = {};
        __audioContext = {}
        __numberElements = [];
        __currentPlayer = undefined;
    }

    function clearElement(elementID) {
        var el = document.getElementById(elementID);
        while (el.hasChildNodes()) {
            el.removeChild(el.firstChild);
        }
    }

    this.recreate = function () {
        create();
    }

    var create = function () {
        reset();
        if (isNoEmptyArray(__context, 'rows')) {
            let ownEl = document.getElementById(ownID);
            let tb = document.createElement("table");
            ownEl.appendChild(tb);
            let ctx = filterContextByPage();
            let nr = __currentPage * __pageSize;
            for (let i = 0; i < ctx.rows.length; i++) {
                let row = ctx.rows[i];
                row.__parent = ctx;
                createLine(row, tb, nr + i);
            }
        }
    };

    var filterContextByPage = function() {
        let hasHead = isNoEmptyArray(__context, 'rows') && typeof __context.rows[0].head !== 'undefined';
        let s = __currentPage * __pageSize + (hasHead ? 1 : 0);
        let f = s + __pageSize  + (hasHead ? 1 : 0) - 1;
        let ctx = {};
        ctx.file = __context.file;
        ctx.rows = [];
        if (hasHead) {
            let row = __context.rows[0];
            ctx.rows.push(row);
        }
        for (let i = hasHead ? 1 : 0; i < __context.rows.length; i++) {
            if (s <= i && i < f) {
                let row = __context.rows[i];
                ctx.rows.push(row);
            }
        };
        return ctx;
    }

    var createPlayElement = function (row, el, isHeader) {
        if (typeof row.__parent.file === 'undefined') {
            return;
        }
        let player = new PlayerWrapper(playStartImgUrl, playStopImgUrl, function (state) {
            if (state == 'start') {
                play(row, !isHeader, player);
            }
            if (state == 'finished') {
                if (typeof __currentPlayer !== 'undefined') {
                    __currentPlayer.stop();
                }
            }
        });
        el.appendChild(player.getControl());
    }

    var fillTraces = function (row, file, traces) {
        if (typeof file === 'undefined') {
            return;
        }
        __currentPlayer = __audioContext[file];
        if (typeof __currentPlayer === 'undefined') {
            __currentPlayer = new AudioPlayer(file);
            __audioContext[file] = __currentPlayer;
        }
        [].forEach.call(row.cols, function (cl) {
            if (typeof cl.__el !== 'undefined'
                && cl.__el.style.display != 'none'
                && cl.st !== undefined
                && cl.ft !== undefined) {
                traces.push(__currentPlayer.createTrace(cl.st, cl.ft, __delay, cl, cl.tx));
            }
        });
    }

    var play = function (row, single, player) {
        let traces = [];
        if (single)
            fillTraces(row, row.__parent.file, traces);
        else {
            [].forEach.call(row.__parent.rows, function (row) {
                fillTraces(row, row.__parent.file, traces);
            });
        }
        __currentPlayer.play(traces, __loop, function (state, tag) {
            if (typeof tag !== 'undefined') {
                let el = tag.__el;
                if (el !== undefined && el != null) {
                    if (state == 'start_trace') {
                        el.style.color = 'red';
                        el.style.fontWeight = 'bold';
                        if (__isScroll) el.scrollIntoView(true);
                    } else if (state == 'stop_trace') {
                        el.style.color = tag.cl === undefined ? 'black' : tag.cl;
                        el.style.fontWeight = 'normal';
                    } else if (state == 'stop') {
                        el.style.color = tag.cl === undefined ? 'black' : tag.cl;
                        el.style.fontWeight = 'normal';
                    }
                }
            }
            if (state == 'stop') {
                player.setState(STATE.STARTED);
                if (typeof startStop !== 'undefined') startStop(false);
            } else if (state == 'start') {
                player.setState(STATE.STOPED);
                if (typeof startStop !== 'undefined') startStop(true);
            }
        });
    }

    var createLine = function (row, tb, number) {
        let tr = document.createElement("tr");
        tb.appendChild(tr);
        let isHeader = typeof row.head !== 'undefined';
        let hasRows = isNoEmptyArray(row, 'rows');

        let firstTdN = document.createElement("td");
        firstTdN.innerHTML = isHeader ? '' : number;
        firstTdN.style.color = 'gray';
        firstTdN.style.fontSize = 'small';
        firstTdN.setAttribute('__number', number);
        firstTdN.style.display = __hasNumber ? '' : 'none';
        __numberElements.push(firstTdN);
        tr.appendChild(firstTdN);

        let firstTdS = document.createElement("td");
        if (!isHeader) {
            let sel = document.createElement("input");
            sel.type = 'checkbox';
            sel.onclick = function () {
                row.sel = this.checked;
            };
            sel.checked = row.sel;
            firstTdS.appendChild(sel);
        }
        __selElements.push(firstTdS);
        firstTdS.style.display = __isSelection ? '' : 'none';
        tr.appendChild(firstTdS);

        let firstTd = document.createElement("td");
        const ctl = document.createElement("IMG");
        firstTd.appendChild(ctl);
        if (!isHeader) {
            ctl.src = hasRows ? expImgUrl : collImgUrl;
            ctl.height = 16;
            ctl.width = 16;
        }
        firstTd.setAttribute('__header', isHeader ? '1' : '0');
        __playElements.push(ctl);
        firstTd.rowSpan = 1;
        tr.appendChild(firstTd);
        [].forEach.call(row.cols, function (cl) {
            let td = document.createElement("td");
            if (cl.tg !== undefined) td.setAttribute('__ctag', cl.tg);
            __textElements[cl.tx] = td;
            td.innerHTML = cl.tx;
            tr.appendChild(td);
            cl.__el = td;
            if (typeof cl.cl !== 'undefined') td.style.color = cl.cl;
            td.setAttribute('__header', isHeader ? '1' : '0');
        });
        createPlayElement(row, firstTd, isHeader);
        if (hasRows) {
            let subTr = document.createElement("tr");
            subTr.style.display = 'none';
            tb.appendChild(subTr);
            firstTd.__nest = subTr;
            let subTb = document.createElement("table");
            subTb.setAttribute('__subtable', '1');

            let subTd = document.createElement("td");
            subTd.style.display = __isSelection ? '' : 'none';
            __selElements.push(subTd);
            subTr.appendChild(subTd);

            subTd = document.createElement("td");
            subTd.style.display = __hasNumber ? '' : 'none';
            __numberElements.push(subTd);
            subTr.appendChild(subTd);
            subTd = document.createElement("td");
            subTd.colSpan = row.cols.length + 1;
            subTr.appendChild(subTd);
            subTd.appendChild(subTb);
            let nr = 0;
            [].forEach.call(row.rows, function (subRow) {
                subRow.__parent = row;
                createLine(subRow, subTb, nr++);
            });
        }
        if (!isHeader) {
            ctl.onclick = function () {
                if (canExpand(this.parentNode)) {
                    if (!isExpanded(this.parentNode)) {
                        expand(this);
                    } else {
                        collapse(this);
                    }
                }
            }
        }
    };

    var isExpanded = function (el) {
        return el.rowSpan == 2;
    }

    var canExpand = function (el) {
        return checkProperty(el, '__nest');
    }

    var expand = function (el) {
        if (checkProperty(el.parentNode, '__nest')) {
            let tr = el.parentNode['__nest'];
            tr.style.display = '';
            el.parentNode.rowSpan = 2;
            el.src = collImgUrl;
        }
    };

    var collapse = function (el) {
        if (checkProperty(el.parentNode, '__nest')) {
            let tr = el.parentNode['__nest'];
            tr.style.display = 'none';
            el.parentNode.rowSpan = 1;
            el.src = expImgUrl;
        }
    };
}

function checkProperty(el, prop) {
    return typeof el !== 'undefined'
        && el != null
        && typeof el[prop] !== 'undefined'
        && el[prop] != null;
}

function isNoEmptyArray(el, prop) {
    return checkProperty(el, prop)
        && Array.isArray(el[prop])
        && el[prop].length > 0;
}

PlayerWrapper = function (startingImgName, stoppingImgName, stateHandler) {
    const __control = document.createElement("IMG");
    __control.src = stoppingImgName;
    __control.height = 16;
    __control.width = 16;
    let __self = this;
    const __stateHandler = function (state) {
        if (stateHandler !== undefined && stateHandler != null) {
            stateHandler(state);
        }
    };

    this.getState = function () {
        return __control.getAttribute('player_state');
    };

    this.setState = function(state) {
        __control.setAttribute('player_state', state);
        __control.src = STATE.STARTED == state ? startingImgName : stoppingImgName;
    };

    this.getControl = function () {
        return __control;
    };

    __control.onclick = function () {
        let state = __self.getState();
        if (STATE.STOPED == state) {
            __self.setState(STATE.STARTED);
            __stateHandler('finished');
        } else {
            __stateHandler('finished');
            __self.setState(STATE.STOPED);
            __stateHandler('start');
        }
    };

    this.setState(STATE.STARTED);
}

// var s = "onmessage = function(e) { postMessage('hello habrahabr'); }";
// var blob = new Blob([s], {type: 'plain/text'});
// var worker = new Worker(
//     window.URL.createObjectURL(
//         blob
//     )
// );
// worker.postMessage('');
// worker.onmessage = function(e) {
//     console.log(e.data);
// }


ContextBuilder = function(snd) {
    var ctx = {};
    var root = ctx;
    ctx.file = snd;
    ctx.rows = [];
    let self = this;

    this.addRow = function(snd, isHead, isSel) {
        let row = {};
        row.file = snd;
        row.rows = [];
        row.cols = [];
        row.sel = isSel;
        if (isHead) row.head = true;
        ctx.rows.push(row);
        row.__parent = ctx;
        ctx = row;
        return self;
    }

    this.addCol = function (c) {
        let col = {
            st:c.st,
            ft:c.ft,
            tx:c.tx,
            tg:c.tg,
            cl:c.cl
        }
        ctx.cols.push(col);
        return self;
    }

    this.toParent = function() {
        ctx = (ctx.__parent !== undefined && ctx.__parent != null)
            ? ctx.__parent : ctx;
        return self;
    }

    this.setFile = function (fn) {
        ctx.file = fn;
        return self;
    }

    this.build = function() {
        return root;
    }
}

var UITools = (function () {
    var __loadingId;
    var __loadingEl;

    return {
        init: function (loadingId) {
            __loadingId = loadingId;
        },

        callLate: function (callback) {
            UITools.showLoading();
            window.setTimeout(function () {
                try {
                    callback();
                } finally {
                    UITools.hideLoading();
                }
            }, 0);
        },

        showLoading: function () {
            if (__loadingEl === undefined) __loadingEl = document.getElementById(__loadingId);
            if (typeof __loadingEl !== 'undefined') __loadingEl.style.visibility = 'visible';
        },

        hideLoading: function () {
            if (__loadingEl === undefined) __loadingEl = document.getElementById(__loadingId);
            if (typeof __loadingEl !== 'undefined') __loadingEl.style.visibility = 'hidden';
        }
    };

    this.init = function (loadingId) {
        __loadingId = loadingId;
    }
})();