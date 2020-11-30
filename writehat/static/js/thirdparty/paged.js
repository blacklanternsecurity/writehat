(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (factory((global.Paged = {})));
}(this, (function (exports) { 'use strict';

    function getBoundingClientRect(element) {
        if (!element) {
            return;
        }
        let rect;
        if (typeof element.getBoundingClientRect !== "undefined") {
            rect = element.getBoundingClientRect();
        } else {
            let range = document.createRange();
            range.selectNode(element);
            rect = range.getBoundingClientRect();
        }
        return rect;
    }

    function getClientRects(element) {
        if (!element) {
            return;
        }
        let rect;
        if (typeof element.getClientRects !== "undefined") {
            rect = element.getClientRects();
        } else {
            let range = document.createRange();
            range.selectNode(element);
            rect = range.getClientRects();
        }
        return rect;
    }

    /**
     * Generates a UUID
     * based on: http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
     * @returns {string} uuid
     */
    function UUID() {
        var d = new Date().getTime();
        if (typeof performance !== "undefined" && typeof performance.now === "function"){
            d += performance.now(); //use high-precision timer if available
        }
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    function attr(element, attributes) {
        for (var i = 0; i < attributes.length; i++) {
            if(element.hasAttribute(attributes[i])) {
                return element.getAttribute(attributes[i]);
            }
        }
    }

    /* Based on by https://mths.be/cssescape v1.5.1 by @mathias | MIT license
     * Allows # and .
     */
    function querySelectorEscape(value) {
        if (arguments.length == 0) {
            throw new TypeError("`CSS.escape` requires an argument.");
        }
        var string = String(value);
        var length = string.length;
        var index = -1;
        var codeUnit;
        var result = "";
        var firstCodeUnit = string.charCodeAt(0);
        while (++index < length) {
            codeUnit = string.charCodeAt(index);
            // Note: there’s no need to special-case astral symbols, surrogate
            // pairs, or lone surrogates.

            // If the character is NULL (U+0000), then the REPLACEMENT CHARACTER
            // (U+FFFD).
            if (codeUnit == 0x0000) {
                result += "\uFFFD";
                continue;
            }

            if (
                // If the character is in the range [\1-\1F] (U+0001 to U+001F) or is
                // U+007F, […]
                (codeUnit >= 0x0001 && codeUnit <= 0x001F) || codeUnit == 0x007F ||
                // If the character is the first character and is in the range [0-9]
                // (U+0030 to U+0039), […]
                (index == 0 && codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
                // If the character is the second character and is in the range [0-9]
                // (U+0030 to U+0039) and the first character is a `-` (U+002D), […]
                (
                    index == 1 &&
                    codeUnit >= 0x0030 && codeUnit <= 0x0039 &&
                    firstCodeUnit == 0x002D
                )
            ) {
                // https://drafts.csswg.org/cssom/#escape-a-character-as-code-point
                result += "\\" + codeUnit.toString(16) + " ";
                continue;
            }

            if (
                // If the character is the first character and is a `-` (U+002D), and
                // there is no second character, […]
                index == 0 &&
                length == 1 &&
                codeUnit == 0x002D
            ) {
                result += "\\" + string.charAt(index);
                continue;
            }

            // If the character is not handled by one of the above rules and is
            // greater than or equal to U+0080, is `-` (U+002D) or `_` (U+005F), or
            // is in one of the ranges [0-9] (U+0030 to U+0039), [A-Z] (U+0041 to
            // U+005A), or [a-z] (U+0061 to U+007A), […]
            if (
                codeUnit >= 0x0080 ||
                codeUnit == 0x002D ||
                codeUnit == 0x005F ||
                codeUnit == 35 || // Allow #
                codeUnit == 46 || // Allow .
                codeUnit >= 0x0030 && codeUnit <= 0x0039 ||
                codeUnit >= 0x0041 && codeUnit <= 0x005A ||
                codeUnit >= 0x0061 && codeUnit <= 0x007A
            ) {
                // the character itself
                result += string.charAt(index);
                continue;
            }

            // Otherwise, the escaped character.
            // https://drafts.csswg.org/cssom/#escape-a-character
            result += "\\" + string.charAt(index);

        }
        return result;
    }

    /**
     * Creates a new pending promise and provides methods to resolve or reject it.
     * From: https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/Promise.jsm/Deferred#backwards_forwards_compatible
     * @returns {object} defered
     */
    function defer() {
        this.resolve = null;

        this.reject = null;

        this.id = UUID();

        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
        Object.freeze(this);
    }

    const requestIdleCallback = typeof window !== "undefined" && ("requestIdleCallback" in window ? window.requestIdleCallback : window.requestAnimationFrame);

    function isElement(node) {
        return node && node.nodeType === 1;
    }

    function isText(node) {
        return node && node.nodeType === 3;
    }

    function *walk(start, limiter) {
        let node = start;

        while (node) {

            yield node;

            if (node.childNodes.length) {
                node = node.firstChild;
            } else if (node.nextSibling) {
                if (limiter && node === limiter) {
                    node = undefined;
                    break;
                }
                node = node.nextSibling;
            } else {
                while (node) {
                    node = node.parentNode;
                    if (limiter && node === limiter) {
                        node = undefined;
                        break;
                    }
                    if (node && node.nextSibling) {
                        node = node.nextSibling;
                        break;
                    }

                }
            }
        }
    }

    function nodeAfter(node, limiter) {
        let after = node;

        if (after.nextSibling) {
            if (limiter && node === limiter) {
                return;
            }
            after = after.nextSibling;
        } else {
            while (after) {
                after = after.parentNode;
                if (limiter && after === limiter) {
                    after = undefined;
                    break;
                }
                if (after && after.nextSibling) {
                    after = after.nextSibling;
                    break;
                }
            }
        }

        return after;
    }

    function nodeBefore(node, limiter) {
        let before = node;
        if (before.previousSibling) {
            if (limiter && node === limiter) {
                return;
            }
            before = before.previousSibling;
        } else {
            while (before) {
                before = before.parentNode;
                if (limiter && before === limiter) {
                    before = undefined;
                    break;
                }
                if (before && before.previousSibling) {
                    before = before.previousSibling;
                    break;
                }
            }
        }

        return before;
    }

    function elementAfter(node, limiter) {
        let after = nodeAfter(node);

        while (after && after.nodeType !== 1) {
            after = nodeAfter(after);
        }

        return after;
    }

    function rebuildAncestors(node) {
        let parent, ancestor;
        let ancestors = [];
        let added = [];

        let fragment = document.createDocumentFragment();

        // Gather all ancestors
        let element = node;
        while(element.parentNode && element.parentNode.nodeType === 1) {
            ancestors.unshift(element.parentNode);
            element = element.parentNode;
        }

        for (var i = 0; i < ancestors.length; i++) {
            ancestor = ancestors[i];
            parent = ancestor.cloneNode(false);

            parent.setAttribute("data-split-from", parent.getAttribute("data-ref"));
            // ancestor.setAttribute("data-split-to", parent.getAttribute("data-ref"));

            if (parent.hasAttribute("id")) {
                let dataID = parent.getAttribute("id");
                parent.setAttribute("data-id", dataID);
                parent.removeAttribute("id");
            }

            // This is handled by css :not, but also tidied up here
            if (parent.hasAttribute("data-break-before")) {
                parent.removeAttribute("data-break-before");
            }

            if (parent.hasAttribute("data-previous-break-after")) {
                parent.removeAttribute("data-previous-break-after");
            }

            if (added.length) {
                let container = added[added.length-1];

                /**
                 * If the split element is a TD with class finding-field-data:
                 *  - Find the previous instance via data-split-from
                 *  - Retrieve that instance's parent (TR)
                 *  - Get the TH element that sits alongside the overflowed TD
                 *  - Clone the TH and insert the cloned element into container
                 *
                 * Note: This is specific to the edge case at hand in which the
                 * TD that overflowed onto an additional page will always have
                 * exactly one sibling, and that sibling will always be a TH. A
                 * more general approach would need to identify all sibling
                 * elements of the split TD, and should gracefully handle
                 * removal of properties like ID from the cloned element .
                 **/

                let p = $(parent); // TODO: Don't use jQuery selectors
                if (p.prop("tagName") == "TD" && p.hasClass("clone-siblings")) {
                    let td_parent = parent.getAttribute("data-split-from")
                    let td_orig = document.querySelector("td.clone-siblings[data-ref='" + td_parent + "']");

                    if (td_orig != null) {
                        let tr_orig = td_orig.parentElement;
                        let th_orig = tr_orig.querySelector("th.clone-siblings");
                        if (th_orig != null) {
                            let th_new = th_orig.cloneNode(true);
                            if (th_new.textContent.length) {
                                th_new.textContent += " (Cont'd)";
                            }
                            container.appendChild(th_new);
                        }
                    }
                }
                container.appendChild(parent);
            } else {
                fragment.appendChild(parent);
            }
            added.push(parent);
        }

        added = undefined;
        return fragment;
    }

    /*
    export function split(bound, cutElement, breakAfter) {
            let needsRemoval = [];
            let index = indexOf(cutElement);

            if (!breakAfter && index === 0) {
                return;
            }

            if (breakAfter && index === (cutElement.parentNode.children.length - 1)) {
                return;
            }

            // Create a fragment with rebuilt ancestors
            let fragment = rebuildAncestors(cutElement);

            // Clone cut
            if (!breakAfter) {
                let clone = cutElement.cloneNode(true);
                let ref = cutElement.parentNode.getAttribute('data-ref');
                let parent = fragment.querySelector("[data-ref='" + ref + "']");
                parent.appendChild(clone);
                needsRemoval.push(cutElement);
            }

            // Remove all after cut
            let next = nodeAfter(cutElement, bound);
            while (next) {
                let clone = next.cloneNode(true);
                let ref = next.parentNode.getAttribute('data-ref');
                let parent = fragment.querySelector("[data-ref='" + ref + "']");
                parent.appendChild(clone);
                needsRemoval.push(next);
                next = nodeAfter(next, bound);
            }

            // Remove originals
            needsRemoval.forEach((node) => {
                if (node) {
                    node.remove();
                }
            });

            // Insert after bounds
            bound.parentNode.insertBefore(fragment, bound.nextSibling);
            return [bound, bound.nextSibling];
    }
    */

    function needsBreakBefore(node) {
        if( typeof node !== "undefined" &&
                typeof node.dataset !== "undefined" &&
                typeof node.dataset.breakBefore !== "undefined" &&
                (node.dataset.breakBefore === "always" ||
                 node.dataset.breakBefore === "page" ||
                 node.dataset.breakBefore === "left" ||
                 node.dataset.breakBefore === "right" ||
                 node.dataset.breakBefore === "recto" ||
                 node.dataset.breakBefore === "verso")
             ) {
            return true;
        }

        return false;
    }

    function needsPreviousBreakAfter(node) {
        if( typeof node !== "undefined" &&
                typeof node.dataset !== "undefined" &&
                typeof node.dataset.previousBreakAfter !== "undefined" &&
                (node.dataset.previousBreakAfter === "always" ||
                 node.dataset.previousBreakAfter === "page" ||
                 node.dataset.previousBreakAfter === "left" ||
                 node.dataset.previousBreakAfter === "right" ||
                 node.dataset.previousBreakAfter === "recto" ||
                 node.dataset.previousBreakAfter === "verso")
             ) {
            return true;
        }

        return false;
    }

    function needsPageBreak(node) {
        if( typeof node !== "undefined" &&
                typeof node.dataset !== "undefined" &&
                (node.dataset.page || node.dataset.afterPage)
             ) {
            return true;
        }

        return false;
    }

    function *words(node) {
        let currentText = node.nodeValue;
        let max = currentText.length;
        let currentOffset = 0;
        let currentLetter;

        let range;

        while(currentOffset < max) {
            currentLetter = currentText[currentOffset];
            if (/^[\S\u202F\u00A0]$/.test(currentLetter)) {
                if (!range) {
                    range = document.createRange();
                    range.setStart(node, currentOffset);
                }
            } else {
                if (range) {
                    range.setEnd(node, currentOffset);
                    yield range;
                    range = undefined;
                }
            }

            currentOffset += 1;
        }

        if (range) {
            range.setEnd(node, currentOffset);
            yield range;
            range = undefined;
        }
    }

    function *letters(wordRange) {
        let currentText = wordRange.startContainer;
        let max = currentText.length;
        let currentOffset = wordRange.startOffset;
        // let currentLetter;

        let range;

        while(currentOffset < max) {
             // currentLetter = currentText[currentOffset];
             range = document.createRange();
             range.setStart(currentText, currentOffset);
             range.setEnd(currentText, currentOffset+1);

             yield range;

             currentOffset += 1;
        }
    }

    function isContainer(node) {
        let container;

        if (typeof node.tagName === "undefined") {
            return true;
        }

        if (node.style.display === "none") {
            return false;
        }

        switch (node.tagName) {
            // Inline
            case "A":
            case "ABBR":
            case "ACRONYM":
            case "B":
            case "BDO":
            case "BIG":
            case "BR":
            case "BUTTON":
            case "CITE":
            case "CODE":
            case "DFN":
            case "EM":
            case "I":
            case "IMG":
            case "INPUT":
            case "KBD":
            case "LABEL":
            case "MAP":
            case "OBJECT":
            case "Q":
            case "SAMP":
            case "SCRIPT":
            case "SELECT":
            case "SMALL":
            case "SPAN":
            case "STRONG":
            case "SUB":
            case "SUP":
            case "TEXTAREA":
            case "TIME":
            case "TT":
            case "VAR":
            case "P":
            case "H1":
            case "H2":
            case "H3":
            case "H4":
            case "H5":
            case "H6":
            case "FIGCAPTION":
            case "BLOCKQUOTE":
            case "PRE":
            case "LI":
            case "TR":
            case "DT":
            case "DD":
            case "VIDEO":
            case "CANVAS":
                container = false;
                break;
            default:
                container = true;
        }

        return container;
    }

    function cloneNode(n, deep=false) {
        return n.cloneNode(deep);
    }

    function findElement(node, doc) {
        const ref = node.getAttribute("data-ref");
        return findRef(ref, doc);
    }

    function findRef(ref, doc) {
        return doc.querySelector(`[data-ref='${ref}']`);
    }

    function validNode(node) {
        if (isText(node)) {
            return true;
        }

        if (isElement(node) && node.dataset.ref) {
            return true;
        }

        return false;
    }

    function prevValidNode(node) {
        while (!validNode(node)) {
            if (node.previousSibling) {
                node = node.previousSibling;
            } else {
                node = node.parentNode;
            }

            if (!node) {
                break;
            }
        }

        return node;
    }


    function indexOf(node) {
        let parent = node.parentNode;
        if (!parent) {
            return 0;
        }
        return Array.prototype.indexOf.call(parent.childNodes, node);
    }

    function child(node, index) {
        return node.childNodes[index];
    }

    function hasContent(node) {
        if (isElement(node)) {
            return true;
        } else if (isText(node) &&
                node.textContent.trim().length) {
            return true;
        }
        return false;
    }

    function indexOfTextNode(node, parent) {
        if (!isText(node)) {
            return -1;
        }
        let nodeTextContent = node.textContent;
        let child;
        let index = -1;
        for (var i = 0; i < parent.childNodes.length; i++) {
            child = parent.childNodes[i];
            if (child.nodeType === 3) {
                let text = parent.childNodes[i].textContent;
                if (text.includes(nodeTextContent)) {
                    index = i;
                    break;
                }
            }
        }

        return index;
    }

    function createCommonjsModule(fn, module) {
        return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var isImplemented = function () {
        var assign = Object.assign, obj;
        if (typeof assign !== "function") return false;
        obj = { foo: "raz" };
        assign(obj, { bar: "dwa" }, { trzy: "trzy" });
        return (obj.foo + obj.bar + obj.trzy) === "razdwatrzy";
    };

    var isImplemented$1 = function () {
        try {
            return true;
        } catch (e) {
     return false;
    }
    };

    // eslint-disable-next-line no-empty-function
    var noop = function () {};

    var _undefined = noop(); // Support ES3 engines

    var isValue = function (val) {
     return (val !== _undefined) && (val !== null);
    };

    var keys = Object.keys;

    var shim = function (object) {
        return keys(isValue(object) ? Object(object) : object);
    };

    var keys$1 = isImplemented$1()
        ? Object.keys
        : shim;

    var validValue = function (value) {
        if (!isValue(value)) throw new TypeError("Cannot use null or undefined");
        return value;
    };

    var max   = Math.max;

    var shim$1 = function (dest, src /*, …srcn*/) {
        var error, i, length = max(arguments.length, 2), assign;
        dest = Object(validValue(dest));
        assign = function (key) {
            try {
                dest[key] = src[key];
            } catch (e) {
                if (!error) error = e;
            }
        };
        for (i = 1; i < length; ++i) {
            src = arguments[i];
            keys$1(src).forEach(assign);
        }
        if (error !== undefined) throw error;
        return dest;
    };

    var assign = isImplemented()
        ? Object.assign
        : shim$1;

    var forEach = Array.prototype.forEach, create = Object.create;

    var process = function (src, obj) {
        var key;
        for (key in src) obj[key] = src[key];
    };

    // eslint-disable-next-line no-unused-vars
    var normalizeOptions = function (opts1 /*, …options*/) {
        var result = create(null);
        forEach.call(arguments, function (options) {
            if (!isValue(options)) return;
            process(Object(options), result);
        });
        return result;
    };

    // Deprecated

    var isCallable = function (obj) {
     return typeof obj === "function";
    };

    var str = "razdwatrzy";

    var isImplemented$2 = function () {
        if (typeof str.contains !== "function") return false;
        return (str.contains("dwa") === true) && (str.contains("foo") === false);
    };

    var indexOf$1 = String.prototype.indexOf;

    var shim$2 = function (searchString/*, position*/) {
        return indexOf$1.call(this, searchString, arguments[1]) > -1;
    };

    var contains = isImplemented$2()
        ? String.prototype.contains
        : shim$2;

    var d_1 = createCommonjsModule(function (module) {

    var d;

    d = module.exports = function (dscr, value/*, options*/) {
        var c, e, w, options, desc;
        if ((arguments.length < 2) || (typeof dscr !== 'string')) {
            options = value;
            value = dscr;
            dscr = null;
        } else {
            options = arguments[2];
        }
        if (dscr == null) {
            c = w = true;
            e = false;
        } else {
            c = contains.call(dscr, 'c');
            e = contains.call(dscr, 'e');
            w = contains.call(dscr, 'w');
        }

        desc = { value: value, configurable: c, enumerable: e, writable: w };
        return !options ? desc : assign(normalizeOptions(options), desc);
    };

    d.gs = function (dscr, get, set/*, options*/) {
        var c, e, options, desc;
        if (typeof dscr !== 'string') {
            options = set;
            set = get;
            get = dscr;
            dscr = null;
        } else {
            options = arguments[3];
        }
        if (get == null) {
            get = undefined;
        } else if (!isCallable(get)) {
            options = get;
            get = set = undefined;
        } else if (set == null) {
            set = undefined;
        } else if (!isCallable(set)) {
            options = set;
            set = undefined;
        }
        if (dscr == null) {
            c = true;
            e = false;
        } else {
            c = contains.call(dscr, 'c');
            e = contains.call(dscr, 'e');
        }

        desc = { get: get, set: set, configurable: c, enumerable: e };
        return !options ? desc : assign(normalizeOptions(options), desc);
    };
    });

    var validCallable = function (fn) {
        if (typeof fn !== "function") throw new TypeError(fn + " is not a function");
        return fn;
    };

    var eventEmitter = createCommonjsModule(function (module, exports) {

    var apply = Function.prototype.apply, call = Function.prototype.call
      , create = Object.create, defineProperty = Object.defineProperty
      , defineProperties = Object.defineProperties
      , hasOwnProperty = Object.prototype.hasOwnProperty
      , descriptor = { configurable: true, enumerable: false, writable: true }

      , on, once, off, emit, methods, descriptors, base;

    on = function (type, listener) {
        var data;

        validCallable(listener);

        if (!hasOwnProperty.call(this, '__ee__')) {
            data = descriptor.value = create(null);
            defineProperty(this, '__ee__', descriptor);
            descriptor.value = null;
        } else {
            data = this.__ee__;
        }
        if (!data[type]) data[type] = listener;
        else if (typeof data[type] === 'object') data[type].push(listener);
        else data[type] = [data[type], listener];

        return this;
    };

    once = function (type, listener) {
        var once, self;

        validCallable(listener);
        self = this;
        on.call(this, type, once = function () {
            off.call(self, type, once);
            apply.call(listener, this, arguments);
        });

        once.__eeOnceListener__ = listener;
        return this;
    };

    off = function (type, listener) {
        var data, listeners, candidate, i;

        validCallable(listener);

        if (!hasOwnProperty.call(this, '__ee__')) return this;
        data = this.__ee__;
        if (!data[type]) return this;
        listeners = data[type];

        if (typeof listeners === 'object') {
            for (i = 0; (candidate = listeners[i]); ++i) {
                if ((candidate === listener) ||
                        (candidate.__eeOnceListener__ === listener)) {
                    if (listeners.length === 2) data[type] = listeners[i ? 0 : 1];
                    else listeners.splice(i, 1);
                }
            }
        } else {
            if ((listeners === listener) ||
                    (listeners.__eeOnceListener__ === listener)) {
                delete data[type];
            }
        }

        return this;
    };

    emit = function (type) {
        var i, l, listener, listeners, args;

        if (!hasOwnProperty.call(this, '__ee__')) return;
        listeners = this.__ee__[type];
        if (!listeners) return;

        if (typeof listeners === 'object') {
            l = arguments.length;
            args = new Array(l - 1);
            for (i = 1; i < l; ++i) args[i - 1] = arguments[i];

            listeners = listeners.slice();
            for (i = 0; (listener = listeners[i]); ++i) {
                apply.call(listener, this, args);
            }
        } else {
            switch (arguments.length) {
            case 1:
                call.call(listeners, this);
                break;
            case 2:
                call.call(listeners, this, arguments[1]);
                break;
            case 3:
                call.call(listeners, this, arguments[1], arguments[2]);
                break;
            default:
                l = arguments.length;
                args = new Array(l - 1);
                for (i = 1; i < l; ++i) {
                    args[i - 1] = arguments[i];
                }
                apply.call(listeners, this, args);
            }
        }
    };

    methods = {
        on: on,
        once: once,
        off: off,
        emit: emit
    };

    descriptors = {
        on: d_1(on),
        once: d_1(once),
        off: d_1(off),
        emit: d_1(emit)
    };

    base = defineProperties({}, descriptors);

    module.exports = exports = function (o) {
        return (o == null) ? create(base) : defineProperties(Object(o), descriptors);
    };
    exports.methods = methods;
    });
    var eventEmitter_1 = eventEmitter.methods;

    /**
     * Hooks allow for injecting functions that must all complete in order before finishing
     * They will execute in parallel but all must finish before continuing
     * Functions may return a promise if they are asycn.
     * From epubjs/src/utils/hooks
     * @param {any} context scope of this
     * @example this.content = new Hook(this);
     */
    class Hook {
        constructor(context){
            this.context = context || this;
            this.hooks = [];
        }

        /**
         * Adds a function to be run before a hook completes
         * @example this.content.register(function(){...});
         * @return {undefined} void
         */
        register(){
            for(var i = 0; i < arguments.length; ++i) {
                if (typeof arguments[i]  === "function") {
                    this.hooks.push(arguments[i]);
                } else {
                    // unpack array
                    for(var j = 0; j < arguments[i].length; ++j) {
                        this.hooks.push(arguments[i][j]);
                    }
                }
            }
        }

        /**
         * Triggers a hook to run all functions
         * @example this.content.trigger(args).then(function(){...});
         * @return {undefined} void
         */
        trigger(){
            var args = arguments;
            var context = this.context;
            var promises = [];

            this.hooks.forEach(function(task) {
                var executing = task.apply(context, args);

                if(executing && typeof executing["then"] === "function") {
                    // Task is a function that returns a promise
                    promises.push(executing);
                }
                // Otherwise Task resolves immediately, continue
            });


            return Promise.all(promises);
        }

        // Adds a function to be run before a hook completes
        list(){
            return this.hooks;
        }

        clear(){
            return this.hooks = [];
        }
    }

    const MAX_CHARS_PER_BREAK = 1500;

    /**
     * Layout
     * @class
     */
    class Layout {

        constructor(element, hooks, maxChars) {
            this.element = element;

            this.bounds = this.element.getBoundingClientRect();

            if (hooks) {
                this.hooks = hooks;
            } else {
                this.hooks = {};
                this.hooks.layout = new Hook();
                this.hooks.renderNode = new Hook();
                this.hooks.layoutNode = new Hook();
                this.hooks.overflow = new Hook();
            }

            this.maxChars = maxChars || MAX_CHARS_PER_BREAK;
        }

        async renderTo(wrapper, source, breakToken, bounds=this.bounds) {
            let start = this.getStart(source, breakToken);
            let walker = walk(start, source);

            let node;
            let done;
            let next;

            let hasRenderedContent = false;
            let newBreakToken;

            let length = 0;

            while (!done && !newBreakToken) {
                next = walker.next();
                node = next.value;
                done = next.done;

                if (!node) {
                    this.hooks && this.hooks.layout.trigger(wrapper, this);

                    let imgs = wrapper.querySelectorAll("img");
                    if (imgs.length) {
                        await this.waitForImages(imgs);
                    }

                    newBreakToken = this.findBreakToken(wrapper, source, bounds);
                    return newBreakToken;
                }

                this.hooks && this.hooks.layoutNode.trigger(node);

                // Check if the rendered element has a break set
                if (hasRenderedContent && this.shouldBreak(node)) {

                    this.hooks && this.hooks.layout.trigger(wrapper, this);

                    let imgs = wrapper.querySelectorAll("img");
                    if (imgs.length) {
                        await this.waitForImages(imgs);
                    }

                    newBreakToken = this.findBreakToken(wrapper, source, bounds);

                    if (!newBreakToken) {
                        newBreakToken = this.breakAt(node);
                    }

                    length = 0;

                    break;
                }

                // Should the Node be a shallow or deep clone
                let shallow = isContainer(node);

                let rendered = this.append(node, wrapper, breakToken, shallow);

                length += rendered.textContent.length;

                // Check if layout has content yet
                if (!hasRenderedContent) {
                    hasRenderedContent = hasContent(node);
                }

                // Skip to the next node if a deep clone was rendered
                if (!shallow) {
                    walker = walk(nodeAfter(node, source), source);
                }

                // Only check x characters
                if (length >= this.maxChars) {

                    this.hooks && this.hooks.layout.trigger(wrapper, this);

                    let imgs = wrapper.querySelectorAll("img");
                    if (imgs.length) {
                        await this.waitForImages(imgs);
                    }

                    newBreakToken = this.findBreakToken(wrapper, source, bounds);

                    if (newBreakToken) {
                        length = 0;
                    }
                }

            }

            return newBreakToken;
        }

        breakAt(node, offset=0) {
            return {
                node,
                offset
            };
        }

        shouldBreak(node) {
            let previousSibling = node.previousSibling;
            let parentNode = node.parentNode;
            let parentBreakBefore = needsBreakBefore(node) && parentNode && !previousSibling && needsBreakBefore(parentNode);
            let doubleBreakBefore;

            if (parentBreakBefore) {
                doubleBreakBefore = node.dataset.breakBefore === parentNode.dataset.breakBefore;
            }

            return !doubleBreakBefore && needsBreakBefore(node) || needsPreviousBreakAfter(node) || needsPageBreak(node);
        }

        getStart(source, breakToken) {
            let start;
            let node = breakToken && breakToken.node;

            if (node) {
                start = node;
            } else {
                start = source.firstChild;
            }

            return start;
        }

        append(node, dest, breakToken, shallow=true, rebuild=true) {

            let clone = cloneNode(node, !shallow);

            if (node.parentNode && isElement(node.parentNode)) {
                let parent = findElement(node.parentNode, dest);
                // Rebuild chain
                if (parent) {
                    parent.appendChild(clone);
                } else if (rebuild) {
                    let fragment = rebuildAncestors(node);
                    parent = findElement(node.parentNode, fragment);
                    if (!parent) {
                        dest.appendChild(clone);
                    } else if (breakToken && isText(breakToken.node) && breakToken.offset > 0) {
                        clone.textContent = clone.textContent.substring(breakToken.offset);
                        parent.appendChild(clone);
                    } else {
                        parent.appendChild(clone);
                    }

                    dest.appendChild(fragment);
                } else {
                    dest.appendChild(clone);
                }


            } else {
                dest.appendChild(clone);
            }

            this.hooks && this.hooks.renderNode.trigger(clone);

            return clone;
        }

        async waitForImages(imgs) {
            let results = Array.from(imgs).map(async (img) => {
                return this.awaitImageLoaded(img);
            });
            await Promise.all(results);
        }

        async awaitImageLoaded(image) {
            return new Promise(resolve => {
                if (image.complete !== true) {
                    image.onload = function() {
                        let { width, height } = window.getComputedStyle(image);
                        resolve(width, height);
                    };
                    image.onerror = function(e) {
                        let { width, height } = window.getComputedStyle(image);
                        resolve(width, height, e);
                    };
                } else {
                    let { width, height } = window.getComputedStyle(image);
                    resolve(width, height);
                }
            });
        }

        avoidBreakInside(node, limiter) {
            let breakNode;

            if (node === limiter) {
                return;
            }

            while (node.parentNode) {
                node = node.parentNode;

                if (node === limiter) {
                    break;
                }

                if(window.getComputedStyle(node)["break-inside"] === "avoid") {
                    breakNode = node;
                    break;
                }

            }
            return breakNode;
        }

        createBreakToken(overflow, rendered, source) {
            let container = overflow.startContainer;
            let offset = overflow.startOffset;
            let node, renderedNode, parent, index, temp;

            if (isElement(container)) {
                temp = child(container, offset);

                if (isElement(temp)) {
                    renderedNode = findElement(temp, rendered);

                    if (!renderedNode) {
                        // Find closest element with data-ref
                        renderedNode = findElement(prevValidNode(temp), rendered);
                        return;
                    }

                    node = findElement(renderedNode, source);
                    offset = 0;
                } else {
                    renderedNode = findElement(container, rendered);

                    if (!renderedNode) {
                        renderedNode = findElement(prevValidNode(container), rendered);
                    }

                    parent = findElement(renderedNode, source);
                    index = indexOfTextNode(temp, parent);
                    node = child(parent, index);
                    offset = 0;
                }
            } else {
                renderedNode = findElement(container.parentNode, rendered);

                if (!renderedNode) {
                    renderedNode = findElement(prevValidNode(container.parentNode), rendered);
                }

                parent = findElement(renderedNode, source);
                index = indexOfTextNode(container, parent);
                node = child(parent, index);

                if (node && container)  offset += node.textContent.indexOf(container.textContent);
            }

            if (!node) {
                return;
            }

            return {
                node,
                offset
            };

        }

        findBreakToken(rendered, source, bounds=this.bounds, extract=true) {
            let overflow = this.findOverflow(rendered, bounds);
            let breakToken;

            if (overflow) {
                breakToken = this.createBreakToken(overflow, rendered, source);

                if (breakToken && breakToken.node && extract) {
                    this.removeOverflow(overflow);
                }

            }
            return breakToken;
        }

        hasOverflow(element, bounds=this.bounds) {
            let constrainingElement = element && element.parentNode; // this gets the element, instead of the wrapper for the width workaround
            let { width } = element.getBoundingClientRect();
            let scrollWidth = constrainingElement ? constrainingElement.scrollWidth : 0;
            return Math.max(Math.floor(width), scrollWidth) > Math.round(bounds.width);
        }

        findOverflow(rendered, bounds=this.bounds) {
            if (!this.hasOverflow(rendered, bounds)) return;

            let start = Math.round(bounds.left);
            let end =  Math.round(bounds.right);
            let range;

            let walker = walk(rendered.firstChild, rendered);

            // Find Start
            let next, done, node, offset, skip, breakAvoid, prev, br;
            while (!done) {
                next = walker.next();
                done = next.done;
                node = next.value;
                skip = false;
                breakAvoid = false;
                prev = undefined;
                br = undefined;

                if (node) {
                    let pos = getBoundingClientRect(node);
                    let left = Math.floor(pos.left);
                    let right = Math.floor(pos.right);

                    if (!range && left >= end) {
                        // Check if it is a float
                        let isFloat = false;

                        if (isElement(node) ) {
                            let styles = window.getComputedStyle(node);
                            isFloat = styles.getPropertyValue("float") !== "none";
                            skip = styles.getPropertyValue("break-inside") === "avoid";
                            breakAvoid = node.dataset.breakBefore === "avoid" || node.dataset.previousBreakAfter === "avoid";
                            prev = breakAvoid && nodeBefore(node, rendered);
                            br = node.tagName === "BR" || node.tagName === "WBR";
                        }

                        if (prev) {
                            range = document.createRange();
                            range.setStartBefore(prev);
                            break;
                        }

                        if (!br && !isFloat && isElement(node)) {
                            range = document.createRange();
                            range.setStartBefore(node);
                            break;
                        }

                        if (isText(node) && node.textContent.trim().length) {
                            range = document.createRange();
                            range.setStartBefore(node);
                            break;
                        }

                    }

                    if (!range && isText(node) &&
                            node.textContent.trim().length &&
                            window.getComputedStyle(node.parentNode)["break-inside"] !== "avoid") {

                        let rects = getClientRects(node);
                        let rect;
                        left = 0;
                        for (var i = 0; i != rects.length; i++) {
                            rect = rects[i];
                            if (!left || rect.left > left) {
                                left = rect.left;
                            }
                        }

                        if(left >= end) {
                            range = document.createRange();
                            offset = this.textBreak(node, start, end);
                            if (!offset) {
                                range = undefined;
                            } else {
                                range.setStart(node, offset);
                            }
                            break;
                        }
                    }

                    // Skip children
                    if (skip || right < end) {
                        next = nodeAfter(node, rendered);
                        if (next) {
                            walker = walk(next, rendered);
                        }

                    }

                }
            }

            // Find End
            if (range) {
                range.setEndAfter(rendered.lastChild);
                return range;
            }

        }

        findEndToken(rendered, source, bounds=this.bounds) {
            if (rendered.childNodes.length === 0) {
                return;
            }

            let lastChild = rendered.lastChild;

            let lastNodeIndex;
            while (lastChild && lastChild.lastChild) {
                if (!validNode(lastChild)) {
                    // Only get elements with refs
                    lastChild = lastChild.previousSibling;
                } else if(!validNode(lastChild.lastChild)) {
                    // Deal with invalid dom items
                    lastChild = prevValidNode(lastChild.lastChild);
                    break;
                } else {
                    lastChild = lastChild.lastChild;
                }
            }

            if (isText(lastChild)) {

                if (lastChild.parentNode.dataset.ref) {
                    lastNodeIndex = indexOf(lastChild);
                    lastChild = lastChild.parentNode;
                } else {
                    lastChild = lastChild.previousSibling;
                }
            }

            let original = findElement(lastChild, source);

            if (lastNodeIndex) {
                original = original.childNodes[lastNodeIndex];
            }

            let after = nodeAfter(original);

            return this.breakAt(after);
        }

        textBreak(node, start, end) {
            let wordwalker = words(node);
            let left = 0;
            let right = 0;
            let word, next, done, pos;
            let offset;
            while (!done) {
                next = wordwalker.next();
                word = next.value;
                done = next.done;

                if (!word) {
                    break;
                }

                pos = getBoundingClientRect(word);

                left = Math.floor(pos.left);
                right = Math.floor(pos.right);

                if (left >= end) {
                    offset = word.startOffset;
                    break;
                }

                if (right > end) {
                    let letterwalker = letters(word);
                    let letter, nextLetter, doneLetter;

                    while (!doneLetter) {
                        nextLetter = letterwalker.next();
                        letter = nextLetter.value;
                        doneLetter = nextLetter.done;

                        if (!letter) {
                            break;
                        }

                        pos = getBoundingClientRect(letter);
                        left = Math.floor(pos.left);

                        if (left >= end) {
                            offset = letter.startOffset;
                            done = true;

                            break;
                        }
                    }
                }

            }

            return offset;
        }

        removeOverflow(overflow) {
            this.hyphenateAtBreak(overflow);

            return overflow.extractContents();
        }

        hyphenateAtBreak(overflow) {
            if (isText(overflow.startContainer) && overflow.startOffset > 0) {
                let startText = overflow.startContainer.textContent;
                let startOffset = overflow.startOffset;
                let prevLetter = startText[startOffset-1];

                // Add a hyphen if previous character is a letter or soft hyphen
                if (/^\w|\u00AD$/.test(prevLetter)) {
                    overflow.startContainer.textContent = startText.slice(0, startOffset) + "\u2010";
                    overflow.setStart(overflow.startContainer, startOffset + 1);
                }
            }
        }
    }

    eventEmitter(Layout.prototype);

    /**
     * Render a page
     * @class
     */
    class Page {
        constructor(pagesArea, pageTemplate, blank, hooks) {
            this.pagesArea = pagesArea;
            this.pageTemplate = pageTemplate;
            this.blank = blank;

            this.width = undefined;
            this.height = undefined;

            this.hooks = hooks;

            // this.element = this.create(this.pageTemplate);
        }

        create(template, after) {
            //let documentFragment = document.createRange().createContextualFragment( TEMPLATE );
            //let page = documentFragment.children[0];
            let clone = document.importNode(this.pageTemplate.content, true);

            let page;
            if (after) {
                this.pagesArea.insertBefore(clone, after.nextSibling);
                let index = Array.prototype.indexOf.call(this.pagesArea.children, after.nextSibling);
                page = this.pagesArea.children[index];
            } else {
                this.pagesArea.appendChild(clone);
                page = this.pagesArea.lastChild;
            }

            let area = page.querySelector(".pagedjs_page_content");


            let size = area.getBoundingClientRect();


            area.style.columnWidth = Math.round(size.width) + "px";
            area.style.columnGap = "calc(var(--margin-right) + var(--margin-left))";
            // area.style.overflow = "scroll";

            this.width = Math.round(size.width);
            this.height = Math.round(size.height);

            this.element = page;
            this.area = area;

            return page;
        }

        createWrapper() {
            let wrapper = document.createElement("div");

            this.area.appendChild(wrapper);

            this.wrapper = wrapper;

            return wrapper;
        }

        index(pgnum) {
            this.position = pgnum;

            let page = this.element;

            let id = `page-${pgnum+1}`;

            this.id = id;

            page.dataset.pageNumber = pgnum+1;

            if (this.name) {
                page.classList.add("pagedjs_" + this.name + "_page");
            }

            if (this.blank) {
                page.classList.add("pagedjs_blank_page");
            }

            if (pgnum === 0) {
                page.classList.add("pagedjs_first_page");
            }

            if (pgnum % 2 !== 1) {
                page.classList.remove("pagedjs_left_page");
                page.classList.add("pagedjs_right_page");
            } else {
                page.classList.remove("pagedjs_right_page");
                page.classList.add("pagedjs_left_page");
            }
        }

        /*
        size(width, height) {
            if (width === this.width && height === this.height) {
                return;
            }
            this.width = width;
            this.height = height;

            this.element.style.width = Math.round(width) + "px";
            this.element.style.height = Math.round(height) + "px";
            this.element.style.columnWidth = Math.round(width) + "px";
        }
        */

        async layout(contents, breakToken, maxChars) {

            this.clear();

            this.startToken = breakToken;

            this.layoutMethod = await new Layout(this.area, this.hooks, maxChars);

            let addListenersResult = await this.addListeners(contents);

            let newBreakToken = await this.layoutMethod.renderTo(this.wrapper, contents, breakToken);

            this.endToken = newBreakToken;

            return newBreakToken;
        }

        async append(contents, breakToken) {

            if (!this.layoutMethod) {
                return this.layout(contents, breakToken);
            }

            let newBreakToken = await this.layoutMethod.renderTo(this.wrapper, contents, breakToken);

            this.endToken = newBreakToken;

            return newBreakToken;
        }

        getByParent(ref, entries) {
            let e;
            for (var i = 0; i < entries.length; i++) {
                e = entries[i];
                if(e.dataset.ref === ref) {
                    return e;
                }
            }
        }

        onOverflow(func) {
            this._onOverflow = func;
        }

        onUnderflow(func) {
            this._onUnderflow = func;
        }

        clear() {
            this.removeListeners();
            this.wrapper && this.wrapper.remove();
            this.createWrapper();
        }

        addListeners(contents) {
            if (typeof ResizeObserver !== "undefined") {
                this.addResizeObserver(contents);
            } else {
                this._checkOverflowAfterResize = this.checkOverflowAfterResize.bind(this, contents);
                this.element.addEventListener("overflow", this._checkOverflowAfterResize, false);
                this.element.addEventListener("underflow", this._checkOverflowAfterResize, false);
            }
            // TODO: fall back to mutation observer?

            this._onScroll = function() {
                if(this.listening) {
                    this.element.scrollLeft = 0;
                }
            }.bind(this);

            // Keep scroll left from changing
            this.element.addEventListener("scroll", this._onScroll);

            this.listening = true;

            return true;
        }

        removeListeners() {
            this.listening = false;

            if (typeof ResizeObserver !== "undefined" && this.ro) {
                this.ro.disconnect();
            } else if (this.element) {
                this.element.removeEventListener("overflow", this._checkOverflowAfterResize, false);
                this.element.removeEventListener("underflow", this._checkOverflowAfterResize, false);
            }

            this.element &&this.element.removeEventListener("scroll", this._onScroll);

        }

        addResizeObserver(contents) {
            let wrapper = this.wrapper;
            let prevHeight = wrapper.getBoundingClientRect().height;
            this.ro = new ResizeObserver( entries => {

                if (!this.listening) {
                    return;
                }

                for (let entry of entries) {
                    const cr = entry.contentRect;

                    if (cr.height > prevHeight) {
                        this.checkOverflowAfterResize(contents);
                        prevHeight = wrapper.getBoundingClientRect().height;
                    } else if (cr.height < prevHeight ) { // TODO: calc line height && (prevHeight - cr.height) >= 22
                        this.checkUnderflowAfterResize(contents);
                        prevHeight = cr.height;
                    }
                }
            });

            this.ro.observe(wrapper);
        }

        checkOverflowAfterResize(contents) {
            if (!this.listening || !this.layoutMethod) {
                return;
            }

            let newBreakToken = this.layoutMethod.findBreakToken(this.wrapper, contents);

            if (newBreakToken) {
                this.endToken = newBreakToken;
                this._onOverflow && this._onOverflow(newBreakToken);
            }
        }

        checkUnderflowAfterResize(contents) {
            if (!this.listening || !this.layoutMethod) {
                return;
            }

            let endToken = this.layoutMethod.findEndToken(this.wrapper, contents);

            // let newBreakToken = this.layoutMethod.findBreakToken(this.wrapper, contents);

            if (endToken) {
                this._onUnderflow && this._onUnderflow(endToken);
            }
        }


        destroy() {
            this.removeListeners();

            this.element.remove();

            this.element = undefined;
            this.wrapper = undefined;
        }
    }

    eventEmitter(Page.prototype);

    /**
     * Render a flow of text offscreen
     * @class
     */
    class ContentParser {

        constructor(content, cb) {
            if (content && content.nodeType) {
                // handle dom
                this.dom = this.add(content);
            } else if (typeof content === "string") {
                this.dom = this.parse(content);
            }

            return this.dom;
        }

        parse(markup, mime) {
            let range = document.createRange();
            let fragment = range.createContextualFragment(markup);

            this.addRefs(fragment);
            this.removeEmpty(fragment);

            return fragment;
        }

        add(contents) {
            // let fragment = document.createDocumentFragment();
            //
            // let children = [...contents.childNodes];
            // for (let child of children) {
            //     let clone = child.cloneNode(true);
            //     fragment.appendChild(clone);
            // }

            this.addRefs(contents);
            this.removeEmpty(contents);

            return contents;
        }

        addRefs(content) {
            var treeWalker = document.createTreeWalker(
                content,
                NodeFilter.SHOW_ELEMENT,
                { acceptNode: function(node) { return NodeFilter.FILTER_ACCEPT; } },
                false
            );

            let node = treeWalker.nextNode();
            while(node) {

                if (!node.hasAttribute("data-ref")) {
                    let uuid = UUID();
                    node.setAttribute("data-ref", uuid);
                }

                if (node.id) {
                    node.setAttribute("data-id", node.id);
                }

                // node.setAttribute("data-children", node.childNodes.length);

                node.setAttribute("data-text", node.textContent.trim().length);
                node = treeWalker.nextNode();
            }
        }

        removeEmpty(content) {
            var treeWalker = document.createTreeWalker(
                content,
                NodeFilter.SHOW_TEXT,
                { acceptNode: function(node) {
                    // Only remove more than a single space
                    if (node.textContent.length > 1 && !node.textContent.trim()) {

                        // Don't touch whitespace if text is preformated
                        let parent = node.parentNode;
                        let pre = isElement(parent) && parent.closest("pre");
                        if (pre) {
                            return NodeFilter.FILTER_REJECT;
                        }

                        return NodeFilter.FILTER_ACCEPT;
                    } else {
                        return NodeFilter.FILTER_REJECT;
                    }
                } },
                false
            );

            let node;
            let current;
            node = treeWalker.nextNode();
            while(node) {
                current = node;
                node = treeWalker.nextNode();
                // if (!current.nextSibling || (current.nextSibling && current.nextSibling.nodeType === 1)) {
                current.parentNode.removeChild(current);
                // }
            }
        }

        find(ref) {
            return this.refs[ref];
        }

        // isWrapper(element) {
        //   return wrappersRegex.test(element.nodeName);
        // }

        isText(node) {
            return node.tagName === "TAG";
        }

        isElement(node) {
            return node.nodeType === 1;
        }

        hasChildren(node) {
            return node.childNodes && node.childNodes.length;
        }


        destroy() {
            this.refs = undefined;
            this.dom = undefined;
        }
    }

    /**
     * Queue for handling tasks one at a time
     * @class
     * @param {scope} context what this will resolve to in the tasks
     */
    class Queue {
        constructor(context){
            this._q = [];
            this.context = context;
            this.tick = requestAnimationFrame;
            this.running = false;
            this.paused = false;
        }

        /**
         * Add an item to the queue
         * @return {Promise} enqueued
         */
        enqueue() {
            var deferred, promise;
            var queued;
            var task = [].shift.call(arguments);
            var args = arguments;

            // Handle single args without context
            // if(args && !Array.isArray(args)) {
            //   args = [args];
            // }
            if(!task) {
                throw new Error("No Task Provided");
            }

            if(typeof task === "function"){

                deferred = new defer();
                promise = deferred.promise;

                queued = {
                    "task" : task,
                    "args"     : args,
                    //"context"  : context,
                    "deferred" : deferred,
                    "promise" : promise
                };

            } else {
                // Task is a promise
                queued = {
                    "promise" : task
                };

            }

            this._q.push(queued);

            // Wait to start queue flush
            if (this.paused == false && !this.running) {
                this.run();
            }

            return queued.promise;
        }

        /**
         * Run one item
         * @return {Promise} dequeued
         */
        dequeue(){
            var inwait, task, result;

            if(this._q.length && !this.paused) {
                inwait = this._q.shift();
                task = inwait.task;
                if(task){
                    // console.log(task)

                    result = task.apply(this.context, inwait.args);

                    if(result && typeof result["then"] === "function") {
                        // Task is a function that returns a promise
                        return result.then(function(){
                            inwait.deferred.resolve.apply(this.context, arguments);
                        }.bind(this), function() {
                            inwait.deferred.reject.apply(this.context, arguments);
                        }.bind(this));
                    } else {
                        // Task resolves immediately
                        inwait.deferred.resolve.apply(this.context, result);
                        return inwait.promise;
                    }



                } else if(inwait.promise) {
                    // Task is a promise
                    return inwait.promise;
                }

            } else {
                inwait = new defer();
                inwait.deferred.resolve();
                return inwait.promise;
            }

        }

        // Run All Immediately
        dump(){
            while(this._q.length) {
                this.dequeue();
            }
        }

        /**
         * Run all tasks sequentially, at convince
         * @return {Promise} all run
         */
        run(){

            if(!this.running){
                this.running = true;
                this.defered = new defer();
            }

            this.tick.call(window, () => {

                if(this._q.length) {

                    this.dequeue()
                        .then(function(){
                            this.run();
                        }.bind(this));

                } else {
                    this.defered.resolve();
                    this.running = undefined;
                }

            });

            // Unpause
            if(this.paused == true) {
                this.paused = false;
            }

            return this.defered.promise;
        }

        /**
         * Flush all, as quickly as possible
         * @return {Promise} ran
         */
        flush(){

            if(this.running){
                return this.running;
            }

            if(this._q.length) {
                this.running = this.dequeue()
                    .then(function(){
                        this.running = undefined;
                        return this.flush();
                    }.bind(this));

                return this.running;
            }

        }

        /**
         * Clear all items in wait
         * @return {void}
         */
        clear(){
            this._q = [];
        }

        /**
         * Get the number of tasks in the queue
         * @return {number} tasks
         */
        length(){
            return this._q.length;
        }

        /**
         * Pause a running queue
         * @return {void}
         */
        pause(){
            this.paused = true;
        }

        /**
         * End the queue
         * @return {void}
         */
        stop(){
            this._q = [];
            this.running = false;
            this.paused = true;
        }
    }

    const TEMPLATE = `<div class="pagedjs_page">
    <div class="pagedjs_margin-top-left-corner-holder">
        <div class="pagedjs_margin pagedjs_margin-top-left-corner"><div class="pagedjs_margin-content"></div></div>
    </div>
    <div class="pagedjs_margin-top">
        <div class="pagedjs_margin pagedjs_margin-top-left"><div class="pagedjs_margin-content"></div></div>
        <div class="pagedjs_margin pagedjs_margin-top-center"><div class="pagedjs_margin-content"></div></div>
        <div class="pagedjs_margin pagedjs_margin-top-right"><div class="pagedjs_margin-content"></div></div>
    </div>
    <div class="pagedjs_margin-top-right-corner-holder">
        <div class="pagedjs_margin pagedjs_margin-top-right-corner"><div class="pagedjs_margin-content"></div></div>
    </div>
    <div class="pagedjs_margin-right">
        <div class="pagedjs_margin pagedjs_margin-right-top"><div class="pagedjs_margin-content"></div></div>
        <div class="pagedjs_margin pagedjs_margin-right-middle"><div class="pagedjs_margin-content"></div></div>
        <div class="pagedjs_margin pagedjs_margin-right-bottom"><div class="pagedjs_margin-content"></div></div>
    </div>
    <div class="pagedjs_margin-left">
        <div class="pagedjs_margin pagedjs_margin-left-top"><div class="pagedjs_margin-content"></div></div>
        <div class="pagedjs_margin pagedjs_margin-left-middle"><div class="pagedjs_margin-content"></div></div>
        <div class="pagedjs_margin pagedjs_margin-left-bottom"><div class="pagedjs_margin-content"></div></div>
    </div>
    <div class="pagedjs_margin-bottom-left-corner-holder">
        <div class="pagedjs_margin pagedjs_margin-bottom-left-corner"><div class="pagedjs_margin-content"></div></div>
    </div>
    <div class="pagedjs_margin-bottom">
        <div class="pagedjs_margin pagedjs_margin-bottom-left"><div class="pagedjs_margin-content"></div></div>
        <div class="pagedjs_margin pagedjs_margin-bottom-center"><div class="pagedjs_margin-content"></div></div>
        <div class="pagedjs_margin pagedjs_margin-bottom-right"><div class="pagedjs_margin-content"></div></div>
    </div>
    <div class="pagedjs_margin-bottom-right-corner-holder">
        <div class="pagedjs_margin pagedjs_margin-bottom-right-corner"><div class="pagedjs_margin-content"></div></div>
    </div>
    <div class="pagedjs_area">
        <div class="pagedjs_page_content">

        </div>
    </div>
</div>`;

    /**
     * Chop up text into flows
     * @class
     */
    class Chunker {
        constructor(content, renderTo) {
            // this.preview = preview;

            this.hooks = {};
            this.hooks.beforeParsed = new Hook(this);
            this.hooks.afterParsed = new Hook(this);
            this.hooks.beforePageLayout = new Hook(this);
            this.hooks.layout = new Hook(this);
            this.hooks.renderNode = new Hook(this);
            this.hooks.layoutNode = new Hook(this);
            this.hooks.overflow = new Hook(this);
            this.hooks.afterPageLayout = new Hook(this);
            this.hooks.afterRendered = new Hook(this);

            this.pages = [];
            this._total = 0;

            this.q = new Queue(this);
            this.stopped = false;
            this.rendered = false;

            this.content = content;

            this.charsPerBreak = [];
            this.maxChars;

            if (content) {
                this.flow(content, renderTo);
            }
        }

        setup(renderTo) {
            this.pagesArea = document.createElement("div");
            this.pagesArea.classList.add("pagedjs_pages");

            if (renderTo) {
                renderTo.appendChild(this.pagesArea);
            } else {
                document.querySelector("body").appendChild(this.pagesArea);
            }

            this.pageTemplate = document.createElement("template");
            this.pageTemplate.innerHTML = TEMPLATE;

        }

        async flow(content, renderTo) {
            let parsed;

            await this.hooks.beforeParsed.trigger(content, this);

            parsed = new ContentParser(content);

            this.source = parsed;
            this.breakToken = undefined;

            if (this.pagesArea && this.pageTemplate) {
                this.q.clear();
                this.removePages();
            } else {
                this.setup(renderTo);
            }

            this.emit("rendering", content);

            await this.hooks.afterParsed.trigger(parsed, this);

            await this.loadFonts();

            let rendered = await this.render(parsed, this.breakToken);
            while (rendered.canceled) {
                this.start();
                rendered = await this.render(parsed, this.breakToken);
            }

            this.rendered = true;

            await this.hooks.afterRendered.trigger(this.pages, this);

            this.emit("rendered", this.pages);

            return this;
        }

        // oversetPages() {
        //     let overset = [];
        //     for (let i = 0; i < this.pages.length; i++) {
        //         let page = this.pages[i];
        //         if (page.overset) {
        //             overset.push(page);
        //             // page.overset = false;
        //         }
        //     }
        //     return overset;
        // }
        //
        // async handleOverset(parsed) {
        //     let overset = this.oversetPages();
        //     if (overset.length) {
        //         console.log("overset", overset);
        //         let index = this.pages.indexOf(overset[0]) + 1;
        //         console.log("INDEX", index);
        //
        //         // Remove pages
        //         // this.removePages(index);
        //
        //         // await this.render(parsed, overset[0].overset);
        //
        //         // return this.handleOverset(parsed);
        //     }
        // }

        async render(parsed, startAt) {
            let renderer = this.layout(parsed, startAt);

            let done = false;
            let result;

            while (!done) {
                result = await this.q.enqueue(() => { return this.renderAsync(renderer); });
                done = result.done;
            }

            return result;
        }

        start() {
            this.rendered = false;
            this.stopped = false;
        }

        stop() {
            this.stopped = true;
            // this.q.clear();
        }

        renderOnIdle(renderer) {
            return new Promise(resolve => {
                requestIdleCallback(async () => {
                    if (this.stopped) {
                        return resolve({ done: true, canceled: true });
                    }
                    let result = await renderer.next();
                    if (this.stopped) {
                        resolve({ done: true, canceled: true });
                    } else {
                        resolve(result);
                    }
                });
            });
        }

        async renderAsync(renderer) {
            if (this.stopped) {
                return { done: true, canceled: true };
            }
            let result = await renderer.next();
            if (this.stopped) {
                return { done: true, canceled: true };
            } else {
                return result;
            }
        }

        async handleBreaks(node) {
            let currentPage = this.total + 1;
            let currentPosition = currentPage % 2 === 0 ? "left" : "right";
            // TODO: Recto and Verso should reverse for rtl languages
            let currentSide = currentPage % 2 === 0 ? "verso" : "recto";
            let previousBreakAfter;
            let breakBefore;
            let page;

            if (currentPage === 1) {
                return;
            }

            if (node &&
                    typeof node.dataset !== "undefined" &&
                    typeof node.dataset.previousBreakAfter !== "undefined") {
                previousBreakAfter = node.dataset.previousBreakAfter;
            }

            if (node &&
                    typeof node.dataset !== "undefined" &&
                    typeof node.dataset.breakBefore !== "undefined") {
                breakBefore = node.dataset.breakBefore;
            }

            if( previousBreakAfter &&
                    (previousBreakAfter === "left" || previousBreakAfter === "right") &&
                    previousBreakAfter !== currentPosition) {
                page = this.addPage(true);
            } else if( previousBreakAfter &&
                    (previousBreakAfter === "verso" || previousBreakAfter === "recto") &&
                    previousBreakAfter !== currentSide) {
                page = this.addPage(true);
            } else if( breakBefore &&
                    (breakBefore === "left" || breakBefore === "right") &&
                    breakBefore !== currentPosition) {
                page = this.addPage(true);
            } else if( breakBefore &&
                    (breakBefore === "verso" || breakBefore === "recto") &&
                    breakBefore !== currentSide) {
                page = this.addPage(true);
            }

            if (page) {
                await this.hooks.beforePageLayout.trigger(page, undefined, undefined, this);
                this.emit("page", page);
                // await this.hooks.layout.trigger(page.element, page, undefined, this);
                await this.hooks.afterPageLayout.trigger(page.element, page, undefined, this);
                this.emit("renderedPage", page);
            }
        }

        async *layout(content, startAt) {
            let breakToken = startAt || false;

            while (breakToken !== undefined && (true)) {

                if (breakToken && breakToken.node) {
                    await this.handleBreaks(breakToken.node);
                } else {
                    await this.handleBreaks(content.firstChild);
                }

                let page = this.addPage();

                await this.hooks.beforePageLayout.trigger(page, content, breakToken, this);
                this.emit("page", page);

                // Layout content in the page, starting from the breakToken
                breakToken = await page.layout(content, breakToken, this.maxChars);

                await this.hooks.afterPageLayout.trigger(page.element, page, breakToken, this);
                this.emit("renderedPage", page);

                if (page.wrapper) {
                    this.recordCharLength(page.wrapper.textContent.length);
                }

                yield breakToken;

                // Stop if we get undefined, showing we have reached the end of the content
            }
        }

        recordCharLength(length) {
            if (length === 0) {
                return;
            }

            this.charsPerBreak.push(length);

            // Keep the length of the last few breaks
            if (this.charsPerBreak.length > 4) {
                this.charsPerBreak.shift();
            }

            this.maxChars = this.charsPerBreak.reduce((a, b) => a + b, 0) / (this.charsPerBreak.length);
        }

        removePages(fromIndex=0) {

            if (fromIndex >= this.pages.length) {
                return;
            }

            // Remove pages
            for (let i = fromIndex; i < this.pages.length; i++) {
                this.pages[i].destroy();
            }

            if (fromIndex > 0) {
                this.pages.splice(fromIndex);
            } else {
                this.pages = [];
            }
        }

        addPage(blank) {
            let lastPage = this.pages[this.pages.length - 1];
            // Create a new page from the template
            let page = new Page(this.pagesArea, this.pageTemplate, blank, this.hooks);

            this.pages.push(page);

            // Create the pages
            page.create(undefined, lastPage && lastPage.element);

            page.index(this.total);

            if (!blank) {
                // Listen for page overflow
                page.onOverflow((overflowToken) => {
                    console.warn("overflow on", page.id, overflowToken);

                    // Only reflow while rendering
                    if (this.rendered) {
                        console.debug("Not rendering; returning");
                        return;
                    }

                    let index = this.pages.indexOf(page) + 1;

                    // Stop the rendering
                    this.stop();

                    // Set the breakToken to resume at
                    this.breakToken = overflowToken;

                    // Remove pages
                    this.removePages(index);

                    if (this.rendered === true) {
                        this.rendered = false;

                        this.q.enqueue(async () => {

                            this.start();

                            await this.render(this.source, this.breakToken);

                            this.rendered = true;

                        });
                    }


                });

                page.onUnderflow((overflowToken) => {
                    // console.log("underflow on", page.id, overflowToken);

                    // page.append(this.source, overflowToken);

                });
            }

            this.total = this.pages.length;

            return page;
        }
        /*
        insertPage(index, blank) {
            let lastPage = this.pages[index];
            // Create a new page from the template
            let page = new Page(this.pagesArea, this.pageTemplate, blank, this.hooks);

            let total = this.pages.splice(index, 0, page);

            // Create the pages
            page.create(undefined, lastPage && lastPage.element);

            page.index(index + 1);

            for (let i = index + 2; i < this.pages.length; i++) {
                this.pages[i].index(i);
            }

            if (!blank) {
                // Listen for page overflow
                page.onOverflow((overflowToken) => {
                    if (total < this.pages.length) {
                        this.pages[total].layout(this.source, overflowToken);
                    } else {
                        let newPage = this.addPage();
                        newPage.layout(this.source, overflowToken);
                    }
                });

                page.onUnderflow(() => {
                    // console.log("underflow on", page.id);
                });
            }

            this.total += 1;

            return page;
        }
        */

        get total() {
            return this._total;
        }

        set total(num) {
            this.pagesArea.style.setProperty("--page-count", num);
            this._total = num;
        }

        loadFonts() {
            let fontPromises = [];
            document.fonts.forEach((fontFace) => {
                if (fontFace.status !== "loaded") {
                    let fontLoaded = fontFace.load().then((r) => {
                        return fontFace.family;
                    }, (r) => {
                        console.warn("Failed to preload font-family:", fontFace.family);
                        return fontFace.family;
                    });
                    fontPromises.push(fontLoaded);
                }
            });
            return Promise.all(fontPromises).catch((err) => {
                console.warn(err);
            });
        }

        destroy() {
            this.pagesArea.remove();
            this.pageTemplate.remove();
        }

    }

    eventEmitter(Chunker.prototype);

    //
    //            item        item        item        item
    //          /------\    /------\    /------\    /------\
    //          | data |    | data |    | data |    | data |
    //  null <--+-prev |<---+-prev |<---+-prev |<---+-prev |
    //          | next-+--->| next-+--->| next-+--->| next-+--> null
    //          \------/    \------/    \------/    \------/
    //             ^                                    ^
    //             |                list                |
    //             |              /------\              |
    //             \--------------+-head |              |
    //                            | tail-+--------------/
    //                            \------/
    //

    function createItem(data) {
        return {
            prev: null,
            next: null,
            data: data
        };
    }

    function allocateCursor(node, prev, next) {
        var cursor;

        if (cursors !== null) {
            cursor = cursors;
            cursors = cursors.cursor;
            cursor.prev = prev;
            cursor.next = next;
            cursor.cursor = node.cursor;
        } else {
            cursor = {
                prev: prev,
                next: next,
                cursor: node.cursor
            };
        }

        node.cursor = cursor;

        return cursor;
    }

    function releaseCursor(node) {
        var cursor = node.cursor;

        node.cursor = cursor.cursor;
        cursor.prev = null;
        cursor.next = null;
        cursor.cursor = cursors;
        cursors = cursor;
    }

    var cursors = null;
    var List = function() {
        this.cursor = null;
        this.head = null;
        this.tail = null;
    };

    List.createItem = createItem;
    List.prototype.createItem = createItem;

    List.prototype.updateCursors = function(prevOld, prevNew, nextOld, nextNew) {
        var cursor = this.cursor;

        while (cursor !== null) {
            if (cursor.prev === prevOld) {
                cursor.prev = prevNew;
            }

            if (cursor.next === nextOld) {
                cursor.next = nextNew;
            }

            cursor = cursor.cursor;
        }
    };

    List.prototype.getSize = function() {
        var size = 0;
        var cursor = this.head;

        while (cursor) {
            size++;
            cursor = cursor.next;
        }

        return size;
    };

    List.prototype.fromArray = function(array) {
        var cursor = null;

        this.head = null;

        for (var i = 0; i < array.length; i++) {
            var item = createItem(array[i]);

            if (cursor !== null) {
                cursor.next = item;
            } else {
                this.head = item;
            }

            item.prev = cursor;
            cursor = item;
        }

        this.tail = cursor;

        return this;
    };

    List.prototype.toArray = function() {
        var cursor = this.head;
        var result = [];

        while (cursor) {
            result.push(cursor.data);
            cursor = cursor.next;
        }

        return result;
    };

    List.prototype.toJSON = List.prototype.toArray;

    List.prototype.isEmpty = function() {
        return this.head === null;
    };

    List.prototype.first = function() {
        return this.head && this.head.data;
    };

    List.prototype.last = function() {
        return this.tail && this.tail.data;
    };

    List.prototype.each = function(fn, context) {
        var item;

        if (context === undefined) {
            context = this;
        }

        // push cursor
        var cursor = allocateCursor(this, null, this.head);

        while (cursor.next !== null) {
            item = cursor.next;
            cursor.next = item.next;

            fn.call(context, item.data, item, this);
        }

        // pop cursor
        releaseCursor(this);
    };

    List.prototype.forEach = List.prototype.each;

    List.prototype.eachRight = function(fn, context) {
        var item;

        if (context === undefined) {
            context = this;
        }

        // push cursor
        var cursor = allocateCursor(this, this.tail, null);

        while (cursor.prev !== null) {
            item = cursor.prev;
            cursor.prev = item.prev;

            fn.call(context, item.data, item, this);
        }

        // pop cursor
        releaseCursor(this);
    };

    List.prototype.forEachRight = List.prototype.eachRight;

    List.prototype.nextUntil = function(start, fn, context) {
        if (start === null) {
            return;
        }

        var item;

        if (context === undefined) {
            context = this;
        }

        // push cursor
        var cursor = allocateCursor(this, null, start);

        while (cursor.next !== null) {
            item = cursor.next;
            cursor.next = item.next;

            if (fn.call(context, item.data, item, this)) {
                break;
            }
        }

        // pop cursor
        releaseCursor(this);
    };

    List.prototype.prevUntil = function(start, fn, context) {
        if (start === null) {
            return;
        }

        var item;

        if (context === undefined) {
            context = this;
        }

        // push cursor
        var cursor = allocateCursor(this, start, null);

        while (cursor.prev !== null) {
            item = cursor.prev;
            cursor.prev = item.prev;

            if (fn.call(context, item.data, item, this)) {
                break;
            }
        }

        // pop cursor
        releaseCursor(this);
    };

    List.prototype.some = function(fn, context) {
        var cursor = this.head;

        if (context === undefined) {
            context = this;
        }

        while (cursor !== null) {
            if (fn.call(context, cursor.data, cursor, this)) {
                return true;
            }

            cursor = cursor.next;
        }

        return false;
    };

    List.prototype.map = function(fn, context) {
        var result = new List();
        var cursor = this.head;

        if (context === undefined) {
            context = this;
        }

        while (cursor !== null) {
            result.appendData(fn.call(context, cursor.data, cursor, this));
            cursor = cursor.next;
        }

        return result;
    };

    List.prototype.filter = function(fn, context) {
        var result = new List();
        var cursor = this.head;

        if (context === undefined) {
            context = this;
        }

        while (cursor !== null) {
            if (fn.call(context, cursor.data, cursor, this)) {
                result.appendData(cursor.data);
            }
            cursor = cursor.next;
        }

        return result;
    };

    List.prototype.clear = function() {
        this.head = null;
        this.tail = null;
    };

    List.prototype.copy = function() {
        var result = new List();
        var cursor = this.head;

        while (cursor !== null) {
            result.insert(createItem(cursor.data));
            cursor = cursor.next;
        }

        return result;
    };

    List.prototype.prepend = function(item) {
        //      head
        //    ^
        // item
        this.updateCursors(null, item, this.head, item);

        // insert to the beginning of the list
        if (this.head !== null) {
            // new item <- first item
            this.head.prev = item;

            // new item -> first item
            item.next = this.head;
        } else {
            // if list has no head, then it also has no tail
            // in this case tail points to the new item
            this.tail = item;
        }

        // head always points to new item
        this.head = item;

        return this;
    };

    List.prototype.prependData = function(data) {
        return this.prepend(createItem(data));
    };

    List.prototype.append = function(item) {
        return this.insert(item);
    };

    List.prototype.appendData = function(data) {
        return this.insert(createItem(data));
    };

    List.prototype.insert = function(item, before) {
        if (before !== undefined && before !== null) {
            // prev   before
            //      ^
            //     item
            this.updateCursors(before.prev, item, before, item);

            if (before.prev === null) {
                // insert to the beginning of list
                if (this.head !== before) {
                    throw new Error('before doesn\'t belong to list');
                }

                // since head points to before therefore list doesn't empty
                // no need to check tail
                this.head = item;
                before.prev = item;
                item.next = before;

                this.updateCursors(null, item);
            } else {

                // insert between two items
                before.prev.next = item;
                item.prev = before.prev;

                before.prev = item;
                item.next = before;
            }
        } else {
            // tail
            //      ^
            //      item
            this.updateCursors(this.tail, item, null, item);

            // insert to the ending of the list
            if (this.tail !== null) {
                // last item -> new item
                this.tail.next = item;

                // last item <- new item
                item.prev = this.tail;
            } else {
                // if list has no tail, then it also has no head
                // in this case head points to new item
                this.head = item;
            }

            // tail always points to new item
            this.tail = item;
        }

        return this;
    };

    List.prototype.insertData = function(data, before) {
        return this.insert(createItem(data), before);
    };

    List.prototype.remove = function(item) {
        //      item
        //       ^
        // prev     next
        this.updateCursors(item, item.prev, item, item.next);

        if (item.prev !== null) {
            item.prev.next = item.next;
        } else {
            if (this.head !== item) {
                throw new Error('item doesn\'t belong to list');
            }

            this.head = item.next;
        }

        if (item.next !== null) {
            item.next.prev = item.prev;
        } else {
            if (this.tail !== item) {
                throw new Error('item doesn\'t belong to list');
            }

            this.tail = item.prev;
        }

        item.prev = null;
        item.next = null;

        return item;
    };

    List.prototype.push = function(data) {
        this.insert(createItem(data));
    };

    List.prototype.pop = function() {
        if (this.tail !== null) {
            return this.remove(this.tail);
        }
    };

    List.prototype.unshift = function(data) {
        this.prepend(createItem(data));
    };

    List.prototype.shift = function() {
        if (this.head !== null) {
            return this.remove(this.head);
        }
    };

    List.prototype.prependList = function(list) {
        return this.insertList(list, this.head);
    };

    List.prototype.appendList = function(list) {
        return this.insertList(list);
    };

    List.prototype.insertList = function(list, before) {
        // ignore empty lists
        if (list.head === null) {
            return this;
        }

        if (before !== undefined && before !== null) {
            this.updateCursors(before.prev, list.tail, before, list.head);

            // insert in the middle of dist list
            if (before.prev !== null) {
                // before.prev <-> list.head
                before.prev.next = list.head;
                list.head.prev = before.prev;
            } else {
                this.head = list.head;
            }

            before.prev = list.tail;
            list.tail.next = before;
        } else {
            this.updateCursors(this.tail, list.tail, null, list.head);

            // insert to end of the list
            if (this.tail !== null) {
                // if destination list has a tail, then it also has a head,
                // but head doesn't change

                // dest tail -> source head
                this.tail.next = list.head;

                // dest tail <- source head
                list.head.prev = this.tail;
            } else {
                // if list has no a tail, then it also has no a head
                // in this case points head to new item
                this.head = list.head;
            }

            // tail always start point to new item
            this.tail = list.tail;
        }

        list.head = null;
        list.tail = null;

        return this;
    };

    List.prototype.replace = function(oldItem, newItemOrList) {
        if ('head' in newItemOrList) {
            this.insertList(newItemOrList, oldItem);
        } else {
            this.insert(newItemOrList, oldItem);
        }

        this.remove(oldItem);
    };

    var list = List;

    var createCustomError = function createCustomError(name, message) {
        // use Object.create(), because some VMs prevent setting line/column otherwise
        // (iOS Safari 10 even throws an exception)
        var error = Object.create(SyntaxError.prototype);
        var errorStack = new Error();

        error.name = name;
        error.message = message;

        Object.defineProperty(error, 'stack', {
            get: function() {
                return (errorStack.stack || '').replace(/^(.+\n){1,3}/, name + ': ' + message + '\n');
            }
        });

        return error;
    };

    var MAX_LINE_LENGTH = 100;
    var OFFSET_CORRECTION = 60;
    var TAB_REPLACEMENT = '    ';

    function sourceFragment(error, extraLines) {
        function processLines(start, end) {
            return lines.slice(start, end).map(function(line, idx) {
                var num = String(start + idx + 1);

                while (num.length < maxNumLength) {
                    num = ' ' + num;
                }

                return num + ' |' + line;
            }).join('\n');
        }

        var lines = error.source.split(/\r\n?|\n|\f/);
        var line = error.line;
        var column = error.column;
        var startLine = Math.max(1, line - extraLines) - 1;
        var endLine = Math.min(line + extraLines, lines.length + 1);
        var maxNumLength = Math.max(4, String(endLine).length) + 1;
        var cutLeft = 0;

        // column correction according to replaced tab before column
        column += (TAB_REPLACEMENT.length - 1) * (lines[line - 1].substr(0, column - 1).match(/\t/g) || []).length;

        if (column > MAX_LINE_LENGTH) {
            cutLeft = column - OFFSET_CORRECTION + 3;
            column = OFFSET_CORRECTION - 2;
        }

        for (var i = startLine; i <= endLine; i++) {
            if (i >= 0 && i < lines.length) {
                lines[i] = lines[i].replace(/\t/g, TAB_REPLACEMENT);
                lines[i] =
                    (cutLeft > 0 && lines[i].length > cutLeft ? '\u2026' : '') +
                    lines[i].substr(cutLeft, MAX_LINE_LENGTH - 2) +
                    (lines[i].length > cutLeft + MAX_LINE_LENGTH - 1 ? '\u2026' : '');
            }
        }

        return [
            processLines(startLine, line),
            new Array(column + maxNumLength + 2).join('-') + '^',
            processLines(line, endLine)
        ].filter(Boolean).join('\n');
    }

    var CssSyntaxError = function(message, source, offset, line, column) {
        var error = createCustomError('CssSyntaxError', message);

        error.source = source;
        error.offset = offset;
        error.line = line;
        error.column = column;

        error.sourceFragment = function(extraLines) {
            return sourceFragment(error, isNaN(extraLines) ? 0 : extraLines);
        };
        Object.defineProperty(error, 'formattedMessage', {
            get: function() {
                return (
                    'Parse error: ' + error.message + '\n' +
                    sourceFragment(error, 2)
                );
            }
        });

        // for backward capability
        error.parseError = {
            offset: offset,
            line: line,
            column: column
        };

        return error;
    };

    var error = CssSyntaxError;

    // token types (note: value shouldn't intersect with used char codes)
    var WHITESPACE = 1;
    var IDENTIFIER = 2;
    var NUMBER = 3;
    var STRING = 4;
    var COMMENT = 5;
    var PUNCTUATOR = 6;
    var CDO = 7;
    var CDC = 8;
    var ATKEYWORD = 14;
    var FUNCTION = 15;
    var URL$1 = 16;
    var RAW = 17;

    var TAB = 9;
    var N = 10;
    var F = 12;
    var R = 13;
    var SPACE = 32;

    var TYPE = {
        WhiteSpace:   WHITESPACE,
        Identifier:   IDENTIFIER,
        Number:           NUMBER,
        String:           STRING,
        Comment:         COMMENT,
        Punctuator:   PUNCTUATOR,
        CDO:                 CDO,
        CDC:                 CDC,
        AtKeyword:     ATKEYWORD,
        Function:       FUNCTION,
        Url:                 URL$1,
        Raw:                 RAW,

        ExclamationMark:      33,  // !
        QuotationMark:        34,  // "
        NumberSign:           35,  // #
        DollarSign:           36,  // $
        PercentSign:          37,  // %
        Ampersand:            38,  // &
        Apostrophe:           39,  // '
        LeftParenthesis:      40,  // (
        RightParenthesis:     41,  // )
        Asterisk:             42,  // *
        PlusSign:             43,  // +
        Comma:                44,  // ,
        HyphenMinus:          45,  // -
        FullStop:             46,  // .
        Solidus:              47,  // /
        Colon:                58,  // :
        Semicolon:            59,  // ;
        LessThanSign:         60,  // <
        EqualsSign:           61,  // =
        GreaterThanSign:      62,  // >
        QuestionMark:         63,  // ?
        CommercialAt:         64,  // @
        LeftSquareBracket:    91,  // [
        Backslash:            92,  // \
        RightSquareBracket:   93,  // ]
        CircumflexAccent:     94,  // ^
        LowLine:              95,  // _
        GraveAccent:          96,  // `
        LeftCurlyBracket:    123,  // {
        VerticalLine:        124,  // |
        RightCurlyBracket:   125,  // }
        Tilde:               126   // ~
    };

    var NAME = Object.keys(TYPE).reduce(function(result, key) {
        result[TYPE[key]] = key;
        return result;
    }, {});

    // https://drafts.csswg.org/css-syntax/#tokenizer-definitions
    // > non-ASCII code point
    // >   A code point with a value equal to or greater than U+0080 <control>
    // > name-start code point
    // >   A letter, a non-ASCII code point, or U+005F LOW LINE (_).
    // > name code point
    // >   A name-start code point, a digit, or U+002D HYPHEN-MINUS (-)
    // That means only ASCII code points has a special meaning and we a maps for 0..127 codes only
    var SafeUint32Array = typeof Uint32Array !== 'undefined' ? Uint32Array : Array; // fallback on Array when TypedArray is not supported
    var SYMBOL_TYPE = new SafeUint32Array(0x80);
    var PUNCTUATION = new SafeUint32Array(0x80);
    var STOP_URL_RAW = new SafeUint32Array(0x80);

    for (var i = 0; i < SYMBOL_TYPE.length; i++) {
        SYMBOL_TYPE[i] = IDENTIFIER;
    }

    // fill categories
    [
        TYPE.ExclamationMark,    // !
        TYPE.QuotationMark,      // "
        TYPE.NumberSign,         // #
        TYPE.DollarSign,         // $
        TYPE.PercentSign,        // %
        TYPE.Ampersand,          // &
        TYPE.Apostrophe,         // '
        TYPE.LeftParenthesis,    // (
        TYPE.RightParenthesis,   // )
        TYPE.Asterisk,           // *
        TYPE.PlusSign,           // +
        TYPE.Comma,              // ,
        TYPE.HyphenMinus,        // -
        TYPE.FullStop,           // .
        TYPE.Solidus,            // /
        TYPE.Colon,              // :
        TYPE.Semicolon,          // ;
        TYPE.LessThanSign,       // <
        TYPE.EqualsSign,         // =
        TYPE.GreaterThanSign,    // >
        TYPE.QuestionMark,       // ?
        TYPE.CommercialAt,       // @
        TYPE.LeftSquareBracket,  // [
        // TYPE.Backslash,          // \
        TYPE.RightSquareBracket, // ]
        TYPE.CircumflexAccent,   // ^
        // TYPE.LowLine,            // _
        TYPE.GraveAccent,        // `
        TYPE.LeftCurlyBracket,   // {
        TYPE.VerticalLine,       // |
        TYPE.RightCurlyBracket,  // }
        TYPE.Tilde               // ~
    ].forEach(function(key) {
        SYMBOL_TYPE[Number(key)] = PUNCTUATOR;
        PUNCTUATION[Number(key)] = PUNCTUATOR;
    });

    for (var i = 48; i <= 57; i++) {
        SYMBOL_TYPE[i] = NUMBER;
    }

    SYMBOL_TYPE[SPACE] = WHITESPACE;
    SYMBOL_TYPE[TAB] = WHITESPACE;
    SYMBOL_TYPE[N] = WHITESPACE;
    SYMBOL_TYPE[R] = WHITESPACE;
    SYMBOL_TYPE[F] = WHITESPACE;

    SYMBOL_TYPE[TYPE.Apostrophe] = STRING;
    SYMBOL_TYPE[TYPE.QuotationMark] = STRING;

    STOP_URL_RAW[SPACE] = 1;
    STOP_URL_RAW[TAB] = 1;
    STOP_URL_RAW[N] = 1;
    STOP_URL_RAW[R] = 1;
    STOP_URL_RAW[F] = 1;
    STOP_URL_RAW[TYPE.Apostrophe] = 1;
    STOP_URL_RAW[TYPE.QuotationMark] = 1;
    STOP_URL_RAW[TYPE.LeftParenthesis] = 1;
    STOP_URL_RAW[TYPE.RightParenthesis] = 1;

    // whitespace is punctuation ...
    PUNCTUATION[SPACE] = PUNCTUATOR;
    PUNCTUATION[TAB] = PUNCTUATOR;
    PUNCTUATION[N] = PUNCTUATOR;
    PUNCTUATION[R] = PUNCTUATOR;
    PUNCTUATION[F] = PUNCTUATOR;
    // ... hyper minus is not
    PUNCTUATION[TYPE.HyphenMinus] = 0;

    var _const = {
        TYPE: TYPE,
        NAME: NAME,

        SYMBOL_TYPE: SYMBOL_TYPE,
        PUNCTUATION: PUNCTUATION,
        STOP_URL_RAW: STOP_URL_RAW
    };

    var PUNCTUATION$1 = _const.PUNCTUATION;
    var STOP_URL_RAW$1 = _const.STOP_URL_RAW;
    var TYPE$1 = _const.TYPE;
    var FULLSTOP = TYPE$1.FullStop;
    var PLUSSIGN = TYPE$1.PlusSign;
    var HYPHENMINUS = TYPE$1.HyphenMinus;
    var PUNCTUATOR$1 = TYPE$1.Punctuator;
    var TAB$1 = 9;
    var N$1 = 10;
    var F$1 = 12;
    var R$1 = 13;
    var SPACE$1 = 32;
    var BACK_SLASH = 92;
    var E = 101; // 'e'.charCodeAt(0)

    function firstCharOffset(source) {
        // detect BOM (https://en.wikipedia.org/wiki/Byte_order_mark)
        if (source.charCodeAt(0) === 0xFEFF ||  // UTF-16BE
            source.charCodeAt(0) === 0xFFFE) {  // UTF-16LE
            return 1;
        }

        return 0;
    }

    function isHex(code) {
        return (code >= 48 && code <= 57) || // 0 .. 9
               (code >= 65 && code <= 70) || // A .. F
               (code >= 97 && code <= 102);  // a .. f
    }

    function isNumber(code) {
        return code >= 48 && code <= 57;
    }

    function isWhiteSpace(code) {
        return code === SPACE$1 || code === TAB$1 || isNewline(code);
    }

    function isNewline(code) {
        return code === R$1 || code === N$1 || code === F$1;
    }

    function getNewlineLength(source, offset, code) {
        if (isNewline(code)) {
            if (code === R$1 && offset + 1 < source.length && source.charCodeAt(offset + 1) === N$1) {
                return 2;
            }

            return 1;
        }

        return 0;
    }

    function cmpChar(testStr, offset, referenceCode) {
        var code = testStr.charCodeAt(offset);

        // code.toLowerCase() for A..Z
        if (code >= 65 && code <= 90) {
            code = code | 32;
        }

        return code === referenceCode;
    }

    function cmpStr(testStr, start, end, referenceStr) {
        if (end - start !== referenceStr.length) {
            return false;
        }

        if (start < 0 || end > testStr.length) {
            return false;
        }

        for (var i = start; i < end; i++) {
            var testCode = testStr.charCodeAt(i);
            var refCode = referenceStr.charCodeAt(i - start);

            // testCode.toLowerCase() for A..Z
            if (testCode >= 65 && testCode <= 90) {
                testCode = testCode | 32;
            }

            if (testCode !== refCode) {
                return false;
            }
        }

        return true;
    }

    function findWhiteSpaceStart(source, offset) {
        while (offset >= 0 && isWhiteSpace(source.charCodeAt(offset))) {
            offset--;
        }

        return offset + 1;
    }

    function findWhiteSpaceEnd(source, offset) {
        while (offset < source.length && isWhiteSpace(source.charCodeAt(offset))) {
            offset++;
        }

        return offset;
    }

    function findCommentEnd(source, offset) {
        var commentEnd = source.indexOf('*/', offset);

        if (commentEnd === -1) {
            return source.length;
        }

        return commentEnd + 2;
    }

    function findStringEnd(source, offset, quote) {
        for (; offset < source.length; offset++) {
            var code = source.charCodeAt(offset);

            // TODO: bad string
            if (code === BACK_SLASH) {
                offset++;
            } else if (code === quote) {
                offset++;
                break;
            }
        }

        return offset;
    }

    function findDecimalNumberEnd(source, offset) {
        while (offset < source.length && isNumber(source.charCodeAt(offset))) {
            offset++;
        }

        return offset;
    }

    function findNumberEnd(source, offset, allowFraction) {
        var code;

        offset = findDecimalNumberEnd(source, offset);

        // fraction: .\d+
        if (allowFraction && offset + 1 < source.length && source.charCodeAt(offset) === FULLSTOP) {
            code = source.charCodeAt(offset + 1);

            if (isNumber(code)) {
                offset = findDecimalNumberEnd(source, offset + 1);
            }
        }

        // exponent: e[+-]\d+
        if (offset + 1 < source.length) {
            if ((source.charCodeAt(offset) | 32) === E) { // case insensitive check for `e`
                code = source.charCodeAt(offset + 1);

                if (code === PLUSSIGN || code === HYPHENMINUS) {
                    if (offset + 2 < source.length) {
                        code = source.charCodeAt(offset + 2);
                    }
                }

                if (isNumber(code)) {
                    offset = findDecimalNumberEnd(source, offset + 2);
                }
            }
        }

        return offset;
    }

    // skip escaped unicode sequence that can ends with space
    // [0-9a-f]{1,6}(\r\n|[ \n\r\t\f])?
    function findEscapeEnd(source, offset) {
        for (var i = 0; i < 7 && offset + i < source.length; i++) {
            var code = source.charCodeAt(offset + i);

            if (i !== 6 && isHex(code)) {
                continue;
            }

            if (i > 0) {
                offset += i - 1 + getNewlineLength(source, offset + i, code);
                if (code === SPACE$1 || code === TAB$1) {
                    offset++;
                }
            }

            break;
        }

        return offset;
    }

    function findIdentifierEnd(source, offset) {
        for (; offset < source.length; offset++) {
            var code = source.charCodeAt(offset);

            if (code === BACK_SLASH) {
                offset = findEscapeEnd(source, offset + 1);
            } else if (code < 0x80 && PUNCTUATION$1[code] === PUNCTUATOR$1) {
                break;
            }
        }

        return offset;
    }

    function findUrlRawEnd(source, offset) {
        for (; offset < source.length; offset++) {
            var code = source.charCodeAt(offset);

            if (code === BACK_SLASH) {
                offset = findEscapeEnd(source, offset + 1);
            } else if (code < 0x80 && STOP_URL_RAW$1[code] === 1) {
                break;
            }
        }

        return offset;
    }

    var utils = {
        firstCharOffset: firstCharOffset,

        isHex: isHex,
        isNumber: isNumber,
        isWhiteSpace: isWhiteSpace,
        isNewline: isNewline,
        getNewlineLength: getNewlineLength,

        cmpChar: cmpChar,
        cmpStr: cmpStr,

        findWhiteSpaceStart: findWhiteSpaceStart,
        findWhiteSpaceEnd: findWhiteSpaceEnd,
        findCommentEnd: findCommentEnd,
        findStringEnd: findStringEnd,
        findDecimalNumberEnd: findDecimalNumberEnd,
        findNumberEnd: findNumberEnd,
        findEscapeEnd: findEscapeEnd,
        findIdentifierEnd: findIdentifierEnd,
        findUrlRawEnd: findUrlRawEnd
    };

    var TYPE$2 = _const.TYPE;
    var NAME$1 = _const.NAME;
    var SYMBOL_TYPE$1 = _const.SYMBOL_TYPE;


    var firstCharOffset$1 = utils.firstCharOffset;
    var cmpStr$1 = utils.cmpStr;
    var isNumber$1 = utils.isNumber;
    var findWhiteSpaceStart$1 = utils.findWhiteSpaceStart;
    var findWhiteSpaceEnd$1 = utils.findWhiteSpaceEnd;
    var findCommentEnd$1 = utils.findCommentEnd;
    var findStringEnd$1 = utils.findStringEnd;
    var findNumberEnd$1 = utils.findNumberEnd;
    var findIdentifierEnd$1 = utils.findIdentifierEnd;
    var findUrlRawEnd$1 = utils.findUrlRawEnd;

    var NULL = 0;
    var WHITESPACE$1 = TYPE$2.WhiteSpace;
    var IDENTIFIER$1 = TYPE$2.Identifier;
    var NUMBER$1 = TYPE$2.Number;
    var STRING$1 = TYPE$2.String;
    var COMMENT$1 = TYPE$2.Comment;
    var PUNCTUATOR$2 = TYPE$2.Punctuator;
    var CDO$1 = TYPE$2.CDO;
    var CDC$1 = TYPE$2.CDC;
    var ATKEYWORD$1 = TYPE$2.AtKeyword;
    var FUNCTION$1 = TYPE$2.Function;
    var URL$2 = TYPE$2.Url;
    var RAW$1 = TYPE$2.Raw;

    var N$2 = 10;
    var F$2 = 12;
    var R$2 = 13;
    var STAR = TYPE$2.Asterisk;
    var SLASH = TYPE$2.Solidus;
    var FULLSTOP$1 = TYPE$2.FullStop;
    var PLUSSIGN$1 = TYPE$2.PlusSign;
    var HYPHENMINUS$1 = TYPE$2.HyphenMinus;
    var GREATERTHANSIGN = TYPE$2.GreaterThanSign;
    var LESSTHANSIGN = TYPE$2.LessThanSign;
    var EXCLAMATIONMARK = TYPE$2.ExclamationMark;
    var COMMERCIALAT = TYPE$2.CommercialAt;
    var QUOTATIONMARK = TYPE$2.QuotationMark;
    var APOSTROPHE = TYPE$2.Apostrophe;
    var LEFTPARENTHESIS = TYPE$2.LeftParenthesis;
    var RIGHTPARENTHESIS = TYPE$2.RightParenthesis;
    var LEFTCURLYBRACKET = TYPE$2.LeftCurlyBracket;
    var RIGHTCURLYBRACKET = TYPE$2.RightCurlyBracket;
    var LEFTSQUAREBRACKET = TYPE$2.LeftSquareBracket;
    var RIGHTSQUAREBRACKET = TYPE$2.RightSquareBracket;

    var MIN_BUFFER_SIZE = 16 * 1024;
    var OFFSET_MASK = 0x00FFFFFF;
    var TYPE_SHIFT = 24;
    var SafeUint32Array$1 = typeof Uint32Array !== 'undefined' ? Uint32Array : Array; // fallback on Array when TypedArray is not supported

    function computeLinesAndColumns(tokenizer, source) {
        var sourceLength = source.length;
        var start = firstCharOffset$1(source);
        var lines = tokenizer.lines;
        var line = tokenizer.startLine;
        var columns = tokenizer.columns;
        var column = tokenizer.startColumn;

        if (lines === null || lines.length < sourceLength + 1) {
            lines = new SafeUint32Array$1(Math.max(sourceLength + 1024, MIN_BUFFER_SIZE));
            columns = new SafeUint32Array$1(lines.length);
        }

        for (var i = start; i < sourceLength; i++) {
            var code = source.charCodeAt(i);

            lines[i] = line;
            columns[i] = column++;

            if (code === N$2 || code === R$2 || code === F$2) {
                if (code === R$2 && i + 1 < sourceLength && source.charCodeAt(i + 1) === N$2) {
                    i++;
                    lines[i] = line;
                    columns[i] = column;
                }

                line++;
                column = 1;
            }
        }

        lines[i] = line;
        columns[i] = column;

        tokenizer.linesAnsColumnsComputed = true;
        tokenizer.lines = lines;
        tokenizer.columns = columns;
    }

    function tokenLayout(tokenizer, source, startPos) {
        var sourceLength = source.length;
        var offsetAndType = tokenizer.offsetAndType;
        var balance = tokenizer.balance;
        var tokenCount = 0;
        var prevType = 0;
        var offset = startPos;
        var anchor = 0;
        var balanceCloseCode = 0;
        var balanceStart = 0;
        var balancePrev = 0;

        if (offsetAndType === null || offsetAndType.length < sourceLength + 1) {
            offsetAndType = new SafeUint32Array$1(sourceLength + 1024);
            balance = new SafeUint32Array$1(sourceLength + 1024);
        }

        while (offset < sourceLength) {
            var code = source.charCodeAt(offset);
            var type = code < 0x80 ? SYMBOL_TYPE$1[code] : IDENTIFIER$1;

            balance[tokenCount] = sourceLength;

            switch (type) {
                case WHITESPACE$1:
                    offset = findWhiteSpaceEnd$1(source, offset + 1);
                    break;

                case PUNCTUATOR$2:
                    switch (code) {
                        case balanceCloseCode:
                            balancePrev = balanceStart & OFFSET_MASK;
                            balanceStart = balance[balancePrev];
                            balanceCloseCode = balanceStart >> TYPE_SHIFT;
                            balance[tokenCount] = balancePrev;
                            balance[balancePrev++] = tokenCount;
                            for (; balancePrev < tokenCount; balancePrev++) {
                                if (balance[balancePrev] === sourceLength) {
                                    balance[balancePrev] = tokenCount;
                                }
                            }
                            break;

                        case LEFTSQUAREBRACKET:
                            balance[tokenCount] = balanceStart;
                            balanceCloseCode = RIGHTSQUAREBRACKET;
                            balanceStart = (balanceCloseCode << TYPE_SHIFT) | tokenCount;
                            break;

                        case LEFTCURLYBRACKET:
                            balance[tokenCount] = balanceStart;
                            balanceCloseCode = RIGHTCURLYBRACKET;
                            balanceStart = (balanceCloseCode << TYPE_SHIFT) | tokenCount;
                            break;

                        case LEFTPARENTHESIS:
                            balance[tokenCount] = balanceStart;
                            balanceCloseCode = RIGHTPARENTHESIS;
                            balanceStart = (balanceCloseCode << TYPE_SHIFT) | tokenCount;
                            break;
                    }

                    // /*
                    if (code === STAR && prevType === SLASH) {
                        type = COMMENT$1;
                        offset = findCommentEnd$1(source, offset + 1);
                        tokenCount--; // rewrite prev token
                        break;
                    }

                    // edge case for -.123 and +.123
                    if (code === FULLSTOP$1 && (prevType === PLUSSIGN$1 || prevType === HYPHENMINUS$1)) {
                        if (offset + 1 < sourceLength && isNumber$1(source.charCodeAt(offset + 1))) {
                            type = NUMBER$1;
                            offset = findNumberEnd$1(source, offset + 2, false);
                            tokenCount--; // rewrite prev token
                            break;
                        }
                    }

                    // <!--
                    if (code === EXCLAMATIONMARK && prevType === LESSTHANSIGN) {
                        if (offset + 2 < sourceLength &&
                            source.charCodeAt(offset + 1) === HYPHENMINUS$1 &&
                            source.charCodeAt(offset + 2) === HYPHENMINUS$1) {
                            type = CDO$1;
                            offset = offset + 3;
                            tokenCount--; // rewrite prev token
                            break;
                        }
                    }

                    // -->
                    if (code === HYPHENMINUS$1 && prevType === HYPHENMINUS$1) {
                        if (offset + 1 < sourceLength && source.charCodeAt(offset + 1) === GREATERTHANSIGN) {
                            type = CDC$1;
                            offset = offset + 2;
                            tokenCount--; // rewrite prev token
                            break;
                        }
                    }

                    // ident(
                    if (code === LEFTPARENTHESIS && prevType === IDENTIFIER$1) {
                        offset = offset + 1;
                        tokenCount--; // rewrite prev token
                        balance[tokenCount] = balance[tokenCount + 1];
                        balanceStart--;

                        // 4 char length identifier and equal to `url(` (case insensitive)
                        if (offset - anchor === 4 && cmpStr$1(source, anchor, offset, 'url(')) {
                            // special case for url() because it can contain any symbols sequence with few exceptions
                            anchor = findWhiteSpaceEnd$1(source, offset);
                            code = source.charCodeAt(anchor);
                            if (code !== LEFTPARENTHESIS &&
                                code !== RIGHTPARENTHESIS &&
                                code !== QUOTATIONMARK &&
                                code !== APOSTROPHE) {
                                // url(
                                offsetAndType[tokenCount++] = (URL$2 << TYPE_SHIFT) | offset;
                                balance[tokenCount] = sourceLength;

                                // ws*
                                if (anchor !== offset) {
                                    offsetAndType[tokenCount++] = (WHITESPACE$1 << TYPE_SHIFT) | anchor;
                                    balance[tokenCount] = sourceLength;
                                }

                                // raw
                                type = RAW$1;
                                offset = findUrlRawEnd$1(source, anchor);
                            } else {
                                type = URL$2;
                            }
                        } else {
                            type = FUNCTION$1;
                        }
                        break;
                    }

                    type = code;
                    offset = offset + 1;
                    break;

                case NUMBER$1:
                    offset = findNumberEnd$1(source, offset + 1, prevType !== FULLSTOP$1);

                    // merge number with a preceding dot, dash or plus
                    if (prevType === FULLSTOP$1 ||
                        prevType === HYPHENMINUS$1 ||
                        prevType === PLUSSIGN$1) {
                        tokenCount--; // rewrite prev token
                    }

                    break;

                case STRING$1:
                    offset = findStringEnd$1(source, offset + 1, code);
                    break;

                default:
                    anchor = offset;
                    offset = findIdentifierEnd$1(source, offset);

                    // merge identifier with a preceding dash
                    if (prevType === HYPHENMINUS$1) {
                        // rewrite prev token
                        tokenCount--;
                        // restore prev prev token type
                        // for case @-prefix-ident
                        prevType = tokenCount === 0 ? 0 : offsetAndType[tokenCount - 1] >> TYPE_SHIFT;
                    }

                    if (prevType === COMMERCIALAT) {
                        // rewrite prev token and change type to <at-keyword-token>
                        tokenCount--;
                        type = ATKEYWORD$1;
                    }
            }

            offsetAndType[tokenCount++] = (type << TYPE_SHIFT) | offset;
            prevType = type;
        }

        // finalize arrays
        offsetAndType[tokenCount] = offset;
        balance[tokenCount] = sourceLength;
        balance[sourceLength] = sourceLength; // prevents false positive balance match with any token
        while (balanceStart !== 0) {
            balancePrev = balanceStart & OFFSET_MASK;
            balanceStart = balance[balancePrev];
            balance[balancePrev] = sourceLength;
        }

        tokenizer.offsetAndType = offsetAndType;
        tokenizer.tokenCount = tokenCount;
        tokenizer.balance = balance;
    }

    //
    // tokenizer
    //

    var Tokenizer = function(source, startOffset, startLine, startColumn) {
        this.offsetAndType = null;
        this.balance = null;
        this.lines = null;
        this.columns = null;

        this.setSource(source, startOffset, startLine, startColumn);
    };

    Tokenizer.prototype = {
        setSource: function(source, startOffset, startLine, startColumn) {
            var safeSource = String(source || '');
            var start = firstCharOffset$1(safeSource);

            this.source = safeSource;
            this.firstCharOffset = start;
            this.startOffset = typeof startOffset === 'undefined' ? 0 : startOffset;
            this.startLine = typeof startLine === 'undefined' ? 1 : startLine;
            this.startColumn = typeof startColumn === 'undefined' ? 1 : startColumn;
            this.linesAnsColumnsComputed = false;

            this.eof = false;
            this.currentToken = -1;
            this.tokenType = 0;
            this.tokenStart = start;
            this.tokenEnd = start;

            tokenLayout(this, safeSource, start);
            this.next();
        },

        lookupType: function(offset) {
            offset += this.currentToken;

            if (offset < this.tokenCount) {
                return this.offsetAndType[offset] >> TYPE_SHIFT;
            }

            return NULL;
        },
        lookupNonWSType: function(offset) {
            offset += this.currentToken;

            for (var type; offset < this.tokenCount; offset++) {
                type = this.offsetAndType[offset] >> TYPE_SHIFT;

                if (type !== WHITESPACE$1) {
                    return type;
                }
            }

            return NULL;
        },
        lookupValue: function(offset, referenceStr) {
            offset += this.currentToken;

            if (offset < this.tokenCount) {
                return cmpStr$1(
                    this.source,
                    this.offsetAndType[offset - 1] & OFFSET_MASK,
                    this.offsetAndType[offset] & OFFSET_MASK,
                    referenceStr
                );
            }

            return false;
        },
        getTokenStart: function(tokenNum) {
            if (tokenNum === this.currentToken) {
                return this.tokenStart;
            }

            if (tokenNum > 0) {
                return tokenNum < this.tokenCount
                    ? this.offsetAndType[tokenNum - 1] & OFFSET_MASK
                    : this.offsetAndType[this.tokenCount] & OFFSET_MASK;
            }

            return this.firstCharOffset;
        },
        getOffsetExcludeWS: function() {
            if (this.currentToken > 0) {
                if ((this.offsetAndType[this.currentToken - 1] >> TYPE_SHIFT) === WHITESPACE$1) {
                    return this.currentToken > 1
                        ? this.offsetAndType[this.currentToken - 2] & OFFSET_MASK
                        : this.firstCharOffset;
                }
            }
            return this.tokenStart;
        },
        getRawLength: function(startToken, endTokenType1, endTokenType2, includeTokenType2) {
            var cursor = startToken;
            var balanceEnd;

            loop:
            for (; cursor < this.tokenCount; cursor++) {
                balanceEnd = this.balance[cursor];

                // belance end points to offset before start
                if (balanceEnd < startToken) {
                    break loop;
                }

                // check token is stop type
                switch (this.offsetAndType[cursor] >> TYPE_SHIFT) {
                    case endTokenType1:
                        break loop;

                    case endTokenType2:
                        if (includeTokenType2) {
                            cursor++;
                        }
                        break loop;

                    default:
                        // fast forward to the end of balanced block
                        if (this.balance[balanceEnd] === cursor) {
                            cursor = balanceEnd;
                        }
                }

            }

            return cursor - this.currentToken;
        },
        isBalanceEdge: function(pos) {
            var balanceStart = this.balance[this.currentToken];
            return balanceStart < pos;
        },

        getTokenValue: function() {
            return this.source.substring(this.tokenStart, this.tokenEnd);
        },
        substrToCursor: function(start) {
            return this.source.substring(start, this.tokenStart);
        },

        skipWS: function() {
            for (var i = this.currentToken, skipTokenCount = 0; i < this.tokenCount; i++, skipTokenCount++) {
                if ((this.offsetAndType[i] >> TYPE_SHIFT) !== WHITESPACE$1) {
                    break;
                }
            }

            if (skipTokenCount > 0) {
                this.skip(skipTokenCount);
            }
        },
        skipSC: function() {
            while (this.tokenType === WHITESPACE$1 || this.tokenType === COMMENT$1) {
                this.next();
            }
        },
        skip: function(tokenCount) {
            var next = this.currentToken + tokenCount;

            if (next < this.tokenCount) {
                this.currentToken = next;
                this.tokenStart = this.offsetAndType[next - 1] & OFFSET_MASK;
                next = this.offsetAndType[next];
                this.tokenType = next >> TYPE_SHIFT;
                this.tokenEnd = next & OFFSET_MASK;
            } else {
                this.currentToken = this.tokenCount;
                this.next();
            }
        },
        next: function() {
            var next = this.currentToken + 1;

            if (next < this.tokenCount) {
                this.currentToken = next;
                this.tokenStart = this.tokenEnd;
                next = this.offsetAndType[next];
                this.tokenType = next >> TYPE_SHIFT;
                this.tokenEnd = next & OFFSET_MASK;
            } else {
                this.currentToken = this.tokenCount;
                this.eof = true;
                this.tokenType = NULL;
                this.tokenStart = this.tokenEnd = this.source.length;
            }
        },

        eat: function(tokenType) {
            if (this.tokenType !== tokenType) {
                var offset = this.tokenStart;
                var message = NAME$1[tokenType] + ' is expected';

                // tweak message and offset
                if (tokenType === IDENTIFIER$1) {
                    // when identifier is expected but there is a function or url
                    if (this.tokenType === FUNCTION$1 || this.tokenType === URL$2) {
                        offset = this.tokenEnd - 1;
                        message += ' but function found';
                    }
                } else {
                    // when test type is part of another token show error for current position + 1
                    // e.g. eat(HYPHENMINUS) will fail on "-foo", but pointing on "-" is odd
                    if (this.source.charCodeAt(this.tokenStart) === tokenType) {
                        offset = offset + 1;
                    }
                }

                this.error(message, offset);
            }

            this.next();
        },
        eatNonWS: function(tokenType) {
            this.skipWS();
            this.eat(tokenType);
        },

        consume: function(tokenType) {
            var value = this.getTokenValue();

            this.eat(tokenType);

            return value;
        },
        consumeFunctionName: function() {
            var name = this.source.substring(this.tokenStart, this.tokenEnd - 1);

            this.eat(FUNCTION$1);

            return name;
        },
        consumeNonWS: function(tokenType) {
            this.skipWS();

            return this.consume(tokenType);
        },

        expectIdentifier: function(name) {
            if (this.tokenType !== IDENTIFIER$1 || cmpStr$1(this.source, this.tokenStart, this.tokenEnd, name) === false) {
                this.error('Identifier `' + name + '` is expected');
            }

            this.next();
        },

        getLocation: function(offset, filename) {
            if (!this.linesAnsColumnsComputed) {
                computeLinesAndColumns(this, this.source);
            }

            return {
                source: filename,
                offset: this.startOffset + offset,
                line: this.lines[offset],
                column: this.columns[offset]
            };
        },

        getLocationRange: function(start, end, filename) {
            if (!this.linesAnsColumnsComputed) {
                computeLinesAndColumns(this, this.source);
            }

            return {
                source: filename,
                start: {
                    offset: this.startOffset + start,
                    line: this.lines[start],
                    column: this.columns[start]
                },
                end: {
                    offset: this.startOffset + end,
                    line: this.lines[end],
                    column: this.columns[end]
                }
            };
        },

        error: function(message, offset) {
            var location = typeof offset !== 'undefined' && offset < this.source.length
                ? this.getLocation(offset)
                : this.eof
                    ? this.getLocation(findWhiteSpaceStart$1(this.source, this.source.length - 1))
                    : this.getLocation(this.tokenStart);

            throw new error(
                message || 'Unexpected input',
                this.source,
                location.offset,
                location.line,
                location.column
            );
        },

        dump: function() {
            var offset = 0;

            return Array.prototype.slice.call(this.offsetAndType, 0, this.tokenCount).map(function(item, idx) {
                var start = offset;
                var end = item & OFFSET_MASK;

                offset = end;

                return {
                    idx: idx,
                    type: NAME$1[item >> TYPE_SHIFT],
                    chunk: this.source.substring(start, end),
                    balance: this.balance[idx]
                };
            }, this);
        }
    };

    // extend with error class
    Tokenizer.CssSyntaxError = error;

    // extend tokenizer with constants
    Object.keys(_const).forEach(function(key) {
        Tokenizer[key] = _const[key];
    });

    // extend tokenizer with static methods from utils
    Object.keys(utils).forEach(function(key) {
        Tokenizer[key] = utils[key];
    });

    // warm up tokenizer to elimitate code branches that never execute
    // fix soft deoptimizations (insufficient type feedback)
    new Tokenizer('\n\r\r\n\f<!---->//""\'\'/*\r\n\f*/1a;.\\31\t\+2{url(a);func();+1.2e3 -.4e-5 .6e+7}').getLocation();

    var Tokenizer_1 = Tokenizer;

    var tokenizer = Tokenizer_1;

    function noop$1(value) {
        return value;
    }

    function generateMultiplier(multiplier) {
        if (multiplier.min === 0 && multiplier.max === 0) {
            return '*';
        }

        if (multiplier.min === 0 && multiplier.max === 1) {
            return '?';
        }

        if (multiplier.min === 1 && multiplier.max === 0) {
            return multiplier.comma ? '#' : '+';
        }

        if (multiplier.min === 1 && multiplier.max === 1) {
            return '';
        }

        return (
            (multiplier.comma ? '#' : '') +
            (multiplier.min === multiplier.max
                ? '{' + multiplier.min + '}'
                : '{' + multiplier.min + ',' + (multiplier.max !== 0 ? multiplier.max : '') + '}'
            )
        );
    }

    function generateSequence(node, forceBraces, decorate) {
        var result = node.terms.map(function(term) {
            return generate(term, forceBraces, decorate);
        }).join(node.combinator === ' ' ? ' ' : ' ' + node.combinator + ' ');

        if (node.explicit || forceBraces) {
            result = (result[0] !== ',' ? '[ ' : '[') + result + ' ]';
        }

        return result;
    }

    function generate(node, forceBraces, decorate) {
        var result;

        switch (node.type) {
            case 'Group':
                result =
                    generateSequence(node, forceBraces, decorate) +
                    (node.disallowEmpty ? '!' : '');
                break;

            case 'Multiplier':
                // return since node is a composition
                return (
                    generate(node.term, forceBraces, decorate) +
                    decorate(generateMultiplier(node), node)
                );

            case 'Type':
                result = '<' + node.name + '>';
                break;

            case 'Property':
                result = '<\'' + node.name + '\'>';
                break;

            case 'Keyword':
                result = node.name;
                break;

            case 'AtKeyword':
                result = '@' + node.name;
                break;

            case 'Function':
                result = node.name + '(';
                break;

            case 'String':
            case 'Token':
                result = node.value;
                break;

            case 'Comma':
                result = ',';
                break;

            default:
                throw new Error('Unknown node type `' + node.type + '`');
        }

        return decorate(result, node);
    }

    var generate_1 = function(node, options) {
        var decorate = noop$1;
        var forceBraces = false;

        if (typeof options === 'function') {
            decorate = options;
        } else if (options) {
            forceBraces = Boolean(options.forceBraces);
            if (typeof options.decorate === 'function') {
                decorate = options.decorate;
            }
        }

        return generate(node, forceBraces, decorate);
    };

    function fromMatchResult(matchResult) {
        var tokens = matchResult.tokens;
        var longestMatch = matchResult.longestMatch;
        var node = longestMatch < tokens.length ? tokens[longestMatch].node : null;
        var mismatchOffset = 0;
        var entries = 0;
        var css = '';

        for (var i = 0; i < tokens.length; i++) {
            if (i === longestMatch) {
                mismatchOffset = css.length;
            }

            if (node !== null && tokens[i].node === node) {
                if (i <= longestMatch) {
                    entries++;
                } else {
                    entries = 0;
                }
            }

            css += tokens[i].value;
        }

        if (node === null) {
            mismatchOffset = css.length;
        }

        return {
            node: node,
            css: css,
            mismatchOffset: mismatchOffset,
            last: node === null || entries > 1
        };
    }

    function getLocation(node, point) {
        var loc = node && node.loc && node.loc[point];

        if (loc) {
            return {
                offset: loc.offset,
                line: loc.line,
                column: loc.column
            };
        }

        return null;
    }

    var SyntaxReferenceError = function(type, referenceName) {
        var error = createCustomError(
            'SyntaxReferenceError',
            type + (referenceName ? ' `' + referenceName + '`' : '')
        );

        error.reference = referenceName;

        return error;
    };

    var MatchError = function(message, lexer, syntax, node, matchResult) {
        var error = createCustomError('SyntaxMatchError', message);
        var details = fromMatchResult(matchResult);
        var mismatchOffset = details.mismatchOffset || 0;
        var badNode = details.node || node;
        var end = getLocation(badNode, 'end');
        var start = details.last ? end : getLocation(badNode, 'start');
        var css = details.css;

        error.rawMessage = message;
        error.syntax = syntax ? generate_1(syntax) : '<generic>';
        error.css = css;
        error.mismatchOffset = mismatchOffset;
        error.loc = {
            source: (badNode && badNode.loc && badNode.loc.source) || '<unknown>',
            start: start,
            end: end
        };
        error.line = start ? start.line : undefined;
        error.column = start ? start.column : undefined;
        error.offset = start ? start.offset : undefined;
        error.message = message + '\n' +
            '  syntax: ' + error.syntax + '\n' +
            '   value: ' + (error.css || '<empty string>') + '\n' +
            '  --------' + new Array(error.mismatchOffset + 1).join('-') + '^';

        return error;
    };

    var error$1 = {
        SyntaxReferenceError: SyntaxReferenceError,
        MatchError: MatchError
    };

    var hasOwnProperty = Object.prototype.hasOwnProperty;
    var keywords = Object.create(null);
    var properties = Object.create(null);
    var HYPHENMINUS$2 = 45; // '-'.charCodeAt()

    function isCustomProperty(str, offset) {
        offset = offset || 0;

        return str.length - offset >= 2 &&
               str.charCodeAt(offset) === HYPHENMINUS$2 &&
               str.charCodeAt(offset + 1) === HYPHENMINUS$2;
    }

    function getVendorPrefix(str, offset) {
        offset = offset || 0;

        // verdor prefix should be at least 3 chars length
        if (str.length - offset >= 3) {
            // vendor prefix starts with hyper minus following non-hyper minus
            if (str.charCodeAt(offset) === HYPHENMINUS$2 &&
                str.charCodeAt(offset + 1) !== HYPHENMINUS$2) {
                // vendor prefix should contain a hyper minus at the ending
                var secondDashIndex = str.indexOf('-', offset + 2);

                if (secondDashIndex !== -1) {
                    return str.substring(offset, secondDashIndex + 1);
                }
            }
        }

        return '';
    }

    function getKeywordDescriptor(keyword) {
        if (hasOwnProperty.call(keywords, keyword)) {
            return keywords[keyword];
        }

        var name = keyword.toLowerCase();

        if (hasOwnProperty.call(keywords, name)) {
            return keywords[keyword] = keywords[name];
        }

        var custom = isCustomProperty(name, 0);
        var vendor = !custom ? getVendorPrefix(name, 0) : '';

        return keywords[keyword] = Object.freeze({
            basename: name.substr(vendor.length),
            name: name,
            vendor: vendor,
            prefix: vendor,
            custom: custom
        });
    }

    function getPropertyDescriptor(property) {
        if (hasOwnProperty.call(properties, property)) {
            return properties[property];
        }

        var name = property;
        var hack = property[0];

        if (hack === '/') {
            hack = property[1] === '/' ? '//' : '/';
        } else if (hack !== '_' &&
                   hack !== '*' &&
                   hack !== '$' &&
                   hack !== '#' &&
                   hack !== '+') {
            hack = '';
        }

        var custom = isCustomProperty(name, hack.length);

        // re-use result when possible (the same as for lower case)
        if (!custom) {
            name = name.toLowerCase();
            if (hasOwnProperty.call(properties, name)) {
                return properties[property] = properties[name];
            }
        }

        var vendor = !custom ? getVendorPrefix(name, hack.length) : '';
        var prefix = name.substr(0, hack.length + vendor.length);

        return properties[property] = Object.freeze({
            basename: name.substr(prefix.length),
            name: name.substr(hack.length),
            hack: hack,
            vendor: vendor,
            prefix: prefix,
            custom: custom
        });
    }

    var names = {
        keyword: getKeywordDescriptor,
        property: getPropertyDescriptor,
        isCustomProperty: isCustomProperty,
        vendorPrefix: getVendorPrefix
    };

    var findIdentifierEnd$2 = utils.findIdentifierEnd;
    var findNumberEnd$2 = utils.findNumberEnd;
    var findDecimalNumberEnd$1 = utils.findDecimalNumberEnd;
    var isHex$1 = utils.isHex;

    var SYMBOL_TYPE$2 = _const.SYMBOL_TYPE;
    var IDENTIFIER$2 = _const.TYPE.Identifier;
    var PLUSSIGN$2 = _const.TYPE.PlusSign;
    var HYPHENMINUS$3 = _const.TYPE.HyphenMinus;
    var NUMBERSIGN = _const.TYPE.NumberSign;

    var PERCENTAGE = {
        '%': true
    };

    // https://www.w3.org/TR/css-values-3/#lengths
    var LENGTH = {
        // absolute length units
        'px': true,
        'mm': true,
        'cm': true,
        'in': true,
        'pt': true,
        'pc': true,
        'q': true,

        // relative length units
        'em': true,
        'ex': true,
        'ch': true,
        'rem': true,

        // viewport-percentage lengths
        'vh': true,
        'vw': true,
        'vmin': true,
        'vmax': true,
        'vm': true
    };

    var ANGLE = {
        'deg': true,
        'grad': true,
        'rad': true,
        'turn': true
    };

    var TIME = {
        's': true,
        'ms': true
    };

    var FREQUENCY = {
        'hz': true,
        'khz': true
    };

    // https://www.w3.org/TR/css-values-3/#resolution (https://drafts.csswg.org/css-values/#resolution)
    var RESOLUTION = {
        'dpi': true,
        'dpcm': true,
        'dppx': true,
        'x': true      // https://github.com/w3c/csswg-drafts/issues/461
    };

    // https://drafts.csswg.org/css-grid/#fr-unit
    var FLEX = {
        'fr': true
    };

    // https://www.w3.org/TR/css3-speech/#mixing-props-voice-volume
    var DECIBEL = {
        'db': true
    };

    // https://www.w3.org/TR/css3-speech/#voice-props-voice-pitch
    var SEMITONES = {
        'st': true
    };

    function consumeFunction(token, addTokenToMatch, getNextToken) {
        var length = 1;
        var cursor;

        do {
            cursor = getNextToken(length++);
        } while (cursor !== null && cursor.node !== token.node);

        if (cursor === null) {
            return false;
        }

        while (true) {
            // consume tokens until cursor
            if (addTokenToMatch() === cursor) {
                break;
            }
        }

        return true;
    }

    // TODO: implement
    // can be used wherever <length>, <frequency>, <angle>, <time>, <percentage>, <number>, or <integer> values are allowed
    // https://drafts.csswg.org/css-values/#calc-notation
    function calc(token, addTokenToMatch, getNextToken) {
        if (token === null) {
            return false;
        }

        var name = token.value.toLowerCase();
        if (name !== 'calc(' &&
            name !== '-moz-calc(' &&
            name !== '-webkit-calc(') {
            return false;
        }

        return consumeFunction(token, addTokenToMatch, getNextToken);
    }

    function attr$1(token, addTokenToMatch, getNextToken) {
        if (token === null || token.value.toLowerCase() !== 'attr(') {
            return false;
        }

        return consumeFunction(token, addTokenToMatch, getNextToken);
    }

    function expression(token, addTokenToMatch, getNextToken) {
        if (token === null || token.value.toLowerCase() !== 'expression(') {
            return false;
        }

        return consumeFunction(token, addTokenToMatch, getNextToken);
    }

    function url(token, addTokenToMatch, getNextToken) {
        if (token === null || token.value.toLowerCase() !== 'url(') {
            return false;
        }

        return consumeFunction(token, addTokenToMatch, getNextToken);
    }

    function idSelector(token, addTokenToMatch) {
        if (token === null) {
            return false;
        }

        if (token.value.charCodeAt(0) !== NUMBERSIGN) {
            return false;
        }

        if (consumeIdentifier(token.value, 1) !== token.value.length) {
            return false;
        }

        addTokenToMatch();
        return true;
    }

    function isNumber$2(str) {
        return /^[-+]?(\d+|\d*\.\d+)([eE][-+]?\d+)?$/.test(str);
    }

    function consumeNumber(str, allowFraction) {
        var code = str.charCodeAt(0);

        return findNumberEnd$2(str, code === PLUSSIGN$2 || code === HYPHENMINUS$3 ? 1 : 0, allowFraction);
    }

    function consumeIdentifier(str, offset) {
        var code = str.charCodeAt(offset);

        if (code < 0x80 && SYMBOL_TYPE$2[code] !== IDENTIFIER$2 && code !== HYPHENMINUS$3) {
            return offset;
        }

        return findIdentifierEnd$2(str, offset + 1);
    }

    function astNode(type) {
        return function(token, addTokenToMatch) {
            if (token === null || token.node.type !== type) {
                return false;
            }

            addTokenToMatch();
            return true;
        };
    }

    function dimension(type) {
        return function(token, addTokenToMatch, getNextToken) {
            if (calc(token, addTokenToMatch, getNextToken)) {
                return true;
            }

            if (token === null) {
                return false;
            }

            var numberEnd = consumeNumber(token.value, true);
            if (numberEnd === 0) {
                return false;
            }

            if (type) {
                if (!type.hasOwnProperty(token.value.substr(numberEnd).toLowerCase())) {
                    return false;
                }
            } else {
                var unitEnd = consumeIdentifier(token.value, numberEnd);
                if (unitEnd === numberEnd || unitEnd !== token.value.length) {
                    return false;
                }
            }

            addTokenToMatch();
            return true;
        };
    }

    function zeroUnitlessDimension(type) {
        var isDimension = dimension(type);

        return function(token, addTokenToMatch, getNextToken) {
            if (isDimension(token, addTokenToMatch, getNextToken)) {
                return true;
            }

            if (token === null || Number(token.value) !== 0) {
                return false;
            }

            addTokenToMatch();
            return true;
        };
    }

    function number(token, addTokenToMatch, getNextToken) {
        if (calc(token, addTokenToMatch, getNextToken)) {
            return true;
        }

        if (token === null) {
            return false;
        }

        var numberEnd = consumeNumber(token.value, true);
        if (numberEnd !== token.value.length) {
            return false;
        }

        addTokenToMatch();
        return true;
    }

    function numberZeroOne(token, addTokenToMatch, getNextToken) {
        if (calc(token, addTokenToMatch, getNextToken)) {
            return true;
        }

        if (token === null || !isNumber$2(token.value)) {
            return false;
        }

        var value = Number(token.value);
        if (value < 0 || value > 1) {
            return false;
        }

        addTokenToMatch();
        return true;
    }

    function numberOneOrGreater(token, addTokenToMatch, getNextToken) {
        if (calc(token, addTokenToMatch, getNextToken)) {
            return true;
        }

        if (token === null || !isNumber$2(token.value)) {
            return false;
        }

        var value = Number(token.value);
        if (value < 1) {
            return false;
        }

        addTokenToMatch();
        return true;
    }

    // TODO: fail on 10e-2
    function integer(token, addTokenToMatch, getNextToken) {
        if (calc(token, addTokenToMatch, getNextToken)) {
            return true;
        }

        if (token === null) {
            return false;
        }

        var numberEnd = consumeNumber(token.value, false);
        if (numberEnd !== token.value.length) {
            return false;
        }

        addTokenToMatch();
        return true;
    }

    // TODO: fail on 10e-2
    function positiveInteger(token, addTokenToMatch, getNextToken) {
        if (calc(token, addTokenToMatch, getNextToken)) {
            return true;
        }

        if (token === null) {
            return false;
        }

        var numberEnd = findDecimalNumberEnd$1(token.value, 0);
        if (numberEnd !== token.value.length || token.value.charCodeAt(0) === HYPHENMINUS$3) {
            return false;
        }

        addTokenToMatch();
        return true;
    }

    function hexColor(token, addTokenToMatch) {
        if (token === null || token.value.charCodeAt(0) !== NUMBERSIGN) {
            return false;
        }

        var length = token.value.length - 1;

        // valid length is 3, 4, 6 and 8 (+1 for #)
        if (length !== 3 && length !== 4 && length !== 6 && length !== 8) {
            return false;
        }

        for (var i = 1; i < length; i++) {
            if (!isHex$1(token.value.charCodeAt(i))) {
                return false;
            }
        }

        addTokenToMatch();
        return true;
    }

    // https://developer.mozilla.org/en-US/docs/Web/CSS/custom-ident
    // https://drafts.csswg.org/css-values-4/#identifier-value
    function customIdent(token, addTokenToMatch) {
        if (token === null) {
            return false;
        }

        var identEnd = consumeIdentifier(token.value, 0);
        if (identEnd !== token.value.length) {
            return false;
        }

        var name = token.value.toLowerCase();

        // § 3.2. Author-defined Identifiers: the <custom-ident> type
        // The CSS-wide keywords are not valid <custom-ident>s
        if (name === 'unset' || name === 'initial' || name === 'inherit') {
            return false;
        }

        // The default keyword is reserved and is also not a valid <custom-ident>
        if (name === 'default') {
            return false;
        }

        // TODO: ignore property specific keywords (as described https://developer.mozilla.org/en-US/docs/Web/CSS/custom-ident)

        addTokenToMatch();
        return true;
    }

    var generic = {
        'angle': zeroUnitlessDimension(ANGLE),
        'attr()': attr$1,
        'custom-ident': customIdent,
        'decibel': dimension(DECIBEL),
        'dimension': dimension(),
        'frequency': dimension(FREQUENCY),
        'flex': dimension(FLEX),
        'hex-color': hexColor,
        'id-selector': idSelector, // element( <id-selector> )
        'ident': astNode('Identifier'),
        'integer': integer,
        'length': zeroUnitlessDimension(LENGTH),
        'number': number,
        'number-zero-one': numberZeroOne,
        'number-one-or-greater': numberOneOrGreater,
        'percentage': dimension(PERCENTAGE),
        'positive-integer': positiveInteger,
        'resolution': dimension(RESOLUTION),
        'semitones': dimension(SEMITONES),
        'string': astNode('String'),
        'time': dimension(TIME),
        'unicode-range': astNode('UnicodeRange'),
        'url': url,

        // old IE stuff
        'progid': astNode('Raw'),
        'expression': expression
    };

    var SyntaxParseError = function(message, input, offset) {
        var error = createCustomError('SyntaxParseError', message);

        error.input = input;
        error.offset = offset;
        error.rawMessage = message;
        error.message = error.rawMessage + '\n' +
            '  ' + error.input + '\n' +
            '--' + new Array((error.offset || error.input.length) + 1).join('-') + '^';

        return error;
    };

    var error$2 = {
        SyntaxParseError: SyntaxParseError
    };

    var SyntaxParseError$1 = error$2.SyntaxParseError;

    var TAB$2 = 9;
    var N$3 = 10;
    var F$3 = 12;
    var R$3 = 13;
    var SPACE$2 = 32;

    var Tokenizer$1 = function(str) {
        this.str = str;
        this.pos = 0;
    };

    Tokenizer$1.prototype = {
        charCodeAt: function(pos) {
            return pos < this.str.length ? this.str.charCodeAt(pos) : 0;
        },
        charCode: function() {
            return this.charCodeAt(this.pos);
        },
        nextCharCode: function() {
            return this.charCodeAt(this.pos + 1);
        },
        nextNonWsCode: function(pos) {
            return this.charCodeAt(this.findWsEnd(pos));
        },
        findWsEnd: function(pos) {
            for (; pos < this.str.length; pos++) {
                var code = this.str.charCodeAt(pos);
                if (code !== R$3 && code !== N$3 && code !== F$3 && code !== SPACE$2 && code !== TAB$2) {
                    break;
                }
            }

            return pos;
        },
        substringToPos: function(end) {
            return this.str.substring(this.pos, this.pos = end);
        },
        eat: function(code) {
            if (this.charCode() !== code) {
                this.error('Expect `' + String.fromCharCode(code) + '`');
            }

            this.pos++;
        },
        peek: function() {
            return this.pos < this.str.length ? this.str.charAt(this.pos++) : '';
        },
        error: function(message) {
            throw new SyntaxParseError$1(message, this.str, this.pos);
        }
    };

    var tokenizer$1 = Tokenizer$1;

    var TAB$3 = 9;
    var N$4 = 10;
    var F$4 = 12;
    var R$4 = 13;
    var SPACE$3 = 32;
    var EXCLAMATIONMARK$1 = 33;    // !
    var NUMBERSIGN$1 = 35;         // #
    var AMPERSAND = 38;          // &
    var APOSTROPHE$1 = 39;         // '
    var LEFTPARENTHESIS$1 = 40;    // (
    var RIGHTPARENTHESIS$1 = 41;   // )
    var ASTERISK = 42;           // *
    var PLUSSIGN$3 = 43;           // +
    var COMMA = 44;              // ,
    var LESSTHANSIGN$1 = 60;       // <
    var GREATERTHANSIGN$1 = 62;    // >
    var QUESTIONMARK = 63;       // ?
    var COMMERCIALAT$1 = 64;       // @
    var LEFTSQUAREBRACKET$1 = 91;  // [
    var RIGHTSQUAREBRACKET$1 = 93; // ]
    var LEFTCURLYBRACKET$1 = 123;  // {
    var VERTICALLINE = 124;      // |
    var RIGHTCURLYBRACKET$1 = 125; // }
    var NAME_CHAR = createCharMap(function(ch) {
        return /[a-zA-Z0-9\-]/.test(ch);
    });
    var COMBINATOR_PRECEDENCE = {
        ' ': 1,
        '&&': 2,
        '||': 3,
        '|': 4
    };

    function createCharMap(fn) {
        var array = typeof Uint32Array === 'function' ? new Uint32Array(128) : new Array(128);
        for (var i = 0; i < 128; i++) {
            array[i] = fn(String.fromCharCode(i)) ? 1 : 0;
        }
        return array;
    }

    function scanSpaces(tokenizer) {
        return tokenizer.substringToPos(
            tokenizer.findWsEnd(tokenizer.pos + 1)
        );
    }

    function scanWord(tokenizer) {
        var end = tokenizer.pos;

        for (; end < tokenizer.str.length; end++) {
            var code = tokenizer.str.charCodeAt(end);
            if (code >= 128 || NAME_CHAR[code] === 0) {
                break;
            }
        }

        if (tokenizer.pos === end) {
            tokenizer.error('Expect a keyword');
        }

        return tokenizer.substringToPos(end);
    }

    function scanNumber(tokenizer) {
        var end = tokenizer.pos;

        for (; end < tokenizer.str.length; end++) {
            var code = tokenizer.str.charCodeAt(end);
            if (code < 48 || code > 57) {
                break;
            }
        }

        if (tokenizer.pos === end) {
            tokenizer.error('Expect a number');
        }

        return tokenizer.substringToPos(end);
    }

    function scanString(tokenizer) {
        var end = tokenizer.str.indexOf('\'', tokenizer.pos + 1);

        if (end === -1) {
            tokenizer.pos = tokenizer.str.length;
            tokenizer.error('Expect an apostrophe');
        }

        return tokenizer.substringToPos(end + 1);
    }

    function readMultiplierRange(tokenizer) {
        var min = null;
        var max = null;

        tokenizer.eat(LEFTCURLYBRACKET$1);

        min = scanNumber(tokenizer);

        if (tokenizer.charCode() === COMMA) {
            tokenizer.pos++;
            if (tokenizer.charCode() !== RIGHTCURLYBRACKET$1) {
                max = scanNumber(tokenizer);
            }
        } else {
            max = min;
        }

        tokenizer.eat(RIGHTCURLYBRACKET$1);

        return {
            min: Number(min),
            max: max ? Number(max) : 0
        };
    }

    function readMultiplier(tokenizer) {
        var range = null;
        var comma = false;

        switch (tokenizer.charCode()) {
            case ASTERISK:
                tokenizer.pos++;

                range = {
                    min: 0,
                    max: 0
                };

                break;

            case PLUSSIGN$3:
                tokenizer.pos++;

                range = {
                    min: 1,
                    max: 0
                };

                break;

            case QUESTIONMARK:
                tokenizer.pos++;

                range = {
                    min: 0,
                    max: 1
                };

                break;

            case NUMBERSIGN$1:
                tokenizer.pos++;

                comma = true;

                if (tokenizer.charCode() === LEFTCURLYBRACKET$1) {
                    range = readMultiplierRange(tokenizer);
                } else {
                    range = {
                        min: 1,
                        max: 0
                    };
                }

                break;

            case LEFTCURLYBRACKET$1:
                range = readMultiplierRange(tokenizer);
                break;

            default:
                return null;
        }

        return {
            type: 'Multiplier',
            comma: comma,
            min: range.min,
            max: range.max,
            term: null
        };
    }

    function maybeMultiplied(tokenizer, node) {
        var multiplier = readMultiplier(tokenizer);

        if (multiplier !== null) {
            multiplier.term = node;
            return multiplier;
        }

        return node;
    }

    function maybeToken(tokenizer) {
        var ch = tokenizer.peek();

        if (ch === '') {
            return null;
        }

        return {
            type: 'Token',
            value: ch
        };
    }

    function readProperty(tokenizer) {
        var name;

        tokenizer.eat(LESSTHANSIGN$1);
        tokenizer.eat(APOSTROPHE$1);

        name = scanWord(tokenizer);

        tokenizer.eat(APOSTROPHE$1);
        tokenizer.eat(GREATERTHANSIGN$1);

        return maybeMultiplied(tokenizer, {
            type: 'Property',
            name: name
        });
    }

    function readType(tokenizer) {
        var name;

        tokenizer.eat(LESSTHANSIGN$1);
        name = scanWord(tokenizer);

        if (tokenizer.charCode() === LEFTPARENTHESIS$1 &&
            tokenizer.nextCharCode() === RIGHTPARENTHESIS$1) {
            tokenizer.pos += 2;
            name += '()';
        }

        tokenizer.eat(GREATERTHANSIGN$1);

        return maybeMultiplied(tokenizer, {
            type: 'Type',
            name: name
        });
    }

    function readKeywordOrFunction(tokenizer) {
        var name;

        name = scanWord(tokenizer);

        if (tokenizer.charCode() === LEFTPARENTHESIS$1) {
            tokenizer.pos++;

            return {
                type: 'Function',
                name: name
            };
        }

        return maybeMultiplied(tokenizer, {
            type: 'Keyword',
            name: name
        });
    }

    function regroupTerms(terms, combinators) {
        function createGroup(terms, combinator) {
            return {
                type: 'Group',
                terms: terms,
                combinator: combinator,
                disallowEmpty: false,
                explicit: false
            };
        }

        combinators = Object.keys(combinators).sort(function(a, b) {
            return COMBINATOR_PRECEDENCE[a] - COMBINATOR_PRECEDENCE[b];
        });

        while (combinators.length > 0) {
            var combinator = combinators.shift();
            for (var i = 0, subgroupStart = 0; i < terms.length; i++) {
                var term = terms[i];
                if (term.type === 'Combinator') {
                    if (term.value === combinator) {
                        if (subgroupStart === -1) {
                            subgroupStart = i - 1;
                        }
                        terms.splice(i, 1);
                        i--;
                    } else {
                        if (subgroupStart !== -1 && i - subgroupStart > 1) {
                            terms.splice(
                                subgroupStart,
                                i - subgroupStart,
                                createGroup(terms.slice(subgroupStart, i), combinator)
                            );
                            i = subgroupStart + 1;
                        }
                        subgroupStart = -1;
                    }
                }
            }

            if (subgroupStart !== -1 && combinators.length) {
                terms.splice(
                    subgroupStart,
                    i - subgroupStart,
                    createGroup(terms.slice(subgroupStart, i), combinator)
                );
            }
        }

        return combinator;
    }

    function readImplicitGroup(tokenizer) {
        var terms = [];
        var combinators = {};
        var token;
        var prevToken = null;
        var prevTokenPos = tokenizer.pos;

        while (token = peek(tokenizer)) {
            if (token.type !== 'Spaces') {
                if (token.type === 'Combinator') {
                    // check for combinator in group beginning and double combinator sequence
                    if (prevToken === null || prevToken.type === 'Combinator') {
                        tokenizer.pos = prevTokenPos;
                        tokenizer.error('Unexpected combinator');
                    }

                    combinators[token.value] = true;
                } else if (prevToken !== null && prevToken.type !== 'Combinator') {
                    combinators[' '] = true;  // a b
                    terms.push({
                        type: 'Combinator',
                        value: ' '
                    });
                }

                terms.push(token);
                prevToken = token;
                prevTokenPos = tokenizer.pos;
            }
        }

        // check for combinator in group ending
        if (prevToken !== null && prevToken.type === 'Combinator') {
            tokenizer.pos -= prevTokenPos;
            tokenizer.error('Unexpected combinator');
        }

        return {
            type: 'Group',
            terms: terms,
            combinator: regroupTerms(terms, combinators) || ' ',
            disallowEmpty: false,
            explicit: false
        };
    }

    function readGroup(tokenizer) {
        var result;

        tokenizer.eat(LEFTSQUAREBRACKET$1);
        result = readImplicitGroup(tokenizer);
        tokenizer.eat(RIGHTSQUAREBRACKET$1);

        result.explicit = true;

        if (tokenizer.charCode() === EXCLAMATIONMARK$1) {
            tokenizer.pos++;
            result.disallowEmpty = true;
        }

        return result;
    }

    function peek(tokenizer) {
        var code = tokenizer.charCode();

        if (code < 128 && NAME_CHAR[code] === 1) {
            return readKeywordOrFunction(tokenizer);
        }

        switch (code) {
            case RIGHTSQUAREBRACKET$1:
                // don't eat, stop scan a group
                break;

            case LEFTSQUAREBRACKET$1:
                return maybeMultiplied(tokenizer, readGroup(tokenizer));

            case LESSTHANSIGN$1:
                return tokenizer.nextCharCode() === APOSTROPHE$1
                    ? readProperty(tokenizer)
                    : readType(tokenizer);

            case VERTICALLINE:
                return {
                    type: 'Combinator',
                    value: tokenizer.substringToPos(
                        tokenizer.nextCharCode() === VERTICALLINE
                            ? tokenizer.pos + 2
                            : tokenizer.pos + 1
                    )
                };

            case AMPERSAND:
                tokenizer.pos++;
                tokenizer.eat(AMPERSAND);

                return {
                    type: 'Combinator',
                    value: '&&'
                };

            case COMMA:
                tokenizer.pos++;
                return {
                    type: 'Comma'
                };

            case APOSTROPHE$1:
                return maybeMultiplied(tokenizer, {
                    type: 'String',
                    value: scanString(tokenizer)
                });

            case SPACE$3:
            case TAB$3:
            case N$4:
            case R$4:
            case F$4:
                return {
                    type: 'Spaces',
                    value: scanSpaces(tokenizer)
                };

            case COMMERCIALAT$1:
                code = tokenizer.nextCharCode();

                if (code < 128 && NAME_CHAR[code] === 1) {
                    tokenizer.pos++;
                    return {
                        type: 'AtKeyword',
                        name: scanWord(tokenizer)
                    };
                }

                return maybeToken(tokenizer);

            case ASTERISK:
            case PLUSSIGN$3:
            case QUESTIONMARK:
            case NUMBERSIGN$1:
            case EXCLAMATIONMARK$1:
                // prohibited tokens (used as a multiplier start)
                break;

            case LEFTCURLYBRACKET$1:
                // LEFTCURLYBRACKET is allowed since mdn/data uses it w/o quoting
                // check next char isn't a number, because it's likely a disjoined multiplier
                code = tokenizer.nextCharCode();

                if (code < 48 || code > 57) {
                    return maybeToken(tokenizer);
                }

                break;

            default:
                return maybeToken(tokenizer);
        }
    }

    function parse(str) {
        var tokenizer = new tokenizer$1(str);
        var result = readImplicitGroup(tokenizer);

        if (tokenizer.pos !== str.length) {
            tokenizer.error('Unexpected input');
        }

        // reduce redundant groups with single group term
        if (result.terms.length === 1 && result.terms[0].type === 'Group') {
            result = result.terms[0];
        }

        return result;
    }

    // warm up parse to elimitate code branches that never execute
    // fix soft deoptimizations (insufficient type feedback)
    parse('[a&&<b>#|<\'c\'>*||e() f{2} /,(% g#{1,2} h{2,})]!');

    var parse_1 = parse;

    var noop$2 = function() {};

    function ensureFunction(value) {
        return typeof value === 'function' ? value : noop$2;
    }

    var walk$1 = function(node, options, context) {
        function walk(node) {
            enter.call(context, node);

            switch (node.type) {
                case 'Group':
                    node.terms.forEach(walk);
                    break;

                case 'Multiplier':
                    walk(node.term);
                    break;

                case 'Type':
                case 'Property':
                case 'Keyword':
                case 'AtKeyword':
                case 'Function':
                case 'String':
                case 'Token':
                case 'Comma':
                    break;

                default:
                    throw new Error('Unknown type: ' + node.type);
            }

            leave.call(context, node);
        }

        var enter = noop$2;
        var leave = noop$2;

        if (typeof options === 'function') {
            enter = options;
        } else if (options) {
            enter = ensureFunction(options.enter);
            leave = ensureFunction(options.leave);
        }

        if (enter === noop$2 && leave === noop$2) {
            throw new Error('Neither `enter` nor `leave` walker handler is set or both aren\'t a function');
        }

        walk(node, context);
    };

    var astToTokens = {
        decorator: function(handlers) {
            var curNode = null;
            var prev = null;
            var tokens = [];

            return {
                children: handlers.children,
                node: function(node) {
                    var tmp = curNode;
                    curNode = node;
                    handlers.node.call(this, node);
                    curNode = tmp;
                },
                chunk: function(chunk) {
                    if (tokens.length > 0) {
                        switch (curNode.type) {
                            case 'Dimension':
                            case 'HexColor':
                            case 'IdSelector':
                            case 'Percentage':
                                if (prev.node === curNode) {
                                    prev.value += chunk;
                                    return;
                                }
                                break;

                            case 'Function':
                            case 'PseudoClassSelector':
                            case 'PseudoElementSelector':
                            case 'Url':
                                if (chunk === '(') {
                                    prev.value += chunk;
                                    return;
                                }
                                break;

                            case 'Atrule':
                                if (prev.node === curNode && prev.value === '@') {
                                    prev.value += chunk;
                                    return;
                                }
                                break;
                        }
                    }

                    tokens.push(prev = {
                        value: chunk,
                        node: curNode
                    });
                },
                result: function() {
                    return tokens;
                }
            };
        }
    };

    var MATCH = { type: 'Match' };
    var MISMATCH = { type: 'Mismatch' };
    var DISALLOW_EMPTY = { type: 'DisallowEmpty' };
    var LEFTPARENTHESIS$2 = 40;  // (
    var RIGHTPARENTHESIS$2 = 41; // )

    function createCondition(match, thenBranch, elseBranch) {
        // reduce node count
        if (thenBranch === MATCH && elseBranch === MISMATCH) {
            return match;
        }

        if (match === MATCH && thenBranch === MATCH && elseBranch === MATCH) {
            return match;
        }

        if (match.type === 'If' && match.else === MISMATCH && thenBranch === MATCH) {
            thenBranch = match.then;
            match = match.match;
        }

        return {
            type: 'If',
            match: match,
            then: thenBranch,
            else: elseBranch
        };
    }

    function isFunctionType(name) {
        return (
            name.length > 2 &&
            name.charCodeAt(name.length - 2) === LEFTPARENTHESIS$2 &&
            name.charCodeAt(name.length - 1) === RIGHTPARENTHESIS$2
        );
    }

    function isEnumCapatible(term) {
        return (
            term.type === 'Keyword' ||
            term.type === 'AtKeyword' ||
            term.type === 'Function' ||
            term.type === 'Type' && isFunctionType(term.name)
        );
    }

    function buildGroupMatchGraph(combinator, terms, atLeastOneTermMatched) {
        switch (combinator) {
            case ' ':
                // Juxtaposing components means that all of them must occur, in the given order.
                //
                // a b c
                // =
                // match a
                //   then match b
                //     then match c
                //       then MATCH
                //       else MISMATCH
                //     else MISMATCH
                //   else MISMATCH
                var result = MATCH;

                for (var i = terms.length - 1; i >= 0; i--) {
                    var term = terms[i];

                    result = createCondition(
                        term,
                        result,
                        MISMATCH
                    );
                }
                return result;

            case '|':
                // A bar (|) separates two or more alternatives: exactly one of them must occur.
                //
                // a | b | c
                // =
                // match a
                //   then MATCH
                //   else match b
                //     then MATCH
                //     else match c
                //       then MATCH
                //       else MISMATCH

                var result = MISMATCH;
                var map = null;

                for (var i = terms.length - 1; i >= 0; i--) {
                    var term = terms[i];

                    // reduce sequence of keywords into a Enum
                    if (isEnumCapatible(term)) {
                        if (map === null && i > 0 && isEnumCapatible(terms[i - 1])) {
                            map = Object.create(null);
                            result = createCondition(
                                {
                                    type: 'Enum',
                                    map: map
                                },
                                MATCH,
                                result
                            );
                        }

                        if (map !== null) {
                            var key = (isFunctionType(term.name) ? term.name.slice(0, -1) : term.name).toLowerCase();
                            if (key in map === false) {
                                map[key] = term;
                                continue;
                            }
                        }
                    }

                    map = null;

                    // create a new conditonal node
                    result = createCondition(
                        term,
                        MATCH,
                        result
                    );
                }
                return result;

            case '&&':
                // A double ampersand (&&) separates two or more components,
                // all of which must occur, in any order.

                // Use MatchOnce for groups with a large number of terms,
                // since &&-groups produces at least N!-node trees
                if (terms.length > 5) {
                    return {
                        type: 'MatchOnce',
                        terms: terms,
                        all: true
                    };
                }

                // Use a combination tree for groups with small number of terms
                //
                // a && b && c
                // =
                // match a
                //   then [b && c]
                //   else match b
                //     then [a && c]
                //     else match c
                //       then [a && b]
                //       else MISMATCH
                //
                // a && b
                // =
                // match a
                //   then match b
                //     then MATCH
                //     else MISMATCH
                //   else match b
                //     then match a
                //       then MATCH
                //       else MISMATCH
                //     else MISMATCH
                var result = MISMATCH;

                for (var i = terms.length - 1; i >= 0; i--) {
                    var term = terms[i];
                    var thenClause;

                    if (terms.length > 1) {
                        thenClause = buildGroupMatchGraph(
                            combinator,
                            terms.filter(function(newGroupTerm) {
                                return newGroupTerm !== term;
                            }),
                            false
                        );
                    } else {
                        thenClause = MATCH;
                    }

                    result = createCondition(
                        term,
                        thenClause,
                        result
                    );
                }
                return result;

            case '||':
                // A double bar (||) separates two or more options:
                // one or more of them must occur, in any order.

                // Use MatchOnce for groups with a large number of terms,
                // since ||-groups produces at least N!-node trees
                if (terms.length > 5) {
                    return {
                        type: 'MatchOnce',
                        terms: terms,
                        all: false
                    };            }

                // Use a combination tree for groups with small number of terms
                //
                // a || b || c
                // =
                // match a
                //   then [b || c]
                //   else match b
                //     then [a || c]
                //     else match c
                //       then [a || b]
                //       else MISMATCH
                //
                // a || b
                // =
                // match a
                //   then match b
                //     then MATCH
                //     else MATCH
                //   else match b
                //     then match a
                //       then MATCH
                //       else MATCH
                //     else MISMATCH
                var result = atLeastOneTermMatched ? MATCH : MISMATCH;

                for (var i = terms.length - 1; i >= 0; i--) {
                    var term = terms[i];
                    var thenClause;

                    if (terms.length > 1) {
                        thenClause = buildGroupMatchGraph(
                            combinator,
                            terms.filter(function(newGroupTerm) {
                                return newGroupTerm !== term;
                            }),
                            true
                        );
                    } else {
                        thenClause = MATCH;
                    }

                    result = createCondition(
                        term,
                        thenClause,
                        result
                    );
                }
                return result;
        }
    }

    function buildMultiplierMatchGraph(node) {
        var result = MATCH;
        var matchTerm = buildMatchGraph(node.term);

        if (node.max === 0) {
            // disable repeating of empty match to prevent infinite loop
            matchTerm = createCondition(
                matchTerm,
                DISALLOW_EMPTY,
                MISMATCH
            );

            // an occurrence count is not limited, make a cycle;
            // to collect more terms on each following matching mismatch
            result = createCondition(
                matchTerm,
                null, // will be a loop
                MISMATCH
            );

            result.then = createCondition(
                MATCH,
                MATCH,
                result // make a loop
            );

            if (node.comma) {
                result.then.else = createCondition(
                    { type: 'Comma', syntax: node },
                    result,
                    MISMATCH
                );
            }
        } else {
            // create a match node chain for [min .. max] interval with optional matches
            for (var i = node.min || 1; i <= node.max; i++) {
                if (node.comma && result !== MATCH) {
                    result = createCondition(
                        { type: 'Comma', syntax: node },
                        result,
                        MISMATCH
                    );
                }

                result = createCondition(
                    matchTerm,
                    createCondition(
                        MATCH,
                        MATCH,
                        result
                    ),
                    MISMATCH
                );
            }
        }

        if (node.min === 0) {
            // allow zero match
            result = createCondition(
                MATCH,
                MATCH,
                result
            );
        } else {
            // create a match node chain to collect [0 ... min - 1] required matches
            for (var i = 0; i < node.min - 1; i++) {
                if (node.comma && result !== MATCH) {
                    result = createCondition(
                        { type: 'Comma', syntax: node },
                        result,
                        MISMATCH
                    );
                }

                result = createCondition(
                    matchTerm,
                    result,
                    MISMATCH
                );
            }
        }

        return result;
    }

    function buildMatchGraph(node) {
        if (typeof node === 'function') {
            return {
                type: 'Generic',
                fn: node
            };
        }

        switch (node.type) {
            case 'Group':
                var result = buildGroupMatchGraph(
                    node.combinator,
                    node.terms.map(buildMatchGraph),
                    false
                );

                if (node.disallowEmpty) {
                    result = createCondition(
                        result,
                        DISALLOW_EMPTY,
                        MISMATCH
                    );
                }

                return result;

            case 'Multiplier':
                return buildMultiplierMatchGraph(node);

            case 'Type':
            case 'Property':
                return {
                    type: node.type,
                    name: node.name,
                    syntax: node
                };

            case 'Keyword':
                return {
                    type: node.type,
                    name: node.name.toLowerCase(),
                    syntax: node
                };

            case 'AtKeyword':
                return {
                    type: node.type,
                    name: '@' + node.name.toLowerCase(),
                    syntax: node
                };

            case 'Function':
                return {
                    type: node.type,
                    name: node.name.toLowerCase() + '(',
                    syntax: node
                };

            case 'String':
                // convert a one char length String to a Token
                if (node.value.length === 3) {
                    return {
                        type: 'Token',
                        value: node.value.charAt(1),
                        syntax: node
                    };
                }

                // otherwise use it as is
                return {
                    type: node.type,
                    value: node.value,
                    syntax: node
                };

            case 'Token':
                return {
                    type: node.type,
                    value: node.value,
                    syntax: node
                };

            case 'Comma':
                return {
                    type: node.type,
                    syntax: node
                };

            default:
                throw new Error('Unknown node type:', node.type);
        }
    }

    var matchGraph = {
        MATCH: MATCH,
        MISMATCH: MISMATCH,
        DISALLOW_EMPTY: DISALLOW_EMPTY,
        buildMatchGraph: function(syntaxTree, ref) {
            if (typeof syntaxTree === 'string') {
                syntaxTree = parse_1(syntaxTree);
            }

            return {
                type: 'MatchGraph',
                match: buildMatchGraph(syntaxTree),
                syntax: ref || null,
                source: syntaxTree
            };
        }
    };

    var hasOwnProperty$1 = Object.prototype.hasOwnProperty;

    var MATCH$1 = matchGraph.MATCH;
    var MISMATCH$1 = matchGraph.MISMATCH;
    var DISALLOW_EMPTY$1 = matchGraph.DISALLOW_EMPTY;

    var TOKEN = 1;
    var OPEN_SYNTAX = 2;
    var CLOSE_SYNTAX = 3;

    var EXIT_REASON_MATCH = 'Match';
    var EXIT_REASON_MISMATCH = 'Mismatch';
    var EXIT_REASON_ITERATION_LIMIT = 'Maximum iteration number exceeded (please fill an issue on https://github.com/csstree/csstree/issues)';

    var ITERATION_LIMIT = 10000;
    var totalIterationCount = 0;

    function mapList(list, fn) {
        var result = [];

        while (list) {
            result.unshift(fn(list));
            list = list.prev;
        }

        return result;
    }

    function isCommaContextStart(token) {
        if (token === null) {
            return true;
        }

        token = token.value.charAt(token.value.length - 1);

        return (
            token === ',' ||
            token === '(' ||
            token === '[' ||
            token === '/'
        );
    }

    function isCommaContextEnd(token) {
        if (token === null) {
            return true;
        }

        token = token.value.charAt(0);

        return (
            token === ')' ||
            token === ']' ||
            token === '/'
        );
    }

    function internalMatch(tokens, syntax, syntaxes) {
        function moveToNextToken() {
            do {
                tokenCursor++;
                token = tokenCursor < tokens.length ? tokens[tokenCursor] : null;
            } while (token !== null && !/\S/.test(token.value));
        }

        function getNextToken(offset) {
            var nextIndex = tokenCursor + offset;

            return nextIndex < tokens.length ? tokens[nextIndex] : null;
        }

        function pushThenStack(nextSyntax) {
            thenStack = {
                nextSyntax: nextSyntax,
                matchStack: matchStack,
                syntaxStack: syntaxStack,
                prev: thenStack
            };
        }

        function pushElseStack(nextSyntax) {
            elseStack = {
                nextSyntax: nextSyntax,
                matchStack: matchStack,
                syntaxStack: syntaxStack,
                thenStack: thenStack,
                tokenCursor: tokenCursor,
                token: token,
                prev: elseStack
            };
        }

        function addTokenToMatch() {
            matchStack = {
                type: TOKEN,
                syntax: syntax.syntax,
                token: token,
                prev: matchStack
            };

            moveToNextToken();

            if (tokenCursor > longestMatch) {
                longestMatch = tokenCursor;
            }

            return matchStack.token;
        }

        function openSyntax() {
            syntaxStack = {
                syntax: syntax,
                prev: syntaxStack
            };

            matchStack = {
                type: OPEN_SYNTAX,
                syntax: syntax.syntax,
                token: matchStack.token,
                prev: matchStack
            };
        }

        function closeSyntax() {
            if (matchStack.type === OPEN_SYNTAX) {
                matchStack = matchStack.prev;
            } else {
                matchStack = {
                    type: CLOSE_SYNTAX,
                    syntax: syntaxStack.syntax,
                    token: matchStack.token,
                    prev: matchStack
                };
            }

            syntaxStack = syntaxStack.prev;
        }

        var syntaxStack = null;
        var thenStack = null;
        var elseStack = null;

        var iterationCount = 0;
        var exitReason = EXIT_REASON_MATCH;

        var matchStack = { type: 'Stub', syntax: null, token: null, tokenCursor: -1, prev: null };
        var longestMatch = 0;
        var tokenCursor = -1;
        var token = null;

        moveToNextToken();

        while (true) {
            // console.log('--\n',
            //     '#' + iterationCount,
            //     require('util').inspect({
            //         match: mapList(matchStack, x => x.type === TOKEN ? x.token && x.token.value : x.syntax ? x.type + '!' + x.syntax.name : null),
            //         elseStack: mapList(elseStack, x => x.id),
            //         thenStack: mapList(thenStack, x => x.id),
            //         token: token && token.value,
            //         tokenCursor,
            //         syntax
            //     }, { depth: null })
            // );

            // prevent infinite loop
            if (++iterationCount === ITERATION_LIMIT) {
                console.warn('[csstree-match] BREAK after ' + ITERATION_LIMIT + ' iterations');
                exitReason = EXIT_REASON_ITERATION_LIMIT;
                break;
            }

            if (syntax === MATCH$1) {
                if (thenStack === null) {
                    // turn to MISMATCH when some tokens left unmatched
                    if (token !== null) {
                        // doesn't mismatch if just one token left and it's an IE hack
                        if (tokenCursor !== tokens.length - 1 || (token.value !== '\\0' && token.value !== '\\9')) {
                            syntax = MISMATCH$1;
                            continue;
                        }
                    }

                    // break the main loop, return a result - MATCH
                    exitReason = EXIT_REASON_MATCH;
                    break;
                }

                // go to next syntax (`then` branch)
                syntax = thenStack.nextSyntax;

                // check match is not empty
                if (syntax === DISALLOW_EMPTY$1) {
                    if (thenStack.matchStack.token === matchStack.token) {
                        syntax = MISMATCH$1;
                        continue;
                    } else {
                        syntax = MATCH$1;
                    }
                }

                // close syntax if needed
                while (syntaxStack !== null && thenStack.syntaxStack !== syntaxStack) {
                    closeSyntax();
                }

                // pop stack
                thenStack = thenStack.prev;
                continue;
            }

            if (syntax === MISMATCH$1) {
                if (elseStack === null) {
                    // break the main loop, return a result - MISMATCH
                    exitReason = EXIT_REASON_MISMATCH;
                    break;
                }

                // go to next syntax (`else` branch)
                syntax = elseStack.nextSyntax;

                // restore all the rest stack states
                thenStack = elseStack.thenStack;
                syntaxStack = elseStack.syntaxStack;
                matchStack = elseStack.matchStack;
                tokenCursor = elseStack.tokenCursor;
                token = elseStack.token;

                // pop stack
                elseStack = elseStack.prev;
                continue;
            }

            switch (syntax.type) {
                case 'MatchGraph':
                    syntax = syntax.match;
                    break;

                case 'If':
                    // IMPORTANT: else stack push must go first,
                    // since it stores the state of thenStack before changes
                    if (syntax.else !== MISMATCH$1) {
                        pushElseStack(syntax.else);
                    }

                    if (syntax.then !== MATCH$1) {
                        pushThenStack(syntax.then);
                    }

                    syntax = syntax.match;
                    break;

                case 'MatchOnce':
                    syntax = {
                        type: 'MatchOnceBuffer',
                        terms: syntax.terms,
                        all: syntax.all,
                        matchStack: matchStack,
                        index: 0,
                        mask: 0
                    };
                    break;

                case 'MatchOnceBuffer':
                    if (syntax.index === syntax.terms.length) {
                        // if no matches during a cycle
                        if (syntax.matchStack === matchStack) {
                            // no matches at all or it's required all terms to be matched
                            if (syntax.mask === 0 || syntax.all) {
                                syntax = MISMATCH$1;
                                break;
                            }

                            // a partial match is ok
                            syntax = MATCH$1;
                            break;
                        } else {
                            // start trying to match from the start
                            syntax.index = 0;
                            syntax.matchStack = matchStack;
                        }
                    }

                    for (; syntax.index < syntax.terms.length; syntax.index++) {
                        if ((syntax.mask & (1 << syntax.index)) === 0) {
                            // IMPORTANT: else stack push must go first,
                            // since it stores the state of thenStack before changes
                            pushElseStack(syntax);
                            pushThenStack({
                                type: 'AddMatchOnce',
                                buffer: syntax
                            });

                            // match
                            syntax = syntax.terms[syntax.index++];
                            break;
                        }
                    }
                    break;

                case 'AddMatchOnce':
                    syntax = syntax.buffer;

                    var newMask = syntax.mask | (1 << (syntax.index - 1));

                    // all terms are matched
                    if (newMask === (1 << syntax.terms.length) - 1) {
                        syntax = MATCH$1;
                        continue;
                    }

                    syntax = {
                        type: 'MatchOnceBuffer',
                        terms: syntax.terms,
                        all: syntax.all,
                        matchStack: syntax.matchStack,
                        index: syntax.index,
                        mask: newMask
                    };

                    break;

                case 'Enum':
                    var name = token !== null ? token.value.toLowerCase() : '';

                    // drop \0 and \9 hack from keyword name
                    if (name.indexOf('\\') !== -1) {
                        name = name.replace(/\\[09].*$/, '');
                    }

                    if (hasOwnProperty$1.call(syntax.map, name)) {
                        syntax = syntax.map[name];
                    } else {
                        syntax = MISMATCH$1;
                    }

                    break;

                case 'Generic':
                    syntax = syntax.fn(token, addTokenToMatch, getNextToken) ? MATCH$1 : MISMATCH$1;
                    break;

                case 'Type':
                case 'Property':
                    openSyntax();

                    var syntaxDict = syntax.type === 'Type' ? 'types' : 'properties';

                    if (hasOwnProperty$1.call(syntaxes, syntaxDict) && syntaxes[syntaxDict][syntax.name]) {
                        syntax = syntaxes[syntaxDict][syntax.name].match;
                    } else {
                        syntax = undefined;
                    }

                    if (!syntax) {
                        throw new Error(
                            'Bad syntax reference: ' +
                            (syntaxStack.syntax.type === 'Type'
                                ? '<' + syntaxStack.syntax.name + '>'
                                : '<\'' + syntaxStack.syntax.name + '\'>')
                        );
                    }

                    break;

                case 'Keyword':
                    var name = syntax.name;

                    if (token !== null) {
                        var keywordName = token.value;

                        // drop \0 and \9 hack from keyword name
                        if (keywordName.indexOf('\\') !== -1) {
                            keywordName = keywordName.replace(/\\[09].*$/, '');
                        }

                        if (keywordName.toLowerCase() === name) {
                            addTokenToMatch();

                            syntax = MATCH$1;
                            break;
                        }
                    }

                    syntax = MISMATCH$1;
                    break;

                case 'AtKeyword':
                case 'Function':
                    if (token !== null && token.value.toLowerCase() === syntax.name) {
                        addTokenToMatch();

                        syntax = MATCH$1;
                        break;
                    }

                    syntax = MISMATCH$1;
                    break;

                case 'Token':
                    if (token !== null && token.value === syntax.value) {
                        addTokenToMatch();

                        syntax = MATCH$1;
                        break;
                    }

                    syntax = MISMATCH$1;
                    break;

                case 'Comma':
                    if (token !== null && token.value === ',') {
                        if (isCommaContextStart(matchStack.token)) {
                            syntax = MISMATCH$1;
                        } else {
                            addTokenToMatch();
                            syntax = isCommaContextEnd(token) ? MISMATCH$1 : MATCH$1;
                        }
                    } else {
                        syntax = isCommaContextStart(matchStack.token) || isCommaContextEnd(token) ? MATCH$1 : MISMATCH$1;
                    }

                    break;

                // case 'String':
                // TODO: strings with length other than 1 char

                default:
                    throw new Error('Unknown node type: ' + syntax.type);
            }
        }

        totalIterationCount += iterationCount;

        if (exitReason === EXIT_REASON_MATCH) {
            while (syntaxStack !== null) {
                closeSyntax();
            }
        } else {
            matchStack = null;
        }

        return {
            tokens: tokens,
            reason: exitReason,
            iterations: iterationCount,
            match: matchStack,
            longestMatch: longestMatch
        };
    }

    function matchAsList(tokens, matchGraph$$1, syntaxes) {
        var matchResult = internalMatch(tokens, matchGraph$$1, syntaxes || {});

        if (matchResult.match !== null) {
            matchResult.match = mapList(matchResult.match, function(item) {
                if (item.type === OPEN_SYNTAX || item.type === CLOSE_SYNTAX) {
                    return { type: item.type, syntax: item.syntax };
                }

                return {
                    syntax: item.syntax,
                    token: item.token && item.token.value,
                    node: item.token && item.token.node
                };
            }).slice(1);
        }

        return matchResult;
    }

    function matchAsTree(tokens, matchGraph$$1, syntaxes) {
        var matchResult = internalMatch(tokens, matchGraph$$1, syntaxes || {});

        if (matchResult.match === null) {
            return matchResult;
        }

        var cursor = matchResult.match;
        var host = matchResult.match = {
            syntax: matchGraph$$1.syntax || null,
            match: []
        };
        var stack = [host];

        // revert a list
        var prev = null;
        var next = null;
        while (cursor !== null) {
            next = cursor.prev;
            cursor.prev = prev;
            prev = cursor;
            cursor = next;
        }

        // init the cursor to start with 2nd item since 1st is a stub item
        cursor = prev.prev;

        // build a tree
        while (cursor !== null && cursor.syntax !== null) {
            var entry = cursor;

            switch (entry.type) {
                case OPEN_SYNTAX:
                    host.match.push(host = {
                        syntax: entry.syntax,
                        match: []
                    });
                    stack.push(host);
                    break;

                case CLOSE_SYNTAX:
                    stack.pop();
                    host = stack[stack.length - 1];
                    break;

                default:
                    host.match.push({
                        syntax: entry.syntax || null,
                        token: entry.token.value,
                        node: entry.token.node
                    });
            }

            cursor = cursor.prev;
        }

        return matchResult;
    }

    var match = {
        matchAsList: matchAsList,
        matchAsTree: matchAsTree,
        getTotalIterationCount: function() {
            return totalIterationCount;
        }
    };

    function getTrace(node) {
        function shouldPutToTrace(syntax) {
            if (syntax === null) {
                return false;
            }

            return (
                syntax.type === 'Type' ||
                syntax.type === 'Property' ||
                syntax.type === 'Keyword'
            );
        }

        function hasMatch(matchNode) {
            if (Array.isArray(matchNode.match)) {
                // use for-loop for better perfomance
                for (var i = 0; i < matchNode.match.length; i++) {
                    if (hasMatch(matchNode.match[i])) {
                        if (shouldPutToTrace(matchNode.syntax)) {
                            result.unshift(matchNode.syntax);
                        }

                        return true;
                    }
                }
            } else if (matchNode.node === node) {
                result = shouldPutToTrace(matchNode.syntax)
                    ? [matchNode.syntax]
                    : [];

                return true;
            }

            return false;
        }

        var result = null;

        if (this.matched !== null) {
            hasMatch(this.matched);
        }

        return result;
    }

    function testNode(match, node, fn) {
        var trace = getTrace.call(match, node);

        if (trace === null) {
            return false;
        }

        return trace.some(fn);
    }

    function isType(node, type) {
        return testNode(this, node, function(matchNode) {
            return matchNode.type === 'Type' && matchNode.name === type;
        });
    }

    function isProperty(node, property) {
        return testNode(this, node, function(matchNode) {
            return matchNode.type === 'Property' && matchNode.name === property;
        });
    }

    function isKeyword(node) {
        return testNode(this, node, function(matchNode) {
            return matchNode.type === 'Keyword';
        });
    }

    var trace = {
        getTrace: getTrace,
        isType: isType,
        isProperty: isProperty,
        isKeyword: isKeyword
    };

    function getFirstMatchNode(matchNode) {
        if ('node' in matchNode) {
            return matchNode.node;
        }

        return getFirstMatchNode(matchNode.match[0]);
    }

    function getLastMatchNode(matchNode) {
        if ('node' in matchNode) {
            return matchNode.node;
        }

        return getLastMatchNode(matchNode.match[matchNode.match.length - 1]);
    }

    function matchFragments(lexer, ast, match, type, name) {
        function findFragments(matchNode) {
            if (matchNode.syntax !== null &&
                matchNode.syntax.type === type &&
                matchNode.syntax.name === name) {
                var start = getFirstMatchNode(matchNode);
                var end = getLastMatchNode(matchNode);

                lexer.syntax.walk(ast, function(node, item, list$$1) {
                    if (node === start) {
                        var nodes = new list();

                        do {
                            nodes.appendData(item.data);

                            if (item.data === end) {
                                break;
                            }

                            item = item.next;
                        } while (item !== null);

                        fragments.push({
                            parent: list$$1,
                            nodes: nodes
                        });
                    }
                });
            }

            if (Array.isArray(matchNode.match)) {
                matchNode.match.forEach(findFragments);
            }
        }

        var fragments = [];

        if (match.matched !== null) {
            findFragments(match.matched);
        }

        return fragments;
    }

    var search = {
        matchFragments: matchFragments
    };

    var hasOwnProperty$2 = Object.prototype.hasOwnProperty;

    function isValidNumber(value) {
        // Number.isInteger(value) && value >= 0
        return (
            typeof value === 'number' &&
            isFinite(value) &&
            Math.floor(value) === value &&
            value >= 0
        );
    }

    function isValidLocation(loc) {
        return (
            Boolean(loc) &&
            isValidNumber(loc.offset) &&
            isValidNumber(loc.line) &&
            isValidNumber(loc.column)
        );
    }

    function createNodeStructureChecker(type, fields) {
        return function checkNode(node, warn) {
            if (!node || node.constructor !== Object) {
                return warn(node, 'Type of node should be an Object');
            }

            for (var key in node) {
                var valid = true;

                if (hasOwnProperty$2.call(node, key) === false) {
                    continue;
                }

                if (key === 'type') {
                    if (node.type !== type) {
                        warn(node, 'Wrong node type `' + node.type + '`, expected `' + type + '`');
                    }
                } else if (key === 'loc') {
                    if (node.loc === null) {
                        continue;
                    } else if (node.loc && node.loc.constructor === Object) {
                        if (typeof node.loc.source !== 'string') {
                            key += '.source';
                        } else if (!isValidLocation(node.loc.start)) {
                            key += '.start';
                        } else if (!isValidLocation(node.loc.end)) {
                            key += '.end';
                        } else {
                            continue;
                        }
                    }

                    valid = false;
                } else if (fields.hasOwnProperty(key)) {
                    for (var i = 0, valid = false; !valid && i < fields[key].length; i++) {
                        var fieldType = fields[key][i];

                        switch (fieldType) {
                            case String:
                                valid = typeof node[key] === 'string';
                                break;

                            case Boolean:
                                valid = typeof node[key] === 'boolean';
                                break;

                            case null:
                                valid = node[key] === null;
                                break;

                            default:
                                if (typeof fieldType === 'string') {
                                    valid = node[key] && node[key].type === fieldType;
                                } else if (Array.isArray(fieldType)) {
                                    valid = node[key] instanceof list;
                                }
                        }
                    }
                } else {
                    warn(node, 'Unknown field `' + key + '` for ' + type + ' node type');
                }

                if (!valid) {
                    warn(node, 'Bad value for `' + type + '.' + key + '`');
                }
            }

            for (var key in fields) {
                if (hasOwnProperty$2.call(fields, key) &&
                    hasOwnProperty$2.call(node, key) === false) {
                    warn(node, 'Field `' + type + '.' + key + '` is missed');
                }
            }
        };
    }

    function processStructure(name, nodeType) {
        var structure = nodeType.structure;
        var fields = {
            type: String,
            loc: true
        };
        var docs = {
            type: '"' + name + '"'
        };

        for (var key in structure) {
            if (hasOwnProperty$2.call(structure, key) === false) {
                continue;
            }

            var docsTypes = [];
            var fieldTypes = fields[key] = Array.isArray(structure[key])
                ? structure[key].slice()
                : [structure[key]];

            for (var i = 0; i < fieldTypes.length; i++) {
                var fieldType = fieldTypes[i];
                if (fieldType === String || fieldType === Boolean) {
                    docsTypes.push(fieldType.name);
                } else if (fieldType === null) {
                    docsTypes.push('null');
                } else if (typeof fieldType === 'string') {
                    docsTypes.push('<' + fieldType + '>');
                } else if (Array.isArray(fieldType)) {
                    docsTypes.push('List'); // TODO: use type enum
                } else {
                    throw new Error('Wrong value `' + fieldType + '` in `' + name + '.' + key + '` structure definition');
                }
            }

            docs[key] = docsTypes.join(' | ');
        }

        return {
            docs: docs,
            check: createNodeStructureChecker(name, fields)
        };
    }

    var structure = {
        getStructureFromConfig: function(config) {
            var structure = {};

            if (config.node) {
                for (var name in config.node) {
                    if (hasOwnProperty$2.call(config.node, name)) {
                        var nodeType = config.node[name];

                        if (nodeType.structure) {
                            structure[name] = processStructure(name, nodeType);
                        } else {
                            throw new Error('Missed `structure` field in `' + name + '` node type definition');
                        }
                    }
                }
            }

            return structure;
        }
    };

    var SyntaxReferenceError$1 = error$1.SyntaxReferenceError;
    var MatchError$1 = error$1.MatchError;






    var buildMatchGraph$1 = matchGraph.buildMatchGraph;
    var matchAsTree$1 = match.matchAsTree;


    var getStructureFromConfig = structure.getStructureFromConfig;
    var cssWideKeywords = buildMatchGraph$1(parse_1('inherit | initial | unset'));
    var cssWideKeywordsWithExpression = buildMatchGraph$1(parse_1('inherit | initial | unset | <expression>'));

    function dumpMapSyntax(map, syntaxAsAst) {
        var result = {};

        for (var name in map) {
            if (map[name].syntax) {
                result[name] = syntaxAsAst ? map[name].syntax : generate_1(map[name].syntax);
            }
        }

        return result;
    }

    function valueHasVar(value) {
        var hasVar = false;

        this.syntax.walk(value, function(node) {
            if (node.type === 'Function' && node.name.toLowerCase() === 'var') {
                hasVar = true;
            }
        });

        return hasVar;
    }

    function buildMatchResult(match$$1, error, iterations) {
        return {
            matched: match$$1,
            iterations: iterations,
            error: error,
            getTrace: trace.getTrace,
            isType: trace.isType,
            isProperty: trace.isProperty,
            isKeyword: trace.isKeyword
        };
    }

    function matchSyntax(lexer, syntax, node, useCommon) {
        if (!node) {
            return buildMatchResult(null, new Error('Node is undefined'));
        }

        if (valueHasVar.call(lexer, node)) {
            return buildMatchResult(null, new Error('Matching for a tree with var() is not supported'));
        }

        var tokens = lexer.syntax.generate(node, astToTokens);
        var result;

        if (useCommon) {
            result = matchAsTree$1(tokens, lexer.valueCommonSyntax, lexer);
        }

        if (!useCommon || !result.match) {
            result = matchAsTree$1(tokens, syntax.match, lexer);
            if (!result.match) {
                return buildMatchResult(
                    null,
                    new MatchError$1(result.reason, lexer, syntax.syntax, node, result),
                    result.iterations
                );
            }
        }

        return buildMatchResult(result.match, null, result.iterations);
    }

    var Lexer = function(config, syntax, structure$$1) {
        this.valueCommonSyntax = cssWideKeywords;
        this.syntax = syntax;
        this.generic = false;
        this.properties = {};
        this.types = {};
        this.structure = structure$$1 || getStructureFromConfig(config);

        if (config) {
            if (config.generic) {
                this.generic = true;
                for (var name in generic) {
                    this.addType_(name, generic[name]);
                }
            }

            if (config.types) {
                for (var name in config.types) {
                    this.addType_(name, config.types[name]);
                }
            }

            if (config.properties) {
                for (var name in config.properties) {
                    this.addProperty_(name, config.properties[name]);
                }
            }
        }
    };

    Lexer.prototype = {
        structure: {},
        checkStructure: function(ast) {
            function collectWarning(node, message) {
                warns.push({
                    node: node,
                    message: message
                });
            }

            var structure$$1 = this.structure;
            var warns = [];

            this.syntax.walk(ast, function(node) {
                if (structure$$1.hasOwnProperty(node.type)) {
                    structure$$1[node.type].check(node, collectWarning);
                } else {
                    collectWarning(node, 'Unknown node type `' + node.type + '`');
                }
            });

            return warns.length ? warns : false;
        },

        createDescriptor: function(syntax, type, name) {
            var ref = {
                type: type,
                name: name
            };
            var descriptor = {
                type: type,
                name: name,
                syntax: null,
                match: null
            };

            if (typeof syntax === 'function') {
                descriptor.match = buildMatchGraph$1(syntax, ref);
            } else {
                if (typeof syntax === 'string') {
                    // lazy parsing on first access
                    Object.defineProperty(descriptor, 'syntax', {
                        get: function() {
                            Object.defineProperty(descriptor, 'syntax', {
                                value: parse_1(syntax)
                            });

                            return descriptor.syntax;
                        }
                    });
                } else {
                    descriptor.syntax = syntax;
                }

                Object.defineProperty(descriptor, 'match', {
                    get: function() {
                        Object.defineProperty(descriptor, 'match', {
                            value: buildMatchGraph$1(descriptor.syntax, ref)
                        });

                        return descriptor.match;
                    }
                });
            }

            return descriptor;
        },
        addProperty_: function(name, syntax) {
            this.properties[name] = this.createDescriptor(syntax, 'Property', name);
        },
        addType_: function(name, syntax) {
            this.types[name] = this.createDescriptor(syntax, 'Type', name);

            if (syntax === generic.expression) {
                this.valueCommonSyntax = cssWideKeywordsWithExpression;
            }
        },

        matchDeclaration: function(node) {
            if (node.type !== 'Declaration') {
                return buildMatchResult(null, new Error('Not a Declaration node'));
            }

            return this.matchProperty(node.property, node.value);
        },
        matchProperty: function(propertyName, value) {
            var property = names.property(propertyName);

            // don't match syntax for a custom property
            if (property.custom) {
                return buildMatchResult(null, new Error('Lexer matching doesn\'t applicable for custom properties'));
            }

            var propertySyntax = property.vendor
                ? this.getProperty(property.name) || this.getProperty(property.basename)
                : this.getProperty(property.name);

            if (!propertySyntax) {
                return buildMatchResult(null, new SyntaxReferenceError$1('Unknown property', propertyName));
            }

            return matchSyntax(this, propertySyntax, value, true);
        },
        matchType: function(typeName, value) {
            var typeSyntax = this.getType(typeName);

            if (!typeSyntax) {
                return buildMatchResult(null, new SyntaxReferenceError$1('Unknown type', typeName));
            }

            return matchSyntax(this, typeSyntax, value, false);
        },
        match: function(syntax, value) {
            if (!syntax || !syntax.type) {
                return buildMatchResult(null, new SyntaxReferenceError$1('Bad syntax'));
            }

            if (!syntax.match) {
                syntax = this.createDescriptor(syntax);
            }

            return matchSyntax(this, syntax, value, false);
        },

        findValueFragments: function(propertyName, value, type, name) {
            return search.matchFragments(this, value, this.matchProperty(propertyName, value), type, name);
        },
        findDeclarationValueFragments: function(declaration, type, name) {
            return search.matchFragments(this, declaration.value, this.matchDeclaration(declaration), type, name);
        },
        findAllFragments: function(ast, type, name) {
            var result = [];

            this.syntax.walk(ast, {
                visit: 'Declaration',
                enter: function(declaration) {
                    result.push.apply(result, this.findDeclarationValueFragments(declaration, type, name));
                }.bind(this)
            });

            return result;
        },

        getProperty: function(name) {
            return this.properties.hasOwnProperty(name) ? this.properties[name] : null;
        },
        getType: function(name) {
            return this.types.hasOwnProperty(name) ? this.types[name] : null;
        },

        validate: function() {
            function validate(syntax, name, broken, descriptor) {
                if (broken.hasOwnProperty(name)) {
                    return broken[name];
                }

                broken[name] = false;
                if (descriptor.syntax !== null) {
                    walk$1(descriptor.syntax, function(node) {
                        if (node.type !== 'Type' && node.type !== 'Property') {
                            return;
                        }

                        var map = node.type === 'Type' ? syntax.types : syntax.properties;
                        var brokenMap = node.type === 'Type' ? brokenTypes : brokenProperties;

                        if (!map.hasOwnProperty(node.name) || validate(syntax, node.name, brokenMap, map[node.name])) {
                            broken[name] = true;
                        }
                    }, this);
                }
            }

            var brokenTypes = {};
            var brokenProperties = {};

            for (var key in this.types) {
                validate(this, key, brokenTypes, this.types[key]);
            }

            for (var key in this.properties) {
                validate(this, key, brokenProperties, this.properties[key]);
            }

            brokenTypes = Object.keys(brokenTypes).filter(function(name) {
                return brokenTypes[name];
            });
            brokenProperties = Object.keys(brokenProperties).filter(function(name) {
                return brokenProperties[name];
            });

            if (brokenTypes.length || brokenProperties.length) {
                return {
                    types: brokenTypes,
                    properties: brokenProperties
                };
            }

            return null;
        },
        dump: function(syntaxAsAst) {
            return {
                generic: this.generic,
                types: dumpMapSyntax(this.types, syntaxAsAst),
                properties: dumpMapSyntax(this.properties, syntaxAsAst)
            };
        },
        toString: function() {
            return JSON.stringify(this.dump());
        }
    };

    var Lexer_1 = Lexer;

    var grammar = {
        SyntaxParseError: error$2.SyntaxParseError,
        parse: parse_1,
        generate: generate_1,
        walk: walk$1
    };

    var TYPE$3 = tokenizer.TYPE;
    var WHITESPACE$2 = TYPE$3.WhiteSpace;
    var COMMENT$2 = TYPE$3.Comment;

    var sequence = function readSequence(recognizer) {
        var children = this.createList();
        var child = null;
        var context = {
            recognizer: recognizer,
            space: null,
            ignoreWS: false,
            ignoreWSAfter: false
        };

        this.scanner.skipSC();

        while (!this.scanner.eof) {
            switch (this.scanner.tokenType) {
                case COMMENT$2:
                    this.scanner.next();
                    continue;

                case WHITESPACE$2:
                    if (context.ignoreWS) {
                        this.scanner.next();
                    } else {
                        context.space = this.WhiteSpace();
                    }
                    continue;
            }

            child = recognizer.getNode.call(this, context);

            if (child === undefined) {
                break;
            }

            if (context.space !== null) {
                children.push(context.space);
                context.space = null;
            }

            children.push(child);

            if (context.ignoreWSAfter) {
                context.ignoreWSAfter = false;
                context.ignoreWS = true;
            } else {
                context.ignoreWS = false;
            }
        }

        return children;
    };

    var noop$3 = function() {};

    function createParseContext(name) {
        return function() {
            return this[name]();
        };
    }

    function processConfig(config) {
        var parserConfig = {
            context: {},
            scope: {},
            atrule: {},
            pseudo: {}
        };

        if (config.parseContext) {
            for (var name in config.parseContext) {
                switch (typeof config.parseContext[name]) {
                    case 'function':
                        parserConfig.context[name] = config.parseContext[name];
                        break;

                    case 'string':
                        parserConfig.context[name] = createParseContext(config.parseContext[name]);
                        break;
                }
            }
        }

        if (config.scope) {
            for (var name in config.scope) {
                parserConfig.scope[name] = config.scope[name];
            }
        }

        if (config.atrule) {
            for (var name in config.atrule) {
                var atrule = config.atrule[name];

                if (atrule.parse) {
                    parserConfig.atrule[name] = atrule.parse;
                }
            }
        }

        if (config.pseudo) {
            for (var name in config.pseudo) {
                var pseudo = config.pseudo[name];

                if (pseudo.parse) {
                    parserConfig.pseudo[name] = pseudo.parse;
                }
            }
        }

        if (config.node) {
            for (var name in config.node) {
                parserConfig[name] = config.node[name].parse;
            }
        }

        return parserConfig;
    }

    var create$1 = function createParser(config) {
        var parser = {
            scanner: new tokenizer(),
            filename: '<unknown>',
            needPositions: false,
            onParseError: noop$3,
            onParseErrorThrow: false,
            parseAtrulePrelude: true,
            parseRulePrelude: true,
            parseValue: true,
            parseCustomProperty: false,

            readSequence: sequence,

            createList: function() {
                return new list();
            },
            createSingleNodeList: function(node) {
                return new list().appendData(node);
            },
            getFirstListNode: function(list$$1) {
                return list$$1 && list$$1.first();
            },
            getLastListNode: function(list$$1) {
                return list$$1.last();
            },

            parseWithFallback: function(consumer, fallback) {
                var startToken = this.scanner.currentToken;

                try {
                    return consumer.call(this);
                } catch (e) {
                    if (this.onParseErrorThrow) {
                        throw e;
                    }

                    var fallbackNode = fallback.call(this, startToken);

                    this.onParseErrorThrow = true;
                    this.onParseError(e, fallbackNode);
                    this.onParseErrorThrow = false;

                    return fallbackNode;
                }
            },

            getLocation: function(start, end) {
                if (this.needPositions) {
                    return this.scanner.getLocationRange(
                        start,
                        end,
                        this.filename
                    );
                }

                return null;
            },
            getLocationFromList: function(list$$1) {
                if (this.needPositions) {
                    var head = this.getFirstListNode(list$$1);
                    var tail = this.getLastListNode(list$$1);
                    return this.scanner.getLocationRange(
                        head !== null ? head.loc.start.offset - this.scanner.startOffset : this.scanner.tokenStart,
                        tail !== null ? tail.loc.end.offset - this.scanner.startOffset : this.scanner.tokenStart,
                        this.filename
                    );
                }

                return null;
            }
        };

        config = processConfig(config || {});
        for (var key in config) {
            parser[key] = config[key];
        }

        return function(source, options) {
            options = options || {};

            var context = options.context || 'default';
            var ast;

            parser.scanner.setSource(source, options.offset, options.line, options.column);
            parser.filename = options.filename || '<unknown>';
            parser.needPositions = Boolean(options.positions);
            parser.onParseError = typeof options.onParseError === 'function' ? options.onParseError : noop$3;
            parser.onParseErrorThrow = false;
            parser.parseAtrulePrelude = 'parseAtrulePrelude' in options ? Boolean(options.parseAtrulePrelude) : true;
            parser.parseRulePrelude = 'parseRulePrelude' in options ? Boolean(options.parseRulePrelude) : true;
            parser.parseValue = 'parseValue' in options ? Boolean(options.parseValue) : true;
            parser.parseCustomProperty = 'parseCustomProperty' in options ? Boolean(options.parseCustomProperty) : false;

            if (!parser.context.hasOwnProperty(context)) {
                throw new Error('Unknown context `' + context + '`');
            }

            ast = parser.context[context].call(parser, options);

            if (!parser.scanner.eof) {
                parser.scanner.error();
            }

            return ast;
        };
    };

    /* -*- Mode: js; js-indent-level: 2; -*- */
    /*
     * Copyright 2011 Mozilla Foundation and contributors
     * Licensed under the New BSD license. See LICENSE or:
     * http://opensource.org/licenses/BSD-3-Clause
     */

    var intToCharMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');

    /**
     * Encode an integer in the range of 0 to 63 to a single base 64 digit.
     */
    var encode = function (number) {
      if (0 <= number && number < intToCharMap.length) {
        return intToCharMap[number];
      }
      throw new TypeError("Must be between 0 and 63: " + number);
    };

    /**
     * Decode a single base 64 character code digit to an integer. Returns -1 on
     * failure.
     */
    var decode = function (charCode) {
      var bigA = 65;     // 'A'
      var bigZ = 90;     // 'Z'

      var littleA = 97;  // 'a'
      var littleZ = 122; // 'z'

      var zero = 48;     // '0'
      var nine = 57;     // '9'

      var plus = 43;     // '+'
      var slash = 47;    // '/'

      var littleOffset = 26;
      var numberOffset = 52;

      // 0 - 25: ABCDEFGHIJKLMNOPQRSTUVWXYZ
      if (bigA <= charCode && charCode <= bigZ) {
        return (charCode - bigA);
      }

      // 26 - 51: abcdefghijklmnopqrstuvwxyz
      if (littleA <= charCode && charCode <= littleZ) {
        return (charCode - littleA + littleOffset);
      }

      // 52 - 61: 0123456789
      if (zero <= charCode && charCode <= nine) {
        return (charCode - zero + numberOffset);
      }

      // 62: +
      if (charCode == plus) {
        return 62;
      }

      // 63: /
      if (charCode == slash) {
        return 63;
      }

      // Invalid base64 digit.
      return -1;
    };

    var base64 = {
        encode: encode,
        decode: decode
    };

    /* -*- Mode: js; js-indent-level: 2; -*- */
    /*
     * Copyright 2011 Mozilla Foundation and contributors
     * Licensed under the New BSD license. See LICENSE or:
     * http://opensource.org/licenses/BSD-3-Clause
     *
     * Based on the Base 64 VLQ implementation in Closure Compiler:
     * https://code.google.com/p/closure-compiler/source/browse/trunk/src/com/google/debugging/sourcemap/Base64VLQ.java
     *
     * Copyright 2011 The Closure Compiler Authors. All rights reserved.
     * Redistribution and use in source and binary forms, with or without
     * modification, are permitted provided that the following conditions are
     * met:
     *
     *  * Redistributions of source code must retain the above copyright
     *    notice, this list of conditions and the following disclaimer.
     *  * Redistributions in binary form must reproduce the above
     *    copyright notice, this list of conditions and the following
     *    disclaimer in the documentation and/or other materials provided
     *    with the distribution.
     *  * Neither the name of Google Inc. nor the names of its
     *    contributors may be used to endorse or promote products derived
     *    from this software without specific prior written permission.
     *
     * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
     * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
     * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
     * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
     * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
     * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
     * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
     * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
     * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
     * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
     * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
     */



    // A single base 64 digit can contain 6 bits of data. For the base 64 variable
    // length quantities we use in the source map spec, the first bit is the sign,
    // the next four bits are the actual value, and the 6th bit is the
    // continuation bit. The continuation bit tells us whether there are more
    // digits in this value following this digit.
    //
    //   Continuation
    //   |    Sign
    //   |    |
    //   V    V
    //   101011

    var VLQ_BASE_SHIFT = 5;

    // binary: 100000
    var VLQ_BASE = 1 << VLQ_BASE_SHIFT;

    // binary: 011111
    var VLQ_BASE_MASK = VLQ_BASE - 1;

    // binary: 100000
    var VLQ_CONTINUATION_BIT = VLQ_BASE;

    /**
     * Converts from a two-complement value to a value where the sign bit is
     * placed in the least significant bit.  For example, as decimals:
     *   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
     *   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
     */
    function toVLQSigned(aValue) {
      return aValue < 0
        ? ((-aValue) << 1) + 1
        : (aValue << 1) + 0;
    }

    /**
     * Converts to a two-complement value from a value where the sign bit is
     * placed in the least significant bit.  For example, as decimals:
     *   2 (10 binary) becomes 1, 3 (11 binary) becomes -1
     *   4 (100 binary) becomes 2, 5 (101 binary) becomes -2
     */
    function fromVLQSigned(aValue) {
      var isNegative = (aValue & 1) === 1;
      var shifted = aValue >> 1;
      return isNegative
        ? -shifted
        : shifted;
    }

    /**
     * Returns the base 64 VLQ encoded value.
     */
    var encode$1 = function base64VLQ_encode(aValue) {
      var encoded = "";
      var digit;

      var vlq = toVLQSigned(aValue);

      do {
        digit = vlq & VLQ_BASE_MASK;
        vlq >>>= VLQ_BASE_SHIFT;
        if (vlq > 0) {
          // There are still more digits in this value, so we must make sure the
          // continuation bit is marked.
          digit |= VLQ_CONTINUATION_BIT;
        }
        encoded += base64.encode(digit);
      } while (vlq > 0);

      return encoded;
    };

    /**
     * Decodes the next base 64 VLQ value from the given string and returns the
     * value and the rest of the string via the out parameter.
     */
    var decode$1 = function base64VLQ_decode(aStr, aIndex, aOutParam) {
      var strLen = aStr.length;
      var result = 0;
      var shift = 0;
      var continuation, digit;

      do {
        if (aIndex >= strLen) {
          throw new Error("Expected more digits in base 64 VLQ value.");
        }

        digit = base64.decode(aStr.charCodeAt(aIndex++));
        if (digit === -1) {
          throw new Error("Invalid base64 digit: " + aStr.charAt(aIndex - 1));
        }

        continuation = !!(digit & VLQ_CONTINUATION_BIT);
        digit &= VLQ_BASE_MASK;
        result = result + (digit << shift);
        shift += VLQ_BASE_SHIFT;
      } while (continuation);

      aOutParam.value = fromVLQSigned(result);
      aOutParam.rest = aIndex;
    };

    var base64Vlq = {
        encode: encode$1,
        decode: decode$1
    };

    var util = createCommonjsModule(function (module, exports) {
    /* -*- Mode: js; js-indent-level: 2; -*- */
    /*
     * Copyright 2011 Mozilla Foundation and contributors
     * Licensed under the New BSD license. See LICENSE or:
     * http://opensource.org/licenses/BSD-3-Clause
     */

    /**
     * This is a helper function for getting values from parameter/options
     * objects.
     *
     * @param args The object we are extracting values from
     * @param name The name of the property we are getting.
     * @param defaultValue An optional value to return if the property is missing
     * from the object. If this is not specified and the property is missing, an
     * error will be thrown.
     */
    function getArg(aArgs, aName, aDefaultValue) {
      if (aName in aArgs) {
        return aArgs[aName];
      } else if (arguments.length === 3) {
        return aDefaultValue;
      } else {
        throw new Error('"' + aName + '" is a required argument.');
      }
    }
    exports.getArg = getArg;

    var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.]*)(?::(\d+))?(\S*)$/;
    var dataUrlRegexp = /^data:.+\,.+$/;

    function urlParse(aUrl) {
      var match = aUrl.match(urlRegexp);
      if (!match) {
        return null;
      }
      return {
        scheme: match[1],
        auth: match[2],
        host: match[3],
        port: match[4],
        path: match[5]
      };
    }
    exports.urlParse = urlParse;

    function urlGenerate(aParsedUrl) {
      var url = '';
      if (aParsedUrl.scheme) {
        url += aParsedUrl.scheme + ':';
      }
      url += '//';
      if (aParsedUrl.auth) {
        url += aParsedUrl.auth + '@';
      }
      if (aParsedUrl.host) {
        url += aParsedUrl.host;
      }
      if (aParsedUrl.port) {
        url += ":" + aParsedUrl.port;
      }
      if (aParsedUrl.path) {
        url += aParsedUrl.path;
      }
      return url;
    }
    exports.urlGenerate = urlGenerate;

    /**
     * Normalizes a path, or the path portion of a URL:
     *
     * - Replaces consecutive slashes with one slash.
     * - Removes unnecessary '.' parts.
     * - Removes unnecessary '<dir>/..' parts.
     *
     * Based on code in the Node.js 'path' core module.
     *
     * @param aPath The path or url to normalize.
     */
    function normalize(aPath) {
      var path = aPath;
      var url = urlParse(aPath);
      if (url) {
        if (!url.path) {
          return aPath;
        }
        path = url.path;
      }
      var isAbsolute = exports.isAbsolute(path);

      var parts = path.split(/\/+/);
      for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
        part = parts[i];
        if (part === '.') {
          parts.splice(i, 1);
        } else if (part === '..') {
          up++;
        } else if (up > 0) {
          if (part === '') {
            // The first part is blank if the path is absolute. Trying to go
            // above the root is a no-op. Therefore we can remove all '..' parts
            // directly after the root.
            parts.splice(i + 1, up);
            up = 0;
          } else {
            parts.splice(i, 2);
            up--;
          }
        }
      }
      path = parts.join('/');

      if (path === '') {
        path = isAbsolute ? '/' : '.';
      }

      if (url) {
        url.path = path;
        return urlGenerate(url);
      }
      return path;
    }
    exports.normalize = normalize;

    /**
     * Joins two paths/URLs.
     *
     * @param aRoot The root path or URL.
     * @param aPath The path or URL to be joined with the root.
     *
     * - If aPath is a URL or a data URI, aPath is returned, unless aPath is a
     *   scheme-relative URL: Then the scheme of aRoot, if any, is prepended
     *   first.
     * - Otherwise aPath is a path. If aRoot is a URL, then its path portion
     *   is updated with the result and aRoot is returned. Otherwise the result
     *   is returned.
     *   - If aPath is absolute, the result is aPath.
     *   - Otherwise the two paths are joined with a slash.
     * - Joining for example 'http://' and 'www.example.com' is also supported.
     */
    function join(aRoot, aPath) {
      if (aRoot === "") {
        aRoot = ".";
      }
      if (aPath === "") {
        aPath = ".";
      }
      var aPathUrl = urlParse(aPath);
      var aRootUrl = urlParse(aRoot);
      if (aRootUrl) {
        aRoot = aRootUrl.path || '/';
      }

      // `join(foo, '//www.example.org')`
      if (aPathUrl && !aPathUrl.scheme) {
        if (aRootUrl) {
          aPathUrl.scheme = aRootUrl.scheme;
        }
        return urlGenerate(aPathUrl);
      }

      if (aPathUrl || aPath.match(dataUrlRegexp)) {
        return aPath;
      }

      // `join('http://', 'www.example.com')`
      if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
        aRootUrl.host = aPath;
        return urlGenerate(aRootUrl);
      }

      var joined = aPath.charAt(0) === '/'
        ? aPath
        : normalize(aRoot.replace(/\/+$/, '') + '/' + aPath);

      if (aRootUrl) {
        aRootUrl.path = joined;
        return urlGenerate(aRootUrl);
      }
      return joined;
    }
    exports.join = join;

    exports.isAbsolute = function (aPath) {
      return aPath.charAt(0) === '/' || !!aPath.match(urlRegexp);
    };

    /**
     * Make a path relative to a URL or another path.
     *
     * @param aRoot The root path or URL.
     * @param aPath The path or URL to be made relative to aRoot.
     */
    function relative(aRoot, aPath) {
      if (aRoot === "") {
        aRoot = ".";
      }

      aRoot = aRoot.replace(/\/$/, '');

      // It is possible for the path to be above the root. In this case, simply
      // checking whether the root is a prefix of the path won't work. Instead, we
      // need to remove components from the root one by one, until either we find
      // a prefix that fits, or we run out of components to remove.
      var level = 0;
      while (aPath.indexOf(aRoot + '/') !== 0) {
        var index = aRoot.lastIndexOf("/");
        if (index < 0) {
          return aPath;
        }

        // If the only part of the root that is left is the scheme (i.e. http://,
        // file:///, etc.), one or more slashes (/), or simply nothing at all, we
        // have exhausted all components, so the path is not relative to the root.
        aRoot = aRoot.slice(0, index);
        if (aRoot.match(/^([^\/]+:\/)?\/*$/)) {
          return aPath;
        }

        ++level;
      }

      // Make sure we add a "../" for each component we removed from the root.
      return Array(level + 1).join("../") + aPath.substr(aRoot.length + 1);
    }
    exports.relative = relative;

    var supportsNullProto = (function () {
      var obj = Object.create(null);
      return !('__proto__' in obj);
    }());

    function identity (s) {
      return s;
    }

    /**
     * Because behavior goes wacky when you set `__proto__` on objects, we
     * have to prefix all the strings in our set with an arbitrary character.
     *
     * See https://github.com/mozilla/source-map/pull/31 and
     * https://github.com/mozilla/source-map/issues/30
     *
     * @param String aStr
     */
    function toSetString(aStr) {
      if (isProtoString(aStr)) {
        return '$' + aStr;
      }

      return aStr;
    }
    exports.toSetString = supportsNullProto ? identity : toSetString;

    function fromSetString(aStr) {
      if (isProtoString(aStr)) {
        return aStr.slice(1);
      }

      return aStr;
    }
    exports.fromSetString = supportsNullProto ? identity : fromSetString;

    function isProtoString(s) {
      if (!s) {
        return false;
      }

      var length = s.length;

      if (length < 9 /* "__proto__".length */) {
        return false;
      }

      if (s.charCodeAt(length - 1) !== 95  /* '_' */ ||
          s.charCodeAt(length - 2) !== 95  /* '_' */ ||
          s.charCodeAt(length - 3) !== 111 /* 'o' */ ||
          s.charCodeAt(length - 4) !== 116 /* 't' */ ||
          s.charCodeAt(length - 5) !== 111 /* 'o' */ ||
          s.charCodeAt(length - 6) !== 114 /* 'r' */ ||
          s.charCodeAt(length - 7) !== 112 /* 'p' */ ||
          s.charCodeAt(length - 8) !== 95  /* '_' */ ||
          s.charCodeAt(length - 9) !== 95  /* '_' */) {
        return false;
      }

      for (var i = length - 10; i >= 0; i--) {
        if (s.charCodeAt(i) !== 36 /* '$' */) {
          return false;
        }
      }

      return true;
    }

    /**
     * Comparator between two mappings where the original positions are compared.
     *
     * Optionally pass in `true` as `onlyCompareGenerated` to consider two
     * mappings with the same original source/line/column, but different generated
     * line and column the same. Useful when searching for a mapping with a
     * stubbed out mapping.
     */
    function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
      var cmp = mappingA.source - mappingB.source;
      if (cmp !== 0) {
        return cmp;
      }

      cmp = mappingA.originalLine - mappingB.originalLine;
      if (cmp !== 0) {
        return cmp;
      }

      cmp = mappingA.originalColumn - mappingB.originalColumn;
      if (cmp !== 0 || onlyCompareOriginal) {
        return cmp;
      }

      cmp = mappingA.generatedColumn - mappingB.generatedColumn;
      if (cmp !== 0) {
        return cmp;
      }

      cmp = mappingA.generatedLine - mappingB.generatedLine;
      if (cmp !== 0) {
        return cmp;
      }

      return mappingA.name - mappingB.name;
    }
    exports.compareByOriginalPositions = compareByOriginalPositions;

    /**
     * Comparator between two mappings with deflated source and name indices where
     * the generated positions are compared.
     *
     * Optionally pass in `true` as `onlyCompareGenerated` to consider two
     * mappings with the same generated line and column, but different
     * source/name/original line and column the same. Useful when searching for a
     * mapping with a stubbed out mapping.
     */
    function compareByGeneratedPositionsDeflated(mappingA, mappingB, onlyCompareGenerated) {
      var cmp = mappingA.generatedLine - mappingB.generatedLine;
      if (cmp !== 0) {
        return cmp;
      }

      cmp = mappingA.generatedColumn - mappingB.generatedColumn;
      if (cmp !== 0 || onlyCompareGenerated) {
        return cmp;
      }

      cmp = mappingA.source - mappingB.source;
      if (cmp !== 0) {
        return cmp;
      }

      cmp = mappingA.originalLine - mappingB.originalLine;
      if (cmp !== 0) {
        return cmp;
      }

      cmp = mappingA.originalColumn - mappingB.originalColumn;
      if (cmp !== 0) {
        return cmp;
      }

      return mappingA.name - mappingB.name;
    }
    exports.compareByGeneratedPositionsDeflated = compareByGeneratedPositionsDeflated;

    function strcmp(aStr1, aStr2) {
      if (aStr1 === aStr2) {
        return 0;
      }

      if (aStr1 > aStr2) {
        return 1;
      }

      return -1;
    }

    /**
     * Comparator between two mappings with inflated source and name strings where
     * the generated positions are compared.
     */
    function compareByGeneratedPositionsInflated(mappingA, mappingB) {
      var cmp = mappingA.generatedLine - mappingB.generatedLine;
      if (cmp !== 0) {
        return cmp;
      }

      cmp = mappingA.generatedColumn - mappingB.generatedColumn;
      if (cmp !== 0) {
        return cmp;
      }

      cmp = strcmp(mappingA.source, mappingB.source);
      if (cmp !== 0) {
        return cmp;
      }

      cmp = mappingA.originalLine - mappingB.originalLine;
      if (cmp !== 0) {
        return cmp;
      }

      cmp = mappingA.originalColumn - mappingB.originalColumn;
      if (cmp !== 0) {
        return cmp;
      }

      return strcmp(mappingA.name, mappingB.name);
    }
    exports.compareByGeneratedPositionsInflated = compareByGeneratedPositionsInflated;
    });
    var util_1 = util.getArg;
    var util_2 = util.urlParse;
    var util_3 = util.urlGenerate;
    var util_4 = util.normalize;
    var util_5 = util.join;
    var util_6 = util.isAbsolute;
    var util_7 = util.relative;
    var util_8 = util.toSetString;
    var util_9 = util.fromSetString;
    var util_10 = util.compareByOriginalPositions;
    var util_11 = util.compareByGeneratedPositionsDeflated;
    var util_12 = util.compareByGeneratedPositionsInflated;

    /* -*- Mode: js; js-indent-level: 2; -*- */
    /*
     * Copyright 2011 Mozilla Foundation and contributors
     * Licensed under the New BSD license. See LICENSE or:
     * http://opensource.org/licenses/BSD-3-Clause
     */


    var has = Object.prototype.hasOwnProperty;
    var hasNativeMap = typeof Map !== "undefined";

    /**
     * A data structure which is a combination of an array and a set. Adding a new
     * member is O(1), testing for membership is O(1), and finding the index of an
     * element is O(1). Removing elements from the set is not supported. Only
     * strings are supported for membership.
     */
    function ArraySet() {
      this._array = [];
      this._set = hasNativeMap ? new Map() : Object.create(null);
    }

    /**
     * Static method for creating ArraySet instances from an existing array.
     */
    ArraySet.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
      var set = new ArraySet();
      for (var i = 0, len = aArray.length; i < len; i++) {
        set.add(aArray[i], aAllowDuplicates);
      }
      return set;
    };

    /**
     * Return how many unique items are in this ArraySet. If duplicates have been
     * added, than those do not count towards the size.
     *
     * @returns Number
     */
    ArraySet.prototype.size = function ArraySet_size() {
      return hasNativeMap ? this._set.size : Object.getOwnPropertyNames(this._set).length;
    };

    /**
     * Add the given string to this set.
     *
     * @param String aStr
     */
    ArraySet.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
      var sStr = hasNativeMap ? aStr : util.toSetString(aStr);
      var isDuplicate = hasNativeMap ? this.has(aStr) : has.call(this._set, sStr);
      var idx = this._array.length;
      if (!isDuplicate || aAllowDuplicates) {
        this._array.push(aStr);
      }
      if (!isDuplicate) {
        if (hasNativeMap) {
          this._set.set(aStr, idx);
        } else {
          this._set[sStr] = idx;
        }
      }
    };

    /**
     * Is the given string a member of this set?
     *
     * @param String aStr
     */
    ArraySet.prototype.has = function ArraySet_has(aStr) {
      if (hasNativeMap) {
        return this._set.has(aStr);
      } else {
        var sStr = util.toSetString(aStr);
        return has.call(this._set, sStr);
      }
    };

    /**
     * What is the index of the given string in the array?
     *
     * @param String aStr
     */
    ArraySet.prototype.indexOf = function ArraySet_indexOf(aStr) {
      if (hasNativeMap) {
        var idx = this._set.get(aStr);
        if (idx >= 0) {
            return idx;
        }
      } else {
        var sStr = util.toSetString(aStr);
        if (has.call(this._set, sStr)) {
          return this._set[sStr];
        }
      }

      throw new Error('"' + aStr + '" is not in the set.');
    };

    /**
     * What is the element at the given index?
     *
     * @param Number aIdx
     */
    ArraySet.prototype.at = function ArraySet_at(aIdx) {
      if (aIdx >= 0 && aIdx < this._array.length) {
        return this._array[aIdx];
      }
      throw new Error('No element indexed by ' + aIdx);
    };

    /**
     * Returns the array representation of this set (which has the proper indices
     * indicated by indexOf). Note that this is a copy of the internal array used
     * for storing the members so that no one can mess with internal state.
     */
    ArraySet.prototype.toArray = function ArraySet_toArray() {
      return this._array.slice();
    };

    var ArraySet_1 = ArraySet;

    var arraySet = {
        ArraySet: ArraySet_1
    };

    /* -*- Mode: js; js-indent-level: 2; -*- */
    /*
     * Copyright 2014 Mozilla Foundation and contributors
     * Licensed under the New BSD license. See LICENSE or:
     * http://opensource.org/licenses/BSD-3-Clause
     */



    /**
     * Determine whether mappingB is after mappingA with respect to generated
     * position.
     */
    function generatedPositionAfter(mappingA, mappingB) {
      // Optimized for most common case
      var lineA = mappingA.generatedLine;
      var lineB = mappingB.generatedLine;
      var columnA = mappingA.generatedColumn;
      var columnB = mappingB.generatedColumn;
      return lineB > lineA || lineB == lineA && columnB >= columnA ||
             util.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0;
    }

    /**
     * A data structure to provide a sorted view of accumulated mappings in a
     * performance conscious manner. It trades a neglibable overhead in general
     * case for a large speedup in case of mappings being added in order.
     */
    function MappingList() {
      this._array = [];
      this._sorted = true;
      // Serves as infimum
      this._last = {generatedLine: -1, generatedColumn: 0};
    }

    /**
     * Iterate through internal items. This method takes the same arguments that
     * `Array.prototype.forEach` takes.
     *
     * NOTE: The order of the mappings is NOT guaranteed.
     */
    MappingList.prototype.unsortedForEach =
      function MappingList_forEach(aCallback, aThisArg) {
        this._array.forEach(aCallback, aThisArg);
      };

    /**
     * Add the given source mapping.
     *
     * @param Object aMapping
     */
    MappingList.prototype.add = function MappingList_add(aMapping) {
      if (generatedPositionAfter(this._last, aMapping)) {
        this._last = aMapping;
        this._array.push(aMapping);
      } else {
        this._sorted = false;
        this._array.push(aMapping);
      }
    };

    /**
     * Returns the flat, sorted array of mappings. The mappings are sorted by
     * generated position.
     *
     * WARNING: This method returns internal data without copying, for
     * performance. The return value must NOT be mutated, and should be treated as
     * an immutable borrow. If you want to take ownership, you must make your own
     * copy.
     */
    MappingList.prototype.toArray = function MappingList_toArray() {
      if (!this._sorted) {
        this._array.sort(util.compareByGeneratedPositionsInflated);
        this._sorted = true;
      }
      return this._array;
    };

    var MappingList_1 = MappingList;

    var mappingList = {
        MappingList: MappingList_1
    };

    /* -*- Mode: js; js-indent-level: 2; -*- */
    /*
     * Copyright 2011 Mozilla Foundation and contributors
     * Licensed under the New BSD license. See LICENSE or:
     * http://opensource.org/licenses/BSD-3-Clause
     */



    var ArraySet$1 = arraySet.ArraySet;
    var MappingList$1 = mappingList.MappingList;

    /**
     * An instance of the SourceMapGenerator represents a source map which is
     * being built incrementally. You may pass an object with the following
     * properties:
     *
     *   - file: The filename of the generated source.
     *   - sourceRoot: A root for all relative URLs in this source map.
     */
    function SourceMapGenerator(aArgs) {
      if (!aArgs) {
        aArgs = {};
      }
      this._file = util.getArg(aArgs, 'file', null);
      this._sourceRoot = util.getArg(aArgs, 'sourceRoot', null);
      this._skipValidation = util.getArg(aArgs, 'skipValidation', false);
      this._sources = new ArraySet$1();
      this._names = new ArraySet$1();
      this._mappings = new MappingList$1();
      this._sourcesContents = null;
    }

    SourceMapGenerator.prototype._version = 3;

    /**
     * Creates a new SourceMapGenerator based on a SourceMapConsumer
     *
     * @param aSourceMapConsumer The SourceMap.
     */
    SourceMapGenerator.fromSourceMap =
      function SourceMapGenerator_fromSourceMap(aSourceMapConsumer) {
        var sourceRoot = aSourceMapConsumer.sourceRoot;
        var generator = new SourceMapGenerator({
          file: aSourceMapConsumer.file,
          sourceRoot: sourceRoot
        });
        aSourceMapConsumer.eachMapping(function (mapping) {
          var newMapping = {
            generated: {
              line: mapping.generatedLine,
              column: mapping.generatedColumn
            }
          };

          if (mapping.source != null) {
            newMapping.source = mapping.source;
            if (sourceRoot != null) {
              newMapping.source = util.relative(sourceRoot, newMapping.source);
            }

            newMapping.original = {
              line: mapping.originalLine,
              column: mapping.originalColumn
            };

            if (mapping.name != null) {
              newMapping.name = mapping.name;
            }
          }

          generator.addMapping(newMapping);
        });
        aSourceMapConsumer.sources.forEach(function (sourceFile) {
          var content = aSourceMapConsumer.sourceContentFor(sourceFile);
          if (content != null) {
            generator.setSourceContent(sourceFile, content);
          }
        });
        return generator;
      };

    /**
     * Add a single mapping from original source line and column to the generated
     * source's line and column for this source map being created. The mapping
     * object should have the following properties:
     *
     *   - generated: An object with the generated line and column positions.
     *   - original: An object with the original line and column positions.
     *   - source: The original source file (relative to the sourceRoot).
     *   - name: An optional original token name for this mapping.
     */
    SourceMapGenerator.prototype.addMapping =
      function SourceMapGenerator_addMapping(aArgs) {
        var generated = util.getArg(aArgs, 'generated');
        var original = util.getArg(aArgs, 'original', null);
        var source = util.getArg(aArgs, 'source', null);
        var name = util.getArg(aArgs, 'name', null);

        if (!this._skipValidation) {
          this._validateMapping(generated, original, source, name);
        }

        if (source != null) {
          source = String(source);
          if (!this._sources.has(source)) {
            this._sources.add(source);
          }
        }

        if (name != null) {
          name = String(name);
          if (!this._names.has(name)) {
            this._names.add(name);
          }
        }

        this._mappings.add({
          generatedLine: generated.line,
          generatedColumn: generated.column,
          originalLine: original != null && original.line,
          originalColumn: original != null && original.column,
          source: source,
          name: name
        });
      };

    /**
     * Set the source content for a source file.
     */
    SourceMapGenerator.prototype.setSourceContent =
      function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
        var source = aSourceFile;
        if (this._sourceRoot != null) {
          source = util.relative(this._sourceRoot, source);
        }

        if (aSourceContent != null) {
          // Add the source content to the _sourcesContents map.
          // Create a new _sourcesContents map if the property is null.
          if (!this._sourcesContents) {
            this._sourcesContents = Object.create(null);
          }
          this._sourcesContents[util.toSetString(source)] = aSourceContent;
        } else if (this._sourcesContents) {
          // Remove the source file from the _sourcesContents map.
          // If the _sourcesContents map is empty, set the property to null.
          delete this._sourcesContents[util.toSetString(source)];
          if (Object.keys(this._sourcesContents).length === 0) {
            this._sourcesContents = null;
          }
        }
      };

    /**
     * Applies the mappings of a sub-source-map for a specific source file to the
     * source map being generated. Each mapping to the supplied source file is
     * rewritten using the supplied source map. Note: The resolution for the
     * resulting mappings is the minimium of this map and the supplied map.
     *
     * @param aSourceMapConsumer The source map to be applied.
     * @param aSourceFile Optional. The filename of the source file.
     *        If omitted, SourceMapConsumer's file property will be used.
     * @param aSourceMapPath Optional. The dirname of the path to the source map
     *        to be applied. If relative, it is relative to the SourceMapConsumer.
     *        This parameter is needed when the two source maps aren't in the same
     *        directory, and the source map to be applied contains relative source
     *        paths. If so, those relative source paths need to be rewritten
     *        relative to the SourceMapGenerator.
     */
    SourceMapGenerator.prototype.applySourceMap =
      function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile, aSourceMapPath) {
        var sourceFile = aSourceFile;
        // If aSourceFile is omitted, we will use the file property of the SourceMap
        if (aSourceFile == null) {
          if (aSourceMapConsumer.file == null) {
            throw new Error(
              'SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, ' +
              'or the source map\'s "file" property. Both were omitted.'
            );
          }
          sourceFile = aSourceMapConsumer.file;
        }
        var sourceRoot = this._sourceRoot;
        // Make "sourceFile" relative if an absolute Url is passed.
        if (sourceRoot != null) {
          sourceFile = util.relative(sourceRoot, sourceFile);
        }
        // Applying the SourceMap can add and remove items from the sources and
        // the names array.
        var newSources = new ArraySet$1();
        var newNames = new ArraySet$1();

        // Find mappings for the "sourceFile"
        this._mappings.unsortedForEach(function (mapping) {
          if (mapping.source === sourceFile && mapping.originalLine != null) {
            // Check if it can be mapped by the source map, then update the mapping.
            var original = aSourceMapConsumer.originalPositionFor({
              line: mapping.originalLine,
              column: mapping.originalColumn
            });
            if (original.source != null) {
              // Copy mapping
              mapping.source = original.source;
              if (aSourceMapPath != null) {
                mapping.source = util.join(aSourceMapPath, mapping.source);
              }
              if (sourceRoot != null) {
                mapping.source = util.relative(sourceRoot, mapping.source);
              }
              mapping.originalLine = original.line;
              mapping.originalColumn = original.column;
              if (original.name != null) {
                mapping.name = original.name;
              }
            }
          }

          var source = mapping.source;
          if (source != null && !newSources.has(source)) {
            newSources.add(source);
          }

          var name = mapping.name;
          if (name != null && !newNames.has(name)) {
            newNames.add(name);
          }

        }, this);
        this._sources = newSources;
        this._names = newNames;

        // Copy sourcesContents of applied map.
        aSourceMapConsumer.sources.forEach(function (sourceFile) {
          var content = aSourceMapConsumer.sourceContentFor(sourceFile);
          if (content != null) {
            if (aSourceMapPath != null) {
              sourceFile = util.join(aSourceMapPath, sourceFile);
            }
            if (sourceRoot != null) {
              sourceFile = util.relative(sourceRoot, sourceFile);
            }
            this.setSourceContent(sourceFile, content);
          }
        }, this);
      };

    /**
     * A mapping can have one of the three levels of data:
     *
     *   1. Just the generated position.
     *   2. The Generated position, original position, and original source.
     *   3. Generated and original position, original source, as well as a name
     *      token.
     *
     * To maintain consistency, we validate that any new mapping being added falls
     * in to one of these categories.
     */
    SourceMapGenerator.prototype._validateMapping =
      function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource,
                                                  aName) {
        // When aOriginal is truthy but has empty values for .line and .column,
        // it is most likely a programmer error. In this case we throw a very
        // specific error message to try to guide them the right way.
        // For example: https://github.com/Polymer/polymer-bundler/pull/519
        if (aOriginal && typeof aOriginal.line !== 'number' && typeof aOriginal.column !== 'number') {
            throw new Error(
                'original.line and original.column are not numbers -- you probably meant to omit ' +
                'the original mapping entirely and only map the generated position. If so, pass ' +
                'null for the original mapping instead of an object with empty or null values.'
            );
        }

        if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
            && aGenerated.line > 0 && aGenerated.column >= 0
            && !aOriginal && !aSource && !aName) {
          // Case 1.
          return;
        }
        else if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
                 && aOriginal && 'line' in aOriginal && 'column' in aOriginal
                 && aGenerated.line > 0 && aGenerated.column >= 0
                 && aOriginal.line > 0 && aOriginal.column >= 0
                 && aSource) {
          // Cases 2 and 3.
          return;
        }
        else {
          throw new Error('Invalid mapping: ' + JSON.stringify({
            generated: aGenerated,
            source: aSource,
            original: aOriginal,
            name: aName
          }));
        }
      };

    /**
     * Serialize the accumulated mappings in to the stream of base 64 VLQs
     * specified by the source map format.
     */
    SourceMapGenerator.prototype._serializeMappings =
      function SourceMapGenerator_serializeMappings() {
        var previousGeneratedColumn = 0;
        var previousGeneratedLine = 1;
        var previousOriginalColumn = 0;
        var previousOriginalLine = 0;
        var previousName = 0;
        var previousSource = 0;
        var result = '';
        var next;
        var mapping;
        var nameIdx;
        var sourceIdx;

        var mappings = this._mappings.toArray();
        for (var i = 0, len = mappings.length; i < len; i++) {
          mapping = mappings[i];
          next = '';

          if (mapping.generatedLine !== previousGeneratedLine) {
            previousGeneratedColumn = 0;
            while (mapping.generatedLine !== previousGeneratedLine) {
              next += ';';
              previousGeneratedLine++;
            }
          }
          else {
            if (i > 0) {
              if (!util.compareByGeneratedPositionsInflated(mapping, mappings[i - 1])) {
                continue;
              }
              next += ',';
            }
          }

          next += base64Vlq.encode(mapping.generatedColumn
                                     - previousGeneratedColumn);
          previousGeneratedColumn = mapping.generatedColumn;

          if (mapping.source != null) {
            sourceIdx = this._sources.indexOf(mapping.source);
            next += base64Vlq.encode(sourceIdx - previousSource);
            previousSource = sourceIdx;

            // lines are stored 0-based in SourceMap spec version 3
            next += base64Vlq.encode(mapping.originalLine - 1
                                       - previousOriginalLine);
            previousOriginalLine = mapping.originalLine - 1;

            next += base64Vlq.encode(mapping.originalColumn
                                       - previousOriginalColumn);
            previousOriginalColumn = mapping.originalColumn;

            if (mapping.name != null) {
              nameIdx = this._names.indexOf(mapping.name);
              next += base64Vlq.encode(nameIdx - previousName);
              previousName = nameIdx;
            }
          }

          result += next;
        }

        return result;
      };

    SourceMapGenerator.prototype._generateSourcesContent =
      function SourceMapGenerator_generateSourcesContent(aSources, aSourceRoot) {
        return aSources.map(function (source) {
          if (!this._sourcesContents) {
            return null;
          }
          if (aSourceRoot != null) {
            source = util.relative(aSourceRoot, source);
          }
          var key = util.toSetString(source);
          return Object.prototype.hasOwnProperty.call(this._sourcesContents, key)
            ? this._sourcesContents[key]
            : null;
        }, this);
      };

    /**
     * Externalize the source map.
     */
    SourceMapGenerator.prototype.toJSON =
      function SourceMapGenerator_toJSON() {
        var map = {
          version: this._version,
          sources: this._sources.toArray(),
          names: this._names.toArray(),
          mappings: this._serializeMappings()
        };
        if (this._file != null) {
          map.file = this._file;
        }
        if (this._sourceRoot != null) {
          map.sourceRoot = this._sourceRoot;
        }
        if (this._sourcesContents) {
          map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
        }

        return map;
      };

    /**
     * Render the source map being generated to a string.
     */
    SourceMapGenerator.prototype.toString =
      function SourceMapGenerator_toString() {
        return JSON.stringify(this.toJSON());
      };

    var SourceMapGenerator_1 = SourceMapGenerator;

    var sourceMapGenerator = {
        SourceMapGenerator: SourceMapGenerator_1
    };

    var binarySearch = createCommonjsModule(function (module, exports) {
    /* -*- Mode: js; js-indent-level: 2; -*- */
    /*
     * Copyright 2011 Mozilla Foundation and contributors
     * Licensed under the New BSD license. See LICENSE or:
     * http://opensource.org/licenses/BSD-3-Clause
     */

    exports.GREATEST_LOWER_BOUND = 1;
    exports.LEAST_UPPER_BOUND = 2;

    /**
     * Recursive implementation of binary search.
     *
     * @param aLow Indices here and lower do not contain the needle.
     * @param aHigh Indices here and higher do not contain the needle.
     * @param aNeedle The element being searched for.
     * @param aHaystack The non-empty array being searched.
     * @param aCompare Function which takes two elements and returns -1, 0, or 1.
     * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
     *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
     *     closest element that is smaller than or greater than the one we are
     *     searching for, respectively, if the exact element cannot be found.
     */
    function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare, aBias) {
      // This function terminates when one of the following is true:
      //
      //   1. We find the exact element we are looking for.
      //
      //   2. We did not find the exact element, but we can return the index of
      //      the next-closest element.
      //
      //   3. We did not find the exact element, and there is no next-closest
      //      element than the one we are searching for, so we return -1.
      var mid = Math.floor((aHigh - aLow) / 2) + aLow;
      var cmp = aCompare(aNeedle, aHaystack[mid], true);
      if (cmp === 0) {
        // Found the element we are looking for.
        return mid;
      }
      else if (cmp > 0) {
        // Our needle is greater than aHaystack[mid].
        if (aHigh - mid > 1) {
          // The element is in the upper half.
          return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare, aBias);
        }

        // The exact needle element was not found in this haystack. Determine if
        // we are in termination case (3) or (2) and return the appropriate thing.
        if (aBias == exports.LEAST_UPPER_BOUND) {
          return aHigh < aHaystack.length ? aHigh : -1;
        } else {
          return mid;
        }
      }
      else {
        // Our needle is less than aHaystack[mid].
        if (mid - aLow > 1) {
          // The element is in the lower half.
          return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare, aBias);
        }

        // we are in termination case (3) or (2) and return the appropriate thing.
        if (aBias == exports.LEAST_UPPER_BOUND) {
          return mid;
        } else {
          return aLow < 0 ? -1 : aLow;
        }
      }
    }

    /**
     * This is an implementation of binary search which will always try and return
     * the index of the closest element if there is no exact hit. This is because
     * mappings between original and generated line/col pairs are single points,
     * and there is an implicit region between each of them, so a miss just means
     * that you aren't on the very start of a region.
     *
     * @param aNeedle The element you are looking for.
     * @param aHaystack The array that is being searched.
     * @param aCompare A function which takes the needle and an element in the
     *     array and returns -1, 0, or 1 depending on whether the needle is less
     *     than, equal to, or greater than the element, respectively.
     * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
     *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
     *     closest element that is smaller than or greater than the one we are
     *     searching for, respectively, if the exact element cannot be found.
     *     Defaults to 'binarySearch.GREATEST_LOWER_BOUND'.
     */
    exports.search = function search(aNeedle, aHaystack, aCompare, aBias) {
      if (aHaystack.length === 0) {
        return -1;
      }

      var index = recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack,
                                  aCompare, aBias || exports.GREATEST_LOWER_BOUND);
      if (index < 0) {
        return -1;
      }

      // We have found either the exact element, or the next-closest element than
      // the one we are searching for. However, there may be more than one such
      // element. Make sure we always return the smallest of these.
      while (index - 1 >= 0) {
        if (aCompare(aHaystack[index], aHaystack[index - 1], true) !== 0) {
          break;
        }
        --index;
      }

      return index;
    };
    });
    var binarySearch_1 = binarySearch.GREATEST_LOWER_BOUND;
    var binarySearch_2 = binarySearch.LEAST_UPPER_BOUND;
    var binarySearch_3 = binarySearch.search;

    /* -*- Mode: js; js-indent-level: 2; -*- */
    /*
     * Copyright 2011 Mozilla Foundation and contributors
     * Licensed under the New BSD license. See LICENSE or:
     * http://opensource.org/licenses/BSD-3-Clause
     */

    // It turns out that some (most?) JavaScript engines don't self-host
    // `Array.prototype.sort`. This makes sense because C++ will likely remain
    // faster than JS when doing raw CPU-intensive sorting. However, when using a
    // custom comparator function, calling back and forth between the VM's C++ and
    // JIT'd JS is rather slow *and* loses JIT type information, resulting in
    // worse generated code for the comparator function than would be optimal. In
    // fact, when sorting with a comparator, these costs outweigh the benefits of
    // sorting in C++. By using our own JS-implemented Quick Sort (below), we get
    // a ~3500ms mean speed-up in `bench/bench.html`.

    /**
     * Swap the elements indexed by `x` and `y` in the array `ary`.
     *
     * @param {Array} ary
     *        The array.
     * @param {Number} x
     *        The index of the first item.
     * @param {Number} y
     *        The index of the second item.
     */
    function swap(ary, x, y) {
      var temp = ary[x];
      ary[x] = ary[y];
      ary[y] = temp;
    }

    /**
     * Returns a random integer within the range `low .. high` inclusive.
     *
     * @param {Number} low
     *        The lower bound on the range.
     * @param {Number} high
     *        The upper bound on the range.
     */
    function randomIntInRange(low, high) {
      return Math.round(low + (Math.random() * (high - low)));
    }

    /**
     * The Quick Sort algorithm.
     *
     * @param {Array} ary
     *        An array to sort.
     * @param {function} comparator
     *        Function to use to compare two items.
     * @param {Number} p
     *        Start index of the array
     * @param {Number} r
     *        End index of the array
     */
    function doQuickSort(ary, comparator, p, r) {
      // If our lower bound is less than our upper bound, we (1) partition the
      // array into two pieces and (2) recurse on each half. If it is not, this is
      // the empty array and our base case.

      if (p < r) {
        // (1) Partitioning.
        //
        // The partitioning chooses a pivot between `p` and `r` and moves all
        // elements that are less than or equal to the pivot to the before it, and
        // all the elements that are greater than it after it. The effect is that
        // once partition is done, the pivot is in the exact place it will be when
        // the array is put in sorted order, and it will not need to be moved
        // again. This runs in O(n) time.

        // Always choose a random pivot so that an input array which is reverse
        // sorted does not cause O(n^2) running time.
        var pivotIndex = randomIntInRange(p, r);
        var i = p - 1;

        swap(ary, pivotIndex, r);
        var pivot = ary[r];

        // Immediately after `j` is incremented in this loop, the following hold
        // true:
        //
        //   * Every element in `ary[p .. i]` is less than or equal to the pivot.
        //
        //   * Every element in `ary[i+1 .. j-1]` is greater than the pivot.
        for (var j = p; j < r; j++) {
          if (comparator(ary[j], pivot) <= 0) {
            i += 1;
            swap(ary, i, j);
          }
        }

        swap(ary, i + 1, j);
        var q = i + 1;

        // (2) Recurse on each half.

        doQuickSort(ary, comparator, p, q - 1);
        doQuickSort(ary, comparator, q + 1, r);
      }
    }

    /**
     * Sort the given array in-place with the given comparator function.
     *
     * @param {Array} ary
     *        An array to sort.
     * @param {function} comparator
     *        Function to use to compare two items.
     */
    var quickSort_1 = function (ary, comparator) {
      doQuickSort(ary, comparator, 0, ary.length - 1);
    };

    var quickSort = {
        quickSort: quickSort_1
    };

    /* -*- Mode: js; js-indent-level: 2; -*- */
    /*
     * Copyright 2011 Mozilla Foundation and contributors
     * Licensed under the New BSD license. See LICENSE or:
     * http://opensource.org/licenses/BSD-3-Clause
     */



    var ArraySet$2 = arraySet.ArraySet;

    var quickSort$1 = quickSort.quickSort;

    function SourceMapConsumer(aSourceMap) {
      var sourceMap = aSourceMap;
      if (typeof aSourceMap === 'string') {
        sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
      }

      return sourceMap.sections != null
        ? new IndexedSourceMapConsumer(sourceMap)
        : new BasicSourceMapConsumer(sourceMap);
    }

    SourceMapConsumer.fromSourceMap = function(aSourceMap) {
      return BasicSourceMapConsumer.fromSourceMap(aSourceMap);
    };

    /**
     * The version of the source mapping spec that we are consuming.
     */
    SourceMapConsumer.prototype._version = 3;

    // `__generatedMappings` and `__originalMappings` are arrays that hold the
    // parsed mapping coordinates from the source map's "mappings" attribute. They
    // are lazily instantiated, accessed via the `_generatedMappings` and
    // `_originalMappings` getters respectively, and we only parse the mappings
    // and create these arrays once queried for a source location. We jump through
    // these hoops because there can be many thousands of mappings, and parsing
    // them is expensive, so we only want to do it if we must.
    //
    // Each object in the arrays is of the form:
    //
    //     {
    //       generatedLine: The line number in the generated code,
    //       generatedColumn: The column number in the generated code,
    //       source: The path to the original source file that generated this
    //               chunk of code,
    //       originalLine: The line number in the original source that
    //                     corresponds to this chunk of generated code,
    //       originalColumn: The column number in the original source that
    //                       corresponds to this chunk of generated code,
    //       name: The name of the original symbol which generated this chunk of
    //             code.
    //     }
    //
    // All properties except for `generatedLine` and `generatedColumn` can be
    // `null`.
    //
    // `_generatedMappings` is ordered by the generated positions.
    //
    // `_originalMappings` is ordered by the original positions.

    SourceMapConsumer.prototype.__generatedMappings = null;
    Object.defineProperty(SourceMapConsumer.prototype, '_generatedMappings', {
      get: function () {
        if (!this.__generatedMappings) {
          this._parseMappings(this._mappings, this.sourceRoot);
        }

        return this.__generatedMappings;
      }
    });

    SourceMapConsumer.prototype.__originalMappings = null;
    Object.defineProperty(SourceMapConsumer.prototype, '_originalMappings', {
      get: function () {
        if (!this.__originalMappings) {
          this._parseMappings(this._mappings, this.sourceRoot);
        }

        return this.__originalMappings;
      }
    });

    SourceMapConsumer.prototype._charIsMappingSeparator =
      function SourceMapConsumer_charIsMappingSeparator(aStr, index) {
        var c = aStr.charAt(index);
        return c === ";" || c === ",";
      };

    /**
     * Parse the mappings in a string in to a data structure which we can easily
     * query (the ordered arrays in the `this.__generatedMappings` and
     * `this.__originalMappings` properties).
     */
    SourceMapConsumer.prototype._parseMappings =
      function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
        throw new Error("Subclasses must implement _parseMappings");
      };

    SourceMapConsumer.GENERATED_ORDER = 1;
    SourceMapConsumer.ORIGINAL_ORDER = 2;

    SourceMapConsumer.GREATEST_LOWER_BOUND = 1;
    SourceMapConsumer.LEAST_UPPER_BOUND = 2;

    /**
     * Iterate over each mapping between an original source/line/column and a
     * generated line/column in this source map.
     *
     * @param Function aCallback
     *        The function that is called with each mapping.
     * @param Object aContext
     *        Optional. If specified, this object will be the value of `this` every
     *        time that `aCallback` is called.
     * @param aOrder
     *        Either `SourceMapConsumer.GENERATED_ORDER` or
     *        `SourceMapConsumer.ORIGINAL_ORDER`. Specifies whether you want to
     *        iterate over the mappings sorted by the generated file's line/column
     *        order or the original's source/line/column order, respectively. Defaults to
     *        `SourceMapConsumer.GENERATED_ORDER`.
     */
    SourceMapConsumer.prototype.eachMapping =
      function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
        var context = aContext || null;
        var order = aOrder || SourceMapConsumer.GENERATED_ORDER;

        var mappings;
        switch (order) {
        case SourceMapConsumer.GENERATED_ORDER:
          mappings = this._generatedMappings;
          break;
        case SourceMapConsumer.ORIGINAL_ORDER:
          mappings = this._originalMappings;
          break;
        default:
          throw new Error("Unknown order of iteration.");
        }

        var sourceRoot = this.sourceRoot;
        mappings.map(function (mapping) {
          var source = mapping.source === null ? null : this._sources.at(mapping.source);
          if (source != null && sourceRoot != null) {
            source = util.join(sourceRoot, source);
          }
          return {
            source: source,
            generatedLine: mapping.generatedLine,
            generatedColumn: mapping.generatedColumn,
            originalLine: mapping.originalLine,
            originalColumn: mapping.originalColumn,
            name: mapping.name === null ? null : this._names.at(mapping.name)
          };
        }, this).forEach(aCallback, context);
      };

    /**
     * Returns all generated line and column information for the original source,
     * line, and column provided. If no column is provided, returns all mappings
     * corresponding to a either the line we are searching for or the next
     * closest line that has any mappings. Otherwise, returns all mappings
     * corresponding to the given line and either the column we are searching for
     * or the next closest column that has any offsets.
     *
     * The only argument is an object with the following properties:
     *
     *   - source: The filename of the original source.
     *   - line: The line number in the original source.
     *   - column: Optional. the column number in the original source.
     *
     * and an array of objects is returned, each with the following properties:
     *
     *   - line: The line number in the generated source, or null.
     *   - column: The column number in the generated source, or null.
     */
    SourceMapConsumer.prototype.allGeneratedPositionsFor =
      function SourceMapConsumer_allGeneratedPositionsFor(aArgs) {
        var line = util.getArg(aArgs, 'line');

        // When there is no exact match, BasicSourceMapConsumer.prototype._findMapping
        // returns the index of the closest mapping less than the needle. By
        // setting needle.originalColumn to 0, we thus find the last mapping for
        // the given line, provided such a mapping exists.
        var needle = {
          source: util.getArg(aArgs, 'source'),
          originalLine: line,
          originalColumn: util.getArg(aArgs, 'column', 0)
        };

        if (this.sourceRoot != null) {
          needle.source = util.relative(this.sourceRoot, needle.source);
        }
        if (!this._sources.has(needle.source)) {
          return [];
        }
        needle.source = this._sources.indexOf(needle.source);

        var mappings = [];

        var index = this._findMapping(needle,
                                      this._originalMappings,
                                      "originalLine",
                                      "originalColumn",
                                      util.compareByOriginalPositions,
                                      binarySearch.LEAST_UPPER_BOUND);
        if (index >= 0) {
          var mapping = this._originalMappings[index];

          if (aArgs.column === undefined) {
            var originalLine = mapping.originalLine;

            // Iterate until either we run out of mappings, or we run into
            // a mapping for a different line than the one we found. Since
            // mappings are sorted, this is guaranteed to find all mappings for
            // the line we found.
            while (mapping && mapping.originalLine === originalLine) {
              mappings.push({
                line: util.getArg(mapping, 'generatedLine', null),
                column: util.getArg(mapping, 'generatedColumn', null),
                lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
              });

              mapping = this._originalMappings[++index];
            }
          } else {
            var originalColumn = mapping.originalColumn;

            // Iterate until either we run out of mappings, or we run into
            // a mapping for a different line than the one we were searching for.
            // Since mappings are sorted, this is guaranteed to find all mappings for
            // the line we are searching for.
            while (mapping &&
                   mapping.originalLine === line &&
                   mapping.originalColumn == originalColumn) {
              mappings.push({
                line: util.getArg(mapping, 'generatedLine', null),
                column: util.getArg(mapping, 'generatedColumn', null),
                lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
              });

              mapping = this._originalMappings[++index];
            }
          }
        }

        return mappings;
      };

    var SourceMapConsumer_1 = SourceMapConsumer;

    /**
     * A BasicSourceMapConsumer instance represents a parsed source map which we can
     * query for information about the original file positions by giving it a file
     * position in the generated source.
     *
     * The only parameter is the raw source map (either as a JSON string, or
     * already parsed to an object). According to the spec, source maps have the
     * following attributes:
     *
     *   - version: Which version of the source map spec this map is following.
     *   - sources: An array of URLs to the original source files.
     *   - names: An array of identifiers which can be referrenced by individual mappings.
     *   - sourceRoot: Optional. The URL root from which all sources are relative.
     *   - sourcesContent: Optional. An array of contents of the original source files.
     *   - mappings: A string of base64 VLQs which contain the actual mappings.
     *   - file: Optional. The generated file this source map is associated with.
     *
     * Here is an example source map, taken from the source map spec[0]:
     *
     *     {
     *       version : 3,
     *       file: "out.js",
     *       sourceRoot : "",
     *       sources: ["foo.js", "bar.js"],
     *       names: ["src", "maps", "are", "fun"],
     *       mappings: "AA,AB;;ABCDE;"
     *     }
     *
     * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit?pli=1#
     */
    function BasicSourceMapConsumer(aSourceMap) {
      var sourceMap = aSourceMap;
      if (typeof aSourceMap === 'string') {
        sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
      }

      var version = util.getArg(sourceMap, 'version');
      var sources = util.getArg(sourceMap, 'sources');
      // Sass 3.3 leaves out the 'names' array, so we deviate from the spec (which
      // requires the array) to play nice here.
      var names = util.getArg(sourceMap, 'names', []);
      var sourceRoot = util.getArg(sourceMap, 'sourceRoot', null);
      var sourcesContent = util.getArg(sourceMap, 'sourcesContent', null);
      var mappings = util.getArg(sourceMap, 'mappings');
      var file = util.getArg(sourceMap, 'file', null);

      // Once again, Sass deviates from the spec and supplies the version as a
      // string rather than a number, so we use loose equality checking here.
      if (version != this._version) {
        throw new Error('Unsupported version: ' + version);
      }

      sources = sources
        .map(String)
        // Some source maps produce relative source paths like "./foo.js" instead of
        // "foo.js".  Normalize these first so that future comparisons will succeed.
        // See bugzil.la/1090768.
        .map(util.normalize)
        // Always ensure that absolute sources are internally stored relative to
        // the source root, if the source root is absolute. Not doing this would
        // be particularly problematic when the source root is a prefix of the
        // source (valid, but why??). See github issue #199 and bugzil.la/1188982.
        .map(function (source) {
          return sourceRoot && util.isAbsolute(sourceRoot) && util.isAbsolute(source)
            ? util.relative(sourceRoot, source)
            : source;
        });

      // Pass `true` below to allow duplicate names and sources. While source maps
      // are intended to be compressed and deduplicated, the TypeScript compiler
      // sometimes generates source maps with duplicates in them. See Github issue
      // #72 and bugzil.la/889492.
      this._names = ArraySet$2.fromArray(names.map(String), true);
      this._sources = ArraySet$2.fromArray(sources, true);

      this.sourceRoot = sourceRoot;
      this.sourcesContent = sourcesContent;
      this._mappings = mappings;
      this.file = file;
    }

    BasicSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
    BasicSourceMapConsumer.prototype.consumer = SourceMapConsumer;

    /**
     * Create a BasicSourceMapConsumer from a SourceMapGenerator.
     *
     * @param SourceMapGenerator aSourceMap
     *        The source map that will be consumed.
     * @returns BasicSourceMapConsumer
     */
    BasicSourceMapConsumer.fromSourceMap =
      function SourceMapConsumer_fromSourceMap(aSourceMap) {
        var smc = Object.create(BasicSourceMapConsumer.prototype);

        var names = smc._names = ArraySet$2.fromArray(aSourceMap._names.toArray(), true);
        var sources = smc._sources = ArraySet$2.fromArray(aSourceMap._sources.toArray(), true);
        smc.sourceRoot = aSourceMap._sourceRoot;
        smc.sourcesContent = aSourceMap._generateSourcesContent(smc._sources.toArray(),
                                                                smc.sourceRoot);
        smc.file = aSourceMap._file;

        // Because we are modifying the entries (by converting string sources and
        // names to indices into the sources and names ArraySets), we have to make
        // a copy of the entry or else bad things happen. Shared mutable state
        // strikes again! See github issue #191.

        var generatedMappings = aSourceMap._mappings.toArray().slice();
        var destGeneratedMappings = smc.__generatedMappings = [];
        var destOriginalMappings = smc.__originalMappings = [];

        for (var i = 0, length = generatedMappings.length; i < length; i++) {
          var srcMapping = generatedMappings[i];
          var destMapping = new Mapping;
          destMapping.generatedLine = srcMapping.generatedLine;
          destMapping.generatedColumn = srcMapping.generatedColumn;

          if (srcMapping.source) {
            destMapping.source = sources.indexOf(srcMapping.source);
            destMapping.originalLine = srcMapping.originalLine;
            destMapping.originalColumn = srcMapping.originalColumn;

            if (srcMapping.name) {
              destMapping.name = names.indexOf(srcMapping.name);
            }

            destOriginalMappings.push(destMapping);
          }

          destGeneratedMappings.push(destMapping);
        }

        quickSort$1(smc.__originalMappings, util.compareByOriginalPositions);

        return smc;
      };

    /**
     * The version of the source mapping spec that we are consuming.
     */
    BasicSourceMapConsumer.prototype._version = 3;

    /**
     * The list of original sources.
     */
    Object.defineProperty(BasicSourceMapConsumer.prototype, 'sources', {
      get: function () {
        return this._sources.toArray().map(function (s) {
          return this.sourceRoot != null ? util.join(this.sourceRoot, s) : s;
        }, this);
      }
    });

    /**
     * Provide the JIT with a nice shape / hidden class.
     */
    function Mapping() {
      this.generatedLine = 0;
      this.generatedColumn = 0;
      this.source = null;
      this.originalLine = null;
      this.originalColumn = null;
      this.name = null;
    }

    /**
     * Parse the mappings in a string in to a data structure which we can easily
     * query (the ordered arrays in the `this.__generatedMappings` and
     * `this.__originalMappings` properties).
     */
    BasicSourceMapConsumer.prototype._parseMappings =
      function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
        var generatedLine = 1;
        var previousGeneratedColumn = 0;
        var previousOriginalLine = 0;
        var previousOriginalColumn = 0;
        var previousSource = 0;
        var previousName = 0;
        var length = aStr.length;
        var index = 0;
        var cachedSegments = {};
        var temp = {};
        var originalMappings = [];
        var generatedMappings = [];
        var mapping, str, segment, end, value;

        while (index < length) {
          if (aStr.charAt(index) === ';') {
            generatedLine++;
            index++;
            previousGeneratedColumn = 0;
          }
          else if (aStr.charAt(index) === ',') {
            index++;
          }
          else {
            mapping = new Mapping();
            mapping.generatedLine = generatedLine;

            // Because each offset is encoded relative to the previous one,
            // many segments often have the same encoding. We can exploit this
            // fact by caching the parsed variable length fields of each segment,
            // allowing us to avoid a second parse if we encounter the same
            // segment again.
            for (end = index; end < length; end++) {
              if (this._charIsMappingSeparator(aStr, end)) {
                break;
              }
            }
            str = aStr.slice(index, end);

            segment = cachedSegments[str];
            if (segment) {
              index += str.length;
            } else {
              segment = [];
              while (index < end) {
                base64Vlq.decode(aStr, index, temp);
                value = temp.value;
                index = temp.rest;
                segment.push(value);
              }

              if (segment.length === 2) {
                throw new Error('Found a source, but no line and column');
              }

              if (segment.length === 3) {
                throw new Error('Found a source and line, but no column');
              }

              cachedSegments[str] = segment;
            }

            // Generated column.
            mapping.generatedColumn = previousGeneratedColumn + segment[0];
            previousGeneratedColumn = mapping.generatedColumn;

            if (segment.length > 1) {
              // Original source.
              mapping.source = previousSource + segment[1];
              previousSource += segment[1];

              // Original line.
              mapping.originalLine = previousOriginalLine + segment[2];
              previousOriginalLine = mapping.originalLine;
              // Lines are stored 0-based
              mapping.originalLine += 1;

              // Original column.
              mapping.originalColumn = previousOriginalColumn + segment[3];
              previousOriginalColumn = mapping.originalColumn;

              if (segment.length > 4) {
                // Original name.
                mapping.name = previousName + segment[4];
                previousName += segment[4];
              }
            }

            generatedMappings.push(mapping);
            if (typeof mapping.originalLine === 'number') {
              originalMappings.push(mapping);
            }
          }
        }

        quickSort$1(generatedMappings, util.compareByGeneratedPositionsDeflated);
        this.__generatedMappings = generatedMappings;

        quickSort$1(originalMappings, util.compareByOriginalPositions);
        this.__originalMappings = originalMappings;
      };

    /**
     * Find the mapping that best matches the hypothetical "needle" mapping that
     * we are searching for in the given "haystack" of mappings.
     */
    BasicSourceMapConsumer.prototype._findMapping =
      function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName,
                                             aColumnName, aComparator, aBias) {
        // To return the position we are searching for, we must first find the
        // mapping for the given position and then return the opposite position it
        // points to. Because the mappings are sorted, we can use binary search to
        // find the best mapping.

        if (aNeedle[aLineName] <= 0) {
          throw new TypeError('Line must be greater than or equal to 1, got '
                              + aNeedle[aLineName]);
        }
        if (aNeedle[aColumnName] < 0) {
          throw new TypeError('Column must be greater than or equal to 0, got '
                              + aNeedle[aColumnName]);
        }

        return binarySearch.search(aNeedle, aMappings, aComparator, aBias);
      };

    /**
     * Compute the last column for each generated mapping. The last column is
     * inclusive.
     */
    BasicSourceMapConsumer.prototype.computeColumnSpans =
      function SourceMapConsumer_computeColumnSpans() {
        for (var index = 0; index < this._generatedMappings.length; ++index) {
          var mapping = this._generatedMappings[index];

          // Mappings do not contain a field for the last generated columnt. We
          // can come up with an optimistic estimate, however, by assuming that
          // mappings are contiguous (i.e. given two consecutive mappings, the
          // first mapping ends where the second one starts).
          if (index + 1 < this._generatedMappings.length) {
            var nextMapping = this._generatedMappings[index + 1];

            if (mapping.generatedLine === nextMapping.generatedLine) {
              mapping.lastGeneratedColumn = nextMapping.generatedColumn - 1;
              continue;
            }
          }

          // The last mapping for each line spans the entire line.
          mapping.lastGeneratedColumn = Infinity;
        }
      };

    /**
     * Returns the original source, line, and column information for the generated
     * source's line and column positions provided. The only argument is an object
     * with the following properties:
     *
     *   - line: The line number in the generated source.
     *   - column: The column number in the generated source.
     *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
     *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
     *     closest element that is smaller than or greater than the one we are
     *     searching for, respectively, if the exact element cannot be found.
     *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
     *
     * and an object is returned with the following properties:
     *
     *   - source: The original source file, or null.
     *   - line: The line number in the original source, or null.
     *   - column: The column number in the original source, or null.
     *   - name: The original identifier, or null.
     */
    BasicSourceMapConsumer.prototype.originalPositionFor =
      function SourceMapConsumer_originalPositionFor(aArgs) {
        var needle = {
          generatedLine: util.getArg(aArgs, 'line'),
          generatedColumn: util.getArg(aArgs, 'column')
        };

        var index = this._findMapping(
          needle,
          this._generatedMappings,
          "generatedLine",
          "generatedColumn",
          util.compareByGeneratedPositionsDeflated,
          util.getArg(aArgs, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND)
        );

        if (index >= 0) {
          var mapping = this._generatedMappings[index];

          if (mapping.generatedLine === needle.generatedLine) {
            var source = util.getArg(mapping, 'source', null);
            if (source !== null) {
              source = this._sources.at(source);
              if (this.sourceRoot != null) {
                source = util.join(this.sourceRoot, source);
              }
            }
            var name = util.getArg(mapping, 'name', null);
            if (name !== null) {
              name = this._names.at(name);
            }
            return {
              source: source,
              line: util.getArg(mapping, 'originalLine', null),
              column: util.getArg(mapping, 'originalColumn', null),
              name: name
            };
          }
        }

        return {
          source: null,
          line: null,
          column: null,
          name: null
        };
      };

    /**
     * Return true if we have the source content for every source in the source
     * map, false otherwise.
     */
    BasicSourceMapConsumer.prototype.hasContentsOfAllSources =
      function BasicSourceMapConsumer_hasContentsOfAllSources() {
        if (!this.sourcesContent) {
          return false;
        }
        return this.sourcesContent.length >= this._sources.size() &&
          !this.sourcesContent.some(function (sc) { return sc == null; });
      };

    /**
     * Returns the original source content. The only argument is the url of the
     * original source file. Returns null if no original source content is
     * available.
     */
    BasicSourceMapConsumer.prototype.sourceContentFor =
      function SourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
        if (!this.sourcesContent) {
          return null;
        }

        if (this.sourceRoot != null) {
          aSource = util.relative(this.sourceRoot, aSource);
        }

        if (this._sources.has(aSource)) {
          return this.sourcesContent[this._sources.indexOf(aSource)];
        }

        var url;
        if (this.sourceRoot != null
            && (url = util.urlParse(this.sourceRoot))) {
          // XXX: file:// URIs and absolute paths lead to unexpected behavior for
          // many users. We can help them out when they expect file:// URIs to
          // behave like it would if they were running a local HTTP server. See
          // https://bugzilla.mozilla.org/show_bug.cgi?id=885597.
          var fileUriAbsPath = aSource.replace(/^file:\/\//, "");
          if (url.scheme == "file"
              && this._sources.has(fileUriAbsPath)) {
            return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)]
          }

          if ((!url.path || url.path == "/")
              && this._sources.has("/" + aSource)) {
            return this.sourcesContent[this._sources.indexOf("/" + aSource)];
          }
        }

        // This function is used recursively from
        // IndexedSourceMapConsumer.prototype.sourceContentFor. In that case, we
        // don't want to throw if we can't find the source - we just want to
        // return null, so we provide a flag to exit gracefully.
        if (nullOnMissing) {
          return null;
        }
        else {
          throw new Error('"' + aSource + '" is not in the SourceMap.');
        }
      };

    /**
     * Returns the generated line and column information for the original source,
     * line, and column positions provided. The only argument is an object with
     * the following properties:
     *
     *   - source: The filename of the original source.
     *   - line: The line number in the original source.
     *   - column: The column number in the original source.
     *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
     *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
     *     closest element that is smaller than or greater than the one we are
     *     searching for, respectively, if the exact element cannot be found.
     *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
     *
     * and an object is returned with the following properties:
     *
     *   - line: The line number in the generated source, or null.
     *   - column: The column number in the generated source, or null.
     */
    BasicSourceMapConsumer.prototype.generatedPositionFor =
      function SourceMapConsumer_generatedPositionFor(aArgs) {
        var source = util.getArg(aArgs, 'source');
        if (this.sourceRoot != null) {
          source = util.relative(this.sourceRoot, source);
        }
        if (!this._sources.has(source)) {
          return {
            line: null,
            column: null,
            lastColumn: null
          };
        }
        source = this._sources.indexOf(source);

        var needle = {
          source: source,
          originalLine: util.getArg(aArgs, 'line'),
          originalColumn: util.getArg(aArgs, 'column')
        };

        var index = this._findMapping(
          needle,
          this._originalMappings,
          "originalLine",
          "originalColumn",
          util.compareByOriginalPositions,
          util.getArg(aArgs, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND)
        );

        if (index >= 0) {
          var mapping = this._originalMappings[index];

          if (mapping.source === needle.source) {
            return {
              line: util.getArg(mapping, 'generatedLine', null),
              column: util.getArg(mapping, 'generatedColumn', null),
              lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
            };
          }
        }

        return {
          line: null,
          column: null,
          lastColumn: null
        };
      };

    var BasicSourceMapConsumer_1 = BasicSourceMapConsumer;

    /**
     * An IndexedSourceMapConsumer instance represents a parsed source map which
     * we can query for information. It differs from BasicSourceMapConsumer in
     * that it takes "indexed" source maps (i.e. ones with a "sections" field) as
     * input.
     *
     * The only parameter is a raw source map (either as a JSON string, or already
     * parsed to an object). According to the spec for indexed source maps, they
     * have the following attributes:
     *
     *   - version: Which version of the source map spec this map is following.
     *   - file: Optional. The generated file this source map is associated with.
     *   - sections: A list of section definitions.
     *
     * Each value under the "sections" field has two fields:
     *   - offset: The offset into the original specified at which this section
     *       begins to apply, defined as an object with a "line" and "column"
     *       field.
     *   - map: A source map definition. This source map could also be indexed,
     *       but doesn't have to be.
     *
     * Instead of the "map" field, it's also possible to have a "url" field
     * specifying a URL to retrieve a source map from, but that's currently
     * unsupported.
     *
     * Here's an example source map, taken from the source map spec[0], but
     * modified to omit a section which uses the "url" field.
     *
     *  {
     *    version : 3,
     *    file: "app.js",
     *    sections: [{
     *      offset: {line:100, column:10},
     *      map: {
     *        version : 3,
     *        file: "section.js",
     *        sources: ["foo.js", "bar.js"],
     *        names: ["src", "maps", "are", "fun"],
     *        mappings: "AAAA,E;;ABCDE;"
     *      }
     *    }],
     *  }
     *
     * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#heading=h.535es3xeprgt
     */
    function IndexedSourceMapConsumer(aSourceMap) {
      var sourceMap = aSourceMap;
      if (typeof aSourceMap === 'string') {
        sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
      }

      var version = util.getArg(sourceMap, 'version');
      var sections = util.getArg(sourceMap, 'sections');

      if (version != this._version) {
        throw new Error('Unsupported version: ' + version);
      }

      this._sources = new ArraySet$2();
      this._names = new ArraySet$2();

      var lastOffset = {
        line: -1,
        column: 0
      };
      this._sections = sections.map(function (s) {
        if (s.url) {
          // The url field will require support for asynchronicity.
          // See https://github.com/mozilla/source-map/issues/16
          throw new Error('Support for url field in sections not implemented.');
        }
        var offset = util.getArg(s, 'offset');
        var offsetLine = util.getArg(offset, 'line');
        var offsetColumn = util.getArg(offset, 'column');

        if (offsetLine < lastOffset.line ||
            (offsetLine === lastOffset.line && offsetColumn < lastOffset.column)) {
          throw new Error('Section offsets must be ordered and non-overlapping.');
        }
        lastOffset = offset;

        return {
          generatedOffset: {
            // The offset fields are 0-based, but we use 1-based indices when
            // encoding/decoding from VLQ.
            generatedLine: offsetLine + 1,
            generatedColumn: offsetColumn + 1
          },
          consumer: new SourceMapConsumer(util.getArg(s, 'map'))
        }
      });
    }

    IndexedSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
    IndexedSourceMapConsumer.prototype.constructor = SourceMapConsumer;

    /**
     * The version of the source mapping spec that we are consuming.
     */
    IndexedSourceMapConsumer.prototype._version = 3;

    /**
     * The list of original sources.
     */
    Object.defineProperty(IndexedSourceMapConsumer.prototype, 'sources', {
      get: function () {
        var sources = [];
        for (var i = 0; i < this._sections.length; i++) {
          for (var j = 0; j < this._sections[i].consumer.sources.length; j++) {
            sources.push(this._sections[i].consumer.sources[j]);
          }
        }
        return sources;
      }
    });

    /**
     * Returns the original source, line, and column information for the generated
     * source's line and column positions provided. The only argument is an object
     * with the following properties:
     *
     *   - line: The line number in the generated source.
     *   - column: The column number in the generated source.
     *
     * and an object is returned with the following properties:
     *
     *   - source: The original source file, or null.
     *   - line: The line number in the original source, or null.
     *   - column: The column number in the original source, or null.
     *   - name: The original identifier, or null.
     */
    IndexedSourceMapConsumer.prototype.originalPositionFor =
      function IndexedSourceMapConsumer_originalPositionFor(aArgs) {
        var needle = {
          generatedLine: util.getArg(aArgs, 'line'),
          generatedColumn: util.getArg(aArgs, 'column')
        };

        // Find the section containing the generated position we're trying to map
        // to an original position.
        var sectionIndex = binarySearch.search(needle, this._sections,
          function(needle, section) {
            var cmp = needle.generatedLine - section.generatedOffset.generatedLine;
            if (cmp) {
              return cmp;
            }

            return (needle.generatedColumn -
                    section.generatedOffset.generatedColumn);
          });
        var section = this._sections[sectionIndex];

        if (!section) {
          return {
            source: null,
            line: null,
            column: null,
            name: null
          };
        }

        return section.consumer.originalPositionFor({
          line: needle.generatedLine -
            (section.generatedOffset.generatedLine - 1),
          column: needle.generatedColumn -
            (section.generatedOffset.generatedLine === needle.generatedLine
             ? section.generatedOffset.generatedColumn - 1
             : 0),
          bias: aArgs.bias
        });
      };

    /**
     * Return true if we have the source content for every source in the source
     * map, false otherwise.
     */
    IndexedSourceMapConsumer.prototype.hasContentsOfAllSources =
      function IndexedSourceMapConsumer_hasContentsOfAllSources() {
        return this._sections.every(function (s) {
          return s.consumer.hasContentsOfAllSources();
        });
      };

    /**
     * Returns the original source content. The only argument is the url of the
     * original source file. Returns null if no original source content is
     * available.
     */
    IndexedSourceMapConsumer.prototype.sourceContentFor =
      function IndexedSourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
        for (var i = 0; i < this._sections.length; i++) {
          var section = this._sections[i];

          var content = section.consumer.sourceContentFor(aSource, true);
          if (content) {
            return content;
          }
        }
        if (nullOnMissing) {
          return null;
        }
        else {
          throw new Error('"' + aSource + '" is not in the SourceMap.');
        }
      };

    /**
     * Returns the generated line and column information for the original source,
     * line, and column positions provided. The only argument is an object with
     * the following properties:
     *
     *   - source: The filename of the original source.
     *   - line: The line number in the original source.
     *   - column: The column number in the original source.
     *
     * and an object is returned with the following properties:
     *
     *   - line: The line number in the generated source, or null.
     *   - column: The column number in the generated source, or null.
     */
    IndexedSourceMapConsumer.prototype.generatedPositionFor =
      function IndexedSourceMapConsumer_generatedPositionFor(aArgs) {
        for (var i = 0; i < this._sections.length; i++) {
          var section = this._sections[i];

          // Only consider this section if the requested source is in the list of
          // sources of the consumer.
          if (section.consumer.sources.indexOf(util.getArg(aArgs, 'source')) === -1) {
            continue;
          }
          var generatedPosition = section.consumer.generatedPositionFor(aArgs);
          if (generatedPosition) {
            var ret = {
              line: generatedPosition.line +
                (section.generatedOffset.generatedLine - 1),
              column: generatedPosition.column +
                (section.generatedOffset.generatedLine === generatedPosition.line
                 ? section.generatedOffset.generatedColumn - 1
                 : 0)
            };
            return ret;
          }
        }

        return {
          line: null,
          column: null
        };
      };

    /**
     * Parse the mappings in a string in to a data structure which we can easily
     * query (the ordered arrays in the `this.__generatedMappings` and
     * `this.__originalMappings` properties).
     */
    IndexedSourceMapConsumer.prototype._parseMappings =
      function IndexedSourceMapConsumer_parseMappings(aStr, aSourceRoot) {
        this.__generatedMappings = [];
        this.__originalMappings = [];
        for (var i = 0; i < this._sections.length; i++) {
          var section = this._sections[i];
          var sectionMappings = section.consumer._generatedMappings;
          for (var j = 0; j < sectionMappings.length; j++) {
            var mapping = sectionMappings[j];

            var source = section.consumer._sources.at(mapping.source);
            if (section.consumer.sourceRoot !== null) {
              source = util.join(section.consumer.sourceRoot, source);
            }
            this._sources.add(source);
            source = this._sources.indexOf(source);

            var name = section.consumer._names.at(mapping.name);
            this._names.add(name);
            name = this._names.indexOf(name);

            // The mappings coming from the consumer for the section have
            // generated positions relative to the start of the section, so we
            // need to offset them to be relative to the start of the concatenated
            // generated file.
            var adjustedMapping = {
              source: source,
              generatedLine: mapping.generatedLine +
                (section.generatedOffset.generatedLine - 1),
              generatedColumn: mapping.generatedColumn +
                (section.generatedOffset.generatedLine === mapping.generatedLine
                ? section.generatedOffset.generatedColumn - 1
                : 0),
              originalLine: mapping.originalLine,
              originalColumn: mapping.originalColumn,
              name: name
            };

            this.__generatedMappings.push(adjustedMapping);
            if (typeof adjustedMapping.originalLine === 'number') {
              this.__originalMappings.push(adjustedMapping);
            }
          }
        }

        quickSort$1(this.__generatedMappings, util.compareByGeneratedPositionsDeflated);
        quickSort$1(this.__originalMappings, util.compareByOriginalPositions);
      };

    var IndexedSourceMapConsumer_1 = IndexedSourceMapConsumer;

    var sourceMapConsumer = {
        SourceMapConsumer: SourceMapConsumer_1,
        BasicSourceMapConsumer: BasicSourceMapConsumer_1,
        IndexedSourceMapConsumer: IndexedSourceMapConsumer_1
    };

    /* -*- Mode: js; js-indent-level: 2; -*- */
    /*
     * Copyright 2011 Mozilla Foundation and contributors
     * Licensed under the New BSD license. See LICENSE or:
     * http://opensource.org/licenses/BSD-3-Clause
     */

    var SourceMapGenerator$1 = sourceMapGenerator.SourceMapGenerator;


    // Matches a Windows-style `\r\n` newline or a `\n` newline used by all other
    // operating systems these days (capturing the result).
    var REGEX_NEWLINE = /(\r?\n)/;

    // Newline character code for charCodeAt() comparisons
    var NEWLINE_CODE = 10;

    // Private symbol for identifying `SourceNode`s when multiple versions of
    // the source-map library are loaded. This MUST NOT CHANGE across
    // versions!
    var isSourceNode = "$$$isSourceNode$$$";

    /**
     * SourceNodes provide a way to abstract over interpolating/concatenating
     * snippets of generated JavaScript source code while maintaining the line and
     * column information associated with the original source code.
     *
     * @param aLine The original line number.
     * @param aColumn The original column number.
     * @param aSource The original source's filename.
     * @param aChunks Optional. An array of strings which are snippets of
     *        generated JS, or other SourceNodes.
     * @param aName The original identifier.
     */
    function SourceNode(aLine, aColumn, aSource, aChunks, aName) {
      this.children = [];
      this.sourceContents = {};
      this.line = aLine == null ? null : aLine;
      this.column = aColumn == null ? null : aColumn;
      this.source = aSource == null ? null : aSource;
      this.name = aName == null ? null : aName;
      this[isSourceNode] = true;
      if (aChunks != null) this.add(aChunks);
    }

    /**
     * Creates a SourceNode from generated code and a SourceMapConsumer.
     *
     * @param aGeneratedCode The generated code
     * @param aSourceMapConsumer The SourceMap for the generated code
     * @param aRelativePath Optional. The path that relative sources in the
     *        SourceMapConsumer should be relative to.
     */
    SourceNode.fromStringWithSourceMap =
      function SourceNode_fromStringWithSourceMap(aGeneratedCode, aSourceMapConsumer, aRelativePath) {
        // The SourceNode we want to fill with the generated code
        // and the SourceMap
        var node = new SourceNode();

        // All even indices of this array are one line of the generated code,
        // while all odd indices are the newlines between two adjacent lines
        // (since `REGEX_NEWLINE` captures its match).
        // Processed fragments are accessed by calling `shiftNextLine`.
        var remainingLines = aGeneratedCode.split(REGEX_NEWLINE);
        var remainingLinesIndex = 0;
        var shiftNextLine = function() {
          var lineContents = getNextLine();
          // The last line of a file might not have a newline.
          var newLine = getNextLine() || "";
          return lineContents + newLine;

          function getNextLine() {
            return remainingLinesIndex < remainingLines.length ?
                remainingLines[remainingLinesIndex++] : undefined;
          }
        };

        // We need to remember the position of "remainingLines"
        var lastGeneratedLine = 1, lastGeneratedColumn = 0;

        // The generate SourceNodes we need a code range.
        // To extract it current and last mapping is used.
        // Here we store the last mapping.
        var lastMapping = null;

        aSourceMapConsumer.eachMapping(function (mapping) {
          if (lastMapping !== null) {
            // We add the code from "lastMapping" to "mapping":
            // First check if there is a new line in between.
            if (lastGeneratedLine < mapping.generatedLine) {
              // Associate first line with "lastMapping"
              addMappingWithCode(lastMapping, shiftNextLine());
              lastGeneratedLine++;
              lastGeneratedColumn = 0;
              // The remaining code is added without mapping
            } else {
              // There is no new line in between.
              // Associate the code between "lastGeneratedColumn" and
              // "mapping.generatedColumn" with "lastMapping"
              var nextLine = remainingLines[remainingLinesIndex];
              var code = nextLine.substr(0, mapping.generatedColumn -
                                            lastGeneratedColumn);
              remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn -
                                                  lastGeneratedColumn);
              lastGeneratedColumn = mapping.generatedColumn;
              addMappingWithCode(lastMapping, code);
              // No more remaining code, continue
              lastMapping = mapping;
              return;
            }
          }
          // We add the generated code until the first mapping
          // to the SourceNode without any mapping.
          // Each line is added as separate string.
          while (lastGeneratedLine < mapping.generatedLine) {
            node.add(shiftNextLine());
            lastGeneratedLine++;
          }
          if (lastGeneratedColumn < mapping.generatedColumn) {
            var nextLine = remainingLines[remainingLinesIndex];
            node.add(nextLine.substr(0, mapping.generatedColumn));
            remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn);
            lastGeneratedColumn = mapping.generatedColumn;
          }
          lastMapping = mapping;
        }, this);
        // We have processed all mappings.
        if (remainingLinesIndex < remainingLines.length) {
          if (lastMapping) {
            // Associate the remaining code in the current line with "lastMapping"
            addMappingWithCode(lastMapping, shiftNextLine());
          }
          // and add the remaining lines without any mapping
          node.add(remainingLines.splice(remainingLinesIndex).join(""));
        }

        // Copy sourcesContent into SourceNode
        aSourceMapConsumer.sources.forEach(function (sourceFile) {
          var content = aSourceMapConsumer.sourceContentFor(sourceFile);
          if (content != null) {
            if (aRelativePath != null) {
              sourceFile = util.join(aRelativePath, sourceFile);
            }
            node.setSourceContent(sourceFile, content);
          }
        });

        return node;

        function addMappingWithCode(mapping, code) {
          if (mapping === null || mapping.source === undefined) {
            node.add(code);
          } else {
            var source = aRelativePath
              ? util.join(aRelativePath, mapping.source)
              : mapping.source;
            node.add(new SourceNode(mapping.originalLine,
                                    mapping.originalColumn,
                                    source,
                                    code,
                                    mapping.name));
          }
        }
      };

    /**
     * Add a chunk of generated JS to this source node.
     *
     * @param aChunk A string snippet of generated JS code, another instance of
     *        SourceNode, or an array where each member is one of those things.
     */
    SourceNode.prototype.add = function SourceNode_add(aChunk) {
      if (Array.isArray(aChunk)) {
        aChunk.forEach(function (chunk) {
          this.add(chunk);
        }, this);
      }
      else if (aChunk[isSourceNode] || typeof aChunk === "string") {
        if (aChunk) {
          this.children.push(aChunk);
        }
      }
      else {
        throw new TypeError(
          "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
        );
      }
      return this;
    };

    /**
     * Add a chunk of generated JS to the beginning of this source node.
     *
     * @param aChunk A string snippet of generated JS code, another instance of
     *        SourceNode, or an array where each member is one of those things.
     */
    SourceNode.prototype.prepend = function SourceNode_prepend(aChunk) {
      if (Array.isArray(aChunk)) {
        for (var i = aChunk.length-1; i >= 0; i--) {
          this.prepend(aChunk[i]);
        }
      }
      else if (aChunk[isSourceNode] || typeof aChunk === "string") {
        this.children.unshift(aChunk);
      }
      else {
        throw new TypeError(
          "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
        );
      }
      return this;
    };

    /**
     * Walk over the tree of JS snippets in this node and its children. The
     * walking function is called once for each snippet of JS and is passed that
     * snippet and the its original associated source's line/column location.
     *
     * @param aFn The traversal function.
     */
    SourceNode.prototype.walk = function SourceNode_walk(aFn) {
      var chunk;
      for (var i = 0, len = this.children.length; i < len; i++) {
        chunk = this.children[i];
        if (chunk[isSourceNode]) {
          chunk.walk(aFn);
        }
        else {
          if (chunk !== '') {
            aFn(chunk, { source: this.source,
                         line: this.line,
                         column: this.column,
                         name: this.name });
          }
        }
      }
    };

    /**
     * Like `String.prototype.join` except for SourceNodes. Inserts `aStr` between
     * each of `this.children`.
     *
     * @param aSep The separator.
     */
    SourceNode.prototype.join = function SourceNode_join(aSep) {
      var newChildren;
      var i;
      var len = this.children.length;
      if (len > 0) {
        newChildren = [];
        for (i = 0; i < len-1; i++) {
          newChildren.push(this.children[i]);
          newChildren.push(aSep);
        }
        newChildren.push(this.children[i]);
        this.children = newChildren;
      }
      return this;
    };

    /**
     * Call String.prototype.replace on the very right-most source snippet. Useful
     * for trimming whitespace from the end of a source node, etc.
     *
     * @param aPattern The pattern to replace.
     * @param aReplacement The thing to replace the pattern with.
     */
    SourceNode.prototype.replaceRight = function SourceNode_replaceRight(aPattern, aReplacement) {
      var lastChild = this.children[this.children.length - 1];
      if (lastChild[isSourceNode]) {
        lastChild.replaceRight(aPattern, aReplacement);
      }
      else if (typeof lastChild === 'string') {
        this.children[this.children.length - 1] = lastChild.replace(aPattern, aReplacement);
      }
      else {
        this.children.push(''.replace(aPattern, aReplacement));
      }
      return this;
    };

    /**
     * Set the source content for a source file. This will be added to the SourceMapGenerator
     * in the sourcesContent field.
     *
     * @param aSourceFile The filename of the source file
     * @param aSourceContent The content of the source file
     */
    SourceNode.prototype.setSourceContent =
      function SourceNode_setSourceContent(aSourceFile, aSourceContent) {
        this.sourceContents[util.toSetString(aSourceFile)] = aSourceContent;
      };

    /**
     * Walk over the tree of SourceNodes. The walking function is called for each
     * source file content and is passed the filename and source content.
     *
     * @param aFn The traversal function.
     */
    SourceNode.prototype.walkSourceContents =
      function SourceNode_walkSourceContents(aFn) {
        for (var i = 0, len = this.children.length; i < len; i++) {
          if (this.children[i][isSourceNode]) {
            this.children[i].walkSourceContents(aFn);
          }
        }

        var sources = Object.keys(this.sourceContents);
        for (var i = 0, len = sources.length; i < len; i++) {
          aFn(util.fromSetString(sources[i]), this.sourceContents[sources[i]]);
        }
      };

    /**
     * Return the string representation of this source node. Walks over the tree
     * and concatenates all the various snippets together to one string.
     */
    SourceNode.prototype.toString = function SourceNode_toString() {
      var str = "";
      this.walk(function (chunk) {
        str += chunk;
      });
      return str;
    };

    /**
     * Returns the string representation of this source node along with a source
     * map.
     */
    SourceNode.prototype.toStringWithSourceMap = function SourceNode_toStringWithSourceMap(aArgs) {
      var generated = {
        code: "",
        line: 1,
        column: 0
      };
      var map = new SourceMapGenerator$1(aArgs);
      var sourceMappingActive = false;
      var lastOriginalSource = null;
      var lastOriginalLine = null;
      var lastOriginalColumn = null;
      var lastOriginalName = null;
      this.walk(function (chunk, original) {
        generated.code += chunk;
        if (original.source !== null
            && original.line !== null
            && original.column !== null) {
          if(lastOriginalSource !== original.source
             || lastOriginalLine !== original.line
             || lastOriginalColumn !== original.column
             || lastOriginalName !== original.name) {
            map.addMapping({
              source: original.source,
              original: {
                line: original.line,
                column: original.column
              },
              generated: {
                line: generated.line,
                column: generated.column
              },
              name: original.name
            });
          }
          lastOriginalSource = original.source;
          lastOriginalLine = original.line;
          lastOriginalColumn = original.column;
          lastOriginalName = original.name;
          sourceMappingActive = true;
        } else if (sourceMappingActive) {
          map.addMapping({
            generated: {
              line: generated.line,
              column: generated.column
            }
          });
          lastOriginalSource = null;
          sourceMappingActive = false;
        }
        for (var idx = 0, length = chunk.length; idx < length; idx++) {
          if (chunk.charCodeAt(idx) === NEWLINE_CODE) {
            generated.line++;
            generated.column = 0;
            // Mappings end at eol
            if (idx + 1 === length) {
              lastOriginalSource = null;
              sourceMappingActive = false;
            } else if (sourceMappingActive) {
              map.addMapping({
                source: original.source,
                original: {
                  line: original.line,
                  column: original.column
                },
                generated: {
                  line: generated.line,
                  column: generated.column
                },
                name: original.name
              });
            }
          } else {
            generated.column++;
          }
        }
      });
      this.walkSourceContents(function (sourceFile, sourceContent) {
        map.setSourceContent(sourceFile, sourceContent);
      });

      return { code: generated.code, map: map };
    };

    var SourceNode_1 = SourceNode;

    var sourceNode = {
        SourceNode: SourceNode_1
    };

    /*
     * Copyright 2009-2011 Mozilla Foundation and contributors
     * Licensed under the New BSD license. See LICENSE.txt or:
     * http://opensource.org/licenses/BSD-3-Clause
     */
    var SourceMapGenerator$2 = sourceMapGenerator.SourceMapGenerator;
    var SourceMapConsumer$1 = sourceMapConsumer.SourceMapConsumer;
    var SourceNode$1 = sourceNode.SourceNode;

    var sourceMap = {
        SourceMapGenerator: SourceMapGenerator$2,
        SourceMapConsumer: SourceMapConsumer$1,
        SourceNode: SourceNode$1
    };

    var SourceMapGenerator$3 = sourceMap.SourceMapGenerator;
    var trackNodes = {
        Atrule: true,
        Selector: true,
        Declaration: true
    };

    var sourceMap$1 = function generateSourceMap(handlers) {
        var map = new SourceMapGenerator$3();
        var line = 1;
        var column = 0;
        var generated = {
            line: 1,
            column: 0
        };
        var original = {
            line: 0, // should be zero to add first mapping
            column: 0
        };
        var sourceMappingActive = false;
        var activatedGenerated = {
            line: 1,
            column: 0
        };
        var activatedMapping = {
            generated: activatedGenerated
        };

        var handlersNode = handlers.node;
        handlers.node = function(node) {
            if (node.loc && node.loc.start && trackNodes.hasOwnProperty(node.type)) {
                var nodeLine = node.loc.start.line;
                var nodeColumn = node.loc.start.column - 1;

                if (original.line !== nodeLine ||
                    original.column !== nodeColumn) {
                    original.line = nodeLine;
                    original.column = nodeColumn;

                    generated.line = line;
                    generated.column = column;

                    if (sourceMappingActive) {
                        sourceMappingActive = false;
                        if (generated.line !== activatedGenerated.line ||
                            generated.column !== activatedGenerated.column) {
                            map.addMapping(activatedMapping);
                        }
                    }

                    sourceMappingActive = true;
                    map.addMapping({
                        source: node.loc.source,
                        original: original,
                        generated: generated
                    });
                }
            }

            handlersNode.call(this, node);

            if (sourceMappingActive && trackNodes.hasOwnProperty(node.type)) {
                activatedGenerated.line = line;
                activatedGenerated.column = column;
            }
        };

        var handlersChunk = handlers.chunk;
        handlers.chunk = function(chunk) {
            for (var i = 0; i < chunk.length; i++) {
                if (chunk.charCodeAt(i) === 10) { // \n
                    line++;
                    column = 0;
                } else {
                    column++;
                }
            }

            handlersChunk(chunk);
        };

        var handlersResult = handlers.result;
        handlers.result = function() {
            if (sourceMappingActive) {
                map.addMapping(activatedMapping);
            }

            return {
                css: handlersResult(),
                map: map
            };
        };

        return handlers;
    };

    var hasOwnProperty$3 = Object.prototype.hasOwnProperty;

    function processChildren(node, delimeter) {
        var list = node.children;
        var prev = null;

        if (typeof delimeter !== 'function') {
            list.forEach(this.node, this);
        } else {
            list.forEach(function(node) {
                if (prev !== null) {
                    delimeter.call(this, prev);
                }

                this.node(node);
                prev = node;
            }, this);
        }
    }

    var create$2 = function createGenerator(config) {
        function processNode(node) {
            if (hasOwnProperty$3.call(types, node.type)) {
                types[node.type].call(this, node);
            } else {
                throw new Error('Unknown node type: ' + node.type);
            }
        }

        var types = {};

        if (config.node) {
            for (var name in config.node) {
                types[name] = config.node[name].generate;
            }
        }

        return function(node, options) {
            var buffer = '';
            var handlers = {
                children: processChildren,
                node: processNode,
                chunk: function(chunk) {
                    buffer += chunk;
                },
                result: function() {
                    return buffer;
                }
            };

            if (options) {
                if (typeof options.decorator === 'function') {
                    handlers = options.decorator(handlers);
                }

                if (options.sourceMap) {
                    handlers = sourceMap$1(handlers);
                }
            }

            handlers.node(node);

            return handlers.result();
        };
    };

    var create$3 = function createConvertors(walk) {
        return {
            fromPlainObject: function(ast) {
                walk(ast, {
                    enter: function(node) {
                        if (node.children && node.children instanceof list === false) {
                            node.children = new list().fromArray(node.children);
                        }
                    }
                });

                return ast;
            },
            toPlainObject: function(ast) {
                walk(ast, {
                    leave: function(node) {
                        if (node.children && node.children instanceof list) {
                            node.children = node.children.toArray();
                        }
                    }
                });

                return ast;
            }
        };
    };

    var hasOwnProperty$4 = Object.prototype.hasOwnProperty;
    var noop$4 = function() {};

    function ensureFunction$1(value) {
        return typeof value === 'function' ? value : noop$4;
    }

    function invokeForType(fn, type) {
        return function(node, item, list) {
            if (node.type === type) {
                fn.call(this, node, item, list);
            }
        };
    }

    function getWalkersFromStructure(name, nodeType) {
        var structure = nodeType.structure;
        var walkers = [];

        for (var key in structure) {
            if (hasOwnProperty$4.call(structure, key) === false) {
                continue;
            }

            var fieldTypes = structure[key];
            var walker = {
                name: key,
                type: false,
                nullable: false
            };

            if (!Array.isArray(structure[key])) {
                fieldTypes = [structure[key]];
            }

            for (var i = 0; i < fieldTypes.length; i++) {
                var fieldType = fieldTypes[i];
                if (fieldType === null) {
                    walker.nullable = true;
                } else if (typeof fieldType === 'string') {
                    walker.type = 'node';
                } else if (Array.isArray(fieldType)) {
                    walker.type = 'list';
                }
            }

            if (walker.type) {
                walkers.push(walker);
            }
        }

        if (walkers.length) {
            return {
                context: nodeType.walkContext,
                fields: walkers
            };
        }

        return null;
    }

    function getTypesFromConfig(config) {
        var types = {};

        for (var name in config.node) {
            if (hasOwnProperty$4.call(config.node, name)) {
                var nodeType = config.node[name];

                if (!nodeType.structure) {
                    throw new Error('Missed `structure` field in `' + name + '` node type definition');
                }

                types[name] = getWalkersFromStructure(name, nodeType);
            }
        }

        return types;
    }

    function createTypeIterator(config, reverse) {
        var fields = reverse ? config.fields.slice().reverse() : config.fields;
        var body = fields.map(function(field) {
            var ref = 'node.' + field.name;
            var line;

            if (field.type === 'list') {
                line = reverse
                    ? ref + '.forEachRight(walk);'
                    : ref + '.forEach(walk);';
            } else {
                line = 'walk(' + ref + ');';
            }

            if (field.nullable) {
                line = 'if (' + ref + ') {\n    ' + line + '}';
            }

            return line;
        });

        if (config.context) {
            body = [].concat(
                'var old = context.' + config.context + ';',
                'context.' + config.context + ' = node;',
                body,
                'context.' + config.context + ' = old;'
            );
        }

        return new Function('node', 'context', 'walk', body.join('\n'));
    }

    function createFastTraveralMap(iterators) {
        return {
            Atrule: {
                StyleSheet: iterators.StyleSheet,
                Atrule: iterators.Atrule,
                Rule: iterators.Rule,
                Block: iterators.Block
            },
            Rule: {
                StyleSheet: iterators.StyleSheet,
                Atrule: iterators.Atrule,
                Rule: iterators.Rule,
                Block: iterators.Block
            },
            Declaration: {
                StyleSheet: iterators.StyleSheet,
                Atrule: iterators.Atrule,
                Rule: iterators.Rule,
                Block: iterators.Block
            }
        };
    }

    var create$4 = function createWalker(config) {
        var types = getTypesFromConfig(config);
        var iteratorsNatural = {};
        var iteratorsReverse = {};

        for (var name in types) {
            if (hasOwnProperty$4.call(types, name) && types[name] !== null) {
                iteratorsNatural[name] = createTypeIterator(types[name], false);
                iteratorsReverse[name] = createTypeIterator(types[name], true);
            }
        }

        var fastTraversalIteratorsNatural = createFastTraveralMap(iteratorsNatural);
        var fastTraversalIteratorsReverse = createFastTraveralMap(iteratorsReverse);

        return function walk(root, options) {
            function walkNode(node, item, list) {
                enter.call(context, node, item, list);

                if (iterators.hasOwnProperty(node.type)) {
                    iterators[node.type](node, context, walkNode);
                }

                leave.call(context, node, item, list);
            }

            var enter = noop$4;
            var leave = noop$4;
            var iterators = iteratorsNatural;
            var context = {
                root: root,
                stylesheet: null,
                atrule: null,
                atrulePrelude: null,
                rule: null,
                selector: null,
                block: null,
                declaration: null,
                function: null
            };

            if (typeof options === 'function') {
                enter = options;
            } else if (options) {
                enter = ensureFunction$1(options.enter);
                leave = ensureFunction$1(options.leave);

                if (options.reverse) {
                    iterators = iteratorsReverse;
                }

                if (options.visit) {
                    if (fastTraversalIteratorsNatural.hasOwnProperty(options.visit)) {
                        iterators = options.reverse
                            ? fastTraversalIteratorsReverse[options.visit]
                            : fastTraversalIteratorsNatural[options.visit];
                    } else if (!types.hasOwnProperty(options.visit)) {
                        throw new Error('Bad value `' + options.visit + '` for `visit` option (should be: ' + Object.keys(types).join(', ') + ')');
                    }

                    enter = invokeForType(enter, options.visit);
                    leave = invokeForType(leave, options.visit);
                }
            }

            if (enter === noop$4 && leave === noop$4) {
                throw new Error('Neither `enter` nor `leave` walker handler is set or both aren\'t a function');
            }

            // swap handlers in reverse mode to invert visit order
            if (options.reverse) {
                var tmp = enter;
                enter = leave;
                leave = tmp;
            }

            walkNode(root);
        };
    };

    var clone = function clone(node) {
        var result = {};

        for (var key in node) {
            var value = node[key];

            if (value) {
                if (Array.isArray(value) || value instanceof list) {
                    value = value.map(clone);
                } else if (value.constructor === Object) {
                    value = clone(value);
                }
            }

            result[key] = value;
        }

        return result;
    };

    var hasOwnProperty$5 = Object.prototype.hasOwnProperty;
    var shape = {
        generic: true,
        types: {},
        properties: {},
        parseContext: {},
        scope: {},
        atrule: ['parse'],
        pseudo: ['parse'],
        node: ['name', 'structure', 'parse', 'generate', 'walkContext']
    };

    function isObject(value) {
        return value && value.constructor === Object;
    }

    function copy(value) {
        if (isObject(value)) {
            var res = {};
            for (var key in value) {
                if (hasOwnProperty$5.call(value, key)) {
                    res[key] = value[key];
                }
            }
            return res;
        } else {
            return value;
        }
    }

    function extend(dest, src) {
        for (var key in src) {
            if (hasOwnProperty$5.call(src, key)) {
                if (isObject(dest[key])) {
                    extend(dest[key], copy(src[key]));
                } else {
                    dest[key] = copy(src[key]);
                }
            }
        }
    }

    function mix(dest, src, shape) {
        for (var key in shape) {
            if (hasOwnProperty$5.call(shape, key) === false) {
                continue;
            }

            if (shape[key] === true) {
                if (key in src) {
                    if (hasOwnProperty$5.call(src, key)) {
                        dest[key] = copy(src[key]);
                    }
                }
            } else if (shape[key]) {
                if (isObject(shape[key])) {
                    var res = {};
                    extend(res, dest[key]);
                    extend(res, src[key]);
                    dest[key] = res;
                } else if (Array.isArray(shape[key])) {
                    var res = {};
                    var innerShape = shape[key].reduce(function(s, k) {
                        s[k] = true;
                        return s;
                    }, {});
                    for (var name in dest[key]) {
                        if (hasOwnProperty$5.call(dest[key], name)) {
                            res[name] = {};
                            if (dest[key] && dest[key][name]) {
                                mix(res[name], dest[key][name], innerShape);
                            }
                        }
                    }
                    for (var name in src[key]) {
                        if (hasOwnProperty$5.call(src[key], name)) {
                            if (!res[name]) {
                                res[name] = {};
                            }
                            if (src[key] && src[key][name]) {
                                mix(res[name], src[key][name], innerShape);
                            }
                        }
                    }
                    dest[key] = res;
                }
            }
        }
        return dest;
    }

    var mix_1 = function(dest, src) {
        return mix(dest, src, shape);
    };

    function assign$1(dest, src) {
        for (var key in src) {
            dest[key] = src[key];
        }

        return dest;
    }

    function createSyntax(config) {
        var parse = create$1(config);
        var walk = create$4(config);
        var generate = create$2(config);
        var convert = create$3(walk);

        var syntax = {
            List: list,
            Tokenizer: tokenizer,
            Lexer: Lexer_1,

            vendorPrefix: names.vendorPrefix,
            keyword: names.keyword,
            property: names.property,
            isCustomProperty: names.isCustomProperty,

            grammar: grammar,
            lexer: null,
            createLexer: function(config) {
                return new Lexer_1(config, syntax, syntax.lexer.structure);
            },

            parse: parse,
            walk: walk,
            generate: generate,

            clone: clone,
            fromPlainObject: convert.fromPlainObject,
            toPlainObject: convert.toPlainObject,

            createSyntax: function(config) {
                return createSyntax(mix_1({}, config));
            },
            fork: function(extension) {
                var base = mix_1({}, config); // copy of config
                return createSyntax(
                    typeof extension === 'function'
                        ? extension(base, assign$1)
                        : mix_1(base, extension)
                );
            }
        };

        syntax.lexer = new Lexer_1({
            generic: true,
            types: config.types,
            properties: config.properties,
            node: config.node
        }, syntax);

        return syntax;
    }
    var create_1 = function(config) {
        return createSyntax(mix_1({}, config));
    };

    var create$5 = {
        create: create_1
    };

    var all = {
        syntax: "initial | inherit | unset | revert",
        media: "noPracticalMedia",
        inherited: false,
        animationType: "eachOfShorthandPropertiesExceptUnicodeBiDiAndDirection",
        percentages: "no",
        groups: [
            "CSS Miscellaneous"
        ],
        initial: "noPracticalInitialValue",
        appliesto: "allElements",
        computed: "asSpecifiedAppliesToEachProperty",
        order: "uniqueOrder",
        status: "standard"
    };
    var animation = {
        syntax: "<single-animation>#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Animations"
        ],
        initial: [
            "animation-name",
            "animation-duration",
            "animation-timing-function",
            "animation-delay",
            "animation-iteration-count",
            "animation-direction",
            "animation-fill-mode",
            "animation-play-state"
        ],
        appliesto: "allElementsAndPseudos",
        computed: [
            "animation-name",
            "animation-duration",
            "animation-timing-function",
            "animation-delay",
            "animation-direction",
            "animation-iteration-count",
            "animation-fill-mode",
            "animation-play-state"
        ],
        order: "orderOfAppearance",
        status: "standard"
    };
    var appearance = {
        syntax: "auto | none",
        media: "all",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Basic User Interface"
        ],
        initial: "auto",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "perGrammar",
        status: "experimental"
    };
    var azimuth = {
        syntax: "<angle> | [ [ left-side | far-left | left | center-left | center | center-right | right | far-right | right-side ] || behind ] | leftwards | rightwards",
        media: "aural",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Speech"
        ],
        initial: "center",
        appliesto: "allElements",
        computed: "normalizedAngle",
        order: "orderOfAppearance",
        status: "obsolete"
    };
    var background = {
        syntax: "[ <bg-layer> , ]* <final-bg-layer>",
        media: "visual",
        inherited: false,
        animationType: [
            "background-color",
            "background-image",
            "background-clip",
            "background-position",
            "background-size",
            "background-repeat",
            "background-attachment"
        ],
        percentages: [
            "background-position",
            "background-size"
        ],
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: [
            "background-image",
            "background-position",
            "background-size",
            "background-repeat",
            "background-origin",
            "background-clip",
            "background-attachment",
            "background-color"
        ],
        appliesto: "allElements",
        computed: [
            "background-image",
            "background-position",
            "background-size",
            "background-repeat",
            "background-origin",
            "background-clip",
            "background-attachment",
            "background-color"
        ],
        order: "orderOfAppearance",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    };
    var border = {
        syntax: "<br-width> || <br-style> || <color>",
        media: "visual",
        inherited: false,
        animationType: [
            "border-color",
            "border-style",
            "border-width"
        ],
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: [
            "border-width",
            "border-style",
            "border-color"
        ],
        appliesto: "allElements",
        computed: [
            "border-width",
            "border-style",
            "border-color"
        ],
        order: "orderOfAppearance",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    };
    var bottom = {
        syntax: "<length> | <percentage> | auto",
        media: "visual",
        inherited: false,
        animationType: "lpc",
        percentages: "referToContainingBlockHeight",
        groups: [
            "CSS Positioning"
        ],
        initial: "auto",
        appliesto: "positionedElements",
        computed: "lengthAbsolutePercentageAsSpecifiedOtherwiseAuto",
        order: "uniqueOrder",
        status: "standard"
    };
    var clear = {
        syntax: "none | left | right | both | inline-start | inline-end",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Positioning"
        ],
        initial: "none",
        appliesto: "blockLevelElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    };
    var clip = {
        syntax: "<shape> | auto",
        media: "visual",
        inherited: false,
        animationType: "rectangle",
        percentages: "no",
        groups: [
            "CSS Masking"
        ],
        initial: "auto",
        appliesto: "absolutelyPositionedElements",
        computed: "autoOrRectangle",
        order: "uniqueOrder",
        status: "standard"
    };
    var color = {
        syntax: "<color>",
        media: "visual",
        inherited: true,
        animationType: "color",
        percentages: "no",
        groups: [
            "CSS Color"
        ],
        initial: "variesFromBrowserToBrowser",
        appliesto: "allElements",
        computed: "translucentValuesRGBAOtherwiseRGB",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    };
    var columns = {
        syntax: "<'column-width'> || <'column-count'>",
        media: "visual",
        inherited: false,
        animationType: [
            "column-width",
            "column-count"
        ],
        percentages: "no",
        groups: [
            "CSS Columns"
        ],
        initial: [
            "column-width",
            "column-count"
        ],
        appliesto: "blockContainersExceptTableWrappers",
        computed: [
            "column-width",
            "column-count"
        ],
        order: "perGrammar",
        status: "standard"
    };
    var contain = {
        syntax: "none | strict | content | [ size || layout || style || paint ]",
        media: "all",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Containment"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "perGrammar",
        status: "experimental"
    };
    var content = {
        syntax: "normal | none | [ <content-replacement> | <content-list> ] [/ <string> ]?",
        media: "all",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Generated Content"
        ],
        initial: "normal",
        appliesto: "beforeAndAfterPseudos",
        computed: "normalOnElementsForPseudosNoneAbsoluteURIStringOrAsSpecified",
        order: "uniqueOrder",
        status: "standard"
    };
    var cursor = {
        syntax: "[ [ <url> [ <x> <y> ]? , ]* [ auto | default | none | context-menu | help | pointer | progress | wait | cell | crosshair | text | vertical-text | alias | copy | move | no-drop | not-allowed | e-resize | n-resize | ne-resize | nw-resize | s-resize | se-resize | sw-resize | w-resize | ew-resize | ns-resize | nesw-resize | nwse-resize | col-resize | row-resize | all-scroll | zoom-in | zoom-out | grab | grabbing ] ]",
        media: [
            "visual",
            "interactive"
        ],
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Basic User Interface"
        ],
        initial: "auto",
        appliesto: "allElements",
        computed: "asSpecifiedURLsAbsolute",
        order: "uniqueOrder",
        status: "standard"
    };
    var direction = {
        syntax: "ltr | rtl",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Writing Modes"
        ],
        initial: "ltr",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    };
    var display = {
        syntax: "[ <display-outside> || <display-inside> ] | <display-listitem> | <display-internal> | <display-box> | <display-legacy>",
        media: "all",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Display"
        ],
        initial: "inline",
        appliesto: "allElements",
        computed: "asSpecifiedExceptPositionedFloatingAndRootElementsKeywordMaybeDifferent",
        order: "uniqueOrder",
        status: "standard"
    };
    var filter = {
        syntax: "none | <filter-function-list>",
        media: "visual",
        inherited: false,
        animationType: "filterList",
        percentages: "no",
        groups: [
            "Filter Effects"
        ],
        initial: "none",
        appliesto: "allElementsSVGContainerElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    };
    var flex = {
        syntax: "none | [ <'flex-grow'> <'flex-shrink'>? || <'flex-basis'> ]",
        media: "visual",
        inherited: false,
        animationType: [
            "flex-grow",
            "flex-shrink",
            "flex-basis"
        ],
        percentages: "no",
        groups: [
            "CSS Flexible Box Layout"
        ],
        initial: [
            "flex-grow",
            "flex-shrink",
            "flex-basis"
        ],
        appliesto: "flexItemsAndInFlowPseudos",
        computed: [
            "flex-grow",
            "flex-shrink",
            "flex-basis"
        ],
        order: "orderOfAppearance",
        status: "standard"
    };
    var float = {
        syntax: "left | right | none | inline-start | inline-end",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Positioning"
        ],
        initial: "none",
        appliesto: "allElementsNoEffectIfDisplayNone",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    };
    var font = {
        syntax: "[ [ <'font-style'> || <font-variant-css21> || <'font-weight'> || <'font-stretch'> ]? <'font-size'> [ / <'line-height'> ]? <'font-family'> ] | caption | icon | menu | message-box | small-caption | status-bar",
        media: "visual",
        inherited: true,
        animationType: [
            "font-style",
            "font-variant",
            "font-weight",
            "font-stretch",
            "font-size",
            "line-height",
            "font-family"
        ],
        percentages: [
            "font-size",
            "line-height"
        ],
        groups: [
            "CSS Fonts"
        ],
        initial: [
            "font-style",
            "font-variant",
            "font-weight",
            "font-stretch",
            "font-size",
            "line-height",
            "font-family"
        ],
        appliesto: "allElements",
        computed: [
            "font-style",
            "font-variant",
            "font-weight",
            "font-stretch",
            "font-size",
            "line-height",
            "font-family"
        ],
        order: "orderOfAppearance",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    };
    var gap = {
        syntax: "<'row-gap'> <'column-gap'>?",
        media: "visual",
        inherited: false,
        animationType: [
            "row-gap",
            "column-gap"
        ],
        percentages: "no",
        groups: [
            "CSS Box Alignment"
        ],
        initial: [
            "row-gap",
            "column-gap"
        ],
        appliesto: "gridContainers",
        computed: [
            "row-gap",
            "column-gap"
        ],
        order: "uniqueOrder",
        status: "standard"
    };
    var grid = {
        syntax: "<'grid-template'> | <'grid-template-rows'> / [ auto-flow && dense? ] <'grid-auto-columns'>? | [ auto-flow && dense? ] <'grid-auto-rows'>? / <'grid-template-columns'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: [
            "grid-template-rows",
            "grid-template-columns",
            "grid-auto-rows",
            "grid-auto-columns"
        ],
        groups: [
            "CSS Grid Layout"
        ],
        initial: [
            "grid-template-rows",
            "grid-template-columns",
            "grid-template-areas",
            "grid-auto-rows",
            "grid-auto-columns",
            "grid-auto-flow",
            "grid-column-gap",
            "grid-row-gap",
            "column-gap",
            "row-gap"
        ],
        appliesto: "gridContainers",
        computed: [
            "grid-template-rows",
            "grid-template-columns",
            "grid-template-areas",
            "grid-auto-rows",
            "grid-auto-columns",
            "grid-auto-flow",
            "grid-column-gap",
            "grid-row-gap",
            "column-gap",
            "row-gap"
        ],
        order: "uniqueOrder",
        status: "standard"
    };
    var height = {
        syntax: "[ <length> | <percentage> ] && [ border-box | content-box ]? | available | min-content | max-content | fit-content | auto",
        media: "visual",
        inherited: false,
        animationType: "lpc",
        percentages: "regardingHeightOfGeneratedBoxContainingBlockPercentagesRelativeToContainingBlock",
        groups: [
            "CSS Box Model"
        ],
        initial: "auto",
        appliesto: "allElementsButNonReplacedAndTableColumns",
        computed: "percentageAutoOrAbsoluteLength",
        order: "uniqueOrder",
        status: "standard"
    };
    var hyphens = {
        syntax: "none | manual | auto",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Text"
        ],
        initial: "manual",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    };
    var isolation = {
        syntax: "auto | isolate",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Compositing and Blending"
        ],
        initial: "auto",
        appliesto: "allElementsSVGContainerGraphicsAndGraphicsReferencingElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    };
    var left = {
        syntax: "<length> | <percentage> | auto",
        media: "visual",
        inherited: false,
        animationType: "lpc",
        percentages: "referToWidthOfContainingBlock",
        groups: [
            "CSS Positioning"
        ],
        initial: "auto",
        appliesto: "positionedElements",
        computed: "lengthAbsolutePercentageAsSpecifiedOtherwiseAuto",
        order: "uniqueOrder",
        status: "standard"
    };
    var margin = {
        syntax: "[ <length> | <percentage> | auto ]{1,4}",
        media: "visual",
        inherited: false,
        animationType: "length",
        percentages: "referToWidthOfContainingBlock",
        groups: [
            "CSS Box Model"
        ],
        initial: [
            "margin-bottom",
            "margin-left",
            "margin-right",
            "margin-top"
        ],
        appliesto: "allElementsExceptTableDisplayTypes",
        computed: [
            "margin-bottom",
            "margin-left",
            "margin-right",
            "margin-top"
        ],
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    };
    var mask = {
        syntax: "<mask-layer>#",
        media: "visual",
        inherited: false,
        animationType: [
            "mask-image",
            "mask-mode",
            "mask-repeat",
            "mask-position",
            "mask-clip",
            "mask-origin",
            "mask-size",
            "mask-composite"
        ],
        percentages: [
            "mask-position"
        ],
        groups: [
            "CSS Masking"
        ],
        initial: [
            "mask-image",
            "mask-mode",
            "mask-repeat",
            "mask-position",
            "mask-clip",
            "mask-origin",
            "mask-size",
            "mask-composite"
        ],
        appliesto: "allElementsSVGContainerElements",
        computed: [
            "mask-image",
            "mask-mode",
            "mask-repeat",
            "mask-position",
            "mask-clip",
            "mask-origin",
            "mask-size",
            "mask-composite"
        ],
        order: "perGrammar",
        stacking: true,
        status: "standard"
    };
    var offset = {
        syntax: "[ <'offset-position'>? [ <'offset-path'> [ <'offset-distance'> || <'offset-rotate'> ]? ]? ]! [ / <'offset-anchor'> ]?",
        media: "visual",
        inherited: false,
        animationType: [
            "offset-position",
            "offset-path",
            "offset-distance",
            "offset-anchor",
            "offset-rotate"
        ],
        percentages: [
            "offset-position",
            "offset-distance",
            "offset-anchor"
        ],
        groups: [
            "CSS Motion"
        ],
        initial: [
            "offset-position",
            "offset-path",
            "offset-distance",
            "offset-anchor",
            "offset-rotate"
        ],
        appliesto: "transformableElements",
        computed: [
            "offset-position",
            "offset-path",
            "offset-distance",
            "offset-anchor",
            "offset-rotate"
        ],
        order: "perGrammar",
        stacking: true,
        status: "experimental"
    };
    var opacity = {
        syntax: "<number>",
        media: "visual",
        inherited: false,
        animationType: "number",
        percentages: "no",
        groups: [
            "CSS Color"
        ],
        initial: "1.0",
        appliesto: "allElements",
        computed: "specifiedValueClipped0To1",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::placeholder"
        ],
        status: "standard"
    };
    var order = {
        syntax: "<integer>",
        media: "visual",
        inherited: false,
        animationType: "integer",
        percentages: "no",
        groups: [
            "CSS Flexible Box Layout"
        ],
        initial: "0",
        appliesto: "flexItemsAndAbsolutelyPositionedFlexContainerChildren",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    };
    var orphans = {
        syntax: "<integer>",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Fragmentation"
        ],
        initial: "2",
        appliesto: "blockContainerElements",
        computed: "asSpecified",
        order: "perGrammar",
        status: "standard"
    };
    var outline = {
        syntax: "[ <'outline-color'> || <'outline-style'> || <'outline-width'> ]",
        media: [
            "visual",
            "interactive"
        ],
        inherited: false,
        animationType: [
            "outline-color",
            "outline-width",
            "outline-style"
        ],
        percentages: "no",
        groups: [
            "CSS Basic User Interface"
        ],
        initial: [
            "outline-color",
            "outline-style",
            "outline-width"
        ],
        appliesto: "allElements",
        computed: [
            "outline-color",
            "outline-width",
            "outline-style"
        ],
        order: "orderOfAppearance",
        status: "standard"
    };
    var overflow = {
        syntax: "[ visible | hidden | clip | scroll | auto ]{1,2}",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Overflow"
        ],
        initial: "visible",
        appliesto: "blockContainersFlexContainersGridContainers",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    };
    var padding = {
        syntax: "[ <length> | <percentage> ]{1,4}",
        media: "visual",
        inherited: false,
        animationType: "length",
        percentages: "referToWidthOfContainingBlock",
        groups: [
            "CSS Box Model"
        ],
        initial: [
            "padding-bottom",
            "padding-left",
            "padding-right",
            "padding-top"
        ],
        appliesto: "allElementsExceptInternalTableDisplayTypes",
        computed: [
            "padding-bottom",
            "padding-left",
            "padding-right",
            "padding-top"
        ],
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    };
    var perspective = {
        syntax: "none | <length>",
        media: "visual",
        inherited: false,
        animationType: "length",
        percentages: "no",
        groups: [
            "CSS Transforms"
        ],
        initial: "none",
        appliesto: "transformableElements",
        computed: "absoluteLengthOrNone",
        order: "uniqueOrder",
        stacking: true,
        status: "standard"
    };
    var position = {
        syntax: "static | relative | absolute | sticky | fixed",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Positioning"
        ],
        initial: "static",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        stacking: true,
        status: "standard"
    };
    var quotes = {
        syntax: "none | [ <string> <string> ]+",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Generated Content"
        ],
        initial: "dependsOnUserAgent",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    };
    var resize = {
        syntax: "none | both | horizontal | vertical",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Basic User Interface"
        ],
        initial: "none",
        appliesto: "elementsWithOverflowNotVisibleAndReplacedElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    };
    var right = {
        syntax: "<length> | <percentage> | auto",
        media: "visual",
        inherited: false,
        animationType: "lpc",
        percentages: "referToWidthOfContainingBlock",
        groups: [
            "CSS Positioning"
        ],
        initial: "auto",
        appliesto: "positionedElements",
        computed: "lengthAbsolutePercentageAsSpecifiedOtherwiseAuto",
        order: "uniqueOrder",
        status: "standard"
    };
    var rotate = {
        syntax: "none | [ x | y | z | <number>{3} ]? && <angle>",
        media: "visual",
        inherited: false,
        animationType: "transform",
        percentages: "no",
        groups: [
            "CSS Transforms"
        ],
        initial: "none",
        appliesto: "transformableElements",
        computed: "asSpecified",
        order: "perGrammar",
        stacking: true,
        status: "standard"
    };
    var scale = {
        syntax: "none | <number>{1,3}",
        media: "visual",
        inherited: false,
        animationType: "transform",
        percentages: "no",
        groups: [
            "CSS Transforms"
        ],
        initial: "none",
        appliesto: "transformableElements",
        computed: "asSpecified",
        order: "perGrammar",
        stacking: true,
        status: "standard"
    };
    var top = {
        syntax: "<length> | <percentage> | auto",
        media: "visual",
        inherited: false,
        animationType: "lpc",
        percentages: "referToContainingBlockHeight",
        groups: [
            "CSS Positioning"
        ],
        initial: "auto",
        appliesto: "positionedElements",
        computed: "lengthAbsolutePercentageAsSpecifiedOtherwiseAuto",
        order: "uniqueOrder",
        status: "standard"
    };
    var transform = {
        syntax: "none | <transform-list>",
        media: "visual",
        inherited: false,
        animationType: "transform",
        percentages: "referToSizeOfBoundingBox",
        groups: [
            "CSS Transforms"
        ],
        initial: "none",
        appliesto: "transformableElements",
        computed: "asSpecifiedRelativeToAbsoluteLengths",
        order: "uniqueOrder",
        stacking: true,
        status: "standard"
    };
    var transition = {
        syntax: "<single-transition>#",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Transitions"
        ],
        initial: [
            "transition-delay",
            "transition-duration",
            "transition-property",
            "transition-timing-function"
        ],
        appliesto: "allElementsAndPseudos",
        computed: [
            "transition-delay",
            "transition-duration",
            "transition-property",
            "transition-timing-function"
        ],
        order: "orderOfAppearance",
        status: "standard"
    };
    var translate = {
        syntax: "none | <length-percentage> [ <length-percentage> <length>? ]?",
        media: "visual",
        inherited: false,
        animationType: "transform",
        percentages: "referToSizeOfBoundingBox",
        groups: [
            "CSS Transforms"
        ],
        initial: "none",
        appliesto: "transformableElements",
        computed: "asSpecifiedRelativeToAbsoluteLengths",
        order: "perGrammar",
        stacking: true,
        status: "standard"
    };
    var visibility = {
        syntax: "visible | hidden | collapse",
        media: "visual",
        inherited: true,
        animationType: "visibility",
        percentages: "no",
        groups: [
            "CSS Box Model"
        ],
        initial: "visible",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    };
    var widows = {
        syntax: "<integer>",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Fragmentation"
        ],
        initial: "2",
        appliesto: "blockContainerElements",
        computed: "asSpecified",
        order: "perGrammar",
        status: "standard"
    };
    var width = {
        syntax: "[ <length> | <percentage> ] && [ border-box | content-box ]? | available | min-content | max-content | fit-content | auto",
        media: "visual",
        inherited: false,
        animationType: "lpc",
        percentages: "referToWidthOfContainingBlock",
        groups: [
            "CSS Box Model"
        ],
        initial: "auto",
        appliesto: "allElementsButNonReplacedAndTableRows",
        computed: "percentageAutoOrAbsoluteLength",
        order: "lengthOrPercentageBeforeKeywordIfBothPresent",
        status: "standard"
    };
    var zoom = {
        syntax: "normal | reset | <number> | <percentage>",
        media: "visual",
        inherited: false,
        animationType: "integer",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "normal",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    };
    var properties$1 = {
        "--*": {
        syntax: "<declaration-value>",
        media: "all",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Variables"
        ],
        initial: "seeProse",
        appliesto: "allElements",
        computed: "asSpecifiedWithVarsSubstituted",
        order: "perGrammar",
        status: "experimental"
    },
        "-ms-accelerator": {
        syntax: "false | true",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "false",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-block-progression": {
        syntax: "tb | rl | bt | lr",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "tb",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-content-zoom-chaining": {
        syntax: "none | chained",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "none",
        appliesto: "nonReplacedBlockAndInlineBlockElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-content-zooming": {
        syntax: "none | zoom",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "zoomForTheTopLevelNoneForTheRest",
        appliesto: "nonReplacedBlockAndInlineBlockElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-content-zoom-limit": {
        syntax: "<'-ms-content-zoom-limit-min'> <'-ms-content-zoom-limit-max'>",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: [
            "-ms-content-zoom-limit-max",
            "-ms-content-zoom-limit-min"
        ],
        groups: [
            "Microsoft Extensions"
        ],
        initial: [
            "-ms-content-zoom-limit-max",
            "-ms-content-zoom-limit-min"
        ],
        appliesto: "nonReplacedBlockAndInlineBlockElements",
        computed: [
            "-ms-content-zoom-limit-max",
            "-ms-content-zoom-limit-min"
        ],
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-content-zoom-limit-max": {
        syntax: "<percentage>",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "maxZoomFactor",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "400%",
        appliesto: "nonReplacedBlockAndInlineBlockElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-content-zoom-limit-min": {
        syntax: "<percentage>",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "minZoomFactor",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "100%",
        appliesto: "nonReplacedBlockAndInlineBlockElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-content-zoom-snap": {
        syntax: "<'-ms-content-zoom-snap-type'> || <'-ms-content-zoom-snap-points'>",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: [
            "-ms-content-zoom-snap-type",
            "-ms-content-zoom-snap-points"
        ],
        appliesto: "nonReplacedBlockAndInlineBlockElements",
        computed: [
            "-ms-content-zoom-snap-type",
            "-ms-content-zoom-snap-points"
        ],
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-content-zoom-snap-points": {
        syntax: "snapInterval( <percentage>, <percentage> ) | snapList( <percentage># )",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "snapInterval(0%, 100%)",
        appliesto: "nonReplacedBlockAndInlineBlockElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-content-zoom-snap-type": {
        syntax: "none | proximity | mandatory",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "none",
        appliesto: "nonReplacedBlockAndInlineBlockElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-filter": {
        syntax: "<string>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "\"\"",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-flow-from": {
        syntax: "[ none | <custom-ident> ]#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "none",
        appliesto: "nonReplacedElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-flow-into": {
        syntax: "[ none | <custom-ident> ]#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "none",
        appliesto: "iframeElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-high-contrast-adjust": {
        syntax: "auto | none",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "auto",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-hyphenate-limit-chars": {
        syntax: "auto | <integer>{1,3}",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "auto",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-hyphenate-limit-lines": {
        syntax: "no-limit | <integer>",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "no-limit",
        appliesto: "blockContainerElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-hyphenate-limit-zone": {
        syntax: "<percentage> | <length>",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "referToLineBoxWidth",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "0",
        appliesto: "blockContainerElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-ime-align": {
        syntax: "auto | after",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "auto",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-overflow-style": {
        syntax: "auto | none | scrollbar | -ms-autohiding-scrollbar",
        media: "interactive",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "auto",
        appliesto: "nonReplacedBlockAndInlineBlockElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-scrollbar-3dlight-color": {
        syntax: "<color>",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "dependsOnUserAgent",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-scrollbar-arrow-color": {
        syntax: "<color>",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "ButtonText",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-scrollbar-base-color": {
        syntax: "<color>",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "dependsOnUserAgent",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-scrollbar-darkshadow-color": {
        syntax: "<color>",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "ThreeDDarkShadow",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-scrollbar-face-color": {
        syntax: "<color>",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "ThreeDFace",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-scrollbar-highlight-color": {
        syntax: "<color>",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "ThreeDHighlight",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-scrollbar-shadow-color": {
        syntax: "<color>",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "ThreeDDarkShadow",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-scrollbar-track-color": {
        syntax: "<color>",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "Scrollbar",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-scroll-chaining": {
        syntax: "chained | none",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "chained",
        appliesto: "nonReplacedBlockAndInlineBlockElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-scroll-limit": {
        syntax: "<'-ms-scroll-limit-x-min'> <'-ms-scroll-limit-y-min'> <'-ms-scroll-limit-x-max'> <'-ms-scroll-limit-y-max'>",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: [
            "-ms-scroll-limit-x-min",
            "-ms-scroll-limit-y-min",
            "-ms-scroll-limit-x-max",
            "-ms-scroll-limit-y-max"
        ],
        appliesto: "nonReplacedBlockAndInlineBlockElements",
        computed: [
            "-ms-scroll-limit-x-min",
            "-ms-scroll-limit-y-min",
            "-ms-scroll-limit-x-max",
            "-ms-scroll-limit-y-max"
        ],
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-scroll-limit-x-max": {
        syntax: "auto | <length>",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "auto",
        appliesto: "nonReplacedBlockAndInlineBlockElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-scroll-limit-x-min": {
        syntax: "<length>",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "0",
        appliesto: "nonReplacedBlockAndInlineBlockElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-scroll-limit-y-max": {
        syntax: "auto | <length>",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "auto",
        appliesto: "nonReplacedBlockAndInlineBlockElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-scroll-limit-y-min": {
        syntax: "<length>",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "0",
        appliesto: "nonReplacedBlockAndInlineBlockElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-scroll-rails": {
        syntax: "none | railed",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "railed",
        appliesto: "nonReplacedBlockAndInlineBlockElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-scroll-snap-points-x": {
        syntax: "snapInterval( <length-percentage>, <length-percentage> ) | snapList( <length-percentage># )",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "snapInterval(0px, 100%)",
        appliesto: "nonReplacedBlockAndInlineBlockElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-scroll-snap-points-y": {
        syntax: "snapInterval( <length-percentage>, <length-percentage> ) | snapList( <length-percentage># )",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "snapInterval(0px, 100%)",
        appliesto: "nonReplacedBlockAndInlineBlockElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-scroll-snap-type": {
        syntax: "none | proximity | mandatory",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "none",
        appliesto: "nonReplacedBlockAndInlineBlockElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-scroll-snap-x": {
        syntax: "<'-ms-scroll-snap-type'> <'-ms-scroll-snap-points-x'>",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: [
            "-ms-scroll-snap-type",
            "-ms-scroll-snap-points-x"
        ],
        appliesto: "nonReplacedBlockAndInlineBlockElements",
        computed: [
            "-ms-scroll-snap-type",
            "-ms-scroll-snap-points-x"
        ],
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-scroll-snap-y": {
        syntax: "<'-ms-scroll-snap-type'> <'-ms-scroll-snap-points-y'>",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: [
            "-ms-scroll-snap-type",
            "-ms-scroll-snap-points-y"
        ],
        appliesto: "nonReplacedBlockAndInlineBlockElements",
        computed: [
            "-ms-scroll-snap-type",
            "-ms-scroll-snap-points-y"
        ],
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-scroll-translation": {
        syntax: "none | vertical-to-horizontal",
        media: "interactive",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-text-autospace": {
        syntax: "none | ideograph-alpha | ideograph-numeric | ideograph-parenthesis | ideograph-space",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-touch-select": {
        syntax: "grippers | none",
        media: "interactive",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "grippers",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-user-select": {
        syntax: "none | element | text",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "text",
        appliesto: "nonReplacedElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-wrap-flow": {
        syntax: "auto | both | start | end | maximum | clear",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "auto",
        appliesto: "blockLevelElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-wrap-margin": {
        syntax: "<length>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "0",
        appliesto: "exclusionElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-ms-wrap-through": {
        syntax: "wrap | none",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Microsoft Extensions"
        ],
        initial: "wrap",
        appliesto: "blockLevelElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-moz-appearance": {
        syntax: "none | button | button-arrow-down | button-arrow-next | button-arrow-previous | button-arrow-up | button-bevel | button-focus | caret | checkbox | checkbox-container | checkbox-label | checkmenuitem | dualbutton | groupbox | listbox | listitem | menuarrow | menubar | menucheckbox | menuimage | menuitem | menuitemtext | menulist | menulist-button | menulist-text | menulist-textfield | menupopup | menuradio | menuseparator | meterbar | meterchunk | progressbar | progressbar-vertical | progresschunk | progresschunk-vertical | radio | radio-container | radio-label | radiomenuitem | range | range-thumb | resizer | resizerpanel | scale-horizontal | scalethumbend | scalethumb-horizontal | scalethumbstart | scalethumbtick | scalethumb-vertical | scale-vertical | scrollbarbutton-down | scrollbarbutton-left | scrollbarbutton-right | scrollbarbutton-up | scrollbarthumb-horizontal | scrollbarthumb-vertical | scrollbartrack-horizontal | scrollbartrack-vertical | searchfield | separator | sheet | spinner | spinner-downbutton | spinner-textfield | spinner-upbutton | splitter | statusbar | statusbarpanel | tab | tabpanel | tabpanels | tab-scroll-arrow-back | tab-scroll-arrow-forward | textfield | textfield-multiline | toolbar | toolbarbutton | toolbarbutton-dropdown | toolbargripper | toolbox | tooltip | treeheader | treeheadercell | treeheadersortarrow | treeitem | treeline | treetwisty | treetwistyopen | treeview | -moz-mac-unified-toolbar | -moz-win-borderless-glass | -moz-win-browsertabbar-toolbox | -moz-win-communicationstext | -moz-win-communications-toolbox | -moz-win-exclude-glass | -moz-win-glass | -moz-win-mediatext | -moz-win-media-toolbox | -moz-window-button-box | -moz-window-button-box-maximized | -moz-window-button-close | -moz-window-button-maximize | -moz-window-button-minimize | -moz-window-button-restore | -moz-window-frame-bottom | -moz-window-frame-left | -moz-window-frame-right | -moz-window-titlebar | -moz-window-titlebar-maximized",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Mozilla Extensions",
            "WebKit Extensions"
        ],
        initial: "noneButOverriddenInUserAgentCSS",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-moz-binding": {
        syntax: "<url> | none",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Mozilla Extensions"
        ],
        initial: "none",
        appliesto: "allElementsExceptGeneratedContentOrPseudoElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-moz-border-bottom-colors": {
        syntax: "<color>+ | none",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Mozilla Extensions"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-moz-border-left-colors": {
        syntax: "<color>+ | none",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Mozilla Extensions"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-moz-border-right-colors": {
        syntax: "<color>+ | none",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Mozilla Extensions"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-moz-border-top-colors": {
        syntax: "<color>+ | none",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Mozilla Extensions"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-moz-context-properties": {
        syntax: "none | [ fill | fill-opacity | stroke | stroke-opacity ]#",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Mozilla Extensions"
        ],
        initial: "none",
        appliesto: "allElementsThatCanReferenceImages",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-moz-float-edge": {
        syntax: "border-box | content-box | margin-box | padding-box",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Mozilla Extensions"
        ],
        initial: "content-box",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-moz-force-broken-image-icon": {
        syntax: "<integer>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Mozilla Extensions"
        ],
        initial: "0",
        appliesto: "images",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-moz-image-region": {
        syntax: "<shape> | auto",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Mozilla Extensions"
        ],
        initial: "auto",
        appliesto: "xulImageElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-moz-orient": {
        syntax: "inline | block | horizontal | vertical",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Mozilla Extensions"
        ],
        initial: "inline",
        appliesto: "anyElementEffectOnProgressAndMeter",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-moz-outline-radius": {
        syntax: "<outline-radius>{1,4} [ / <outline-radius>{1,4} ]?",
        media: "visual",
        inherited: false,
        animationType: [
            "-moz-outline-radius-topleft",
            "-moz-outline-radius-topright",
            "-moz-outline-radius-bottomright",
            "-moz-outline-radius-bottomleft"
        ],
        percentages: [
            "-moz-outline-radius-topleft",
            "-moz-outline-radius-topright",
            "-moz-outline-radius-bottomright",
            "-moz-outline-radius-bottomleft"
        ],
        groups: [
            "Mozilla Extensions"
        ],
        initial: [
            "-moz-outline-radius-topleft",
            "-moz-outline-radius-topright",
            "-moz-outline-radius-bottomright",
            "-moz-outline-radius-bottomleft"
        ],
        appliesto: "allElements",
        computed: [
            "-moz-outline-radius-topleft",
            "-moz-outline-radius-topright",
            "-moz-outline-radius-bottomright",
            "-moz-outline-radius-bottomleft"
        ],
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-moz-outline-radius-bottomleft": {
        syntax: "<outline-radius>",
        media: "visual",
        inherited: false,
        animationType: "lpc",
        percentages: "referToDimensionOfBorderBox",
        groups: [
            "Mozilla Extensions"
        ],
        initial: "0",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-moz-outline-radius-bottomright": {
        syntax: "<outline-radius>",
        media: "visual",
        inherited: false,
        animationType: "lpc",
        percentages: "referToDimensionOfBorderBox",
        groups: [
            "Mozilla Extensions"
        ],
        initial: "0",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-moz-outline-radius-topleft": {
        syntax: "<outline-radius>",
        media: "visual",
        inherited: false,
        animationType: "lpc",
        percentages: "referToDimensionOfBorderBox",
        groups: [
            "Mozilla Extensions"
        ],
        initial: "0",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-moz-outline-radius-topright": {
        syntax: "<outline-radius>",
        media: "visual",
        inherited: false,
        animationType: "lpc",
        percentages: "referToDimensionOfBorderBox",
        groups: [
            "Mozilla Extensions"
        ],
        initial: "0",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-moz-stack-sizing": {
        syntax: "ignore | stretch-to-fit",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Mozilla Extensions"
        ],
        initial: "stretch-to-fit",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-moz-text-blink": {
        syntax: "none | blink",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Mozilla Extensions"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-moz-user-focus": {
        syntax: "ignore | normal | select-after | select-before | select-menu | select-same | select-all | none",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Mozilla Extensions"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-moz-user-input": {
        syntax: "auto | none | enabled | disabled",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Mozilla Extensions"
        ],
        initial: "auto",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-moz-user-modify": {
        syntax: "read-only | read-write | write-only",
        media: "interactive",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Mozilla Extensions"
        ],
        initial: "read-only",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-moz-window-dragging": {
        syntax: "drag | no-drag",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Mozilla Extensions"
        ],
        initial: "drag",
        appliesto: "allElementsCreatingNativeWindows",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-moz-window-shadow": {
        syntax: "default | menu | tooltip | sheet | none",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Mozilla Extensions"
        ],
        initial: "default",
        appliesto: "allElementsCreatingNativeWindows",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-webkit-appearance": {
        syntax: "none | button | button-bevel | caret | checkbox | default-button | inner-spin-button | listbox | listitem | media-controls-background | media-controls-fullscreen-background | media-current-time-display | media-enter-fullscreen-button | media-exit-fullscreen-button | media-fullscreen-button | media-mute-button | media-overlay-play-button | media-play-button | media-seek-back-button | media-seek-forward-button | media-slider | media-sliderthumb | media-time-remaining-display | media-toggle-closed-captions-button | media-volume-slider | media-volume-slider-container | media-volume-sliderthumb | menulist | menulist-button | menulist-text | menulist-textfield | meter | progress-bar | progress-bar-value | push-button | radio | searchfield | searchfield-cancel-button | searchfield-decoration | searchfield-results-button | searchfield-results-decoration | slider-horizontal | slider-vertical | sliderthumb-horizontal | sliderthumb-vertical | square-button | textarea | textfield",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "WebKit Extensions"
        ],
        initial: "noneButOverriddenInUserAgentCSS",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-webkit-border-before": {
        syntax: "<'border-width'> || <'border-style'> || <'color'>",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: [
            "-webkit-border-before-width"
        ],
        groups: [
            "WebKit Extensions"
        ],
        initial: [
            "border-width",
            "border-style",
            "color"
        ],
        appliesto: "allElements",
        computed: [
            "border-width",
            "border-style",
            "color"
        ],
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-webkit-border-before-color": {
        syntax: "<'color'>",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "WebKit Extensions"
        ],
        initial: "currentcolor",
        appliesto: "allElements",
        computed: "computedColor",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-webkit-border-before-style": {
        syntax: "<'border-style'>",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "WebKit Extensions"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-webkit-border-before-width": {
        syntax: "<'border-width'>",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "logicalWidthOfContainingBlock",
        groups: [
            "WebKit Extensions"
        ],
        initial: "medium",
        appliesto: "allElements",
        computed: "absoluteLengthZeroIfBorderStyleNoneOrHidden",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-webkit-box-reflect": {
        syntax: "[ above | below | right | left ]? <length>? <image>?",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "WebKit Extensions"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-webkit-mask": {
        syntax: "[ <mask-reference> || <position> [ / <bg-size> ]? || <repeat-style> || [ <box> | border | padding | content | text ] || [ <box> | border | padding | content ] ]#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "WebKit Extensions"
        ],
        initial: [
            "-webkit-mask-image",
            "-webkit-mask-repeat",
            "-webkit-mask-attachment",
            "-webkit-mask-position",
            "-webkit-mask-origin",
            "-webkit-mask-clip"
        ],
        appliesto: "allElements",
        computed: [
            "-webkit-mask-image",
            "-webkit-mask-repeat",
            "-webkit-mask-attachment",
            "-webkit-mask-position",
            "-webkit-mask-origin",
            "-webkit-mask-clip"
        ],
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-webkit-mask-attachment": {
        syntax: "<attachment>#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "WebKit Extensions"
        ],
        initial: "scroll",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "orderOfAppearance",
        status: "nonstandard"
    },
        "-webkit-mask-clip": {
        syntax: "[ <box> | border | padding | content | text ]#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "WebKit Extensions"
        ],
        initial: "border",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "orderOfAppearance",
        status: "nonstandard"
    },
        "-webkit-mask-composite": {
        syntax: "<composite-style>#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "WebKit Extensions"
        ],
        initial: "source-over",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "orderOfAppearance",
        status: "nonstandard"
    },
        "-webkit-mask-image": {
        syntax: "<mask-reference>#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "WebKit Extensions"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "absoluteURIOrNone",
        order: "orderOfAppearance",
        status: "nonstandard"
    },
        "-webkit-mask-origin": {
        syntax: "[ <box> | border | padding | content ]#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "WebKit Extensions"
        ],
        initial: "padding",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "orderOfAppearance",
        status: "nonstandard"
    },
        "-webkit-mask-position": {
        syntax: "<position>#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "referToSizeOfElement",
        groups: [
            "WebKit Extensions"
        ],
        initial: "0% 0%",
        appliesto: "allElements",
        computed: "absoluteLengthOrPercentage",
        order: "orderOfAppearance",
        status: "nonstandard"
    },
        "-webkit-mask-position-x": {
        syntax: "[ <length-percentage> | left | center | right ]#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "referToSizeOfElement",
        groups: [
            "WebKit Extensions"
        ],
        initial: "0%",
        appliesto: "allElements",
        computed: "absoluteLengthOrPercentage",
        order: "orderOfAppearance",
        status: "nonstandard"
    },
        "-webkit-mask-position-y": {
        syntax: "[ <length-percentage> | top | center | bottom ]#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "referToSizeOfElement",
        groups: [
            "WebKit Extensions"
        ],
        initial: "0%",
        appliesto: "allElements",
        computed: "absoluteLengthOrPercentage",
        order: "orderOfAppearance",
        status: "nonstandard"
    },
        "-webkit-mask-repeat": {
        syntax: "<repeat-style>#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "WebKit Extensions"
        ],
        initial: "repeat",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "orderOfAppearance",
        status: "nonstandard"
    },
        "-webkit-mask-repeat-x": {
        syntax: "repeat | no-repeat | space | round",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "WebKit Extensions"
        ],
        initial: "repeat",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "orderOfAppearance",
        status: "nonstandard"
    },
        "-webkit-mask-repeat-y": {
        syntax: "repeat | no-repeat | space | round",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "WebKit Extensions"
        ],
        initial: "repeat",
        appliesto: "allElements",
        computed: "absoluteLengthOrPercentage",
        order: "orderOfAppearance",
        status: "nonstandard"
    },
        "-webkit-mask-size": {
        syntax: "<bg-size>#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "relativeToBackgroundPositioningArea",
        groups: [
            "WebKit Extensions"
        ],
        initial: "auto auto",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "orderOfAppearance",
        status: "nonstandard"
    },
        "-webkit-overflow-scrolling": {
        syntax: "auto | touch",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "WebKit Extensions"
        ],
        initial: "auto",
        appliesto: "scrollingBoxes",
        computed: "asSpecified",
        order: "orderOfAppearance",
        status: "nonstandard"
    },
        "-webkit-tap-highlight-color": {
        syntax: "<color>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "WebKit Extensions"
        ],
        initial: "black",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-webkit-text-fill-color": {
        syntax: "<color>",
        media: "visual",
        inherited: true,
        animationType: "color",
        percentages: "no",
        groups: [
            "WebKit Extensions"
        ],
        initial: "currentcolor",
        appliesto: "allElements",
        computed: "computedColor",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-webkit-text-stroke": {
        syntax: "<length> || <color>",
        media: "visual",
        inherited: true,
        animationType: [
            "-webkit-text-stroke-width",
            "-webkit-text-stroke-color"
        ],
        percentages: "no",
        groups: [
            "WebKit Extensions"
        ],
        initial: [
            "-webkit-text-stroke-width",
            "-webkit-text-stroke-color"
        ],
        appliesto: "allElements",
        computed: [
            "-webkit-text-stroke-width",
            "-webkit-text-stroke-color"
        ],
        order: "canonicalOrder",
        status: "nonstandard"
    },
        "-webkit-text-stroke-color": {
        syntax: "<color>",
        media: "visual",
        inherited: true,
        animationType: "color",
        percentages: "no",
        groups: [
            "WebKit Extensions"
        ],
        initial: "currentcolor",
        appliesto: "allElements",
        computed: "computedColor",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-webkit-text-stroke-width": {
        syntax: "<length>",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "WebKit Extensions"
        ],
        initial: "0",
        appliesto: "allElements",
        computed: "absoluteLength",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-webkit-touch-callout": {
        syntax: "default | none",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "WebKit Extensions"
        ],
        initial: "default",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "-webkit-user-modify": {
        syntax: "read-only | read-write | read-write-plaintext-only",
        media: "interactive",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "WebKit Extensions"
        ],
        initial: "read-only",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "align-content": {
        syntax: "normal | <baseline-position> | <content-distribution> | <overflow-position>? <content-position>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Flexible Box Layout"
        ],
        initial: "normal",
        appliesto: "multilineFlexContainers",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "align-items": {
        syntax: "normal | stretch | <baseline-position> | [ <overflow-position>? <self-position> ]",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Flexible Box Layout"
        ],
        initial: "normal",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "align-self": {
        syntax: "auto | normal | stretch | <baseline-position> | <overflow-position>? <self-position>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Flexible Box Layout"
        ],
        initial: "auto",
        appliesto: "flexItemsGridItemsAndAbsolutelyPositionedBoxes",
        computed: "autoOnAbsolutelyPositionedElementsValueOfAlignItemsOnParent",
        order: "uniqueOrder",
        status: "standard"
    },
        all: all,
        animation: animation,
        "animation-delay": {
        syntax: "<time>#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Animations"
        ],
        initial: "0s",
        appliesto: "allElementsAndPseudos",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "animation-direction": {
        syntax: "<single-animation-direction>#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Animations"
        ],
        initial: "normal",
        appliesto: "allElementsAndPseudos",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "animation-duration": {
        syntax: "<time>#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Animations"
        ],
        initial: "0s",
        appliesto: "allElementsAndPseudos",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "animation-fill-mode": {
        syntax: "<single-animation-fill-mode>#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Animations"
        ],
        initial: "none",
        appliesto: "allElementsAndPseudos",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "animation-iteration-count": {
        syntax: "<single-animation-iteration-count>#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Animations"
        ],
        initial: "1",
        appliesto: "allElementsAndPseudos",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "animation-name": {
        syntax: "[ none | <keyframes-name> ]#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Animations"
        ],
        initial: "none",
        appliesto: "allElementsAndPseudos",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "animation-play-state": {
        syntax: "<single-animation-play-state>#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Animations"
        ],
        initial: "running",
        appliesto: "allElementsAndPseudos",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "animation-timing-function": {
        syntax: "<single-timing-function>#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Animations"
        ],
        initial: "ease",
        appliesto: "allElementsAndPseudos",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        appearance: appearance,
        azimuth: azimuth,
        "backdrop-filter": {
        syntax: "none | <filter-function-list>",
        media: "visual",
        inherited: false,
        animationType: "filterList",
        percentages: "no",
        groups: [
            "Filter Effects"
        ],
        initial: "none",
        appliesto: "allElementsSVGContainerElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "experimental"
    },
        "backface-visibility": {
        syntax: "visible | hidden",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Transforms"
        ],
        initial: "visible",
        appliesto: "transformableElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        background: background,
        "background-attachment": {
        syntax: "<attachment>#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "scroll",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "background-blend-mode": {
        syntax: "<blend-mode>#",
        media: "none",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Compositing and Blending"
        ],
        initial: "normal",
        appliesto: "allElementsSVGContainerGraphicsAndGraphicsReferencingElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "background-clip": {
        syntax: "<box>#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "border-box",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "background-color": {
        syntax: "<color>",
        media: "visual",
        inherited: false,
        animationType: "color",
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "transparent",
        appliesto: "allElements",
        computed: "computedColor",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "background-image": {
        syntax: "<bg-image>#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecifiedURLsAbsolute",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "background-origin": {
        syntax: "<box>#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "padding-box",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "background-position": {
        syntax: "<bg-position>#",
        media: "visual",
        inherited: false,
        animationType: "repeatableListOfSimpleListOfLpc",
        percentages: "referToSizeOfBackgroundPositioningAreaMinusBackgroundImageSize",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "0% 0%",
        appliesto: "allElements",
        computed: "listEachItemTwoKeywordsOriginOffsets",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "background-position-x": {
        syntax: "[ center | [ left | right | x-start | x-end ]? <length-percentage>? ]#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "referToWidthOfBackgroundPositioningAreaMinusBackgroundImageHeight",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "left",
        appliesto: "allElements",
        computed: "listEachItemConsistingOfAbsoluteLengthPercentageAndOrigin",
        order: "uniqueOrder",
        status: "experimental"
    },
        "background-position-y": {
        syntax: "[ center | [ top | bottom | y-start | y-end ]? <length-percentage>? ]#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "referToHeightOfBackgroundPositioningAreaMinusBackgroundImageHeight",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "top",
        appliesto: "allElements",
        computed: "listEachItemConsistingOfAbsoluteLengthPercentageAndOrigin",
        order: "uniqueOrder",
        status: "experimental"
    },
        "background-repeat": {
        syntax: "<repeat-style>#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "repeat",
        appliesto: "allElements",
        computed: "listEachItemHasTwoKeywordsOnePerDimension",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "background-size": {
        syntax: "<bg-size>#",
        media: "visual",
        inherited: false,
        animationType: "repeatableListOfSimpleListOfLpc",
        percentages: "relativeToBackgroundPositioningArea",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "auto auto",
        appliesto: "allElements",
        computed: "asSpecifiedRelativeToAbsoluteLengths",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "block-overflow": {
        syntax: "clip | ellipsis | <string>",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Overflow"
        ],
        initial: "clip",
        appliesto: "blockContainers",
        computed: "asSpecified",
        order: "perGrammar",
        status: "experimental"
    },
        "block-size": {
        syntax: "<'width'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "blockSizeOfContainingBlock",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "auto",
        appliesto: "sameAsWidthAndHeight",
        computed: "sameAsWidthAndHeight",
        order: "uniqueOrder",
        status: "standard"
    },
        border: border,
        "border-block-end": {
        syntax: "<'border-width'> || <'border-style'> || <'color'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Logical Properties"
        ],
        initial: [
            "border-width",
            "border-style",
            "color"
        ],
        appliesto: "allElements",
        computed: [
            "border-width",
            "border-style",
            "border-block-end-color"
        ],
        order: "uniqueOrder",
        status: "standard"
    },
        "border-block-end-color": {
        syntax: "<'color'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "currentcolor",
        appliesto: "allElements",
        computed: "computedColor",
        order: "uniqueOrder",
        status: "standard"
    },
        "border-block-end-style": {
        syntax: "<'border-style'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "border-block-end-width": {
        syntax: "<'border-width'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "logicalWidthOfContainingBlock",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "medium",
        appliesto: "allElements",
        computed: "absoluteLengthZeroIfBorderStyleNoneOrHidden",
        order: "uniqueOrder",
        status: "standard"
    },
        "border-block-start": {
        syntax: "<'border-width'> || <'border-style'> || <'color'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Logical Properties"
        ],
        initial: [
            "border-width",
            "border-style",
            "color"
        ],
        appliesto: "allElements",
        computed: [
            "border-width",
            "border-style",
            "border-block-start-color"
        ],
        order: "uniqueOrder",
        status: "standard"
    },
        "border-block-start-color": {
        syntax: "<'color'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "currentcolor",
        appliesto: "allElements",
        computed: "computedColor",
        order: "uniqueOrder",
        status: "standard"
    },
        "border-block-start-style": {
        syntax: "<'border-style'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "border-block-start-width": {
        syntax: "<'border-width'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "logicalWidthOfContainingBlock",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "medium",
        appliesto: "allElements",
        computed: "absoluteLengthZeroIfBorderStyleNoneOrHidden",
        order: "uniqueOrder",
        status: "standard"
    },
        "border-bottom": {
        syntax: "<br-width> || <br-style> || <color>",
        media: "visual",
        inherited: false,
        animationType: [
            "border-bottom-color",
            "border-bottom-style",
            "border-bottom-width"
        ],
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: [
            "border-bottom-width",
            "border-bottom-style",
            "border-bottom-color"
        ],
        appliesto: "allElements",
        computed: [
            "border-bottom-width",
            "border-bottom-style",
            "border-bottom-color"
        ],
        order: "orderOfAppearance",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-bottom-color": {
        syntax: "<color>",
        media: "visual",
        inherited: false,
        animationType: "color",
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "currentcolor",
        appliesto: "allElements",
        computed: "computedColor",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-bottom-left-radius": {
        syntax: "<length-percentage>{1,2}",
        media: "visual",
        inherited: false,
        animationType: "lpc",
        percentages: "referToDimensionOfBorderBox",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "0",
        appliesto: "allElementsUAsNotRequiredWhenCollapse",
        computed: "twoAbsoluteLengthOrPercentages",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-bottom-right-radius": {
        syntax: "<length-percentage>{1,2}",
        media: "visual",
        inherited: false,
        animationType: "lpc",
        percentages: "referToDimensionOfBorderBox",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "0",
        appliesto: "allElementsUAsNotRequiredWhenCollapse",
        computed: "twoAbsoluteLengthOrPercentages",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-bottom-style": {
        syntax: "<br-style>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-bottom-width": {
        syntax: "<br-width>",
        media: "visual",
        inherited: false,
        animationType: "length",
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "medium",
        appliesto: "allElements",
        computed: "absoluteLengthOr0IfBorderBottomStyleNoneOrHidden",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-collapse": {
        syntax: "collapse | separate",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Table"
        ],
        initial: "separate",
        appliesto: "tableElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "border-color": {
        syntax: "<color>{1,4}",
        media: "visual",
        inherited: false,
        animationType: [
            "border-bottom-color",
            "border-left-color",
            "border-right-color",
            "border-top-color"
        ],
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: [
            "border-top-color",
            "border-right-color",
            "border-bottom-color",
            "border-left-color"
        ],
        appliesto: "allElements",
        computed: [
            "border-bottom-color",
            "border-left-color",
            "border-right-color",
            "border-top-color"
        ],
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-image": {
        syntax: "<'border-image-source'> || <'border-image-slice'> [ / <'border-image-width'> | / <'border-image-width'>? / <'border-image-outset'> ]? || <'border-image-repeat'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: [
            "border-image-slice",
            "border-image-width"
        ],
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: [
            "border-image-source",
            "border-image-slice",
            "border-image-width",
            "border-image-outset",
            "border-image-repeat"
        ],
        appliesto: "allElementsExceptTableElementsWhenCollapse",
        computed: [
            "border-image-outset",
            "border-image-repeat",
            "border-image-slice",
            "border-image-source",
            "border-image-width"
        ],
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-image-outset": {
        syntax: "[ <length> | <number> ]{1,4}",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "0",
        appliesto: "allElementsExceptTableElementsWhenCollapse",
        computed: "asSpecifiedRelativeToAbsoluteLengths",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-image-repeat": {
        syntax: "[ stretch | repeat | round | space ]{1,2}",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "stretch",
        appliesto: "allElementsExceptTableElementsWhenCollapse",
        computed: "asSpecified",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-image-slice": {
        syntax: "<number-percentage>{1,4} && fill?",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "referToSizeOfBorderImage",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "100%",
        appliesto: "allElementsExceptTableElementsWhenCollapse",
        computed: "oneToFourPercentagesOrAbsoluteLengthsPlusFill",
        order: "percentagesOrLengthsFollowedByFill",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-image-source": {
        syntax: "none | <image>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "none",
        appliesto: "allElementsExceptTableElementsWhenCollapse",
        computed: "noneOrImageWithAbsoluteURI",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-image-width": {
        syntax: "[ <length-percentage> | <number> | auto ]{1,4}",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "referToWidthOrHeightOfBorderImageArea",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "1",
        appliesto: "allElementsExceptTableElementsWhenCollapse",
        computed: "asSpecifiedRelativeToAbsoluteLengths",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-inline-end": {
        syntax: "<'border-width'> || <'border-style'> || <'color'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Logical Properties"
        ],
        initial: [
            "border-width",
            "border-style",
            "color"
        ],
        appliesto: "allElements",
        computed: [
            "border-width",
            "border-style",
            "border-inline-end-color"
        ],
        order: "uniqueOrder",
        status: "standard"
    },
        "border-inline-end-color": {
        syntax: "<'color'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "currentcolor",
        appliesto: "allElements",
        computed: "computedColor",
        order: "uniqueOrder",
        status: "standard"
    },
        "border-inline-end-style": {
        syntax: "<'border-style'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "border-inline-end-width": {
        syntax: "<'border-width'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "logicalWidthOfContainingBlock",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "medium",
        appliesto: "allElements",
        computed: "absoluteLengthZeroIfBorderStyleNoneOrHidden",
        order: "uniqueOrder",
        status: "standard"
    },
        "border-inline-start": {
        syntax: "<'border-width'> || <'border-style'> || <'color'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Logical Properties"
        ],
        initial: [
            "border-width",
            "border-style",
            "color"
        ],
        appliesto: "allElements",
        computed: [
            "border-width",
            "border-style",
            "border-inline-start-color"
        ],
        order: "uniqueOrder",
        status: "standard"
    },
        "border-inline-start-color": {
        syntax: "<'color'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "currentcolor",
        appliesto: "allElements",
        computed: "computedColor",
        order: "uniqueOrder",
        status: "standard"
    },
        "border-inline-start-style": {
        syntax: "<'border-style'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "border-inline-start-width": {
        syntax: "<'border-width'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "logicalWidthOfContainingBlock",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "medium",
        appliesto: "allElements",
        computed: "absoluteLengthZeroIfBorderStyleNoneOrHidden",
        order: "uniqueOrder",
        status: "standard"
    },
        "border-left": {
        syntax: "<br-width> || <br-style> || <color>",
        media: "visual",
        inherited: false,
        animationType: [
            "border-left-color",
            "border-left-style",
            "border-left-width"
        ],
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: [
            "border-left-width",
            "border-left-style",
            "border-left-color"
        ],
        appliesto: "allElements",
        computed: [
            "border-left-width",
            "border-left-style",
            "border-left-color"
        ],
        order: "orderOfAppearance",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-left-color": {
        syntax: "<color>",
        media: "visual",
        inherited: false,
        animationType: "color",
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "currentcolor",
        appliesto: "allElements",
        computed: "computedColor",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-left-style": {
        syntax: "<br-style>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-left-width": {
        syntax: "<br-width>",
        media: "visual",
        inherited: false,
        animationType: "length",
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "medium",
        appliesto: "allElements",
        computed: "absoluteLengthOr0IfBorderLeftStyleNoneOrHidden",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-radius": {
        syntax: "<length-percentage>{1,4} [ / <length-percentage>{1,4} ]?",
        media: "visual",
        inherited: false,
        animationType: [
            "border-top-left-radius",
            "border-top-right-radius",
            "border-bottom-right-radius",
            "border-bottom-left-radius"
        ],
        percentages: "referToDimensionOfBorderBox",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: [
            "border-top-left-radius",
            "border-top-right-radius",
            "border-bottom-right-radius",
            "border-bottom-left-radius"
        ],
        appliesto: "allElementsUAsNotRequiredWhenCollapse",
        computed: [
            "border-bottom-left-radius",
            "border-bottom-right-radius",
            "border-top-left-radius",
            "border-top-right-radius"
        ],
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-right": {
        syntax: "<br-width> || <br-style> || <color>",
        media: "visual",
        inherited: false,
        animationType: [
            "border-right-color",
            "border-right-style",
            "border-right-width"
        ],
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: [
            "border-right-width",
            "border-right-style",
            "border-right-color"
        ],
        appliesto: "allElements",
        computed: [
            "border-right-width",
            "border-right-style",
            "border-right-color"
        ],
        order: "orderOfAppearance",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-right-color": {
        syntax: "<color>",
        media: "visual",
        inherited: false,
        animationType: "color",
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "currentcolor",
        appliesto: "allElements",
        computed: "computedColor",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-right-style": {
        syntax: "<br-style>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-right-width": {
        syntax: "<br-width>",
        media: "visual",
        inherited: false,
        animationType: "length",
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "medium",
        appliesto: "allElements",
        computed: "absoluteLengthOr0IfBorderRightStyleNoneOrHidden",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-spacing": {
        syntax: "<length> <length>?",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Table"
        ],
        initial: "0",
        appliesto: "tableElements",
        computed: "twoAbsoluteLengths",
        order: "uniqueOrder",
        status: "standard"
    },
        "border-style": {
        syntax: "<br-style>{1,4}",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: [
            "border-top-style",
            "border-right-style",
            "border-bottom-style",
            "border-left-style"
        ],
        appliesto: "allElements",
        computed: [
            "border-bottom-style",
            "border-left-style",
            "border-right-style",
            "border-top-style"
        ],
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-top": {
        syntax: "<br-width> || <br-style> || <color>",
        media: "visual",
        inherited: false,
        animationType: [
            "border-top-color",
            "border-top-style",
            "border-top-width"
        ],
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: [
            "border-top-width",
            "border-top-style",
            "border-top-color"
        ],
        appliesto: "allElements",
        computed: [
            "border-top-width",
            "border-top-style",
            "border-top-color"
        ],
        order: "orderOfAppearance",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-top-color": {
        syntax: "<color>",
        media: "visual",
        inherited: false,
        animationType: "color",
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "currentcolor",
        appliesto: "allElements",
        computed: "computedColor",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-top-left-radius": {
        syntax: "<length-percentage>{1,2}",
        media: "visual",
        inherited: false,
        animationType: "lpc",
        percentages: "referToDimensionOfBorderBox",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "0",
        appliesto: "allElementsUAsNotRequiredWhenCollapse",
        computed: "twoAbsoluteLengthOrPercentages",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-top-right-radius": {
        syntax: "<length-percentage>{1,2}",
        media: "visual",
        inherited: false,
        animationType: "lpc",
        percentages: "referToDimensionOfBorderBox",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "0",
        appliesto: "allElementsUAsNotRequiredWhenCollapse",
        computed: "twoAbsoluteLengthOrPercentages",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-top-style": {
        syntax: "<br-style>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-top-width": {
        syntax: "<br-width>",
        media: "visual",
        inherited: false,
        animationType: "length",
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "medium",
        appliesto: "allElements",
        computed: "absoluteLengthOr0IfBorderTopStyleNoneOrHidden",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "border-width": {
        syntax: "<br-width>{1,4}",
        media: "visual",
        inherited: false,
        animationType: [
            "border-bottom-width",
            "border-left-width",
            "border-right-width",
            "border-top-width"
        ],
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: [
            "border-top-width",
            "border-right-width",
            "border-bottom-width",
            "border-left-width"
        ],
        appliesto: "allElements",
        computed: [
            "border-bottom-width",
            "border-left-width",
            "border-right-width",
            "border-top-width"
        ],
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        bottom: bottom,
        "box-align": {
        syntax: "start | center | end | baseline | stretch",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Mozilla Extensions",
            "WebKit Extensions"
        ],
        initial: "stretch",
        appliesto: "elementsWithDisplayBoxOrInlineBox",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "box-decoration-break": {
        syntax: "slice | clone",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Fragmentation"
        ],
        initial: "slice",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "box-direction": {
        syntax: "normal | reverse | inherit",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Mozilla Extensions",
            "WebKit Extensions"
        ],
        initial: "normal",
        appliesto: "elementsWithDisplayBoxOrInlineBox",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "box-flex": {
        syntax: "<number>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Mozilla Extensions",
            "WebKit Extensions"
        ],
        initial: "0",
        appliesto: "directChildrenOfElementsWithDisplayMozBoxMozInlineBox",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "box-flex-group": {
        syntax: "<integer>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Mozilla Extensions",
            "WebKit Extensions"
        ],
        initial: "1",
        appliesto: "inFlowChildrenOfBoxElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "box-lines": {
        syntax: "single | multiple",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Mozilla Extensions",
            "WebKit Extensions"
        ],
        initial: "single",
        appliesto: "boxElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "box-ordinal-group": {
        syntax: "<integer>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Mozilla Extensions",
            "WebKit Extensions"
        ],
        initial: "1",
        appliesto: "childrenOfBoxElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "box-orient": {
        syntax: "horizontal | vertical | inline-axis | block-axis | inherit",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Mozilla Extensions",
            "WebKit Extensions"
        ],
        initial: "inlineAxisHorizontalInXUL",
        appliesto: "elementsWithDisplayBoxOrInlineBox",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "box-pack": {
        syntax: "start | center | end | justify",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Mozilla Extensions",
            "WebKit Extensions"
        ],
        initial: "start",
        appliesto: "elementsWithDisplayMozBoxMozInlineBox",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "box-shadow": {
        syntax: "none | <shadow>#",
        media: "visual",
        inherited: false,
        animationType: "shadowList",
        percentages: "no",
        groups: [
            "CSS Backgrounds and Borders"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "absoluteLengthsSpecifiedColorAsSpecified",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "box-sizing": {
        syntax: "content-box | border-box",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Basic User Interface"
        ],
        initial: "content-box",
        appliesto: "allElementsAcceptingWidthOrHeight",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "break-after": {
        syntax: "auto | avoid | avoid-page | page | left | right | recto | verso | avoid-column | column | avoid-region | region",
        media: "paged",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Fragmentation"
        ],
        initial: "auto",
        appliesto: "blockLevelElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "break-before": {
        syntax: "auto | avoid | avoid-page | page | left | right | recto | verso | avoid-column | column | avoid-region | region",
        media: "paged",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Fragmentation"
        ],
        initial: "auto",
        appliesto: "blockLevelElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "break-inside": {
        syntax: "auto | avoid | avoid-page | avoid-column | avoid-region",
        media: "paged",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Fragmentation"
        ],
        initial: "auto",
        appliesto: "blockLevelElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "caption-side": {
        syntax: "top | bottom | block-start | block-end | inline-start | inline-end",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Table"
        ],
        initial: "top",
        appliesto: "tableCaptionElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "caret-color": {
        syntax: "auto | <color>",
        media: "interactive",
        inherited: true,
        animationType: "color",
        percentages: "no",
        groups: [
            "CSS Basic User Interface"
        ],
        initial: "auto",
        appliesto: "allElements",
        computed: "asAutoOrColor",
        order: "perGrammar",
        status: "standard"
    },
        clear: clear,
        clip: clip,
        "clip-path": {
        syntax: "<clip-source> | [ <basic-shape> || <geometry-box> ] | none",
        media: "visual",
        inherited: false,
        animationType: "basicShapeOtherwiseNo",
        percentages: "referToReferenceBoxWhenSpecifiedOtherwiseBorderBox",
        groups: [
            "CSS Masking"
        ],
        initial: "none",
        appliesto: "allElementsSVGContainerElements",
        computed: "asSpecifiedURLsAbsolute",
        order: "uniqueOrder",
        status: "standard"
    },
        color: color,
        "color-adjust": {
        syntax: "economy | exact",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Color"
        ],
        initial: "economy",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "perGrammar",
        status: "standard"
    },
        "column-count": {
        syntax: "<integer> | auto",
        media: "visual",
        inherited: false,
        animationType: "integer",
        percentages: "no",
        groups: [
            "CSS Columns"
        ],
        initial: "auto",
        appliesto: "blockContainersExceptTableWrappers",
        computed: "asSpecified",
        order: "perGrammar",
        status: "standard"
    },
        "column-fill": {
        syntax: "auto | balance | balance-all",
        media: "visualInContinuousMediaNoEffectInOverflowColumns",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Columns"
        ],
        initial: "balance",
        appliesto: "multicolElements",
        computed: "asSpecified",
        order: "perGrammar",
        status: "standard"
    },
        "column-gap": {
        syntax: "normal | <length-percentage>",
        media: "visual",
        inherited: false,
        animationType: "lpc",
        percentages: "referToDimensionOfContentArea",
        groups: [
            "CSS Box Alignment"
        ],
        initial: "normal",
        appliesto: "multiColumnElementsFlexContainersGridContainers",
        computed: "asSpecifiedWithLengthsAbsoluteAndNormalComputingToZeroExceptMultiColumn",
        order: "perGrammar",
        status: "standard"
    },
        "column-rule": {
        syntax: "<'column-rule-width'> || <'column-rule-style'> || <'column-rule-color'>",
        media: "visual",
        inherited: false,
        animationType: [
            "column-rule-color",
            "column-rule-style",
            "column-rule-width"
        ],
        percentages: "no",
        groups: [
            "CSS Columns"
        ],
        initial: [
            "column-rule-width",
            "column-rule-style",
            "column-rule-color"
        ],
        appliesto: "multicolElements",
        computed: [
            "column-rule-color",
            "column-rule-style",
            "column-rule-width"
        ],
        order: "perGrammar",
        status: "standard"
    },
        "column-rule-color": {
        syntax: "<color>",
        media: "visual",
        inherited: false,
        animationType: "color",
        percentages: "no",
        groups: [
            "CSS Columns"
        ],
        initial: "currentcolor",
        appliesto: "multicolElements",
        computed: "computedColor",
        order: "perGrammar",
        status: "standard"
    },
        "column-rule-style": {
        syntax: "<'border-style'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Columns"
        ],
        initial: "none",
        appliesto: "multicolElements",
        computed: "asSpecified",
        order: "perGrammar",
        status: "standard"
    },
        "column-rule-width": {
        syntax: "<'border-width'>",
        media: "visual",
        inherited: false,
        animationType: "length",
        percentages: "no",
        groups: [
            "CSS Columns"
        ],
        initial: "medium",
        appliesto: "multicolElements",
        computed: "absoluteLength0IfColumnRuleStyleNoneOrHidden",
        order: "perGrammar",
        status: "standard"
    },
        "column-span": {
        syntax: "none | all",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Columns"
        ],
        initial: "none",
        appliesto: "inFlowBlockLevelElements",
        computed: "asSpecified",
        order: "perGrammar",
        status: "standard"
    },
        "column-width": {
        syntax: "<length> | auto",
        media: "visual",
        inherited: false,
        animationType: "length",
        percentages: "no",
        groups: [
            "CSS Columns"
        ],
        initial: "auto",
        appliesto: "blockContainersExceptTableWrappers",
        computed: "absoluteLengthZeroOrLarger",
        order: "perGrammar",
        status: "standard"
    },
        columns: columns,
        contain: contain,
        content: content,
        "counter-increment": {
        syntax: "[ <custom-ident> <integer>? ]+ | none",
        media: "all",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Counter Styles"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "counter-reset": {
        syntax: "[ <custom-ident> <integer>? ]+ | none",
        media: "all",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Counter Styles"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        cursor: cursor,
        direction: direction,
        display: display,
        "empty-cells": {
        syntax: "show | hide",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Table"
        ],
        initial: "show",
        appliesto: "tableCellElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        filter: filter,
        flex: flex,
        "flex-basis": {
        syntax: "content | <'width'>",
        media: "visual",
        inherited: false,
        animationType: "lpc",
        percentages: "referToFlexContainersInnerMainSize",
        groups: [
            "CSS Flexible Box Layout"
        ],
        initial: "auto",
        appliesto: "flexItemsAndInFlowPseudos",
        computed: "asSpecifiedRelativeToAbsoluteLengths",
        order: "lengthOrPercentageBeforeKeywordIfBothPresent",
        status: "standard"
    },
        "flex-direction": {
        syntax: "row | row-reverse | column | column-reverse",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Flexible Box Layout"
        ],
        initial: "row",
        appliesto: "flexContainers",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "flex-flow": {
        syntax: "<'flex-direction'> || <'flex-wrap'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Flexible Box Layout"
        ],
        initial: [
            "flex-direction",
            "flex-wrap"
        ],
        appliesto: "flexContainers",
        computed: [
            "flex-direction",
            "flex-wrap"
        ],
        order: "orderOfAppearance",
        status: "standard"
    },
        "flex-grow": {
        syntax: "<number>",
        media: "visual",
        inherited: false,
        animationType: "number",
        percentages: "no",
        groups: [
            "CSS Flexible Box Layout"
        ],
        initial: "0",
        appliesto: "flexItemsAndInFlowPseudos",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "flex-shrink": {
        syntax: "<number>",
        media: "visual",
        inherited: false,
        animationType: "number",
        percentages: "no",
        groups: [
            "CSS Flexible Box Layout"
        ],
        initial: "1",
        appliesto: "flexItemsAndInFlowPseudos",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "flex-wrap": {
        syntax: "nowrap | wrap | wrap-reverse",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Flexible Box Layout"
        ],
        initial: "nowrap",
        appliesto: "flexContainers",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        float: float,
        font: font,
        "font-family": {
        syntax: "[ <family-name> | <generic-family> ]#",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Fonts"
        ],
        initial: "dependsOnUserAgent",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "font-feature-settings": {
        syntax: "normal | <feature-tag-value>#",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Fonts"
        ],
        initial: "normal",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "font-kerning": {
        syntax: "auto | normal | none",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Fonts"
        ],
        initial: "auto",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "font-language-override": {
        syntax: "normal | <string>",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Fonts"
        ],
        initial: "normal",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "font-optical-sizing": {
        syntax: "auto | none",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Fonts"
        ],
        initial: "auto",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "perGrammar",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "font-variation-settings": {
        syntax: "normal | [ <string> <number> ]#",
        media: "visual",
        inherited: true,
        animationType: "transform",
        percentages: "no",
        groups: [
            "CSS Fonts"
        ],
        initial: "normal",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "perGrammar",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "experimental"
    },
        "font-size": {
        syntax: "<absolute-size> | <relative-size> | <length-percentage>",
        media: "visual",
        inherited: true,
        animationType: "length",
        percentages: "referToParentElementsFontSize",
        groups: [
            "CSS Fonts"
        ],
        initial: "medium",
        appliesto: "allElements",
        computed: "asSpecifiedRelativeToAbsoluteLengths",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "font-size-adjust": {
        syntax: "none | <number>",
        media: "visual",
        inherited: true,
        animationType: "number",
        percentages: "no",
        groups: [
            "CSS Fonts"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "font-stretch": {
        syntax: "<font-stretch-absolute>",
        media: "visual",
        inherited: true,
        animationType: "fontStretch",
        percentages: "no",
        groups: [
            "CSS Fonts"
        ],
        initial: "normal",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "font-style": {
        syntax: "normal | italic | oblique <angle>?",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Fonts"
        ],
        initial: "normal",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "font-synthesis": {
        syntax: "none | [ weight || style ]",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Fonts"
        ],
        initial: "weight style",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "orderOfAppearance",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "font-variant": {
        syntax: "normal | none | [ <common-lig-values> || <discretionary-lig-values> || <historical-lig-values> || <contextual-alt-values> || stylistic( <feature-value-name> ) || historical-forms || styleset( <feature-value-name># ) || character-variant( <feature-value-name># ) || swash( <feature-value-name> ) || ornaments( <feature-value-name> ) || annotation( <feature-value-name> ) || [ small-caps | all-small-caps | petite-caps | all-petite-caps | unicase | titling-caps ] || <numeric-figure-values> || <numeric-spacing-values> || <numeric-fraction-values> || ordinal || slashed-zero || <east-asian-variant-values> || <east-asian-width-values> || ruby ]",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Fonts"
        ],
        initial: "normal",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "font-variant-alternates": {
        syntax: "normal | [ stylistic( <feature-value-name> ) || historical-forms || styleset( <feature-value-name># ) || character-variant( <feature-value-name># ) || swash( <feature-value-name> ) || ornaments( <feature-value-name> ) || annotation( <feature-value-name> ) ]",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Fonts"
        ],
        initial: "normal",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "orderOfAppearance",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "font-variant-caps": {
        syntax: "normal | small-caps | all-small-caps | petite-caps | all-petite-caps | unicase | titling-caps",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Fonts"
        ],
        initial: "normal",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "font-variant-east-asian": {
        syntax: "normal | [ <east-asian-variant-values> || <east-asian-width-values> || ruby ]",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Fonts"
        ],
        initial: "normal",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "orderOfAppearance",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "font-variant-ligatures": {
        syntax: "normal | none | [ <common-lig-values> || <discretionary-lig-values> || <historical-lig-values> || <contextual-alt-values> ]",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Fonts"
        ],
        initial: "normal",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "orderOfAppearance",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "font-variant-numeric": {
        syntax: "normal | [ <numeric-figure-values> || <numeric-spacing-values> || <numeric-fraction-values> || ordinal || slashed-zero ]",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Fonts"
        ],
        initial: "normal",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "orderOfAppearance",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "font-variant-position": {
        syntax: "normal | sub | super",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Fonts"
        ],
        initial: "normal",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "font-weight": {
        syntax: "<font-weight-absolute> | bolder | lighter",
        media: "visual",
        inherited: true,
        animationType: "fontWeight",
        percentages: "no",
        groups: [
            "CSS Fonts"
        ],
        initial: "normal",
        appliesto: "allElements",
        computed: "keywordOrNumericalValueBolderLighterTransformedToRealValue",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        gap: gap,
        grid: grid,
        "grid-area": {
        syntax: "<grid-line> [ / <grid-line> ]{0,3}",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Grid Layout"
        ],
        initial: [
            "grid-row-start",
            "grid-column-start",
            "grid-row-end",
            "grid-column-end"
        ],
        appliesto: "gridItemsAndBoxesWithinGridContainer",
        computed: [
            "grid-row-start",
            "grid-column-start",
            "grid-row-end",
            "grid-column-end"
        ],
        order: "uniqueOrder",
        status: "standard"
    },
        "grid-auto-columns": {
        syntax: "<track-size>+",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "referToDimensionOfContentArea",
        groups: [
            "CSS Grid Layout"
        ],
        initial: "auto",
        appliesto: "gridContainers",
        computed: "percentageAsSpecifiedOrAbsoluteLength",
        order: "uniqueOrder",
        status: "standard"
    },
        "grid-auto-flow": {
        syntax: "[ row | column ] || dense",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Grid Layout"
        ],
        initial: "row",
        appliesto: "gridContainers",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "grid-auto-rows": {
        syntax: "<track-size>+",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "referToDimensionOfContentArea",
        groups: [
            "CSS Grid Layout"
        ],
        initial: "auto",
        appliesto: "gridContainers",
        computed: "percentageAsSpecifiedOrAbsoluteLength",
        order: "uniqueOrder",
        status: "standard"
    },
        "grid-column": {
        syntax: "<grid-line> [ / <grid-line> ]?",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Grid Layout"
        ],
        initial: [
            "grid-column-start",
            "grid-column-end"
        ],
        appliesto: "gridItemsAndBoxesWithinGridContainer",
        computed: [
            "grid-column-start",
            "grid-column-end"
        ],
        order: "uniqueOrder",
        status: "standard"
    },
        "grid-column-end": {
        syntax: "<grid-line>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Grid Layout"
        ],
        initial: "auto",
        appliesto: "gridItemsAndBoxesWithinGridContainer",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "grid-column-gap": {
        syntax: "<length-percentage>",
        media: "visual",
        inherited: false,
        animationType: "length",
        percentages: "referToDimensionOfContentArea",
        groups: [
            "CSS Grid Layout"
        ],
        initial: "0",
        appliesto: "gridContainers",
        computed: "percentageAsSpecifiedOrAbsoluteLength",
        order: "uniqueOrder",
        status: "obsolete"
    },
        "grid-column-start": {
        syntax: "<grid-line>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Grid Layout"
        ],
        initial: "auto",
        appliesto: "gridItemsAndBoxesWithinGridContainer",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "grid-gap": {
        syntax: "<'grid-row-gap'> <'grid-column-gap'>?",
        media: "visual",
        inherited: false,
        animationType: [
            "grid-row-gap",
            "grid-column-gap"
        ],
        percentages: "no",
        groups: [
            "CSS Grid Layout"
        ],
        initial: [
            "grid-row-gap",
            "grid-column-gap"
        ],
        appliesto: "gridContainers",
        computed: [
            "grid-row-gap",
            "grid-column-gap"
        ],
        order: "uniqueOrder",
        status: "obsolete"
    },
        "grid-row": {
        syntax: "<grid-line> [ / <grid-line> ]?",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Grid Layout"
        ],
        initial: [
            "grid-row-start",
            "grid-row-end"
        ],
        appliesto: "gridItemsAndBoxesWithinGridContainer",
        computed: [
            "grid-row-start",
            "grid-row-end"
        ],
        order: "uniqueOrder",
        status: "standard"
    },
        "grid-row-end": {
        syntax: "<grid-line>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Grid Layout"
        ],
        initial: "auto",
        appliesto: "gridItemsAndBoxesWithinGridContainer",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "grid-row-gap": {
        syntax: "<length-percentage>",
        media: "visual",
        inherited: false,
        animationType: "length",
        percentages: "referToDimensionOfContentArea",
        groups: [
            "CSS Grid Layout"
        ],
        initial: "0",
        appliesto: "gridContainers",
        computed: "percentageAsSpecifiedOrAbsoluteLength",
        order: "uniqueOrder",
        status: "obsolete"
    },
        "grid-row-start": {
        syntax: "<grid-line>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Grid Layout"
        ],
        initial: "auto",
        appliesto: "gridItemsAndBoxesWithinGridContainer",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "grid-template": {
        syntax: "none | [ <'grid-template-rows'> / <'grid-template-columns'> ] | [ <line-names>? <string> <track-size>? <line-names>? ]+ [ / <explicit-track-list> ]?",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: [
            "grid-template-columns",
            "grid-template-rows"
        ],
        groups: [
            "CSS Grid Layout"
        ],
        initial: [
            "grid-template-columns",
            "grid-template-rows",
            "grid-template-areas"
        ],
        appliesto: "gridContainers",
        computed: [
            "grid-template-columns",
            "grid-template-rows",
            "grid-template-areas"
        ],
        order: "uniqueOrder",
        status: "standard"
    },
        "grid-template-areas": {
        syntax: "none | <string>+",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Grid Layout"
        ],
        initial: "none",
        appliesto: "gridContainers",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "grid-template-columns": {
        syntax: "none | <track-list> | <auto-track-list>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "referToDimensionOfContentArea",
        groups: [
            "CSS Grid Layout"
        ],
        initial: "none",
        appliesto: "gridContainers",
        computed: "asSpecifiedRelativeToAbsoluteLengths",
        order: "uniqueOrder",
        status: "standard"
    },
        "grid-template-rows": {
        syntax: "none | <track-list> | <auto-track-list>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "referToDimensionOfContentArea",
        groups: [
            "CSS Grid Layout"
        ],
        initial: "none",
        appliesto: "gridContainers",
        computed: "asSpecifiedRelativeToAbsoluteLengths",
        order: "uniqueOrder",
        status: "standard"
    },
        "hanging-punctuation": {
        syntax: "none | [ first || [ force-end | allow-end ] || last ]",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Text"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        height: height,
        hyphens: hyphens,
        "image-orientation": {
        syntax: "from-image | <angle> | [ <angle>? flip ]",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Images"
        ],
        initial: "0deg",
        appliesto: "allElements",
        computed: "angleRoundedToNextQuarter",
        order: "uniqueOrder",
        status: "standard"
    },
        "image-rendering": {
        syntax: "auto | crisp-edges | pixelated",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Images"
        ],
        initial: "auto",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "image-resolution": {
        syntax: "[ from-image || <resolution> ] && snap?",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Images"
        ],
        initial: "1dppx",
        appliesto: "allElements",
        computed: "asSpecifiedWithExceptionOfResolution",
        order: "uniqueOrder",
        status: "experimental"
    },
        "ime-mode": {
        syntax: "auto | normal | active | inactive | disabled",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Basic User Interface"
        ],
        initial: "auto",
        appliesto: "textFields",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "obsolete"
    },
        "initial-letter": {
        syntax: "normal | [ <number> <integer>? ]",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Inline"
        ],
        initial: "normal",
        appliesto: "firstLetterPseudoElementsAndInlineLevelFirstChildren",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "experimental"
    },
        "initial-letter-align": {
        syntax: "[ auto | alphabetic | hanging | ideographic ]",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Inline"
        ],
        initial: "auto",
        appliesto: "firstLetterPseudoElementsAndInlineLevelFirstChildren",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "experimental"
    },
        "inline-size": {
        syntax: "<'width'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "inlineSizeOfContainingBlock",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "auto",
        appliesto: "sameAsWidthAndHeight",
        computed: "sameAsWidthAndHeight",
        order: "uniqueOrder",
        status: "standard"
    },
        isolation: isolation,
        "justify-content": {
        syntax: "normal | <content-distribution> | <overflow-position>? [ <content-position> | left | right ]",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Flexible Box Layout"
        ],
        initial: "normal",
        appliesto: "flexContainers",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "justify-items": {
        syntax: "normal | stretch | <baseline-position> | <overflow-position>? [ <self-position> | left | right ] | legacy | legacy && [ left | right | center ]",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Box Alignment"
        ],
        initial: "legacy",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "perGrammar",
        status: "standard"
    },
        "justify-self": {
        syntax: "auto | normal | stretch | <baseline-position> | <overflow-position>? [ <self-position> | left | right ]",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Box Alignment"
        ],
        initial: "auto",
        appliesto: "blockLevelBoxesAndAbsolutelyPositionedBoxesAndGridItems",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        left: left,
        "letter-spacing": {
        syntax: "normal | <length>",
        media: "visual",
        inherited: true,
        animationType: "length",
        percentages: "no",
        groups: [
            "CSS Text"
        ],
        initial: "normal",
        appliesto: "allElements",
        computed: "optimumValueOfAbsoluteLengthOrNormal",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line"
        ],
        status: "standard"
    },
        "line-break": {
        syntax: "auto | loose | normal | strict",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Text"
        ],
        initial: "auto",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "line-clamp": {
        syntax: "none | <integer>",
        media: "visual",
        inherited: false,
        animationType: "integer",
        percentages: "no",
        groups: [
            "CSS Overflow"
        ],
        initial: "none",
        appliesto: "blockContainersExceptMultiColumnContainers",
        computed: "asSpecified",
        order: "perGrammar",
        status: "experimental"
    },
        "line-height": {
        syntax: "normal | <number> | <length> | <percentage>",
        media: "visual",
        inherited: true,
        animationType: "numberOrLength",
        percentages: "referToElementFontSize",
        groups: [
            "CSS Fonts"
        ],
        initial: "normal",
        appliesto: "allElements",
        computed: "absoluteLengthOrAsSpecified",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "line-height-step": {
        syntax: "<length>",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Fonts"
        ],
        initial: "0",
        appliesto: "blockContainerElements",
        computed: "absoluteLength",
        order: "perGrammar",
        status: "experimental"
    },
        "list-style": {
        syntax: "<'list-style-type'> || <'list-style-position'> || <'list-style-image'>",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Lists and Counters"
        ],
        initial: [
            "list-style-type",
            "list-style-position",
            "list-style-image"
        ],
        appliesto: "listItems",
        computed: [
            "list-style-image",
            "list-style-position",
            "list-style-type"
        ],
        order: "orderOfAppearance",
        status: "standard"
    },
        "list-style-image": {
        syntax: "<url> | none",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Lists and Counters"
        ],
        initial: "none",
        appliesto: "listItems",
        computed: "noneOrImageWithAbsoluteURI",
        order: "uniqueOrder",
        status: "standard"
    },
        "list-style-position": {
        syntax: "inside | outside",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Lists and Counters"
        ],
        initial: "outside",
        appliesto: "listItems",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "list-style-type": {
        syntax: "<counter-style> | <string> | none",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Lists and Counters"
        ],
        initial: "disc",
        appliesto: "listItems",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        margin: margin,
        "margin-block-end": {
        syntax: "<'margin-left'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "dependsOnLayoutModel",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "0",
        appliesto: "sameAsMargin",
        computed: "lengthAbsolutePercentageAsSpecifiedOtherwiseAuto",
        order: "uniqueOrder",
        status: "standard"
    },
        "margin-block-start": {
        syntax: "<'margin-left'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "dependsOnLayoutModel",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "0",
        appliesto: "sameAsMargin",
        computed: "lengthAbsolutePercentageAsSpecifiedOtherwiseAuto",
        order: "uniqueOrder",
        status: "standard"
    },
        "margin-bottom": {
        syntax: "<length> | <percentage> | auto",
        media: "visual",
        inherited: false,
        animationType: "length",
        percentages: "referToWidthOfContainingBlock",
        groups: [
            "CSS Box Model"
        ],
        initial: "0",
        appliesto: "allElementsExceptTableDisplayTypes",
        computed: "percentageAsSpecifiedOrAbsoluteLength",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "margin-inline-end": {
        syntax: "<'margin-left'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "dependsOnLayoutModel",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "0",
        appliesto: "sameAsMargin",
        computed: "lengthAbsolutePercentageAsSpecifiedOtherwiseAuto",
        order: "uniqueOrder",
        status: "standard"
    },
        "margin-inline-start": {
        syntax: "<'margin-left'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "dependsOnLayoutModel",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "0",
        appliesto: "sameAsMargin",
        computed: "lengthAbsolutePercentageAsSpecifiedOtherwiseAuto",
        order: "uniqueOrder",
        status: "standard"
    },
        "margin-left": {
        syntax: "<length> | <percentage> | auto",
        media: "visual",
        inherited: false,
        animationType: "length",
        percentages: "referToWidthOfContainingBlock",
        groups: [
            "CSS Box Model"
        ],
        initial: "0",
        appliesto: "allElementsExceptTableDisplayTypes",
        computed: "percentageAsSpecifiedOrAbsoluteLength",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "margin-right": {
        syntax: "<length> | <percentage> | auto",
        media: "visual",
        inherited: false,
        animationType: "length",
        percentages: "referToWidthOfContainingBlock",
        groups: [
            "CSS Box Model"
        ],
        initial: "0",
        appliesto: "allElementsExceptTableDisplayTypes",
        computed: "percentageAsSpecifiedOrAbsoluteLength",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "margin-top": {
        syntax: "<length> | <percentage> | auto",
        media: "visual",
        inherited: false,
        animationType: "length",
        percentages: "referToWidthOfContainingBlock",
        groups: [
            "CSS Box Model"
        ],
        initial: "0",
        appliesto: "allElementsExceptTableDisplayTypes",
        computed: "percentageAsSpecifiedOrAbsoluteLength",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        mask: mask,
        "mask-border": {
        syntax: "<'mask-border-source'> || <'mask-border-slice'> [ / <'mask-border-width'>? [ / <'mask-border-outset'> ]? ]? || <'mask-border-repeat'> || <'mask-border-mode'>",
        media: "visual",
        inherited: false,
        animationType: [
            "mask-border-mode",
            "mask-border-outset",
            "mask-border-repeat",
            "mask-border-slice",
            "mask-border-source",
            "mask-border-width"
        ],
        percentages: [
            "mask-border-slice",
            "mask-border-width"
        ],
        groups: [
            "CSS Masking"
        ],
        initial: [
            "mask-border-mode",
            "mask-border-outset",
            "mask-border-repeat",
            "mask-border-slice",
            "mask-border-source",
            "mask-border-width"
        ],
        appliesto: "allElementsSVGContainerElements",
        computed: [
            "mask-border-mode",
            "mask-border-outset",
            "mask-border-repeat",
            "mask-border-slice",
            "mask-border-source",
            "mask-border-width"
        ],
        order: "perGrammar",
        stacking: true,
        status: "experimental"
    },
        "mask-border-mode": {
        syntax: "luminance | alpha",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Masking"
        ],
        initial: "alpha",
        appliesto: "allElementsSVGContainerElements",
        computed: "asSpecified",
        order: "perGrammar",
        status: "experimental"
    },
        "mask-border-outset": {
        syntax: "[ <length> | <number> ]{1,4}",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Masking"
        ],
        initial: "0",
        appliesto: "allElementsSVGContainerElements",
        computed: "asSpecifiedRelativeToAbsoluteLengths",
        order: "perGrammar",
        status: "experimental"
    },
        "mask-border-repeat": {
        syntax: "[ stretch | repeat | round | space ]{1,2}",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Masking"
        ],
        initial: "stretch",
        appliesto: "allElementsSVGContainerElements",
        computed: "asSpecified",
        order: "perGrammar",
        status: "experimental"
    },
        "mask-border-slice": {
        syntax: "<number-percentage>{1,4} fill?",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "referToSizeOfMaskBorderImage",
        groups: [
            "CSS Masking"
        ],
        initial: "0",
        appliesto: "allElementsSVGContainerElements",
        computed: "asSpecified",
        order: "perGrammar",
        status: "experimental"
    },
        "mask-border-source": {
        syntax: "none | <image>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Masking"
        ],
        initial: "none",
        appliesto: "allElementsSVGContainerElements",
        computed: "asSpecifiedURLsAbsolute",
        order: "perGrammar",
        status: "experimental"
    },
        "mask-border-width": {
        syntax: "[ <length-percentage> | <number> | auto ]{1,4}",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "relativeToMaskBorderImageArea",
        groups: [
            "CSS Masking"
        ],
        initial: "auto",
        appliesto: "allElementsSVGContainerElements",
        computed: "asSpecifiedRelativeToAbsoluteLengths",
        order: "perGrammar",
        status: "experimental"
    },
        "mask-clip": {
        syntax: "[ <geometry-box> | no-clip ]#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Masking"
        ],
        initial: "border-box",
        appliesto: "allElementsSVGContainerElements",
        computed: "asSpecified",
        order: "perGrammar",
        status: "standard"
    },
        "mask-composite": {
        syntax: "<compositing-operator>#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Masking"
        ],
        initial: "add",
        appliesto: "allElementsSVGContainerElements",
        computed: "asSpecified",
        order: "perGrammar",
        status: "standard"
    },
        "mask-image": {
        syntax: "<mask-reference>#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Masking"
        ],
        initial: "none",
        appliesto: "allElementsSVGContainerElements",
        computed: "asSpecifiedURLsAbsolute",
        order: "perGrammar",
        status: "standard"
    },
        "mask-mode": {
        syntax: "<masking-mode>#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Masking"
        ],
        initial: "match-source",
        appliesto: "allElementsSVGContainerElements",
        computed: "asSpecified",
        order: "perGrammar",
        status: "standard"
    },
        "mask-origin": {
        syntax: "<geometry-box>#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Masking"
        ],
        initial: "border-box",
        appliesto: "allElementsSVGContainerElements",
        computed: "asSpecified",
        order: "perGrammar",
        status: "standard"
    },
        "mask-position": {
        syntax: "<position>#",
        media: "visual",
        inherited: false,
        animationType: "repeatableListOfSimpleListOfLpc",
        percentages: "referToSizeOfMaskPaintingArea",
        groups: [
            "CSS Masking"
        ],
        initial: "center",
        appliesto: "allElementsSVGContainerElements",
        computed: "consistsOfTwoKeywordsForOriginAndOffsets",
        order: "perGrammar",
        status: "standard"
    },
        "mask-repeat": {
        syntax: "<repeat-style>#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Masking"
        ],
        initial: "no-repeat",
        appliesto: "allElementsSVGContainerElements",
        computed: "consistsOfTwoDimensionKeywords",
        order: "perGrammar",
        status: "standard"
    },
        "mask-size": {
        syntax: "<bg-size>#",
        media: "visual",
        inherited: false,
        animationType: "repeatableListOfSimpleListOfLpc",
        percentages: "no",
        groups: [
            "CSS Masking"
        ],
        initial: "auto",
        appliesto: "allElementsSVGContainerElements",
        computed: "asSpecifiedRelativeToAbsoluteLengths",
        order: "perGrammar",
        status: "standard"
    },
        "mask-type": {
        syntax: "luminance | alpha",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Masking"
        ],
        initial: "luminance",
        appliesto: "maskElements",
        computed: "asSpecified",
        order: "perGrammar",
        status: "standard"
    },
        "max-block-size": {
        syntax: "<'max-width'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "blockSizeOfContainingBlock",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "0",
        appliesto: "sameAsWidthAndHeight",
        computed: "sameAsMaxWidthAndMaxHeight",
        order: "uniqueOrder",
        status: "experimental"
    },
        "max-height": {
        syntax: "<length> | <percentage> | none | max-content | min-content | fit-content | fill-available",
        media: "visual",
        inherited: false,
        animationType: "lpc",
        percentages: "regardingHeightOfGeneratedBoxContainingBlockPercentagesNone",
        groups: [
            "CSS Box Model"
        ],
        initial: "none",
        appliesto: "allElementsButNonReplacedAndTableColumns",
        computed: "percentageAsSpecifiedAbsoluteLengthOrNone",
        order: "uniqueOrder",
        status: "standard"
    },
        "max-inline-size": {
        syntax: "<'max-width'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "inlineSizeOfContainingBlock",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "0",
        appliesto: "sameAsWidthAndHeight",
        computed: "sameAsMaxWidthAndMaxHeight",
        order: "uniqueOrder",
        status: "experimental"
    },
        "max-lines": {
        syntax: "none | <integer>",
        media: "visual",
        inherited: false,
        animationType: "integer",
        percentages: "no",
        groups: [
            "CSS Overflow"
        ],
        initial: "none",
        appliesto: "blockContainersExceptMultiColumnContainers",
        computed: "asSpecified",
        order: "perGrammar",
        status: "experimental"
    },
        "max-width": {
        syntax: "<length> | <percentage> | none | max-content | min-content | fit-content | fill-available",
        media: "visual",
        inherited: false,
        animationType: "lpc",
        percentages: "referToWidthOfContainingBlock",
        groups: [
            "CSS Box Model"
        ],
        initial: "none",
        appliesto: "allElementsButNonReplacedAndTableRows",
        computed: "percentageAsSpecifiedAbsoluteLengthOrNone",
        order: "uniqueOrder",
        status: "standard"
    },
        "min-block-size": {
        syntax: "<'min-width'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "blockSizeOfContainingBlock",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "0",
        appliesto: "sameAsWidthAndHeight",
        computed: "sameAsMinWidthAndMinHeight",
        order: "uniqueOrder",
        status: "standard"
    },
        "min-height": {
        syntax: "<length> | <percentage> | auto | max-content | min-content | fit-content | fill-available",
        media: "visual",
        inherited: false,
        animationType: "lpc",
        percentages: "regardingHeightOfGeneratedBoxContainingBlockPercentages0",
        groups: [
            "CSS Box Model"
        ],
        initial: "0",
        appliesto: "allElementsButNonReplacedAndTableColumns",
        computed: "percentageAsSpecifiedOrAbsoluteLength",
        order: "uniqueOrder",
        status: "standard"
    },
        "min-inline-size": {
        syntax: "<'min-width'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "inlineSizeOfContainingBlock",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "0",
        appliesto: "sameAsWidthAndHeight",
        computed: "sameAsMinWidthAndMinHeight",
        order: "uniqueOrder",
        status: "standard"
    },
        "min-width": {
        syntax: "<length> | <percentage> | auto | max-content | min-content | fit-content | fill-available",
        media: "visual",
        inherited: false,
        animationType: "lpc",
        percentages: "referToWidthOfContainingBlock",
        groups: [
            "CSS Box Model"
        ],
        initial: "0",
        appliesto: "allElementsButNonReplacedAndTableRows",
        computed: "percentageAsSpecifiedOrAbsoluteLength",
        order: "uniqueOrder",
        status: "standard"
    },
        "mix-blend-mode": {
        syntax: "<blend-mode>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Compositing and Blending"
        ],
        initial: "normal",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        stacking: true,
        status: "standard"
    },
        "object-fit": {
        syntax: "fill | contain | cover | none | scale-down",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Images"
        ],
        initial: "fill",
        appliesto: "replacedElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "object-position": {
        syntax: "<position>",
        media: "visual",
        inherited: true,
        animationType: "repeatableListOfSimpleListOfLpc",
        percentages: "referToWidthAndHeightOfElement",
        groups: [
            "CSS Images"
        ],
        initial: "50% 50%",
        appliesto: "replacedElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        offset: offset,
        "offset-anchor": {
        syntax: "auto | <position>",
        media: "visual",
        inherited: false,
        animationType: "position",
        percentages: "relativeToWidthAndHeight",
        groups: [
            "CSS Motion"
        ],
        initial: "auto",
        appliesto: "transformableElements",
        computed: "forLengthAbsoluteValueOtherwisePercentage",
        order: "perGrammar",
        status: "experimental"
    },
        "offset-block-end": {
        syntax: "<'left'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "logicalHeightOfContainingBlock",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "auto",
        appliesto: "positionedElements",
        computed: "sameAsBoxOffsets",
        order: "uniqueOrder",
        status: "standard"
    },
        "offset-block-start": {
        syntax: "<'left'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "logicalHeightOfContainingBlock",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "auto",
        appliesto: "positionedElements",
        computed: "sameAsBoxOffsets",
        order: "uniqueOrder",
        status: "standard"
    },
        "offset-inline-end": {
        syntax: "<'left'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "logicalWidthOfContainingBlock",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "auto",
        appliesto: "positionedElements",
        computed: "sameAsBoxOffsets",
        order: "uniqueOrder",
        status: "standard"
    },
        "offset-inline-start": {
        syntax: "<'left'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "logicalWidthOfContainingBlock",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "auto",
        appliesto: "positionedElements",
        computed: "sameAsBoxOffsets",
        order: "uniqueOrder",
        status: "standard"
    },
        "offset-distance": {
        syntax: "<length-percentage>",
        media: "visual",
        inherited: false,
        animationType: "lpc",
        percentages: "referToTotalPathLength",
        groups: [
            "CSS Motion"
        ],
        initial: "0",
        appliesto: "transformableElements",
        computed: "forLengthAbsoluteValueOtherwisePercentage",
        order: "perGrammar",
        status: "experimental"
    },
        "offset-path": {
        syntax: "none | ray( [ <angle> && <size>? && contain? ] ) | <path()> | <url> | [ <basic-shape> || <geometry-box> ]",
        media: "visual",
        inherited: false,
        animationType: "angleOrBasicShapeOrPath",
        percentages: "no",
        groups: [
            "CSS Motion"
        ],
        initial: "none",
        appliesto: "transformableElements",
        computed: "asSpecified",
        order: "perGrammar",
        stacking: true,
        status: "experimental"
    },
        "offset-position": {
        syntax: "auto | <position>",
        media: "visual",
        inherited: false,
        animationType: "position",
        percentages: "referToSizeOfContainingBlock",
        groups: [
            "CSS Motion"
        ],
        initial: "auto",
        appliesto: "transformableElements",
        computed: "forLengthAbsoluteValueOtherwisePercentage",
        order: "perGrammar",
        status: "experimental"
    },
        "offset-rotate": {
        syntax: "[ auto | reverse ] || <angle>",
        media: "visual",
        inherited: false,
        animationType: "angle",
        percentages: "no",
        groups: [
            "CSS Motion"
        ],
        initial: "auto",
        appliesto: "transformableElements",
        computed: "asSpecified",
        order: "perGrammar",
        status: "experimental"
    },
        opacity: opacity,
        order: order,
        orphans: orphans,
        outline: outline,
        "outline-color": {
        syntax: "<color> | invert",
        media: [
            "visual",
            "interactive"
        ],
        inherited: false,
        animationType: "color",
        percentages: "no",
        groups: [
            "CSS Basic User Interface"
        ],
        initial: "invertOrCurrentColor",
        appliesto: "allElements",
        computed: "invertForTranslucentColorRGBAOtherwiseRGB",
        order: "uniqueOrder",
        status: "standard"
    },
        "outline-offset": {
        syntax: "<length>",
        media: [
            "visual",
            "interactive"
        ],
        inherited: false,
        animationType: "length",
        percentages: "no",
        groups: [
            "CSS Basic User Interface"
        ],
        initial: "0",
        appliesto: "allElements",
        computed: "asSpecifiedRelativeToAbsoluteLengths",
        order: "uniqueOrder",
        status: "standard"
    },
        "outline-style": {
        syntax: "auto | <br-style>",
        media: [
            "visual",
            "interactive"
        ],
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Basic User Interface"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "outline-width": {
        syntax: "<br-width>",
        media: [
            "visual",
            "interactive"
        ],
        inherited: false,
        animationType: "length",
        percentages: "no",
        groups: [
            "CSS Basic User Interface"
        ],
        initial: "medium",
        appliesto: "allElements",
        computed: "absoluteLength0ForNone",
        order: "uniqueOrder",
        status: "standard"
    },
        overflow: overflow,
        "overflow-anchor": {
        syntax: "auto | none",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Scroll Anchoring"
        ],
        initial: "auto",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "perGrammar",
        status: "experimental"
    },
        "overflow-block": {
        syntax: "<'overflow'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Overflow"
        ],
        initial: "auto",
        appliesto: "blockContainersFlexContainersGridContainers",
        computed: "asSpecified",
        order: "perGrammar",
        status: "experimental"
    },
        "overflow-clip-box": {
        syntax: "padding-box | content-box",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Mozilla Extensions"
        ],
        initial: "padding-box",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "overflow-inline": {
        syntax: "<'overflow'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Overflow"
        ],
        initial: "auto",
        appliesto: "blockContainersFlexContainersGridContainers",
        computed: "asSpecified",
        order: "perGrammar",
        status: "experimental"
    },
        "overflow-wrap": {
        syntax: "normal | break-word",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Text"
        ],
        initial: "normal",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "overflow-x": {
        syntax: "visible | hidden | clip | scroll | auto",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Overflow"
        ],
        initial: "visible",
        appliesto: "blockContainersFlexContainersGridContainers",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "overflow-y": {
        syntax: "visible | hidden | clip | scroll | auto",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Overflow"
        ],
        initial: "visible",
        appliesto: "blockContainersFlexContainersGridContainers",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "overscroll-behavior": {
        syntax: "[ contain | none | auto ]{1,2}",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Box Model"
        ],
        initial: "auto",
        appliesto: "nonReplacedBlockAndInlineBlockElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "overscroll-behavior-x": {
        syntax: "contain | none | auto",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Box Model"
        ],
        initial: "auto",
        appliesto: "nonReplacedBlockAndInlineBlockElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "overscroll-behavior-y": {
        syntax: "contain | none | auto",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Box Model"
        ],
        initial: "auto",
        appliesto: "nonReplacedBlockAndInlineBlockElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        padding: padding,
        "padding-block-end": {
        syntax: "<'padding-left'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "logicalWidthOfContainingBlock",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "0",
        appliesto: "allElements",
        computed: "asLength",
        order: "uniqueOrder",
        status: "standard"
    },
        "padding-block-start": {
        syntax: "<'padding-left'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "logicalWidthOfContainingBlock",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "0",
        appliesto: "allElements",
        computed: "asLength",
        order: "uniqueOrder",
        status: "standard"
    },
        "padding-bottom": {
        syntax: "<length> | <percentage>",
        media: "visual",
        inherited: false,
        animationType: "length",
        percentages: "referToWidthOfContainingBlock",
        groups: [
            "CSS Box Model"
        ],
        initial: "0",
        appliesto: "allElementsExceptInternalTableDisplayTypes",
        computed: "percentageAsSpecifiedOrAbsoluteLength",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "padding-inline-end": {
        syntax: "<'padding-left'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "logicalWidthOfContainingBlock",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "0",
        appliesto: "allElements",
        computed: "asLength",
        order: "uniqueOrder",
        status: "standard"
    },
        "padding-inline-start": {
        syntax: "<'padding-left'>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "logicalWidthOfContainingBlock",
        groups: [
            "CSS Logical Properties"
        ],
        initial: "0",
        appliesto: "allElements",
        computed: "asLength",
        order: "uniqueOrder",
        status: "standard"
    },
        "padding-left": {
        syntax: "<length> | <percentage>",
        media: "visual",
        inherited: false,
        animationType: "length",
        percentages: "referToWidthOfContainingBlock",
        groups: [
            "CSS Box Model"
        ],
        initial: "0",
        appliesto: "allElementsExceptInternalTableDisplayTypes",
        computed: "percentageAsSpecifiedOrAbsoluteLength",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "padding-right": {
        syntax: "<length> | <percentage>",
        media: "visual",
        inherited: false,
        animationType: "length",
        percentages: "referToWidthOfContainingBlock",
        groups: [
            "CSS Box Model"
        ],
        initial: "0",
        appliesto: "allElementsExceptInternalTableDisplayTypes",
        computed: "percentageAsSpecifiedOrAbsoluteLength",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "padding-top": {
        syntax: "<length> | <percentage>",
        media: "visual",
        inherited: false,
        animationType: "length",
        percentages: "referToWidthOfContainingBlock",
        groups: [
            "CSS Box Model"
        ],
        initial: "0",
        appliesto: "allElementsExceptInternalTableDisplayTypes",
        computed: "percentageAsSpecifiedOrAbsoluteLength",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter"
        ],
        status: "standard"
    },
        "page-break-after": {
        syntax: "auto | always | avoid | left | right | recto | verso",
        media: [
            "visual",
            "paged"
        ],
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Pages"
        ],
        initial: "auto",
        appliesto: "blockElementsInNormalFlow",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "page-break-before": {
        syntax: "auto | always | avoid | left | right | recto | verso",
        media: [
            "visual",
            "paged"
        ],
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Pages"
        ],
        initial: "auto",
        appliesto: "blockElementsInNormalFlow",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "page-break-inside": {
        syntax: "auto | avoid",
        media: [
            "visual",
            "paged"
        ],
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Pages"
        ],
        initial: "auto",
        appliesto: "blockElementsInNormalFlow",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "paint-order": {
        syntax: "normal | [ fill || stroke || markers ]",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Text"
        ],
        initial: "normal",
        appliesto: "textElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "experimental"
    },
        perspective: perspective,
        "perspective-origin": {
        syntax: "<position>",
        media: "visual",
        inherited: false,
        animationType: "simpleListOfLpc",
        percentages: "referToSizeOfBoundingBox",
        groups: [
            "CSS Transforms"
        ],
        initial: "50% 50%",
        appliesto: "transformableElements",
        computed: "forLengthAbsoluteValueOtherwisePercentage",
        order: "oneOrTwoValuesLengthAbsoluteKeywordsPercentages",
        status: "standard"
    },
        "place-content": {
        syntax: "<'align-content'> <'justify-content'>?",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Flexible Box Layout"
        ],
        initial: "normal",
        appliesto: "multilineFlexContainers",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "pointer-events": {
        syntax: "auto | none | visiblePainted | visibleFill | visibleStroke | visible | painted | fill | stroke | all | inherit",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Pointer Events"
        ],
        initial: "auto",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        position: position,
        quotes: quotes,
        resize: resize,
        right: right,
        rotate: rotate,
        "row-gap": {
        syntax: "normal | <length-percentage>",
        media: "visual",
        inherited: false,
        animationType: "lpc",
        percentages: "referToDimensionOfContentArea",
        groups: [
            "CSS Box Alignment"
        ],
        initial: "normal",
        appliesto: "multiColumnElementsFlexContainersGridContainers",
        computed: "asSpecifiedWithLengthsAbsoluteAndNormalComputingToZeroExceptMultiColumn",
        order: "perGrammar",
        status: "standard"
    },
        "ruby-align": {
        syntax: "start | center | space-between | space-around",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Ruby"
        ],
        initial: "space-around",
        appliesto: "rubyBasesAnnotationsBaseAnnotationContainers",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "experimental"
    },
        "ruby-merge": {
        syntax: "separate | collapse | auto",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Ruby"
        ],
        initial: "separate",
        appliesto: "rubyAnnotationsContainers",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "experimental"
    },
        "ruby-position": {
        syntax: "over | under | inter-character",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Ruby"
        ],
        initial: "over",
        appliesto: "rubyAnnotationsContainers",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "experimental"
    },
        scale: scale,
        "scroll-behavior": {
        syntax: "auto | smooth",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSSOM View"
        ],
        initial: "auto",
        appliesto: "scrollingBoxes",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "scroll-snap-coordinate": {
        syntax: "none | <position>#",
        media: "interactive",
        inherited: false,
        animationType: "position",
        percentages: "referToBorderBox",
        groups: [
            "CSS Scroll Snap"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecifiedRelativeToAbsoluteLengths",
        order: "uniqueOrder",
        status: "standard"
    },
        "scroll-snap-destination": {
        syntax: "<position>",
        media: "interactive",
        inherited: false,
        animationType: "position",
        percentages: "relativeToScrollContainerPaddingBoxAxis",
        groups: [
            "CSS Scroll Snap"
        ],
        initial: "0px 0px",
        appliesto: "scrollContainers",
        computed: "asSpecifiedRelativeToAbsoluteLengths",
        order: "uniqueOrder",
        status: "standard"
    },
        "scroll-snap-points-x": {
        syntax: "none | repeat( <length-percentage> )",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "relativeToScrollContainerPaddingBoxAxis",
        groups: [
            "CSS Scroll Snap"
        ],
        initial: "none",
        appliesto: "scrollContainers",
        computed: "asSpecifiedRelativeToAbsoluteLengths",
        order: "uniqueOrder",
        status: "obsolete"
    },
        "scroll-snap-points-y": {
        syntax: "none | repeat( <length-percentage> )",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "relativeToScrollContainerPaddingBoxAxis",
        groups: [
            "CSS Scroll Snap"
        ],
        initial: "none",
        appliesto: "scrollContainers",
        computed: "asSpecifiedRelativeToAbsoluteLengths",
        order: "uniqueOrder",
        status: "obsolete"
    },
        "scroll-snap-type": {
        syntax: "none | mandatory | proximity",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Scroll Snap"
        ],
        initial: "none",
        appliesto: "scrollContainers",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "scroll-snap-type-x": {
        syntax: "none | mandatory | proximity",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Scroll Snap"
        ],
        initial: "none",
        appliesto: "scrollContainers",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "scroll-snap-type-y": {
        syntax: "none | mandatory | proximity",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Scroll Snap"
        ],
        initial: "none",
        appliesto: "scrollContainers",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "shape-image-threshold": {
        syntax: "<number>",
        media: "visual",
        inherited: false,
        animationType: "number",
        percentages: "no",
        groups: [
            "CSS Shapes"
        ],
        initial: "0.0",
        appliesto: "floats",
        computed: "specifiedValueNumberClipped0To1",
        order: "uniqueOrder",
        status: "standard"
    },
        "shape-margin": {
        syntax: "<length-percentage>",
        media: "visual",
        inherited: false,
        animationType: "lpc",
        percentages: "referToWidthOfContainingBlock",
        groups: [
            "CSS Shapes"
        ],
        initial: "0",
        appliesto: "floats",
        computed: "asSpecifiedRelativeToAbsoluteLengths",
        order: "uniqueOrder",
        status: "standard"
    },
        "shape-outside": {
        syntax: "none | <shape-box> || <basic-shape> | <image>",
        media: "visual",
        inherited: false,
        animationType: "basicShapeOtherwiseNo",
        percentages: "no",
        groups: [
            "CSS Shapes"
        ],
        initial: "none",
        appliesto: "floats",
        computed: "asDefinedForBasicShapeWithAbsoluteURIOtherwiseAsSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "tab-size": {
        syntax: "<integer> | <length>",
        media: "visual",
        inherited: true,
        animationType: "length",
        percentages: "no",
        groups: [
            "CSS Text"
        ],
        initial: "8",
        appliesto: "blockContainers",
        computed: "specifiedIntegerOrAbsoluteLength",
        order: "uniqueOrder",
        status: "standard"
    },
        "table-layout": {
        syntax: "auto | fixed",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Table"
        ],
        initial: "auto",
        appliesto: "tableElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "text-align": {
        syntax: "start | end | left | right | center | justify | match-parent",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Text"
        ],
        initial: "startOrNamelessValueIfLTRRightIfRTL",
        appliesto: "blockContainers",
        computed: "asSpecifiedExceptMatchParent",
        order: "orderOfAppearance",
        alsoAppliesTo: [
            "::placeholder"
        ],
        status: "standard"
    },
        "text-align-last": {
        syntax: "auto | start | end | left | right | center | justify",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Text"
        ],
        initial: "auto",
        appliesto: "blockContainers",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "text-combine-upright": {
        syntax: "none | all | [ digits <integer>? ]",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Writing Modes"
        ],
        initial: "none",
        appliesto: "nonReplacedInlineElements",
        computed: "keywordPlusIntegerIfDigits",
        order: "uniqueOrder",
        status: "standard"
    },
        "text-decoration": {
        syntax: "<'text-decoration-line'> || <'text-decoration-style'> || <'text-decoration-color'>",
        media: "visual",
        inherited: false,
        animationType: [
            "text-decoration-color",
            "text-decoration-style",
            "text-decoration-line"
        ],
        percentages: "no",
        groups: [
            "CSS Text Decoration"
        ],
        initial: [
            "text-decoration-color",
            "text-decoration-style",
            "text-decoration-line"
        ],
        appliesto: "allElements",
        computed: [
            "text-decoration-line",
            "text-decoration-style",
            "text-decoration-color"
        ],
        order: "orderOfAppearance",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "text-decoration-color": {
        syntax: "<color>",
        media: "visual",
        inherited: false,
        animationType: "color",
        percentages: "no",
        groups: [
            "CSS Text Decoration"
        ],
        initial: "currentcolor",
        appliesto: "allElements",
        computed: "computedColor",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "text-decoration-line": {
        syntax: "none | [ underline || overline || line-through || blink ]",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Text Decoration"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "orderOfAppearance",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "text-decoration-skip": {
        syntax: "none | [ objects || [ spaces | [ leading-spaces || trailing-spaces ] ] || edges || box-decoration ]",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Text Decoration"
        ],
        initial: "objects",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "orderOfAppearance",
        status: "experimental"
    },
        "text-decoration-skip-ink": {
        syntax: "auto | none",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Text Decoration"
        ],
        initial: "auto",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "orderOfAppearance",
        status: "experimental"
    },
        "text-decoration-style": {
        syntax: "solid | double | dotted | dashed | wavy",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Text Decoration"
        ],
        initial: "solid",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "text-emphasis": {
        syntax: "<'text-emphasis-style'> || <'text-emphasis-color'>",
        media: "visual",
        inherited: false,
        animationType: [
            "text-emphasis-color",
            "text-emphasis-style"
        ],
        percentages: "no",
        groups: [
            "CSS Text Decoration"
        ],
        initial: [
            "text-emphasis-style",
            "text-emphasis-color"
        ],
        appliesto: "allElements",
        computed: [
            "text-emphasis-style",
            "text-emphasis-color"
        ],
        order: "orderOfAppearance",
        status: "standard"
    },
        "text-emphasis-color": {
        syntax: "<color>",
        media: "visual",
        inherited: false,
        animationType: "color",
        percentages: "no",
        groups: [
            "CSS Text Decoration"
        ],
        initial: "currentcolor",
        appliesto: "allElements",
        computed: "computedColor",
        order: "uniqueOrder",
        status: "standard"
    },
        "text-emphasis-position": {
        syntax: "[ over | under ] && [ right | left ]",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Text Decoration"
        ],
        initial: "over right",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "text-emphasis-style": {
        syntax: "none | [ [ filled | open ] || [ dot | circle | double-circle | triangle | sesame ] ] | <string>",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Text Decoration"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "text-indent": {
        syntax: "<length-percentage> && hanging? && each-line?",
        media: "visual",
        inherited: true,
        animationType: "lpc",
        percentages: "referToWidthOfContainingBlock",
        groups: [
            "CSS Text"
        ],
        initial: "0",
        appliesto: "blockContainers",
        computed: "percentageOrAbsoluteLengthPlusKeywords",
        order: "lengthOrPercentageBeforeKeywords",
        status: "standard"
    },
        "text-justify": {
        syntax: "auto | inter-character | inter-word | none",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Text"
        ],
        initial: "auto",
        appliesto: "inlineLevelAndTableCellElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "text-orientation": {
        syntax: "mixed | upright | sideways",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Writing Modes"
        ],
        initial: "mixed",
        appliesto: "allElementsExceptTableRowGroupsRowsColumnGroupsAndColumns",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "text-overflow": {
        syntax: "[ clip | ellipsis | <string> ]{1,2}",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Basic User Interface"
        ],
        initial: "clip",
        appliesto: "blockContainerElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::placeholder"
        ],
        status: "standard"
    },
        "text-rendering": {
        syntax: "auto | optimizeSpeed | optimizeLegibility | geometricPrecision",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Miscellaneous"
        ],
        initial: "auto",
        appliesto: "textElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "text-shadow": {
        syntax: "none | <shadow-t>#",
        media: "visual",
        inherited: true,
        animationType: "shadowList",
        percentages: "no",
        groups: [
            "CSS Text Decoration"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "colorPlusThreeAbsoluteLengths",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "text-size-adjust": {
        syntax: "none | auto | <percentage>",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "referToSizeOfFont",
        groups: [
            "CSS Text"
        ],
        initial: "autoForSmartphoneBrowsersSupportingInflation",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "experimental"
    },
        "text-transform": {
        syntax: "none | capitalize | uppercase | lowercase | full-width",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Text"
        ],
        initial: "none",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "text-underline-position": {
        syntax: "auto | [ under || [ left | right ] ]",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Text Decoration"
        ],
        initial: "auto",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "orderOfAppearance",
        status: "standard"
    },
        top: top,
        "touch-action": {
        syntax: "auto | none | [ [ pan-x | pan-left | pan-right ] || [ pan-y | pan-up | pan-down ] || pinch-zoom ] | manipulation",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "Pointer Events"
        ],
        initial: "auto",
        appliesto: "allElementsExceptNonReplacedInlineElementsTableRowsColumnsRowColumnGroups",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        transform: transform,
        "transform-box": {
        syntax: "border-box | fill-box | view-box",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Transforms"
        ],
        initial: "border-box ",
        appliesto: "transformableElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "transform-origin": {
        syntax: "[ <length-percentage> | left | center | right | top | bottom ] | [ [ <length-percentage> | left | center | right ] && [ <length-percentage> | top | center | bottom ] ] <length>?",
        media: "visual",
        inherited: false,
        animationType: "simpleListOfLpc",
        percentages: "referToSizeOfBoundingBox",
        groups: [
            "CSS Transforms"
        ],
        initial: "50% 50% 0",
        appliesto: "transformableElements",
        computed: "forLengthAbsoluteValueOtherwisePercentage",
        order: "oneOrTwoValuesLengthAbsoluteKeywordsPercentages",
        status: "standard"
    },
        "transform-style": {
        syntax: "flat | preserve-3d",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Transforms"
        ],
        initial: "flat",
        appliesto: "transformableElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        stacking: true,
        status: "standard"
    },
        transition: transition,
        "transition-delay": {
        syntax: "<time>#",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Transitions"
        ],
        initial: "0s",
        appliesto: "allElementsAndPseudos",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "transition-duration": {
        syntax: "<time>#",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Transitions"
        ],
        initial: "0s",
        appliesto: "allElementsAndPseudos",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "transition-property": {
        syntax: "none | <single-transition-property>#",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Transitions"
        ],
        initial: "all",
        appliesto: "allElementsAndPseudos",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "transition-timing-function": {
        syntax: "<single-transition-timing-function>#",
        media: "interactive",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Transitions"
        ],
        initial: "ease",
        appliesto: "allElementsAndPseudos",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        translate: translate,
        "unicode-bidi": {
        syntax: "normal | embed | isolate | bidi-override | isolate-override | plaintext",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Writing Modes"
        ],
        initial: "normal",
        appliesto: "allElementsSomeValuesNoEffectOnNonInlineElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "user-select": {
        syntax: "auto | text | none | contain | all",
        media: "visual",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Basic User Interface"
        ],
        initial: "auto",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "nonstandard"
    },
        "vertical-align": {
        syntax: "baseline | sub | super | text-top | text-bottom | middle | top | bottom | <percentage> | <length>",
        media: "visual",
        inherited: false,
        animationType: "length",
        percentages: "referToLineHeight",
        groups: [
            "CSS Table"
        ],
        initial: "baseline",
        appliesto: "inlineLevelAndTableCellElements",
        computed: "absoluteLengthOrKeyword",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        visibility: visibility,
        "white-space": {
        syntax: "normal | pre | nowrap | pre-wrap | pre-line",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Text"
        ],
        initial: "normal",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        widows: widows,
        width: width,
        "will-change": {
        syntax: "auto | <animateable-feature>#",
        media: "all",
        inherited: false,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Will Change"
        ],
        initial: "auto",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "word-break": {
        syntax: "normal | break-all | keep-all | break-word",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Text"
        ],
        initial: "normal",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "word-spacing": {
        syntax: "normal | <length-percentage>",
        media: "visual",
        inherited: true,
        animationType: "length",
        percentages: "referToWidthOfAffectedGlyph",
        groups: [
            "CSS Text"
        ],
        initial: "normal",
        appliesto: "allElements",
        computed: "optimumMinAndMaxValueOfAbsoluteLengthPercentageOrNormal",
        order: "uniqueOrder",
        alsoAppliesTo: [
            "::first-letter",
            "::first-line",
            "::placeholder"
        ],
        status: "standard"
    },
        "word-wrap": {
        syntax: "normal | break-word",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Text"
        ],
        initial: "normal",
        appliesto: "allElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "writing-mode": {
        syntax: "horizontal-tb | vertical-rl | vertical-lr | sideways-rl | sideways-lr",
        media: "visual",
        inherited: true,
        animationType: "discrete",
        percentages: "no",
        groups: [
            "CSS Writing Modes"
        ],
        initial: "horizontal-tb",
        appliesto: "allElementsExceptTableRowColumnGroupsTableRowsColumns",
        computed: "asSpecified",
        order: "uniqueOrder",
        status: "standard"
    },
        "z-index": {
        syntax: "auto | <integer>",
        media: "visual",
        inherited: false,
        animationType: "integer",
        percentages: "no",
        groups: [
            "CSS Positioning"
        ],
        initial: "auto",
        appliesto: "positionedElements",
        computed: "asSpecified",
        order: "uniqueOrder",
        stacking: true,
        status: "standard"
    },
        zoom: zoom
    };

    var properties$2 = /*#__PURE__*/Object.freeze({
        all: all,
        animation: animation,
        appearance: appearance,
        azimuth: azimuth,
        background: background,
        border: border,
        bottom: bottom,
        clear: clear,
        clip: clip,
        color: color,
        columns: columns,
        contain: contain,
        content: content,
        cursor: cursor,
        direction: direction,
        display: display,
        filter: filter,
        flex: flex,
        float: float,
        font: font,
        gap: gap,
        grid: grid,
        height: height,
        hyphens: hyphens,
        isolation: isolation,
        left: left,
        margin: margin,
        mask: mask,
        offset: offset,
        opacity: opacity,
        order: order,
        orphans: orphans,
        outline: outline,
        overflow: overflow,
        padding: padding,
        perspective: perspective,
        position: position,
        quotes: quotes,
        resize: resize,
        right: right,
        rotate: rotate,
        scale: scale,
        top: top,
        transform: transform,
        transition: transition,
        translate: translate,
        visibility: visibility,
        widows: widows,
        width: width,
        zoom: zoom,
        default: properties$1
    });

    var attachment = {
        syntax: "scroll | fixed | local"
    };
    var box = {
        syntax: "border-box | padding-box | content-box"
    };
    var color$1 = {
        syntax: "<rgb()> | <rgba()> | <hsl()> | <hsla()> | <hex-color> | <named-color> | currentcolor | <deprecated-system-color>"
    };
    var gradient = {
        syntax: "<linear-gradient()> | <repeating-linear-gradient()> | <radial-gradient()> | <repeating-radial-gradient()>"
    };
    var hue = {
        syntax: "<number> | <angle>"
    };
    var image = {
        syntax: "<url> | <image()> | <image-set()> | <element()> | <cross-fade()> | <gradient>"
    };
    var nth = {
        syntax: "<an-plus-b> | even | odd"
    };
    var position$1 = {
        syntax: "[ [ left | center | right ] || [ top | center | bottom ] | [ left | center | right | <length-percentage> ] [ top | center | bottom | <length-percentage> ]? | [ [ left | right ] <length-percentage> ] && [ [ top | bottom ] <length-percentage> ] ]"
    };
    var quote = {
        syntax: "open-quote | close-quote | no-open-quote | no-close-quote"
    };
    var shadow = {
        syntax: "inset? && <length>{2,4} && <color>?"
    };
    var shape$1 = {
        syntax: "rect(<top>, <right>, <bottom>, <left>)"
    };
    var size = {
        syntax: "closest-side | farthest-side | closest-corner | farthest-corner | <length> | <length-percentage>{2}"
    };
    var symbol = {
        syntax: "<string> | <image> | <custom-ident>"
    };
    var target = {
        syntax: "<target-counter()> | <target-counters()> | <target-text()>"
    };
    var syntaxes = {
        "absolute-size": {
        syntax: "xx-small | x-small | small | medium | large | x-large | xx-large"
    },
        "alpha-value": {
        syntax: "<number> | <percentage>"
    },
        "angle-percentage": {
        syntax: "<angle> | <percentage>"
    },
        "animateable-feature": {
        syntax: "scroll-position | contents | <custom-ident>"
    },
        attachment: attachment,
        "attr()": {
        syntax: "attr( <attr-name> <type-or-unit>? [, <attr-fallback> ]? )"
    },
        "attr-matcher": {
        syntax: "[ '~' | '|' | '^' | '$' | '*' ]? '='"
    },
        "attr-modifier": {
        syntax: "i"
    },
        "attribute-selector": {
        syntax: "'[' <wq-name> ']' | '[' <wq-name> <attr-matcher> [ <string-token> | <ident-token> ] <attr-modifier>? ']'"
    },
        "auto-repeat": {
        syntax: "repeat( [ auto-fill | auto-fit ] , [ <line-names>? <fixed-size> ]+ <line-names>? )"
    },
        "auto-track-list": {
        syntax: "[ <line-names>? [ <fixed-size> | <fixed-repeat> ] ]* <line-names>? <auto-repeat>\n[ <line-names>? [ <fixed-size> | <fixed-repeat> ] ]* <line-names>?"
    },
        "baseline-position": {
        syntax: "[ first | last ]? baseline"
    },
        "basic-shape": {
        syntax: "<inset()> | <circle()> | <ellipse()> | <polygon()>"
    },
        "bg-image": {
        syntax: "none | <image>"
    },
        "bg-layer": {
        syntax: "<bg-image> || <bg-position> [ / <bg-size> ]? || <repeat-style> || <attachment> || <box> || <box>"
    },
        "bg-position": {
        syntax: "[ [ left | center | right | top | bottom | <length-percentage> ] | [ left | center | right | <length-percentage> ] [ top | center | bottom | <length-percentage> ] | [ center | [ left | right ] <length-percentage>? ] && [ center | [ top | bottom ] <length-percentage>? ] ]"
    },
        "bg-size": {
        syntax: "[ <length-percentage> | auto ]{1,2} | cover | contain"
    },
        "blur()": {
        syntax: "blur( <length> )"
    },
        "blend-mode": {
        syntax: "normal | multiply | screen | overlay | darken | lighten | color-dodge | color-burn | hard-light | soft-light | difference | exclusion | hue | saturation | color | luminosity"
    },
        box: box,
        "br-style": {
        syntax: "none | hidden | dotted | dashed | solid | double | groove | ridge | inset | outset"
    },
        "br-width": {
        syntax: "<length> | thin | medium | thick"
    },
        "brightness()": {
        syntax: "brightness( <number-percentage> )"
    },
        "calc()": {
        syntax: "calc( <calc-sum> )"
    },
        "calc-sum": {
        syntax: "<calc-product> [ [ '+' | '-' ] <calc-product> ]*"
    },
        "calc-product": {
        syntax: "<calc-value> [ '*' <calc-value> | '/' <number> ]*"
    },
        "calc-value": {
        syntax: "<number> | <dimension> | <percentage> | ( <calc-sum> )"
    },
        "cf-final-image": {
        syntax: "<image> | <color>"
    },
        "cf-mixing-image": {
        syntax: "<percentage>? && <image>"
    },
        "circle()": {
        syntax: "circle( [ <shape-radius> ]? [ at <position> ]? )"
    },
        "class-selector": {
        syntax: "'.' <ident-token>"
    },
        "clip-source": {
        syntax: "<url>"
    },
        color: color$1,
        "color-stop": {
        syntax: "<color> <length-percentage>?"
    },
        "color-stop-list": {
        syntax: "<color-stop>#{2,}"
    },
        "common-lig-values": {
        syntax: "[ common-ligatures | no-common-ligatures ]"
    },
        "composite-style": {
        syntax: "clear | copy | source-over | source-in | source-out | source-atop | destination-over | destination-in | destination-out | destination-atop | xor"
    },
        "compositing-operator": {
        syntax: "add | subtract | intersect | exclude"
    },
        "compound-selector": {
        syntax: "[ <type-selector>? <subclass-selector>* [ <pseudo-element-selector> <pseudo-class-selector>* ]* ]!"
    },
        "compound-selector-list": {
        syntax: "<compound-selector>#"
    },
        "contextual-alt-values": {
        syntax: "[ contextual | no-contextual ]"
    },
        "content-distribution": {
        syntax: "space-between | space-around | space-evenly | stretch"
    },
        "content-list": {
        syntax: "[ <string> | contents | <image> | <quote> | <target> | <leader()> ]+"
    },
        "content-position": {
        syntax: "center | start | end | flex-start | flex-end"
    },
        "content-replacement": {
        syntax: "<image>"
    },
        "contrast()": {
        syntax: "contrast( [ <number-percentage> ] )"
    },
        "counter-style": {
        syntax: "<counter-style-name> | symbols()"
    },
        "counter-style-name": {
        syntax: "<custom-ident>"
    },
        "cross-fade()": {
        syntax: "cross-fade( <cf-mixing-image> , <cf-final-image>? )"
    },
        "cubic-bezier-timing-function": {
        syntax: "ease | ease-in | ease-out | ease-in-out | cubic-bezier(<number>, <number>, <number>, <number>)"
    },
        "deprecated-system-color": {
        syntax: "ActiveBorder | ActiveCaption | AppWorkspace | Background | ButtonFace | ButtonHighlight | ButtonShadow | ButtonText | CaptionText | GrayText | Highlight | HighlightText | InactiveBorder | InactiveCaption | InactiveCaptionText | InfoBackground | InfoText | Menu | MenuText | Scrollbar | ThreeDDarkShadow | ThreeDFace | ThreeDHighlight | ThreeDLightShadow | ThreeDShadow | Window | WindowFrame | WindowText"
    },
        "discretionary-lig-values": {
        syntax: "[ discretionary-ligatures | no-discretionary-ligatures ]"
    },
        "display-box": {
        syntax: "contents | none"
    },
        "display-inside": {
        syntax: "flow | flow-root | table | flex | grid | subgrid | ruby"
    },
        "display-internal": {
        syntax: "table-row-group | table-header-group | table-footer-group | table-row | table-cell | table-column-group | table-column | table-caption | ruby-base | ruby-text | ruby-base-container | ruby-text-container"
    },
        "display-legacy": {
        syntax: "inline-block | inline-list-item | inline-table | inline-flex | inline-grid"
    },
        "display-listitem": {
        syntax: "<display-outside>? && [ flow | flow-root ]? && list-item"
    },
        "display-outside": {
        syntax: "block | inline | run-in"
    },
        "drop-shadow()": {
        syntax: "drop-shadow( <length>{2,3} <color>? )"
    },
        "east-asian-variant-values": {
        syntax: "[ jis78 | jis83 | jis90 | jis04 | simplified | traditional ]"
    },
        "east-asian-width-values": {
        syntax: "[ full-width | proportional-width ]"
    },
        "element()": {
        syntax: "element( <id-selector> )"
    },
        "ellipse()": {
        syntax: "ellipse( [ <shape-radius>{2} ]? [ at <position> ]? )"
    },
        "ending-shape": {
        syntax: "circle | ellipse"
    },
        "explicit-track-list": {
        syntax: "[ <line-names>? <track-size> ]+ <line-names>?"
    },
        "family-name": {
        syntax: "<string> | <custom-ident>+"
    },
        "feature-tag-value": {
        syntax: "<string> [ <integer> | on | off ]?"
    },
        "feature-type": {
        syntax: "@stylistic | @historical-forms | @styleset | @character-variant | @swash | @ornaments | @annotation"
    },
        "feature-value-block": {
        syntax: "<feature-type> {\n  <feature-value-declaration-list>\n}"
    },
        "feature-value-block-list": {
        syntax: "<feature-value-block>+"
    },
        "feature-value-declaration": {
        syntax: "<custom-ident>: <integer>+;"
    },
        "feature-value-declaration-list": {
        syntax: "<feature-value-declaration>"
    },
        "feature-value-name": {
        syntax: "<custom-ident>"
    },
        "fill-rule": {
        syntax: "nonzero | evenodd"
    },
        "filter-function": {
        syntax: "<blur()> | <brightness()> | <contrast()> | <drop-shadow()> | <grayscale()> | <hue-rotate()> | <invert()> | <opacity()> | <saturate()> | <sepia()>"
    },
        "filter-function-list": {
        syntax: "[ <filter-function> | <url> ]+"
    },
        "final-bg-layer": {
        syntax: "<'background-color'> || <bg-image> || <bg-position> [ / <bg-size> ]? || <repeat-style> || <attachment> || <box> || <box>"
    },
        "fit-content()": {
        syntax: "fit-content( [ <length> | <percentage> ] )"
    },
        "fixed-breadth": {
        syntax: "<length-percentage>"
    },
        "fixed-repeat": {
        syntax: "repeat( [ <positive-integer> ] , [ <line-names>? <fixed-size> ]+ <line-names>? )"
    },
        "fixed-size": {
        syntax: "<fixed-breadth> | minmax( <fixed-breadth> , <track-breadth> ) | minmax( <inflexible-breadth> , <fixed-breadth> )"
    },
        "font-stretch-absolute": {
        syntax: "normal | ultra-condensed | extra-condensed | condensed | semi-condensed | semi-expanded | expanded | extra-expanded | ultra-expanded | <percentage>"
    },
        "font-variant-css21": {
        syntax: "[ normal | small-caps ]"
    },
        "font-weight-absolute": {
        syntax: "normal | bold | <number>"
    },
        "frames-timing-function": {
        syntax: "frames(<integer>)"
    },
        "frequency-percentage": {
        syntax: "<frequency> | <percentage>"
    },
        "general-enclosed": {
        syntax: "[ <function-token> <any-value> ) ] | ( <ident> <any-value> )"
    },
        "generic-family": {
        syntax: "serif | sans-serif | cursive | fantasy | monospace"
    },
        "generic-name": {
        syntax: "serif | sans-serif | cursive | fantasy | monospace"
    },
        "geometry-box": {
        syntax: "<shape-box> | fill-box | stroke-box | view-box"
    },
        gradient: gradient,
        "grayscale()": {
        syntax: "grayscale( <number-percentage> )"
    },
        "grid-line": {
        syntax: "auto | <custom-ident> | [ <integer> && <custom-ident>? ] | [ span && [ <integer> || <custom-ident> ] ]"
    },
        "historical-lig-values": {
        syntax: "[ historical-ligatures | no-historical-ligatures ]"
    },
        "hsl()": {
        syntax: "hsl( <hue> <percentage> <percentage> [ / <alpha-value> ]? ) | hsl( <hue>, <percentage>, <percentage>, <alpha-value>? )"
    },
        "hsla()": {
        syntax: "hsla( <hue> <percentage> <percentage> [ / <alpha-value> ]? ) | hsla( <hue>, <percentage>, <percentage>, <alpha-value>? )"
    },
        hue: hue,
        "hue-rotate()": {
        syntax: "hue-rotate( <angle> )"
    },
        "id-selector": {
        syntax: "<hash-token>"
    },
        image: image,
        "image()": {
        syntax: "image( [ [ <image> | <string> ]? , <color>? ]! )"
    },
        "image-set()": {
        syntax: "image-set( <image-set-option># )"
    },
        "image-set-option": {
        syntax: "[ <image> | <string> ] <resolution>"
    },
        "inflexible-breadth": {
        syntax: "<length> | <percentage> | min-content | max-content | auto"
    },
        "inset()": {
        syntax: "inset( <length-percentage>{1,4} [ round <border-radius> ]? )"
    },
        "invert()": {
        syntax: "invert( <number-percentage> )"
    },
        "keyframes-name": {
        syntax: "<custom-ident> | <string>"
    },
        "keyframe-block": {
        syntax: "<keyframe-selector># {\n  <declaration-list>\n}"
    },
        "keyframe-block-list": {
        syntax: "<keyframe-block>+"
    },
        "keyframe-selector": {
        syntax: "from | to | <percentage>"
    },
        "leader()": {
        syntax: "leader( <leader-type> )"
    },
        "leader-type": {
        syntax: "dotted | solid | space | <string>"
    },
        "length-percentage": {
        syntax: "<length> | <percentage>"
    },
        "line-names": {
        syntax: "'[' <custom-ident>* ']'"
    },
        "line-name-list": {
        syntax: "[ <line-names> | <name-repeat> ]+"
    },
        "linear-gradient()": {
        syntax: "linear-gradient( [ <angle> | to <side-or-corner> ]? , <color-stop-list> )"
    },
        "mask-layer": {
        syntax: "<mask-reference> || <position> [ / <bg-size> ]? || <repeat-style> || <geometry-box> || [ <geometry-box> | no-clip ] || <compositing-operator> || <masking-mode>"
    },
        "mask-position": {
        syntax: "[ <length-percentage> | left | center | right ] [ <length-percentage> | top | center | bottom ]?"
    },
        "mask-reference": {
        syntax: "none | <image> | <mask-source>"
    },
        "mask-source": {
        syntax: "<url>"
    },
        "masking-mode": {
        syntax: "alpha | luminance | match-source"
    },
        "matrix()": {
        syntax: "matrix( <number> [, <number> ]{5,5} )"
    },
        "matrix3d()": {
        syntax: "matrix3d( <number> [, <number> ]{15,15} )"
    },
        "media-and": {
        syntax: "<media-in-parens> [ and <media-in-parens> ]+"
    },
        "media-condition": {
        syntax: "<media-not> | <media-and> | <media-or> | <media-in-parens>"
    },
        "media-condition-without-or": {
        syntax: "<media-not> | <media-and> | <media-in-parens>"
    },
        "media-feature": {
        syntax: "( [ <mf-plain> | <mf-boolean> | <mf-range> ] )"
    },
        "media-in-parens": {
        syntax: "( <media-condition> ) | <media-feature> | <general-enclosed>"
    },
        "media-not": {
        syntax: "not <media-in-parens>"
    },
        "media-or": {
        syntax: "<media-in-parens> [ or <media-in-parens> ]+"
    },
        "media-query": {
        syntax: "<media-condition> | [ not | only ]? <media-type> [ and <media-condition-without-or> ]?"
    },
        "media-query-list": {
        syntax: "<media-query>#"
    },
        "media-type": {
        syntax: "<ident>"
    },
        "mf-boolean": {
        syntax: "<mf-name>"
    },
        "mf-name": {
        syntax: "<ident>"
    },
        "mf-plain": {
        syntax: "<mf-name> : <mf-value>"
    },
        "mf-range": {
        syntax: "<mf-name> [ '<' | '>' ]? '='? <mf-value>\n| <mf-value> [ '<' | '>' ]? '='? <mf-name>\n| <mf-value> '<' '='? <mf-name> '<' '='? <mf-value>\n| <mf-value> '>' '='? <mf-name> '>' '='? <mf-value>"
    },
        "mf-value": {
        syntax: "<number> | <dimension> | <ident> | <ratio>"
    },
        "minmax()": {
        syntax: "minmax( [ <length> | <percentage> | <flex> | min-content | max-content | auto ] , [ <length> | <percentage> | <flex> | min-content | max-content | auto ] )"
    },
        "named-color": {
        syntax: "transparent | aliceblue | antiquewhite | aqua | aquamarine | azure | beige | bisque | black | blanchedalmond | blue | blueviolet | brown | burlywood | cadetblue | chartreuse | chocolate | coral | cornflowerblue | cornsilk | crimson | cyan | darkblue | darkcyan | darkgoldenrod | darkgray | darkgreen | darkgrey | darkkhaki | darkmagenta | darkolivegreen | darkorange | darkorchid | darkred | darksalmon | darkseagreen | darkslateblue | darkslategray | darkslategrey | darkturquoise | darkviolet | deeppink | deepskyblue | dimgray | dimgrey | dodgerblue | firebrick | floralwhite | forestgreen | fuchsia | gainsboro | ghostwhite | gold | goldenrod | gray | green | greenyellow | grey | honeydew | hotpink | indianred | indigo | ivory | khaki | lavender | lavenderblush | lawngreen | lemonchiffon | lightblue | lightcoral | lightcyan | lightgoldenrodyellow | lightgray | lightgreen | lightgrey | lightpink | lightsalmon | lightseagreen | lightskyblue | lightslategray | lightslategrey | lightsteelblue | lightyellow | lime | limegreen | linen | magenta | maroon | mediumaquamarine | mediumblue | mediumorchid | mediumpurple | mediumseagreen | mediumslateblue | mediumspringgreen | mediumturquoise | mediumvioletred | midnightblue | mintcream | mistyrose | moccasin | navajowhite | navy | oldlace | olive | olivedrab | orange | orangered | orchid | palegoldenrod | palegreen | paleturquoise | palevioletred | papayawhip | peachpuff | peru | pink | plum | powderblue | purple | rebeccapurple | red | rosybrown | royalblue | saddlebrown | salmon | sandybrown | seagreen | seashell | sienna | silver | skyblue | slateblue | slategray | slategrey | snow | springgreen | steelblue | tan | teal | thistle | tomato | turquoise | violet | wheat | white | whitesmoke | yellow | yellowgreen"
    },
        "namespace-prefix": {
        syntax: "<ident>"
    },
        "ns-prefix": {
        syntax: "[ <ident-token> | '*' ]? '|'"
    },
        "number-percentage": {
        syntax: "<number> | <percentage>"
    },
        "numeric-figure-values": {
        syntax: "[ lining-nums | oldstyle-nums ]"
    },
        "numeric-fraction-values": {
        syntax: "[ diagonal-fractions | stacked-fractions ]"
    },
        "numeric-spacing-values": {
        syntax: "[ proportional-nums | tabular-nums ]"
    },
        nth: nth,
        "opacity()": {
        syntax: "opacity( [ <number-percentage> ] )"
    },
        "overflow-position": {
        syntax: "unsafe | safe"
    },
        "outline-radius": {
        syntax: "<length> | <percentage>"
    },
        "page-body": {
        syntax: "<declaration>? [ ; <page-body> ]? | <page-margin-box> <page-body>"
    },
        "page-margin-box": {
        syntax: "<page-margin-box-type> {\n  <declaration-list>\n}"
    },
        "page-margin-box-type": {
        syntax: "@top-left-corner | @top-left | @top-center | @top-right | @top-right-corner | @bottom-left-corner | @bottom-left | @bottom-center | @bottom-right | @bottom-right-corner | @left-top | @left-middle | @left-bottom | @right-top | @right-middle | @right-bottom"
    },
        "page-selector-list": {
        syntax: "[ <page-selector># ]?"
    },
        "page-selector": {
        syntax: "<pseudo-page>+ | <ident> <pseudo-page>*"
    },
        "perspective()": {
        syntax: "perspective( <length> )"
    },
        "polygon()": {
        syntax: "polygon( <fill-rule>? , [ <length-percentage> <length-percentage> ]# )"
    },
        position: position$1,
        "pseudo-class-selector": {
        syntax: "':' <ident-token> | ':' <function-token> <any-value> ')'"
    },
        "pseudo-element-selector": {
        syntax: "':' <pseudo-class-selector>"
    },
        "pseudo-page": {
        syntax: ": [ left | right | first | blank ]"
    },
        quote: quote,
        "radial-gradient()": {
        syntax: "radial-gradient( [ <ending-shape> || <size> ]? [ at <position> ]? , <color-stop-list> )"
    },
        "relative-size": {
        syntax: "larger | smaller"
    },
        "repeat-style": {
        syntax: "repeat-x | repeat-y | [ repeat | space | round | no-repeat ]{1,2}"
    },
        "repeating-linear-gradient()": {
        syntax: "repeating-linear-gradient( [ <angle> | to <side-or-corner> ]? , <color-stop-list> )"
    },
        "repeating-radial-gradient()": {
        syntax: "repeating-radial-gradient( [ <ending-shape> || <size> ]? [ at <position> ]? , <color-stop-list> )"
    },
        "rgb()": {
        syntax: "rgb( <percentage>{3} [ / <alpha-value> ]? ) | rgb( <number>{3} [ / <alpha-value> ]? ) | rgb( <percentage>#{3} , <alpha-value>? ) | rgb( <number>#{3} , <alpha-value>? )"
    },
        "rgba()": {
        syntax: "rgba( <percentage>{3} [ / <alpha-value> ]? ) | rgba( <number>{3} [ / <alpha-value> ]? ) | rgba( <percentage>#{3} , <alpha-value>? ) | rgba( <number>#{3} , <alpha-value>? )"
    },
        "rotate()": {
        syntax: "rotate( <angle> )"
    },
        "rotate3d()": {
        syntax: "rotate3d( <number> , <number> , <number> , <angle> )"
    },
        "rotateX()": {
        syntax: "rotateX( <angle> )"
    },
        "rotateY()": {
        syntax: "rotateY( <angle> )"
    },
        "rotateZ()": {
        syntax: "rotateZ( <angle> )"
    },
        "saturate()": {
        syntax: "saturate( <number-percentage> )"
    },
        "scale()": {
        syntax: "scale( <number> [, <number> ]? )"
    },
        "scale3d()": {
        syntax: "scale3d( <number> , <number> , <number> )"
    },
        "scaleX()": {
        syntax: "scaleX( <number> )"
    },
        "scaleY()": {
        syntax: "scaleY( <number> )"
    },
        "scaleZ()": {
        syntax: "scaleZ( <number> )"
    },
        "self-position": {
        syntax: "center | start | end | self-start | self-end | flex-start | flex-end"
    },
        "shape-radius": {
        syntax: "<length-percentage> | closest-side | farthest-side"
    },
        "skew()": {
        syntax: "skew( <angle> [, <angle> ]? )"
    },
        "skewX()": {
        syntax: "skewX( <angle> )"
    },
        "skewY()": {
        syntax: "skewY( <angle> )"
    },
        "sepia()": {
        syntax: "sepia( <number-percentage> )"
    },
        shadow: shadow,
        "shadow-t": {
        syntax: "[ <length>{2,3} && <color>? ]"
    },
        shape: shape$1,
        "shape-box": {
        syntax: "<box> | margin-box"
    },
        "side-or-corner": {
        syntax: "[ left | right ] || [ top | bottom ]"
    },
        "single-animation": {
        syntax: "<time> || <single-timing-function> || <time> || <single-animation-iteration-count> || <single-animation-direction> || <single-animation-fill-mode> || <single-animation-play-state> || [ none | <keyframes-name> ]"
    },
        "single-animation-direction": {
        syntax: "normal | reverse | alternate | alternate-reverse"
    },
        "single-animation-fill-mode": {
        syntax: "none | forwards | backwards | both"
    },
        "single-animation-iteration-count": {
        syntax: "infinite | <number>"
    },
        "single-animation-play-state": {
        syntax: "running | paused"
    },
        "single-timing-function": {
        syntax: "linear | <cubic-bezier-timing-function> | <step-timing-function> | <frames-timing-function>"
    },
        "single-transition": {
        syntax: "[ none | <single-transition-property> ] || <time> || <single-transition-timing-function> || <time>"
    },
        "single-transition-timing-function": {
        syntax: "<single-timing-function>"
    },
        "single-transition-property": {
        syntax: "all | <custom-ident>"
    },
        size: size,
        "step-timing-function": {
        syntax: "step-start | step-end | steps(<integer>[, [ start | end ] ]?)"
    },
        "subclass-selector": {
        syntax: "<id-selector> | <class-selector> | <attribute-selector> | <pseudo-class-selector>"
    },
        symbol: symbol,
        target: target,
        "target-counter()": {
        syntax: "target-counter( [ <string> | <url> ] , <custom-ident> , <counter-style>? )"
    },
        "target-counters()": {
        syntax: "target-counters( [ <string> | <url> ] , <custom-ident> , <string> , <counter-style>? )"
    },
        "target-text()": {
        syntax: "target-text( [ <string> | <url> ] , [ content | before | after | first-letter ]? )"
    },
        "time-percentage": {
        syntax: "<time> | <percentage>"
    },
        "track-breadth": {
        syntax: "<length-percentage> | <flex> | min-content | max-content | auto"
    },
        "track-list": {
        syntax: "[ <line-names>? [ <track-size> | <track-repeat> ] ]+ <line-names>?"
    },
        "track-repeat": {
        syntax: "repeat( [ <positive-integer> ] , [ <line-names>? <track-size> ]+ <line-names>? )"
    },
        "track-size": {
        syntax: "<track-breadth> | minmax( <inflexible-breadth> , <track-breadth> ) | fit-content( [ <length> | <percentage> ] )"
    },
        "transform-function": {
        syntax: "<matrix()> | <translate()> | <translateX()> | <translateY()> | <scale()> | <scaleX()> | <scaleY()> | <rotate()> | <skew()> | <skewX()> | <skewY()> | <matrix3d()> | <translate3d()> | <translateZ()> | <scale3d()> | <scaleZ()> | <rotate3d()> | <rotateX()> | <rotateY()> | <rotateZ()> | <perspective()>"
    },
        "transform-list": {
        syntax: "<transform-function>+"
    },
        "translate()": {
        syntax: "translate( <length-percentage> [, <length-percentage> ]? )"
    },
        "translate3d()": {
        syntax: "translate3d( <length-percentage> , <length-percentage> , <length> )"
    },
        "translateX()": {
        syntax: "translateX( <length-percentage> )"
    },
        "translateY()": {
        syntax: "translateY( <length-percentage> )"
    },
        "translateZ()": {
        syntax: "translateZ( <length> )"
    },
        "type-or-unit": {
        syntax: "string | integer | color | url | integer | number | length | angle | time | frequency | em | ex | px | rem | vw | vh | vmin | vmax | mm | q | cm | in | pt | pc | deg | grad | rad | ms | s | Hz | kHz | %"
    },
        "type-selector": {
        syntax: "<wq-name> | <ns-prefix>? '*'"
    },
        "var()": {
        syntax: "var( <custom-property-name> [, <declaration-value> ]? )"
    },
        "viewport-length": {
        syntax: "auto | <length-percentage>"
    },
        "wq-name": {
        syntax: "<ns-prefix>? <ident-token>"
    }
    };

    var syntaxes$1 = /*#__PURE__*/Object.freeze({
        attachment: attachment,
        box: box,
        color: color$1,
        gradient: gradient,
        hue: hue,
        image: image,
        nth: nth,
        position: position$1,
        quote: quote,
        shadow: shadow,
        shape: shape$1,
        size: size,
        symbol: symbol,
        target: target,
        default: syntaxes
    });

    var properties$3 = {
        "--*": {
            comment: "syntax is incorrect and can't be parsed, drop for now",
            syntax: null
        },
        "-moz-background-clip": {
            comment: "deprecated syntax in old Firefox, https://developer.mozilla.org/en/docs/Web/CSS/background-clip",
            syntax: "padding | border"
        },
        "-moz-border-radius-bottomleft": {
            comment: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-bottom-left-radius",
            syntax: "<'border-bottom-left-radius'>"
        },
        "-moz-border-radius-bottomright": {
            comment: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-bottom-right-radius",
            syntax: "<'border-bottom-right-radius'>"
        },
        "-moz-border-radius-topleft": {
            comment: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-top-left-radius",
            syntax: "<'border-top-left-radius'>"
        },
        "-moz-border-radius-topright": {
            comment: "https://developer.mozilla.org/en-US/docs/Web/CSS/border-bottom-right-radius",
            syntax: "<'border-bottom-right-radius'>"
        },
        "-moz-osx-font-smoothing": {
            comment: "misssed old syntax https://developer.mozilla.org/en-US/docs/Web/CSS/font-smooth",
            syntax: "auto | grayscale"
        },
        "-moz-user-select": {
            comment: "https://developer.mozilla.org/en-US/docs/Web/CSS/user-select",
            syntax: "none | text | all | -moz-none"
        },
        "-ms-flex-align": {
            comment: "misssed old syntax implemented in IE, https://www.w3.org/TR/2012/WD-css3-flexbox-20120322/#flex-align",
            syntax: "start | end | center | baseline | stretch"
        },
        "-ms-flex-item-align": {
            comment: "misssed old syntax implemented in IE, https://www.w3.org/TR/2012/WD-css3-flexbox-20120322/#flex-align",
            syntax: "auto | start | end | center | baseline | stretch"
        },
        "-ms-flex-line-pack": {
            comment: "misssed old syntax implemented in IE, https://www.w3.org/TR/2012/WD-css3-flexbox-20120322/#flex-line-pack",
            syntax: "start | end | center | justify | distribute | stretch"
        },
        "-ms-flex-negative": {
            comment: "misssed old syntax implemented in IE; TODO: find references for comfirmation",
            syntax: "<'flex-shrink'>"
        },
        "-ms-flex-pack": {
            comment: "misssed old syntax implemented in IE, https://www.w3.org/TR/2012/WD-css3-flexbox-20120322/#flex-pack",
            syntax: "start | end | center | justify | distribute"
        },
        "-ms-flex-order": {
            comment: "misssed old syntax implemented in IE; https://msdn.microsoft.com/en-us/library/jj127303(v=vs.85).aspx",
            syntax: "<integer>"
        },
        "-ms-flex-positive": {
            comment: "misssed old syntax implemented in IE; TODO: find references for comfirmation",
            syntax: "<'flex-grow'>"
        },
        "-ms-flex-preferred-size": {
            comment: "misssed old syntax implemented in IE; TODO: find references for comfirmation",
            syntax: "<'flex-basis'>"
        },
        "-ms-interpolation-mode": {
            comment: "https://msdn.microsoft.com/en-us/library/ff521095(v=vs.85).aspx",
            syntax: "nearest-neighbor | bicubic"
        },
        "-ms-grid-column-align": {
            comment: "add this property first since it uses as fallback for flexbox, https://msdn.microsoft.com/en-us/library/windows/apps/hh466338.aspx",
            syntax: "start | end | center | stretch"
        },
        "-ms-grid-row-align": {
            comment: "add this property first since it uses as fallback for flexbox, https://msdn.microsoft.com/en-us/library/windows/apps/hh466348.aspx",
            syntax: "start | end | center | stretch"
        },
        "-webkit-appearance": {
            comment: "webkit specific keywords",
            references: [
                "http://css-infos.net/property/-webkit-appearance"
            ],
            syntax: "none | button | button-bevel | caps-lock-indicator | caret | checkbox | default-button | listbox | listitem | media-fullscreen-button | media-mute-button | media-play-button | media-seek-back-button | media-seek-forward-button | media-slider | media-sliderthumb | menulist | menulist-button | menulist-text | menulist-textfield | push-button | radio | scrollbarbutton-down | scrollbarbutton-left | scrollbarbutton-right | scrollbarbutton-up | scrollbargripper-horizontal | scrollbargripper-vertical | scrollbarthumb-horizontal | scrollbarthumb-vertical | scrollbartrack-horizontal | scrollbartrack-vertical | searchfield | searchfield-cancel-button | searchfield-decoration | searchfield-results-button | searchfield-results-decoration | slider-horizontal | slider-vertical | sliderthumb-horizontal | sliderthumb-vertical | square-button | textarea | textfield"
        },
        "-webkit-background-clip": {
            comment: "https://developer.mozilla.org/en/docs/Web/CSS/background-clip",
            syntax: "[ <box> | border | padding | content | text ]#"
        },
        "-webkit-column-break-after": {
            comment: "added, http://help.dottoro.com/lcrthhhv.php",
            syntax: "always | auto | avoid"
        },
        "-webkit-column-break-before": {
            comment: "added, http://help.dottoro.com/lcxquvkf.php",
            syntax: "always | auto | avoid"
        },
        "-webkit-column-break-inside": {
            comment: "added, http://help.dottoro.com/lclhnthl.php",
            syntax: "always | auto | avoid"
        },
        "-webkit-font-smoothing": {
            comment: "https://developer.mozilla.org/en-US/docs/Web/CSS/font-smooth",
            syntax: "auto | none | antialiased | subpixel-antialiased"
        },
        "-webkit-line-clamp": {
            comment: "non-standard and deprecated but may still using by some sites",
            syntax: "<positive-integer>"
        },
        "-webkit-mask-box-image": {
            comment: "missed; https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-mask-box-image",
            syntax: "[ <url> | <gradient> | none ] [ <length-percentage>{4} <-webkit-mask-box-repeat>{2} ]?"
        },
        "-webkit-mask-clip": {
            comment: "change type to <-webkit-mask-clip-style> since it differ from <mask-clip>, extra space between [ and ,",
            syntax: "<-webkit-mask-clip-style> [, <-webkit-mask-clip-style> ]*"
        },
        "-webkit-print-color-adjust": {
            comment: "missed",
            references: [
                "https://developer.mozilla.org/en/docs/Web/CSS/-webkit-print-color-adjust"
            ],
            syntax: "economy | exact"
        },
        "-webkit-text-security": {
            comment: "missed; http://help.dottoro.com/lcbkewgt.php",
            syntax: "none | circle | disc | square"
        },
        "-webkit-user-drag": {
            comment: "missed; http://help.dottoro.com/lcbixvwm.php",
            syntax: "none | element | auto"
        },
        "-webkit-user-select": {
            comment: "auto is supported by old webkit, https://developer.mozilla.org/en-US/docs/Web/CSS/user-select",
            syntax: "auto | none | text | all"
        },
        "alignment-baseline": {
            comment: "added SVG property",
            references: [
                "https://www.w3.org/TR/SVG/text.html#AlignmentBaselineProperty"
            ],
            syntax: "auto | baseline | before-edge | text-before-edge | middle | central | after-edge | text-after-edge | ideographic | alphabetic | hanging | mathematical"
        },
        "baseline-shift": {
            comment: "added SVG property",
            references: [
                "https://www.w3.org/TR/SVG/text.html#BaselineShiftProperty"
            ],
            syntax: "baseline | sub | super | <svg-length>"
        },
        behavior: {
            comment: "added old IE property https://msdn.microsoft.com/en-us/library/ms530723(v=vs.85).aspx",
            syntax: "<url>+"
        },
        "clip-rule": {
            comment: "added SVG property",
            references: [
                "https://www.w3.org/TR/SVG/masking.html#ClipRuleProperty"
            ],
            syntax: "nonzero | evenodd"
        },
        cue: {
            comment: "https://www.w3.org/TR/css3-speech/#property-index",
            syntax: "<'cue-before'> <'cue-after'>?"
        },
        "cue-after": {
            comment: "https://www.w3.org/TR/css3-speech/#property-index",
            syntax: "<url> <decibel>? | none"
        },
        "cue-before": {
            comment: "https://www.w3.org/TR/css3-speech/#property-index",
            syntax: "<url> <decibel>? | none"
        },
        cursor: {
            comment: "added legacy keywords: hand, -webkit-grab. -webkit-grabbing, -webkit-zoom-in, -webkit-zoom-out, -moz-grab, -moz-grabbing, -moz-zoom-in, -moz-zoom-out",
            refenrences: [
                "https://www.sitepoint.com/css3-cursor-styles/"
            ],
            syntax: "[ [ <url> [ <x> <y> ]? , ]* [ auto | default | none | context-menu | help | pointer | progress | wait | cell | crosshair | text | vertical-text | alias | copy | move | no-drop | not-allowed | e-resize | n-resize | ne-resize | nw-resize | s-resize | se-resize | sw-resize | w-resize | ew-resize | ns-resize | nesw-resize | nwse-resize | col-resize | row-resize | all-scroll | zoom-in | zoom-out | grab | grabbing | hand | -webkit-grab | -webkit-grabbing | -webkit-zoom-in | -webkit-zoom-out | -moz-grab | -moz-grabbing | -moz-zoom-in | -moz-zoom-out ] ]"
        },
        display: {
            comment: "extended with -ms-flexbox",
            syntax: "none | inline | block | list-item | inline-list-item | inline-block | inline-table | table | table-cell | table-column | table-column-group | table-footer-group | table-header-group | table-row | table-row-group | flex | inline-flex | grid | inline-grid | run-in | ruby | ruby-base | ruby-text | ruby-base-container | ruby-text-container | contents | -ms-flexbox | -ms-inline-flexbox | -ms-grid | -ms-inline-grid | -webkit-flex | -webkit-inline-flex | -webkit-box | -webkit-inline-box | -moz-inline-stack | -moz-box | -moz-inline-box"
        },
        position: {
            comment: "extended with -webkit-sticky",
            syntax: "static | relative | absolute | sticky | fixed | -webkit-sticky"
        },
        "dominant-baseline": {
            comment: "added SVG property",
            references: [
                "https://www.w3.org/TR/SVG/text.html#DominantBaselineProperty"
            ],
            syntax: "auto | use-script | no-change | reset-size | ideographic | alphabetic | hanging | mathematical | central | middle | text-after-edge | text-before-edge"
        },
        "image-rendering": {
            comment: "extended with <-non-standard-image-rendering>, added SVG keywords optimizeSpeed and optimizeQuality",
            references: [
                "https://developer.mozilla.org/en/docs/Web/CSS/image-rendering",
                "https://www.w3.org/TR/SVG/painting.html#ImageRenderingProperty"
            ],
            syntax: "auto | crisp-edges | pixelated | optimizeSpeed | optimizeQuality | <-non-standard-image-rendering>"
        },
        fill: {
            comment: "added SVG property",
            references: [
                "https://www.w3.org/TR/SVG/painting.html#FillProperty"
            ],
            syntax: "<paint>"
        },
        "fill-opacity": {
            comment: "added SVG property",
            references: [
                "https://www.w3.org/TR/SVG/painting.html#FillProperty"
            ],
            syntax: "<number-zero-one>"
        },
        "fill-rule": {
            comment: "added SVG property",
            references: [
                "https://www.w3.org/TR/SVG/painting.html#FillProperty"
            ],
            syntax: "nonzero | evenodd"
        },
        filter: {
            comment: "extend with IE legacy syntaxes",
            syntax: "none | <filter-function-list> | <-ms-filter>"
        },
        font: {
            comment: "extend with non-standard fonts",
            syntax: "[ [ <'font-style'> || <font-variant-css21> || <'font-weight'> || <'font-stretch'> ]? <'font-size'> [ / <'line-height'> ]? <'font-family'> ] | caption | icon | menu | message-box | small-caption | status-bar | <-non-standard-font>"
        },
        "glyph-orientation-horizontal": {
            comment: "added SVG property",
            references: [
                "https://www.w3.org/TR/SVG/text.html#GlyphOrientationHorizontalProperty"
            ],
            syntax: "<angle>"
        },
        "glyph-orientation-vertical": {
            comment: "added SVG property",
            references: [
                "https://www.w3.org/TR/SVG/text.html#GlyphOrientationVerticalProperty"
            ],
            syntax: "<angle>"
        },
        kerning: {
            comment: "added SVG property",
            references: [
                "https://www.w3.org/TR/SVG/text.html#KerningProperty"
            ],
            syntax: "auto | <svg-length>"
        },
        "letter-spacing": {
            comment: "fix syntax <length> -> <length-percentage>",
            references: [
                "https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/letter-spacing"
            ],
            syntax: "normal | <length-percentage>"
        },
        "line-height-step": {
            comment: "fix extra spaces around",
            syntax: "none | <length>"
        },
        marker: {
            comment: "added SVG property",
            references: [
                "https://www.w3.org/TR/SVG/painting.html#MarkerProperties"
            ],
            syntax: "none | <url>"
        },
        "marker-end": {
            comment: "added SVG property",
            references: [
                "https://www.w3.org/TR/SVG/painting.html#MarkerProperties"
            ],
            syntax: "none | <url>"
        },
        "marker-mid": {
            comment: "added SVG property",
            references: [
                "https://www.w3.org/TR/SVG/painting.html#MarkerProperties"
            ],
            syntax: "none | <url>"
        },
        "marker-start": {
            comment: "added SVG property",
            references: [
                "https://www.w3.org/TR/SVG/painting.html#MarkerProperties"
            ],
            syntax: "none | <url>"
        },
        "max-width": {
            comment: "extend by non-standard width keywords https://developer.mozilla.org/en-US/docs/Web/CSS/max-width",
            syntax: "<length> | <percentage> | none | max-content | min-content | fit-content | fill-available | <-non-standard-width>"
        },
        "min-width": {
            comment: "extend by non-standard width keywords https://developer.mozilla.org/en-US/docs/Web/CSS/width",
            syntax: "<length> | <percentage> | auto | max-content | min-content | fit-content | fill-available | <-non-standard-width>"
        },
        opacity: {
            comment: "strict to 0..1 <number> -> <number-zero-one>",
            syntax: "<number-zero-one>"
        },
        overflow: {
            comment: "extend by vendor keywords https://developer.mozilla.org/en-US/docs/Web/CSS/overflow",
            syntax: "visible | hidden | scroll | auto | <-non-standard-overflow>"
        },
        pause: {
            comment: "https://www.w3.org/TR/css3-speech/#property-index",
            syntax: "<'pause-before'> <'pause-after'>?"
        },
        "pause-after": {
            comment: "https://www.w3.org/TR/css3-speech/#property-index",
            syntax: "<time> | none | x-weak | weak | medium | strong | x-strong"
        },
        "pause-before": {
            comment: "https://www.w3.org/TR/css3-speech/#property-index",
            syntax: "<time> | none | x-weak | weak | medium | strong | x-strong"
        },
        rest: {
            comment: "https://www.w3.org/TR/css3-speech/#property-index",
            syntax: "<'rest-before'> <'rest-after'>?"
        },
        "rest-after": {
            comment: "https://www.w3.org/TR/css3-speech/#property-index",
            syntax: "<time> | none | x-weak | weak | medium | strong | x-strong"
        },
        "rest-before": {
            comment: "https://www.w3.org/TR/css3-speech/#property-index",
            syntax: "<time> | none | x-weak | weak | medium | strong | x-strong"
        },
        "shape-rendering": {
            comment: "added SVG property",
            references: [
                "https://www.w3.org/TR/SVG/painting.html#ShapeRenderingPropert"
            ],
            syntax: "auto | optimizeSpeed | crispEdges | geometricPrecision"
        },
        src: {
            comment: "added @font-face's src property https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/src",
            syntax: "[ <url> [ format( <string># ) ]? | local( <family-name> ) ]#"
        },
        speak: {
            comment: "https://www.w3.org/TR/css3-speech/#property-index",
            syntax: "auto | none | normal"
        },
        "speak-as": {
            comment: "https://www.w3.org/TR/css3-speech/#property-index",
            syntax: "normal | spell-out || digits || [ literal-punctuation | no-punctuation ]"
        },
        stroke: {
            comment: "added SVG property",
            references: [
                "https://www.w3.org/TR/SVG/painting.html#StrokeProperties"
            ],
            syntax: "<paint>"
        },
        "stroke-dasharray": {
            comment: "added SVG property; a list of comma and/or white space separated <length>s and <percentage>s",
            references: [
                "https://www.w3.org/TR/SVG/painting.html#StrokeProperties"
            ],
            syntax: "none | [ <svg-length>+ ]#"
        },
        "stroke-dashoffset": {
            comment: "added SVG property",
            references: [
                "https://www.w3.org/TR/SVG/painting.html#StrokeProperties"
            ],
            syntax: "<svg-length>"
        },
        "stroke-linecap": {
            comment: "added SVG property",
            references: [
                "https://www.w3.org/TR/SVG/painting.html#StrokeProperties"
            ],
            syntax: "butt | round | square"
        },
        "stroke-linejoin": {
            comment: "added SVG property",
            references: [
                "https://www.w3.org/TR/SVG/painting.html#StrokeProperties"
            ],
            syntax: "miter | round | bevel"
        },
        "stroke-miterlimit": {
            comment: "added SVG property (<miterlimit> = <number-one-or-greater>) ",
            references: [
                "https://www.w3.org/TR/SVG/painting.html#StrokeProperties"
            ],
            syntax: "<number-one-or-greater>"
        },
        "stroke-opacity": {
            comment: "added SVG property",
            references: [
                "https://www.w3.org/TR/SVG/painting.html#StrokeProperties"
            ],
            syntax: "<number-zero-one>"
        },
        "stroke-width": {
            comment: "added SVG property",
            references: [
                "https://www.w3.org/TR/SVG/painting.html#StrokeProperties"
            ],
            syntax: "<svg-length>"
        },
        "text-anchor": {
            comment: "added SVG property",
            references: [
                "https://www.w3.org/TR/SVG/text.html#TextAlignmentProperties"
            ],
            syntax: "start | middle | end"
        },
        "transform-origin": {
            comment: "move first group to the end since less collecting",
            syntax: "[ [ <length-percentage> | left | center | right ] && [ <length-percentage> | top | center | bottom ] ] <length>? | [ <length-percentage> | left | center | right | top | bottom ]"
        },
        "unicode-bidi": {
            comment: "added prefixed keywords https://developer.mozilla.org/en-US/docs/Web/CSS/unicode-bidi",
            syntax: "normal | embed | isolate | bidi-override | isolate-override | plaintext | -moz-isolate | -moz-isolate-override | -moz-plaintext | -webkit-isolate"
        },
        "unicode-range": {
            comment: "added missed property https://developer.mozilla.org/en-US/docs/Web/CSS/%40font-face/unicode-range",
            syntax: "<unicode-range>#"
        },
        "voice-balance": {
            comment: "https://www.w3.org/TR/css3-speech/#property-index",
            syntax: "<number> | left | center | right | leftwards | rightwards"
        },
        "voice-duration": {
            comment: "https://www.w3.org/TR/css3-speech/#property-index",
            syntax: "auto | <time>"
        },
        "voice-family": {
            comment: "<name> -> <family-name>, https://www.w3.org/TR/css3-speech/#property-index",
            syntax: "[ [ <family-name> | <generic-voice> ] , ]* [ <family-name> | <generic-voice> ] | preserve"
        },
        "voice-pitch": {
            comment: "https://www.w3.org/TR/css3-speech/#property-index",
            syntax: "<frequency> && absolute | [ [ x-low | low | medium | high | x-high ] || [ <frequency> | <semitones> | <percentage> ] ]"
        },
        "voice-range": {
            comment: "https://www.w3.org/TR/css3-speech/#property-index",
            syntax: "<frequency> && absolute | [ [ x-low | low | medium | high | x-high ] || [ <frequency> | <semitones> | <percentage> ] ]"
        },
        "voice-rate": {
            comment: "https://www.w3.org/TR/css3-speech/#property-index",
            syntax: "[ normal | x-slow | slow | medium | fast | x-fast ] || <percentage>"
        },
        "voice-stress": {
            comment: "https://www.w3.org/TR/css3-speech/#property-index",
            syntax: "normal | strong | moderate | none | reduced"
        },
        "voice-volume": {
            comment: "https://www.w3.org/TR/css3-speech/#property-index",
            syntax: "silent | [ [ x-soft | soft | medium | loud | x-loud ] || <decibel> ]"
        },
        "word-break": {
            comment: "extend with non-standard keywords",
            syntax: "normal | break-all | keep-all | <-non-standard-word-break>"
        },
        "writing-mode": {
            comment: "extend with SVG keywords",
            syntax: "horizontal-tb | vertical-rl | vertical-lr | sideways-rl | sideways-lr | <svg-writing-mode>"
        }
    };
    var syntaxes$2 = {
        "-legacy-gradient": {
            comment: "added collection of legacy gradient syntaxes",
            syntax: "<-webkit-gradient()> | <-legacy-linear-gradient> | <-legacy-repeating-linear-gradient> | <-legacy-radial-gradient> | <-legacy-repeating-radial-gradient>"
        },
        "-legacy-linear-gradient": {
            comment: "like standard syntax but w/o `to` keyword https://developer.mozilla.org/en-US/docs/Web/CSS/linear-gradient",
            syntax: "-moz-linear-gradient( <-legacy-linear-gradient-arguments> ) | -webkit-linear-gradient( <-legacy-linear-gradient-arguments> ) | -o-linear-gradient( <-legacy-linear-gradient-arguments> )"
        },
        "-legacy-repeating-linear-gradient": {
            comment: "like standard syntax but w/o `to` keyword https://developer.mozilla.org/en-US/docs/Web/CSS/linear-gradient",
            syntax: "-moz-repeating-linear-gradient( <-legacy-linear-gradient-arguments> ) | -webkit-repeating-linear-gradient( <-legacy-linear-gradient-arguments> ) | -o-repeating-linear-gradient( <-legacy-linear-gradient-arguments> )"
        },
        "-legacy-linear-gradient-arguments": {
            comment: "like standard syntax but w/o `to` keyword https://developer.mozilla.org/en-US/docs/Web/CSS/linear-gradient",
            syntax: "[ <angle> | <side-or-corner> ]? , <color-stop-list>"
        },
        "-legacy-radial-gradient": {
            comment: "deprecated syntax that implemented by some browsers https://www.w3.org/TR/2011/WD-css3-images-20110908/#radial-gradients",
            syntax: "-moz-radial-gradient( <-legacy-radial-gradient-arguments> ) | -webkit-radial-gradient( <-legacy-radial-gradient-arguments> ) | -o-radial-gradient( <-legacy-radial-gradient-arguments> )"
        },
        "-legacy-repeating-radial-gradient": {
            comment: "deprecated syntax that implemented by some browsers https://www.w3.org/TR/2011/WD-css3-images-20110908/#radial-gradients",
            syntax: "-moz-repeating-radial-gradient( <-legacy-radial-gradient-arguments> ) | -webkit-repeating-radial-gradient( <-legacy-radial-gradient-arguments> ) | -o-repeating-radial-gradient( <-legacy-radial-gradient-arguments> )"
        },
        "-legacy-radial-gradient-arguments": {
            comment: "deprecated syntax that implemented by some browsers https://www.w3.org/TR/2011/WD-css3-images-20110908/#radial-gradients",
            syntax: "[ <position> , ]? [ [ [ <-legacy-radial-gradient-shape> || <-legacy-radial-gradient-size> ] | [ <length> | <percentage> ]{2} ] , ]? <color-stop-list>"
        },
        "-legacy-radial-gradient-size": {
            comment: "before a standard it contains 2 extra keywords (`contain` and `cover`) https://www.w3.org/TR/2011/WD-css3-images-20110908/#ltsize",
            syntax: "closest-side | closest-corner | farthest-side | farthest-corner | contain | cover"
        },
        "-legacy-radial-gradient-shape": {
            comment: "define to duoble sure it doesn't extends in future https://www.w3.org/TR/2011/WD-css3-images-20110908/#ltshape",
            syntax: "circle | ellipse"
        },
        "-non-standard-font": {
            comment: "non standard fonts",
            preferences: [
                "https://webkit.org/blog/3709/using-the-system-font-in-web-content/"
            ],
            syntax: "-apple-system-body | -apple-system-headline | -apple-system-subheadline | -apple-system-caption1 | -apple-system-caption2 | -apple-system-footnote | -apple-system-short-body | -apple-system-short-headline | -apple-system-short-subheadline | -apple-system-short-caption1 | -apple-system-short-footnote | -apple-system-tall-body"
        },
        "-non-standard-color": {
            comment: "non standard colors",
            references: [
                "http://cssdot.ru/%D0%A1%D0%BF%D1%80%D0%B0%D0%B2%D0%BE%D1%87%D0%BD%D0%B8%D0%BA_CSS/color-i305.html",
                "https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#Mozilla_Color_Preference_Extensions"
            ],
            syntax: "-moz-ButtonDefault | -moz-ButtonHoverFace | -moz-ButtonHoverText | -moz-CellHighlight | -moz-CellHighlightText | -moz-Combobox | -moz-ComboboxText | -moz-Dialog | -moz-DialogText | -moz-dragtargetzone | -moz-EvenTreeRow | -moz-Field | -moz-FieldText | -moz-html-CellHighlight | -moz-html-CellHighlightText | -moz-mac-accentdarkestshadow | -moz-mac-accentdarkshadow | -moz-mac-accentface | -moz-mac-accentlightesthighlight | -moz-mac-accentlightshadow | -moz-mac-accentregularhighlight | -moz-mac-accentregularshadow | -moz-mac-chrome-active | -moz-mac-chrome-inactive | -moz-mac-focusring | -moz-mac-menuselect | -moz-mac-menushadow | -moz-mac-menutextselect | -moz-MenuHover | -moz-MenuHoverText | -moz-MenuBarText | -moz-MenuBarHoverText | -moz-nativehyperlinktext | -moz-OddTreeRow | -moz-win-communicationstext | -moz-win-mediatext | -moz-activehyperlinktext | -moz-default-background-color | -moz-default-color | -moz-hyperlinktext | -moz-visitedhyperlinktext | -webkit-activelink | -webkit-focus-ring-color | -webkit-link | -webkit-text"
        },
        "-non-standard-image-rendering": {
            comment: "non-standard keywords http://phrogz.net/tmp/canvas_image_zoom.html",
            syntax: "optimize-contrast | -moz-crisp-edges | -o-crisp-edges | -webkit-optimize-contrast"
        },
        "-non-standard-overflow": {
            comment: "non-standard keywords https://developer.mozilla.org/en-US/docs/Web/CSS/overflow",
            syntax: "-moz-scrollbars-none | -moz-scrollbars-horizontal | -moz-scrollbars-vertical | -moz-hidden-unscrollable"
        },
        "-non-standard-width": {
            comment: "non-standard keywords https://developer.mozilla.org/en-US/docs/Web/CSS/width",
            syntax: "min-intrinsic | intrinsic | -moz-min-content | -moz-max-content | -webkit-min-content | -webkit-max-content"
        },
        "-non-standard-word-break": {
            comment: "non-standard keywords https://css-tricks.com/almanac/properties/w/word-break/",
            syntax: "break-word"
        },
        "-webkit-gradient()": {
            comment: "first Apple proposal gradient syntax https://webkit.org/blog/175/introducing-css-gradients/ - TODO: simplify when after match algorithm improvement ( [, point, radius | , point] -> [, radius]? , point )",
            syntax: "-webkit-gradient( <-webkit-gradient-type>, <-webkit-gradient-point> [, <-webkit-gradient-point> | , <-webkit-gradient-radius>, <-webkit-gradient-point> ] [, <-webkit-gradient-radius>]? [, <-webkit-gradient-color-stop>]* )"
        },
        "-webkit-gradient-color-stop": {
            comment: "first Apple proposal gradient syntax https://webkit.org/blog/175/introducing-css-gradients/",
            syntax: "from( <color> ) | color-stop( [ <number-zero-one> | <percentage> ] , <color> ) | to( <color> )"
        },
        "-webkit-gradient-point": {
            comment: "first Apple proposal gradient syntax https://webkit.org/blog/175/introducing-css-gradients/",
            syntax: "[ left | center | right | <length-percentage> ] [ top | center | bottom | <length-percentage> ]"
        },
        "-webkit-gradient-radius": {
            comment: "first Apple proposal gradient syntax https://webkit.org/blog/175/introducing-css-gradients/",
            syntax: "<length> | <percentage>"
        },
        "-webkit-gradient-type": {
            comment: "first Apple proposal gradient syntax https://webkit.org/blog/175/introducing-css-gradients/",
            syntax: "linear | radial"
        },
        "-webkit-mask-box-repeat": {
            comment: "missed; https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-mask-box-image",
            syntax: "repeat | stretch | round"
        },
        "-webkit-mask-clip-style": {
            comment: "missed; there is no enough information about `-webkit-mask-clip` property, but looks like all those keywords are working",
            syntax: "border | border-box | padding | padding-box | content | content-box | text"
        },
        "-ms-filter": {
            syntax: "[ <progid> | FlipH | FlipV ]+"
        },
        age: {
            comment: "https://www.w3.org/TR/css3-speech/#voice-family",
            syntax: "child | young | old"
        },
        "attr()": {
            comment: "drop it since it's a generic",
            syntax: null
        },
        "border-radius": {
            comment: "missed, https://drafts.csswg.org/css-backgrounds-3/#the-border-radius",
            syntax: "<length-percentage>{1,2}"
        },
        bottom: {
            comment: "missed; not sure we should add it, but no others except `shape` is using it so it's ok for now; https://drafts.fxtf.org/css-masking-1/#funcdef-clip-rect",
            syntax: "<length> | auto"
        },
        "content-list": {
            comment: "missed -> https://drafts.csswg.org/css-content/#typedef-content-list (document-url, <target> and leader() is omitted util stabilization)",
            syntax: "[ <string> | contents | <url> | <quote> | <attr()> | counter( <ident>, <'list-style-type'>? ) ]+"
        },
        "inset()": {
            comment: "changed <border-radius> to <'border-radius'>",
            syntax: "inset( <length-percentage>{1,4} [ round <'border-radius'> ]? )"
        },
        "generic-voice": {
            comment: "https://www.w3.org/TR/css3-speech/#voice-family",
            syntax: "[ <age>? <gender> <integer>? ]"
        },
        gender: {
            comment: "https://www.w3.org/TR/css3-speech/#voice-family",
            syntax: "male | female | neutral"
        },
        "generic-family": {
            comment: "added -apple-system",
            references: [
                "https://webkit.org/blog/3709/using-the-system-font-in-web-content/"
            ],
            syntax: "serif | sans-serif | cursive | fantasy | monospace | -apple-system"
        },
        gradient: {
            comment: "added -webkit-gradient() since may to be used for legacy support",
            syntax: "<-legacy-gradient> | <linear-gradient()> | <repeating-linear-gradient()> | <radial-gradient()> | <repeating-radial-gradient()>"
        },
        left: {
            comment: "missed; not sure we should add it, but no others except `shape` is using it so it's ok for now; https://drafts.fxtf.org/css-masking-1/#funcdef-clip-rect",
            syntax: "<length> | auto"
        },
        "mask-image": {
            comment: "missed; https://drafts.fxtf.org/css-masking-1/#the-mask-image",
            syntax: "<mask-reference>#"
        },
        "matrix()": {
            comment: "redundant max",
            syntax: "matrix( <number> [, <number> ]{5} )"
        },
        "matrix3d()": {
            comment: "redundant max",
            syntax: "matrix3d( <number> [, <number> ]{15} )"
        },
        "name-repeat": {
            comment: "missed, and looks like obsolete, keep it as is since other property syntaxes should be changed too; https://www.w3.org/TR/2015/WD-css-grid-1-20150917/#typedef-name-repeat",
            syntax: "repeat( [ <positive-integer> | auto-fill ], <line-names>+)"
        },
        "named-color": {
            comment: "replaced <ident> to list of colors according to https://www.w3.org/TR/css-color-4/#named-colors",
            syntax: "transparent | aliceblue | antiquewhite | aqua | aquamarine | azure | beige | bisque | black | blanchedalmond | blue | blueviolet | brown | burlywood | cadetblue | chartreuse | chocolate | coral | cornflowerblue | cornsilk | crimson | cyan | darkblue | darkcyan | darkgoldenrod | darkgray | darkgreen | darkgrey | darkkhaki | darkmagenta | darkolivegreen | darkorange | darkorchid | darkred | darksalmon | darkseagreen | darkslateblue | darkslategray | darkslategrey | darkturquoise | darkviolet | deeppink | deepskyblue | dimgray | dimgrey | dodgerblue | firebrick | floralwhite | forestgreen | fuchsia | gainsboro | ghostwhite | gold | goldenrod | gray | green | greenyellow | grey | honeydew | hotpink | indianred | indigo | ivory | khaki | lavender | lavenderblush | lawngreen | lemonchiffon | lightblue | lightcoral | lightcyan | lightgoldenrodyellow | lightgray | lightgreen | lightgrey | lightpink | lightsalmon | lightseagreen | lightskyblue | lightslategray | lightslategrey | lightsteelblue | lightyellow | lime | limegreen | linen | magenta | maroon | mediumaquamarine | mediumblue | mediumorchid | mediumpurple | mediumseagreen | mediumslateblue | mediumspringgreen | mediumturquoise | mediumvioletred | midnightblue | mintcream | mistyrose | moccasin | navajowhite | navy | oldlace | olive | olivedrab | orange | orangered | orchid | palegoldenrod | palegreen | paleturquoise | palevioletred | papayawhip | peachpuff | peru | pink | plum | powderblue | purple | rebeccapurple | red | rosybrown | royalblue | saddlebrown | salmon | sandybrown | seagreen | seashell | sienna | silver | skyblue | slateblue | slategray | slategrey | snow | springgreen | steelblue | tan | teal | thistle | tomato | turquoise | violet | wheat | white | whitesmoke | yellow | yellowgreen | <-non-standard-color>"
        },
        "outline-radius": {
            comment: "missed, looks like it's a similar to <border-radius> https://developer.mozilla.org/en/docs/Web/CSS/-moz-outline-radius",
            syntax: "<border-radius>"
        },
        paint: {
            comment: "simplified SVG syntax (omit <icccolor>, replace <funciri> for <url>) https://www.w3.org/TR/SVG/painting.html#SpecifyingPaint",
            syntax: "none | currentColor | <color> | <url> [ none | currentColor | <color> ]?"
        },
        "path()": {
            comment: "missed, `motion` property was renamed, but left it as is for now; path() syntax was get from last draft https://drafts.fxtf.org/motion-1/#funcdef-offset-path-path",
            syntax: "path( <string> )"
        },
        right: {
            comment: "missed; not sure we should add it, but no others except `shape` is using it so it's ok for now; https://drafts.fxtf.org/css-masking-1/#funcdef-clip-rect",
            syntax: "<length> | auto"
        },
        shape: {
            comment: "missed spaces in function body and add backwards compatible syntax",
            syntax: "rect( [ [ <top>, <right>, <bottom>, <left> ] | [ <top> <right> <bottom> <left> ] ] )"
        },
        "single-transition": {
            comment: "moved <single-transition-timing-function> in the beginning to avoid wrong match to <single-transition-property>",
            syntax: "<single-transition-timing-function> || [ none | <single-transition-property> ] || <time> || <time>"
        },
        "svg-length": {
            comment: "All coordinates and lengths in SVG can be specified with or without a unit identifier",
            references: [
                "https://www.w3.org/TR/SVG11/coords.html#Units"
            ],
            syntax: "<percentage> | <length> | <number>"
        },
        "svg-writing-mode": {
            comment: "SVG specific keywords (deprecated for CSS)",
            references: [
                "https://developer.mozilla.org/en/docs/Web/CSS/writing-mode",
                "https://www.w3.org/TR/SVG/text.html#WritingModeProperty"
            ],
            syntax: "lr-tb | rl-tb | tb-rl | lr | rl | tb"
        },
        top: {
            comment: "missed; not sure we should add it, but no others except `shape` is using it so it's ok for now; https://drafts.fxtf.org/css-masking-1/#funcdef-clip-rect",
            syntax: "<length> | auto"
        },
        x: {
            comment: "missed; not sure we should add it, but no others except `cursor` is using it so it's ok for now; https://drafts.csswg.org/css-ui-3/#cursor",
            syntax: "<number>"
        },
        y: {
            comment: "missed; not sure we should add it, but no others except `cursor` is using so it's ok for now; https://drafts.csswg.org/css-ui-3/#cursor",
            syntax: "<number>"
        },
        "var()": {
            comment: "drop it since it's a generic (also syntax is incorrect and can't be parsed)",
            syntax: null
        },
        "an-plus-b": {
            comment: "syntax is incorrect and can't be parsed, drop for now",
            syntax: null
        },
        "feature-type": {
            comment: "syntax is incorrect and can't be parsed, drop for now",
            syntax: null
        },
        "feature-value-block": {
            comment: "syntax is incorrect and can't be parsed, drop for now",
            syntax: null
        },
        "feature-value-declaration": {
            comment: "syntax is incorrect and can't be parsed, drop for now",
            syntax: null
        },
        "feature-value-block-list": {
            comment: "syntax is incorrect and can't be parsed, drop for now",
            syntax: null
        },
        "feature-value-declaration-list": {
            comment: "syntax is incorrect and can't be parsed, drop for now",
            syntax: null
        },
        "general-enclosed": {
            comment: "syntax is incorrect and can't be parsed, drop for now",
            syntax: null
        },
        "keyframe-block": {
            comment: "syntax is incorrect and can't be parsed, drop for now",
            syntax: null
        },
        "keyframe-block-list": {
            comment: "syntax is incorrect and can't be parsed, drop for now",
            syntax: null
        },
        "mf-plain": {
            comment: "syntax is incorrect and can't be parsed, drop for now",
            syntax: null
        },
        "mf-range": {
            comment: "syntax is incorrect and can't be parsed, drop for now",
            syntax: null
        },
        "mf-value": {
            comment: "syntax is incorrect and can't be parsed, drop for now",
            syntax: null
        },
        "media-and": {
            comment: "syntax is incorrect and can't be parsed, drop for now",
            syntax: null
        },
        "media-condition": {
            comment: "syntax is incorrect and can't be parsed, drop for now",
            syntax: null
        },
        "media-not": {
            comment: "syntax is incorrect and can't be parsed, drop for now",
            syntax: null
        },
        "media-or": {
            comment: "syntax is incorrect and can't be parsed, drop for now",
            syntax: null
        },
        "media-in-parens": {
            comment: "syntax is incorrect and can't be parsed, drop for now",
            syntax: null
        },
        "media-feature": {
            comment: "syntax is incorrect and can't be parsed, drop for now",
            syntax: null
        },
        "media-condition-without-or": {
            comment: "syntax is incorrect and can't be parsed, drop for now",
            syntax: null
        },
        "media-query": {
            comment: "syntax is incorrect and can't be parsed, drop for now",
            syntax: null
        },
        "media-query-list": {
            comment: "syntax is incorrect and can't be parsed, drop for now",
            syntax: null
        },
        nth: {
            comment: "syntax has <an-plus-b> that doesn't support currently, drop for now",
            syntax: null
        },
        "page-selector": {
            comment: "syntax is incorrect and can't be parsed, drop for now",
            syntax: null
        },
        "page-selector-list": {
            comment: "syntax is incorrect and can't be parsed, drop for now",
            syntax: null
        },
        "page-body": {
            comment: "syntax is incorrect and can't be parsed, drop for now",
            syntax: null
        },
        "page-margin-box": {
            comment: "syntax is incorrect and can't be parsed, drop for now",
            syntax: null
        },
        "page-margin-box-type": {
            comment: "syntax is incorrect and can't be parsed, drop for now",
            syntax: null
        },
        "pseudo-page": {
            comment: "syntax is incorrect and can't be parsed, drop for now",
            syntax: null
        }
    };
    var patch = {
        properties: properties$3,
        syntaxes: syntaxes$2
    };

    var patch$1 = /*#__PURE__*/Object.freeze({
        properties: properties$3,
        syntaxes: syntaxes$2,
        default: patch
    });

    var mdnProperties = ( properties$2 && properties$1 ) || properties$2;

    var mdnSyntaxes = ( syntaxes$1 && syntaxes ) || syntaxes$1;

    var patch$2 = ( patch$1 && patch ) || patch$1;

    function buildDictionary(dict, patchDict) {
        var result = {};

        // copy all syntaxes for an original dict
        for (var key in dict) {
            result[key] = dict[key].syntax;
        }

        // apply a patch
        for (var key in patchDict) {
            if (key in dict) {
                if (patchDict[key].syntax) {
                    result[key] = patchDict[key].syntax;
                } else {
                    delete result[key];
                }
            } else {
                if (patchDict[key].syntax) {
                    result[key] = patchDict[key].syntax;
                }
            }
        }

        return result;
    }

    var data = {
        properties: buildDictionary(mdnProperties, patch$2.properties),
        types: buildDictionary(mdnSyntaxes, patch$2.syntaxes)
    };

    var cmpChar$1 = tokenizer.cmpChar;
    var isNumber$3 = tokenizer.isNumber;
    var TYPE$4 = tokenizer.TYPE;

    var IDENTIFIER$3 = TYPE$4.Identifier;
    var NUMBER$2 = TYPE$4.Number;
    var PLUSSIGN$4 = TYPE$4.PlusSign;
    var HYPHENMINUS$4 = TYPE$4.HyphenMinus;
    var N$5 = 110; // 'n'.charCodeAt(0)
    var DISALLOW_SIGN = true;
    var ALLOW_SIGN = false;

    function checkTokenIsInteger(scanner, disallowSign) {
        var pos = scanner.tokenStart;

        if (scanner.source.charCodeAt(pos) === PLUSSIGN$4 ||
            scanner.source.charCodeAt(pos) === HYPHENMINUS$4) {
            if (disallowSign) {
                scanner.error();
            }
            pos++;
        }

        for (; pos < scanner.tokenEnd; pos++) {
            if (!isNumber$3(scanner.source.charCodeAt(pos))) {
                scanner.error('Unexpected input', pos);
            }
        }
    }

    // An+B microsyntax https://www.w3.org/TR/css-syntax-3/#anb
    var AnPlusB = {
        name: 'AnPlusB',
        structure: {
            a: [String, null],
            b: [String, null]
        },
        parse: function() {
            var start = this.scanner.tokenStart;
            var end = start;
            var prefix = '';
            var a = null;
            var b = null;

            if (this.scanner.tokenType === NUMBER$2 ||
                this.scanner.tokenType === PLUSSIGN$4) {
                checkTokenIsInteger(this.scanner, ALLOW_SIGN);
                prefix = this.scanner.getTokenValue();
                this.scanner.next();
                end = this.scanner.tokenStart;
            }

            if (this.scanner.tokenType === IDENTIFIER$3) {
                var bStart = this.scanner.tokenStart;

                if (cmpChar$1(this.scanner.source, bStart, HYPHENMINUS$4)) {
                    if (prefix === '') {
                        prefix = '-';
                        bStart++;
                    } else {
                        this.scanner.error('Unexpected hyphen minus');
                    }
                }

                if (!cmpChar$1(this.scanner.source, bStart, N$5)) {
                    this.scanner.error();
                }

                a = prefix === ''  ? '1'  :
                    prefix === '+' ? '+1' :
                    prefix === '-' ? '-1' :
                    prefix;

                var len = this.scanner.tokenEnd - bStart;
                if (len > 1) {
                    // ..n-..
                    if (this.scanner.source.charCodeAt(bStart + 1) !== HYPHENMINUS$4) {
                        this.scanner.error('Unexpected input', bStart + 1);
                    }

                    if (len > 2) {
                        // ..n-{number}..
                        this.scanner.tokenStart = bStart + 2;
                    } else {
                        // ..n- {number}
                        this.scanner.next();
                        this.scanner.skipSC();
                    }

                    checkTokenIsInteger(this.scanner, DISALLOW_SIGN);
                    b = '-' + this.scanner.getTokenValue();
                    this.scanner.next();
                    end = this.scanner.tokenStart;
                } else {
                    prefix = '';
                    this.scanner.next();
                    end = this.scanner.tokenStart;
                    this.scanner.skipSC();

                    if (this.scanner.tokenType === HYPHENMINUS$4 ||
                        this.scanner.tokenType === PLUSSIGN$4) {
                        prefix = this.scanner.getTokenValue();
                        this.scanner.next();
                        this.scanner.skipSC();
                    }

                    if (this.scanner.tokenType === NUMBER$2) {
                        checkTokenIsInteger(this.scanner, prefix !== '');

                        if (!isNumber$3(this.scanner.source.charCodeAt(this.scanner.tokenStart))) {
                            prefix = this.scanner.source.charAt(this.scanner.tokenStart);
                            this.scanner.tokenStart++;
                        }

                        if (prefix === '') {
                            // should be an operator before number
                            this.scanner.error();
                        } else if (prefix === '+') {
                            // plus is using by default
                            prefix = '';
                        }

                        b = prefix + this.scanner.getTokenValue();

                        this.scanner.next();
                        end = this.scanner.tokenStart;
                    } else {
                        if (prefix) {
                            this.scanner.eat(NUMBER$2);
                        }
                    }
                }
            } else {
                if (prefix === '' || prefix === '+') { // no number
                    this.scanner.error(
                        'Number or identifier is expected',
                        this.scanner.tokenStart + (
                            this.scanner.tokenType === PLUSSIGN$4 ||
                            this.scanner.tokenType === HYPHENMINUS$4
                        )
                    );
                }

                b = prefix;
            }

            return {
                type: 'AnPlusB',
                loc: this.getLocation(start, end),
                a: a,
                b: b
            };
        },
        generate: function(node) {
            var a = node.a !== null && node.a !== undefined;
            var b = node.b !== null && node.b !== undefined;

            if (a) {
                this.chunk(
                    node.a === '+1' ? '+n' :
                    node.a ===  '1' ?  'n' :
                    node.a === '-1' ? '-n' :
                    node.a + 'n'
                );

                if (b) {
                    b = String(node.b);
                    if (b.charAt(0) === '-' || b.charAt(0) === '+') {
                        this.chunk(b.charAt(0));
                        this.chunk(b.substr(1));
                    } else {
                        this.chunk('+');
                        this.chunk(b);
                    }
                }
            } else {
                this.chunk(String(node.b));
            }
        }
    };

    var TYPE$5 = tokenizer.TYPE;

    var ATKEYWORD$2 = TYPE$5.AtKeyword;
    var SEMICOLON = TYPE$5.Semicolon;
    var LEFTCURLYBRACKET$2 = TYPE$5.LeftCurlyBracket;
    var RIGHTCURLYBRACKET$2 = TYPE$5.RightCurlyBracket;

    function consumeRaw(startToken) {
        return this.Raw(startToken, SEMICOLON, LEFTCURLYBRACKET$2, false, true);
    }

    function isDeclarationBlockAtrule() {
        for (var offset = 1, type; type = this.scanner.lookupType(offset); offset++) {
            if (type === RIGHTCURLYBRACKET$2) {
                return true;
            }

            if (type === LEFTCURLYBRACKET$2 ||
                type === ATKEYWORD$2) {
                return false;
            }
        }

        return false;
    }

    var Atrule = {
        name: 'Atrule',
        structure: {
            name: String,
            prelude: ['AtrulePrelude', 'Raw', null],
            block: ['Block', null]
        },
        parse: function() {
            var start = this.scanner.tokenStart;
            var name;
            var nameLowerCase;
            var prelude = null;
            var block = null;

            this.scanner.eat(ATKEYWORD$2);

            name = this.scanner.substrToCursor(start + 1);
            nameLowerCase = name.toLowerCase();
            this.scanner.skipSC();

            // parse prelude
            if (this.scanner.eof === false &&
                this.scanner.tokenType !== LEFTCURLYBRACKET$2 &&
                this.scanner.tokenType !== SEMICOLON) {
                if (this.parseAtrulePrelude) {
                    prelude = this.parseWithFallback(this.AtrulePrelude.bind(this, name), consumeRaw);

                    // turn empty AtrulePrelude into null
                    if (prelude.type === 'AtrulePrelude' && prelude.children.head === null) {
                        prelude = null;
                    }
                } else {
                    prelude = consumeRaw.call(this, this.scanner.currentToken);
                }

                this.scanner.skipSC();
            }

            switch (this.scanner.tokenType) {
                case SEMICOLON:
                    this.scanner.next();
                    break;

                case LEFTCURLYBRACKET$2:
                    if (this.atrule.hasOwnProperty(nameLowerCase) &&
                        typeof this.atrule[nameLowerCase].block === 'function') {
                        block = this.atrule[nameLowerCase].block.call(this);
                    } else {
                        // TODO: should consume block content as Raw?
                        block = this.Block(isDeclarationBlockAtrule.call(this));
                    }

                    break;
            }

            return {
                type: 'Atrule',
                loc: this.getLocation(start, this.scanner.tokenStart),
                name: name,
                prelude: prelude,
                block: block
            };
        },
        generate: function(node) {
            this.chunk('@');
            this.chunk(node.name);

            if (node.prelude !== null) {
                this.chunk(' ');
                this.node(node.prelude);
            }

            if (node.block) {
                this.node(node.block);
            } else {
                this.chunk(';');
            }
        },
        walkContext: 'atrule'
    };

    var TYPE$6 = tokenizer.TYPE;

    var SEMICOLON$1 = TYPE$6.Semicolon;
    var LEFTCURLYBRACKET$3 = TYPE$6.LeftCurlyBracket;

    var AtrulePrelude = {
        name: 'AtrulePrelude',
        structure: {
            children: [[]]
        },
        parse: function(name) {
            var children = null;

            if (name !== null) {
                name = name.toLowerCase();
            }

            this.scanner.skipSC();

            if (this.atrule.hasOwnProperty(name) &&
                typeof this.atrule[name].prelude === 'function') {
                // custom consumer
                children = this.atrule[name].prelude.call(this);
            } else {
                // default consumer
                children = this.readSequence(this.scope.AtrulePrelude);
            }

            this.scanner.skipSC();

            if (this.scanner.eof !== true &&
                this.scanner.tokenType !== LEFTCURLYBRACKET$3 &&
                this.scanner.tokenType !== SEMICOLON$1) {
                this.scanner.error('Semicolon or block is expected');
            }

            if (children === null) {
                children = this.createList();
            }

            return {
                type: 'AtrulePrelude',
                loc: this.getLocationFromList(children),
                children: children
            };
        },
        generate: function(node) {
            this.children(node);
        },
        walkContext: 'atrulePrelude'
    };

    var TYPE$7 = tokenizer.TYPE;

    var IDENTIFIER$4 = TYPE$7.Identifier;
    var STRING$2 = TYPE$7.String;
    var DOLLARSIGN = TYPE$7.DollarSign;
    var ASTERISK$1 = TYPE$7.Asterisk;
    var COLON = TYPE$7.Colon;
    var EQUALSSIGN = TYPE$7.EqualsSign;
    var LEFTSQUAREBRACKET$2 = TYPE$7.LeftSquareBracket;
    var RIGHTSQUAREBRACKET$2 = TYPE$7.RightSquareBracket;
    var CIRCUMFLEXACCENT = TYPE$7.CircumflexAccent;
    var VERTICALLINE$1 = TYPE$7.VerticalLine;
    var TILDE = TYPE$7.Tilde;

    function getAttributeName() {
        if (this.scanner.eof) {
            this.scanner.error('Unexpected end of input');
        }

        var start = this.scanner.tokenStart;
        var expectIdentifier = false;
        var checkColon = true;

        if (this.scanner.tokenType === ASTERISK$1) {
            expectIdentifier = true;
            checkColon = false;
            this.scanner.next();
        } else if (this.scanner.tokenType !== VERTICALLINE$1) {
            this.scanner.eat(IDENTIFIER$4);
        }

        if (this.scanner.tokenType === VERTICALLINE$1) {
            if (this.scanner.lookupType(1) !== EQUALSSIGN) {
                this.scanner.next();
                this.scanner.eat(IDENTIFIER$4);
            } else if (expectIdentifier) {
                this.scanner.error('Identifier is expected', this.scanner.tokenEnd);
            }
        } else if (expectIdentifier) {
            this.scanner.error('Vertical line is expected');
        }

        if (checkColon && this.scanner.tokenType === COLON) {
            this.scanner.next();
            this.scanner.eat(IDENTIFIER$4);
        }

        return {
            type: 'Identifier',
            loc: this.getLocation(start, this.scanner.tokenStart),
            name: this.scanner.substrToCursor(start)
        };
    }

    function getOperator() {
        var start = this.scanner.tokenStart;
        var tokenType = this.scanner.tokenType;

        if (tokenType !== EQUALSSIGN &&        // =
            tokenType !== TILDE &&             // ~=
            tokenType !== CIRCUMFLEXACCENT &&  // ^=
            tokenType !== DOLLARSIGN &&        // $=
            tokenType !== ASTERISK$1 &&          // *=
            tokenType !== VERTICALLINE$1         // |=
        ) {
            this.scanner.error('Attribute selector (=, ~=, ^=, $=, *=, |=) is expected');
        }

        if (tokenType === EQUALSSIGN) {
            this.scanner.next();
        } else {
            this.scanner.next();
            this.scanner.eat(EQUALSSIGN);
        }

        return this.scanner.substrToCursor(start);
    }

    // '[' S* attrib_name ']'
    // '[' S* attrib_name S* attrib_matcher S* [ IDENT | STRING ] S* attrib_flags? S* ']'
    var AttributeSelector = {
        name: 'AttributeSelector',
        structure: {
            name: 'Identifier',
            matcher: [String, null],
            value: ['String', 'Identifier', null],
            flags: [String, null]
        },
        parse: function() {
            var start = this.scanner.tokenStart;
            var name;
            var matcher = null;
            var value = null;
            var flags = null;

            this.scanner.eat(LEFTSQUAREBRACKET$2);
            this.scanner.skipSC();

            name = getAttributeName.call(this);
            this.scanner.skipSC();

            if (this.scanner.tokenType !== RIGHTSQUAREBRACKET$2) {
                // avoid case `[name i]`
                if (this.scanner.tokenType !== IDENTIFIER$4) {
                    matcher = getOperator.call(this);

                    this.scanner.skipSC();

                    value = this.scanner.tokenType === STRING$2
                        ? this.String()
                        : this.Identifier();

                    this.scanner.skipSC();
                }

                // attribute flags
                if (this.scanner.tokenType === IDENTIFIER$4) {
                    flags = this.scanner.getTokenValue();
                    this.scanner.next();

                    this.scanner.skipSC();
                }
            }

            this.scanner.eat(RIGHTSQUAREBRACKET$2);

            return {
                type: 'AttributeSelector',
                loc: this.getLocation(start, this.scanner.tokenStart),
                name: name,
                matcher: matcher,
                value: value,
                flags: flags
            };
        },
        generate: function(node) {
            var flagsPrefix = ' ';

            this.chunk('[');
            this.node(node.name);

            if (node.matcher !== null) {
                this.chunk(node.matcher);

                if (node.value !== null) {
                    this.node(node.value);

                    // space between string and flags is not required
                    if (node.value.type === 'String') {
                        flagsPrefix = '';
                    }
                }
            }

            if (node.flags !== null) {
                this.chunk(flagsPrefix);
                this.chunk(node.flags);
            }

            this.chunk(']');
        }
    };

    var TYPE$8 = tokenizer.TYPE;

    var WHITESPACE$3 = TYPE$8.WhiteSpace;
    var COMMENT$3 = TYPE$8.Comment;
    var SEMICOLON$2 = TYPE$8.Semicolon;
    var ATKEYWORD$3 = TYPE$8.AtKeyword;
    var LEFTCURLYBRACKET$4 = TYPE$8.LeftCurlyBracket;
    var RIGHTCURLYBRACKET$3 = TYPE$8.RightCurlyBracket;

    function consumeRaw$1(startToken) {
        return this.Raw(startToken, 0, 0, false, true);
    }
    function consumeRule() {
        return this.parseWithFallback(this.Rule, consumeRaw$1);
    }
    function consumeRawDeclaration(startToken) {
        return this.Raw(startToken, 0, SEMICOLON$2, true, true);
    }
    function consumeDeclaration() {
        if (this.scanner.tokenType === SEMICOLON$2) {
            return consumeRawDeclaration.call(this, this.scanner.currentToken);
        }

        var node = this.parseWithFallback(this.Declaration, consumeRawDeclaration);

        if (this.scanner.tokenType === SEMICOLON$2) {
            this.scanner.next();
        }

        return node;
    }

    var Block = {
        name: 'Block',
        structure: {
            children: [[
                'Atrule',
                'Rule',
                'Declaration'
            ]]
        },
        parse: function(isDeclaration) {
            var consumer = isDeclaration ? consumeDeclaration : consumeRule;

            var start = this.scanner.tokenStart;
            var children = this.createList();

            this.scanner.eat(LEFTCURLYBRACKET$4);

            scan:
            while (!this.scanner.eof) {
                switch (this.scanner.tokenType) {
                    case RIGHTCURLYBRACKET$3:
                        break scan;

                    case WHITESPACE$3:
                    case COMMENT$3:
                        this.scanner.next();
                        break;

                    case ATKEYWORD$3:
                        children.push(this.parseWithFallback(this.Atrule, consumeRaw$1));
                        break;

                    default:
                        children.push(consumer.call(this));
                }
            }

            if (!this.scanner.eof) {
                this.scanner.eat(RIGHTCURLYBRACKET$3);
            }

            return {
                type: 'Block',
                loc: this.getLocation(start, this.scanner.tokenStart),
                children: children
            };
        },
        generate: function(node) {
            this.chunk('{');
            this.children(node, function(prev) {
                if (prev.type === 'Declaration') {
                    this.chunk(';');
                }
            });
            this.chunk('}');
        },
        walkContext: 'block'
    };

    var TYPE$9 = tokenizer.TYPE;
    var LEFTSQUAREBRACKET$3 = TYPE$9.LeftSquareBracket;
    var RIGHTSQUAREBRACKET$3 = TYPE$9.RightSquareBracket;

    var Brackets = {
        name: 'Brackets',
        structure: {
            children: [[]]
        },
        parse: function(readSequence, recognizer) {
            var start = this.scanner.tokenStart;
            var children = null;

            this.scanner.eat(LEFTSQUAREBRACKET$3);

            children = readSequence.call(this, recognizer);

            if (!this.scanner.eof) {
                this.scanner.eat(RIGHTSQUAREBRACKET$3);
            }

            return {
                type: 'Brackets',
                loc: this.getLocation(start, this.scanner.tokenStart),
                children: children
            };
        },
        generate: function(node) {
            this.chunk('[');
            this.children(node);
            this.chunk(']');
        }
    };

    var CDC$2 = tokenizer.TYPE.CDC;

    var CDC_1 = {
        name: 'CDC',
        structure: [],
        parse: function() {
            var start = this.scanner.tokenStart;

            this.scanner.eat(CDC$2); // -->

            return {
                type: 'CDC',
                loc: this.getLocation(start, this.scanner.tokenStart)
            };
        },
        generate: function() {
            this.chunk('-->');
        }
    };

    var CDO$2 = tokenizer.TYPE.CDO;

    var CDO_1 = {
        name: 'CDO',
        structure: [],
        parse: function() {
            var start = this.scanner.tokenStart;

            this.scanner.eat(CDO$2); // <!--

            return {
                type: 'CDO',
                loc: this.getLocation(start, this.scanner.tokenStart)
            };
        },
        generate: function() {
            this.chunk('<!--');
        }
    };

    var TYPE$a = tokenizer.TYPE;
    var IDENTIFIER$5 = TYPE$a.Identifier;
    var FULLSTOP$2 = TYPE$a.FullStop;

    // '.' ident
    var ClassSelector = {
        name: 'ClassSelector',
        structure: {
            name: String
        },
        parse: function() {
            this.scanner.eat(FULLSTOP$2);

            return {
                type: 'ClassSelector',
                loc: this.getLocation(this.scanner.tokenStart - 1, this.scanner.tokenEnd),
                name: this.scanner.consume(IDENTIFIER$5)
            };
        },
        generate: function(node) {
            this.chunk('.');
            this.chunk(node.name);
        }
    };

    var TYPE$b = tokenizer.TYPE;

    var PLUSSIGN$5 = TYPE$b.PlusSign;
    var SOLIDUS = TYPE$b.Solidus;
    var GREATERTHANSIGN$2 = TYPE$b.GreaterThanSign;
    var TILDE$1 = TYPE$b.Tilde;

    // + | > | ~ | /deep/
    var Combinator = {
        name: 'Combinator',
        structure: {
            name: String
        },
        parse: function() {
            var start = this.scanner.tokenStart;

            switch (this.scanner.tokenType) {
                case GREATERTHANSIGN$2:
                case PLUSSIGN$5:
                case TILDE$1:
                    this.scanner.next();
                    break;

                case SOLIDUS:
                    this.scanner.next();
                    this.scanner.expectIdentifier('deep');
                    this.scanner.eat(SOLIDUS);
                    break;

                default:
                    this.scanner.error('Combinator is expected');
            }

            return {
                type: 'Combinator',
                loc: this.getLocation(start, this.scanner.tokenStart),
                name: this.scanner.substrToCursor(start)
            };
        },
        generate: function(node) {
            this.chunk(node.name);
        }
    };

    var TYPE$c = tokenizer.TYPE;

    var ASTERISK$2 = TYPE$c.Asterisk;
    var SOLIDUS$1 = TYPE$c.Solidus;

    // '/*' .* '*/'
    var Comment = {
        name: 'Comment',
        structure: {
            value: String
        },
        parse: function() {
            var start = this.scanner.tokenStart;
            var end = this.scanner.tokenEnd;

            if ((end - start + 2) >= 2 &&
                this.scanner.source.charCodeAt(end - 2) === ASTERISK$2 &&
                this.scanner.source.charCodeAt(end - 1) === SOLIDUS$1) {
                end -= 2;
            }

            this.scanner.next();

            return {
                type: 'Comment',
                loc: this.getLocation(start, this.scanner.tokenStart),
                value: this.scanner.source.substring(start + 2, end)
            };
        },
        generate: function(node) {
            this.chunk('/*');
            this.chunk(node.value);
            this.chunk('*/');
        }
    };

    var isCustomProperty$1 = names.isCustomProperty;
    var TYPE$d = tokenizer.TYPE;

    var IDENTIFIER$6 = TYPE$d.Identifier;
    var COLON$1 = TYPE$d.Colon;
    var EXCLAMATIONMARK$2 = TYPE$d.ExclamationMark;
    var SOLIDUS$2 = TYPE$d.Solidus;
    var ASTERISK$3 = TYPE$d.Asterisk;
    var DOLLARSIGN$1 = TYPE$d.DollarSign;
    var HYPHENMINUS$5 = TYPE$d.HyphenMinus;
    var SEMICOLON$3 = TYPE$d.Semicolon;
    var PLUSSIGN$6 = TYPE$d.PlusSign;
    var NUMBERSIGN$2 = TYPE$d.NumberSign;

    function consumeValueRaw(startToken) {
        return this.Raw(startToken, EXCLAMATIONMARK$2, SEMICOLON$3, false, true);
    }

    function consumeCustomPropertyRaw(startToken) {
        return this.Raw(startToken, EXCLAMATIONMARK$2, SEMICOLON$3, false, false);
    }

    function consumeValue() {
        var startValueToken = this.scanner.currentToken;
        var value = this.Value();

        if (value.type !== 'Raw' &&
            this.scanner.eof === false &&
            this.scanner.tokenType !== SEMICOLON$3 &&
            this.scanner.tokenType !== EXCLAMATIONMARK$2 &&
            this.scanner.isBalanceEdge(startValueToken) === false) {
            this.scanner.error();
        }

        return value;
    }

    var Declaration = {
        name: 'Declaration',
        structure: {
            important: [Boolean, String],
            property: String,
            value: ['Value', 'Raw']
        },
        parse: function() {
            var start = this.scanner.tokenStart;
            var startToken = this.scanner.currentToken;
            var property = readProperty$1.call(this);
            var customProperty = isCustomProperty$1(property);
            var parseValue = customProperty ? this.parseCustomProperty : this.parseValue;
            var consumeRaw = customProperty ? consumeCustomPropertyRaw : consumeValueRaw;
            var important = false;
            var value;

            this.scanner.skipSC();
            this.scanner.eat(COLON$1);

            if (!customProperty) {
                this.scanner.skipSC();
            }

            if (parseValue) {
                value = this.parseWithFallback(consumeValue, consumeRaw);
            } else {
                value = consumeRaw.call(this, this.scanner.currentToken);
            }

            if (this.scanner.tokenType === EXCLAMATIONMARK$2) {
                important = getImportant(this.scanner);
                this.scanner.skipSC();
            }

            // Do not include semicolon to range per spec
            // https://drafts.csswg.org/css-syntax/#declaration-diagram

            if (this.scanner.eof === false &&
                this.scanner.tokenType !== SEMICOLON$3 &&
                this.scanner.isBalanceEdge(startToken) === false) {
                this.scanner.error();
            }

            return {
                type: 'Declaration',
                loc: this.getLocation(start, this.scanner.tokenStart),
                important: important,
                property: property,
                value: value
            };
        },
        generate: function(node) {
            this.chunk(node.property);
            this.chunk(':');
            this.node(node.value);

            if (node.important) {
                this.chunk(node.important === true ? '!important' : '!' + node.important);
            }
        },
        walkContext: 'declaration'
    };

    function readProperty$1() {
        var start = this.scanner.tokenStart;
        var prefix = 0;

        // hacks
        switch (this.scanner.tokenType) {
            case ASTERISK$3:
            case DOLLARSIGN$1:
            case PLUSSIGN$6:
            case NUMBERSIGN$2:
                prefix = 1;
                break;

            // TODO: not sure we should support this hack
            case SOLIDUS$2:
                prefix = this.scanner.lookupType(1) === SOLIDUS$2 ? 2 : 1;
                break;
        }

        if (this.scanner.lookupType(prefix) === HYPHENMINUS$5) {
            prefix++;
        }

        if (prefix) {
            this.scanner.skip(prefix);
        }

        this.scanner.eat(IDENTIFIER$6);

        return this.scanner.substrToCursor(start);
    }

    // ! ws* important
    function getImportant(scanner) {
        scanner.eat(EXCLAMATIONMARK$2);
        scanner.skipSC();

        var important = scanner.consume(IDENTIFIER$6);

        // store original value in case it differ from `important`
        // for better original source restoring and hacks like `!ie` support
        return important === 'important' ? true : important;
    }

    var TYPE$e = tokenizer.TYPE;

    var WHITESPACE$4 = TYPE$e.WhiteSpace;
    var COMMENT$4 = TYPE$e.Comment;
    var SEMICOLON$4 = TYPE$e.Semicolon;

    function consumeRaw$2(startToken) {
        return this.Raw(startToken, 0, SEMICOLON$4, true, true);
    }

    var DeclarationList = {
        name: 'DeclarationList',
        structure: {
            children: [[
                'Declaration'
            ]]
        },
        parse: function() {
            var children = this.createList();

            scan:
            while (!this.scanner.eof) {
                switch (this.scanner.tokenType) {
                    case WHITESPACE$4:
                    case COMMENT$4:
                    case SEMICOLON$4:
                        this.scanner.next();
                        break;

                    default:
                        children.push(this.parseWithFallback(this.Declaration, consumeRaw$2));
                }
            }

            return {
                type: 'DeclarationList',
                loc: this.getLocationFromList(children),
                children: children
            };
        },
        generate: function(node) {
            this.children(node, function(prev) {
                if (prev.type === 'Declaration') {
                    this.chunk(';');
                }
            });
        }
    };

    var NUMBER$3 = tokenizer.TYPE.Number;

    // special reader for units to avoid adjoined IE hacks (i.e. '1px\9')
    function readUnit(scanner) {
        var unit = scanner.getTokenValue();
        var backSlashPos = unit.indexOf('\\');

        if (backSlashPos > 0) {
            // patch token offset
            scanner.tokenStart += backSlashPos;

            // return part before backslash
            return unit.substring(0, backSlashPos);
        }

        // no backslash in unit name
        scanner.next();

        return unit;
    }

    // number ident
    var Dimension = {
        name: 'Dimension',
        structure: {
            value: String,
            unit: String
        },
        parse: function() {
            var start = this.scanner.tokenStart;
            var value = this.scanner.consume(NUMBER$3);
            var unit = readUnit(this.scanner);

            return {
                type: 'Dimension',
                loc: this.getLocation(start, this.scanner.tokenStart),
                value: value,
                unit: unit
            };
        },
        generate: function(node) {
            this.chunk(node.value);
            this.chunk(node.unit);
        }
    };

    var TYPE$f = tokenizer.TYPE;
    var RIGHTPARENTHESIS$3 = TYPE$f.RightParenthesis;

    // <function-token> <sequence> ')'
    var _Function = {
        name: 'Function',
        structure: {
            name: String,
            children: [[]]
        },
        parse: function(readSequence, recognizer) {
            var start = this.scanner.tokenStart;
            var name = this.scanner.consumeFunctionName();
            var nameLowerCase = name.toLowerCase();
            var children;

            children = recognizer.hasOwnProperty(nameLowerCase)
                ? recognizer[nameLowerCase].call(this, recognizer)
                : readSequence.call(this, recognizer);

            if (!this.scanner.eof) {
                this.scanner.eat(RIGHTPARENTHESIS$3);
            }

            return {
                type: 'Function',
                loc: this.getLocation(start, this.scanner.tokenStart),
                name: name,
                children: children
            };
        },
        generate: function(node) {
            this.chunk(node.name);
            this.chunk('(');
            this.children(node);
            this.chunk(')');
        },
        walkContext: 'function'
    };

    var isHex$2 = tokenizer.isHex;
    var TYPE$g = tokenizer.TYPE;

    var IDENTIFIER$7 = TYPE$g.Identifier;
    var NUMBER$4 = TYPE$g.Number;
    var NUMBERSIGN$3 = TYPE$g.NumberSign;

    function consumeHexSequence(scanner, required) {
        if (!isHex$2(scanner.source.charCodeAt(scanner.tokenStart))) {
            if (required) {
                scanner.error('Unexpected input', scanner.tokenStart);
            } else {
                return;
            }
        }

        for (var pos = scanner.tokenStart + 1; pos < scanner.tokenEnd; pos++) {
            var code = scanner.source.charCodeAt(pos);

            // break on non-hex char
            if (!isHex$2(code)) {
                // break token, exclude symbol
                scanner.tokenStart = pos;
                return;
            }
        }

        // token is full hex sequence, go to next token
        scanner.next();
    }

    // # ident
    var HexColor = {
        name: 'HexColor',
        structure: {
            value: String
        },
        parse: function() {
            var start = this.scanner.tokenStart;

            this.scanner.eat(NUMBERSIGN$3);

            scan:
            switch (this.scanner.tokenType) {
                case NUMBER$4:
                    consumeHexSequence(this.scanner, true);

                    // if token is identifier then number consists of hex only,
                    // try to add identifier to result
                    if (this.scanner.tokenType === IDENTIFIER$7) {
                        consumeHexSequence(this.scanner, false);
                    }

                    break;

                case IDENTIFIER$7:
                    consumeHexSequence(this.scanner, true);
                    break;

                default:
                    this.scanner.error('Number or identifier is expected');
            }

            return {
                type: 'HexColor',
                loc: this.getLocation(start, this.scanner.tokenStart),
                value: this.scanner.substrToCursor(start + 1) // skip #
            };
        },
        generate: function(node) {
            this.chunk('#');
            this.chunk(node.value);
        }
    };

    var TYPE$h = tokenizer.TYPE;
    var IDENTIFIER$8 = TYPE$h.Identifier;

    var Identifier = {
        name: 'Identifier',
        structure: {
            name: String
        },
        parse: function() {
            return {
                type: 'Identifier',
                loc: this.getLocation(this.scanner.tokenStart, this.scanner.tokenEnd),
                name: this.scanner.consume(IDENTIFIER$8)
            };
        },
        generate: function(node) {
            this.chunk(node.name);
        }
    };

    var TYPE$i = tokenizer.TYPE;
    var IDENTIFIER$9 = TYPE$i.Identifier;
    var NUMBERSIGN$4 = TYPE$i.NumberSign;

    // '#' ident
    var IdSelector = {
        name: 'IdSelector',
        structure: {
            name: String
        },
        parse: function() {
            this.scanner.eat(NUMBERSIGN$4);

            return {
                type: 'IdSelector',
                loc: this.getLocation(this.scanner.tokenStart - 1, this.scanner.tokenEnd),
                name: this.scanner.consume(IDENTIFIER$9)
            };
        },
        generate: function(node) {
            this.chunk('#');
            this.chunk(node.name);
        }
    };

    var TYPE$j = tokenizer.TYPE;

    var IDENTIFIER$a = TYPE$j.Identifier;
    var NUMBER$5 = TYPE$j.Number;
    var LEFTPARENTHESIS$3 = TYPE$j.LeftParenthesis;
    var RIGHTPARENTHESIS$4 = TYPE$j.RightParenthesis;
    var COLON$2 = TYPE$j.Colon;
    var SOLIDUS$3 = TYPE$j.Solidus;

    var MediaFeature = {
        name: 'MediaFeature',
        structure: {
            name: String,
            value: ['Identifier', 'Number', 'Dimension', 'Ratio', null]
        },
        parse: function() {
            var start = this.scanner.tokenStart;
            var name;
            var value = null;

            this.scanner.eat(LEFTPARENTHESIS$3);
            this.scanner.skipSC();

            name = this.scanner.consume(IDENTIFIER$a);
            this.scanner.skipSC();

            if (this.scanner.tokenType !== RIGHTPARENTHESIS$4) {
                this.scanner.eat(COLON$2);
                this.scanner.skipSC();

                switch (this.scanner.tokenType) {
                    case NUMBER$5:
                        if (this.scanner.lookupType(1) === IDENTIFIER$a) {
                            value = this.Dimension();
                        } else if (this.scanner.lookupNonWSType(1) === SOLIDUS$3) {
                            value = this.Ratio();
                        } else {
                            value = this.Number();
                        }

                        break;

                    case IDENTIFIER$a:
                        value = this.Identifier();

                        break;

                    default:
                        this.scanner.error('Number, dimension, ratio or identifier is expected');
                }

                this.scanner.skipSC();
            }

            this.scanner.eat(RIGHTPARENTHESIS$4);

            return {
                type: 'MediaFeature',
                loc: this.getLocation(start, this.scanner.tokenStart),
                name: name,
                value: value
            };
        },
        generate: function(node) {
            this.chunk('(');
            this.chunk(node.name);
            if (node.value !== null) {
                this.chunk(':');
                this.node(node.value);
            }
            this.chunk(')');
        }
    };

    var TYPE$k = tokenizer.TYPE;

    var WHITESPACE$5 = TYPE$k.WhiteSpace;
    var COMMENT$5 = TYPE$k.Comment;
    var IDENTIFIER$b = TYPE$k.Identifier;
    var LEFTPARENTHESIS$4 = TYPE$k.LeftParenthesis;

    var MediaQuery = {
        name: 'MediaQuery',
        structure: {
            children: [[
                'Identifier',
                'MediaFeature',
                'WhiteSpace'
            ]]
        },
        parse: function() {
            this.scanner.skipSC();

            var children = this.createList();
            var child = null;
            var space = null;

            scan:
            while (!this.scanner.eof) {
                switch (this.scanner.tokenType) {
                    case COMMENT$5:
                        this.scanner.next();
                        continue;

                    case WHITESPACE$5:
                        space = this.WhiteSpace();
                        continue;

                    case IDENTIFIER$b:
                        child = this.Identifier();
                        break;

                    case LEFTPARENTHESIS$4:
                        child = this.MediaFeature();
                        break;

                    default:
                        break scan;
                }

                if (space !== null) {
                    children.push(space);
                    space = null;
                }

                children.push(child);
            }

            if (child === null) {
                this.scanner.error('Identifier or parenthesis is expected');
            }

            return {
                type: 'MediaQuery',
                loc: this.getLocationFromList(children),
                children: children
            };
        },
        generate: function(node) {
            this.children(node);
        }
    };

    var COMMA$1 = tokenizer.TYPE.Comma;

    var MediaQueryList = {
        name: 'MediaQueryList',
        structure: {
            children: [[
                'MediaQuery'
            ]]
        },
        parse: function(relative) {
            var children = this.createList();

            this.scanner.skipSC();

            while (!this.scanner.eof) {
                children.push(this.MediaQuery(relative));

                if (this.scanner.tokenType !== COMMA$1) {
                    break;
                }

                this.scanner.next();
            }

            return {
                type: 'MediaQueryList',
                loc: this.getLocationFromList(children),
                children: children
            };
        },
        generate: function(node) {
            this.children(node, function() {
                this.chunk(',');
            });
        }
    };

    // https://drafts.csswg.org/css-syntax-3/#the-anb-type
    var Nth = {
        name: 'Nth',
        structure: {
            nth: ['AnPlusB', 'Identifier'],
            selector: ['SelectorList', null]
        },
        parse: function(allowOfClause) {
            this.scanner.skipSC();

            var start = this.scanner.tokenStart;
            var end = start;
            var selector = null;
            var query;

            if (this.scanner.lookupValue(0, 'odd') || this.scanner.lookupValue(0, 'even')) {
                query = this.Identifier();
            } else {
                query = this.AnPlusB();
            }

            this.scanner.skipSC();

            if (allowOfClause && this.scanner.lookupValue(0, 'of')) {
                this.scanner.next();

                selector = this.SelectorList();

                if (this.needPositions) {
                    end = this.getLastListNode(selector.children).loc.end.offset;
                }
            } else {
                if (this.needPositions) {
                    end = query.loc.end.offset;
                }
            }

            return {
                type: 'Nth',
                loc: this.getLocation(start, end),
                nth: query,
                selector: selector
            };
        },
        generate: function(node) {
            this.node(node.nth);
            if (node.selector !== null) {
                this.chunk(' of ');
                this.node(node.selector);
            }
        }
    };

    var NUMBER$6 = tokenizer.TYPE.Number;

    var _Number = {
        name: 'Number',
        structure: {
            value: String
        },
        parse: function() {
            return {
                type: 'Number',
                loc: this.getLocation(this.scanner.tokenStart, this.scanner.tokenEnd),
                value: this.scanner.consume(NUMBER$6)
            };
        },
        generate: function(node) {
            this.chunk(node.value);
        }
    };

    // '/' | '*' | ',' | ':' | '+' | '-'
    var Operator = {
        name: 'Operator',
        structure: {
            value: String
        },
        parse: function() {
            var start = this.scanner.tokenStart;

            this.scanner.next();

            return {
                type: 'Operator',
                loc: this.getLocation(start, this.scanner.tokenStart),
                value: this.scanner.substrToCursor(start)
            };
        },
        generate: function(node) {
            this.chunk(node.value);
        }
    };

    var TYPE$l = tokenizer.TYPE;
    var LEFTPARENTHESIS$5 = TYPE$l.LeftParenthesis;
    var RIGHTPARENTHESIS$5 = TYPE$l.RightParenthesis;

    var Parentheses = {
        name: 'Parentheses',
        structure: {
            children: [[]]
        },
        parse: function(readSequence, recognizer) {
            var start = this.scanner.tokenStart;
            var children = null;

            this.scanner.eat(LEFTPARENTHESIS$5);

            children = readSequence.call(this, recognizer);

            if (!this.scanner.eof) {
                this.scanner.eat(RIGHTPARENTHESIS$5);
            }

            return {
                type: 'Parentheses',
                loc: this.getLocation(start, this.scanner.tokenStart),
                children: children
            };
        },
        generate: function(node) {
            this.chunk('(');
            this.children(node);
            this.chunk(')');
        }
    };

    var TYPE$m = tokenizer.TYPE;

    var NUMBER$7 = TYPE$m.Number;
    var PERCENTSIGN = TYPE$m.PercentSign;

    var Percentage = {
        name: 'Percentage',
        structure: {
            value: String
        },
        parse: function() {
            var start = this.scanner.tokenStart;
            var number = this.scanner.consume(NUMBER$7);

            this.scanner.eat(PERCENTSIGN);

            return {
                type: 'Percentage',
                loc: this.getLocation(start, this.scanner.tokenStart),
                value: number
            };
        },
        generate: function(node) {
            this.chunk(node.value);
            this.chunk('%');
        }
    };

    var TYPE$n = tokenizer.TYPE;

    var IDENTIFIER$c = TYPE$n.Identifier;
    var FUNCTION$2 = TYPE$n.Function;
    var COLON$3 = TYPE$n.Colon;
    var RIGHTPARENTHESIS$6 = TYPE$n.RightParenthesis;

    // : ident [ '(' .. ')' ]?
    var PseudoClassSelector = {
        name: 'PseudoClassSelector',
        structure: {
            name: String,
            children: [['Raw'], null]
        },
        parse: function() {
            var start = this.scanner.tokenStart;
            var children = null;
            var name;
            var nameLowerCase;

            this.scanner.eat(COLON$3);

            if (this.scanner.tokenType === FUNCTION$2) {
                name = this.scanner.consumeFunctionName();
                nameLowerCase = name.toLowerCase();

                if (this.pseudo.hasOwnProperty(nameLowerCase)) {
                    this.scanner.skipSC();
                    children = this.pseudo[nameLowerCase].call(this);
                    this.scanner.skipSC();
                } else {
                    children = this.createList();
                    children.push(
                        this.Raw(this.scanner.currentToken, 0, 0, false, false)
                    );
                }

                this.scanner.eat(RIGHTPARENTHESIS$6);
            } else {
                name = this.scanner.consume(IDENTIFIER$c);
            }

            return {
                type: 'PseudoClassSelector',
                loc: this.getLocation(start, this.scanner.tokenStart),
                name: name,
                children: children
            };
        },
        generate: function(node) {
            this.chunk(':');
            this.chunk(node.name);

            if (node.children !== null) {
                this.chunk('(');
                this.children(node);
                this.chunk(')');
            }
        },
        walkContext: 'function'
    };

    var TYPE$o = tokenizer.TYPE;

    var IDENTIFIER$d = TYPE$o.Identifier;
    var FUNCTION$3 = TYPE$o.Function;
    var COLON$4 = TYPE$o.Colon;
    var RIGHTPARENTHESIS$7 = TYPE$o.RightParenthesis;

    // :: ident [ '(' .. ')' ]?
    var PseudoElementSelector = {
        name: 'PseudoElementSelector',
        structure: {
            name: String,
            children: [['Raw'], null]
        },
        parse: function() {
            var start = this.scanner.tokenStart;
            var children = null;
            var name;
            var nameLowerCase;

            this.scanner.eat(COLON$4);
            this.scanner.eat(COLON$4);

            if (this.scanner.tokenType === FUNCTION$3) {
                name = this.scanner.consumeFunctionName();
                nameLowerCase = name.toLowerCase();

                if (this.pseudo.hasOwnProperty(nameLowerCase)) {
                    this.scanner.skipSC();
                    children = this.pseudo[nameLowerCase].call(this);
                    this.scanner.skipSC();
                } else {
                    children = this.createList();
                    children.push(
                        this.Raw(this.scanner.currentToken, 0, 0, false, false)
                    );
                }

                this.scanner.eat(RIGHTPARENTHESIS$7);
            } else {
                name = this.scanner.consume(IDENTIFIER$d);
            }

            return {
                type: 'PseudoElementSelector',
                loc: this.getLocation(start, this.scanner.tokenStart),
                name: name,
                children: children
            };
        },
        generate: function(node) {
            this.chunk('::');
            this.chunk(node.name);

            if (node.children !== null) {
                this.chunk('(');
                this.children(node);
                this.chunk(')');
            }
        },
        walkContext: 'function'
    };

    var isNumber$4 = tokenizer.isNumber;
    var TYPE$p = tokenizer.TYPE;
    var NUMBER$8 = TYPE$p.Number;
    var SOLIDUS$4 = TYPE$p.Solidus;
    var FULLSTOP$3 = TYPE$p.FullStop;

    // Terms of <ratio> should to be a positive number (not zero or negative)
    // (see https://drafts.csswg.org/mediaqueries-3/#values)
    // However, -o-min-device-pixel-ratio takes fractional values as a ratio's term
    // and this is using by various sites. Therefore we relax checking on parse
    // to test a term is unsigned number without exponent part.
    // Additional checks may to be applied on lexer validation.
    function consumeNumber$1(scanner) {
        var value = scanner.consumeNonWS(NUMBER$8);

        for (var i = 0; i < value.length; i++) {
            var code = value.charCodeAt(i);
            if (!isNumber$4(code) && code !== FULLSTOP$3) {
                scanner.error('Unsigned number is expected', scanner.tokenStart - value.length + i);
            }
        }

        if (Number(value) === 0) {
            scanner.error('Zero number is not allowed', scanner.tokenStart - value.length);
        }

        return value;
    }

    // <positive-integer> S* '/' S* <positive-integer>
    var Ratio = {
        name: 'Ratio',
        structure: {
            left: String,
            right: String
        },
        parse: function() {
            var start = this.scanner.tokenStart;
            var left = consumeNumber$1(this.scanner);
            var right;

            this.scanner.eatNonWS(SOLIDUS$4);
            right = consumeNumber$1(this.scanner);

            return {
                type: 'Ratio',
                loc: this.getLocation(start, this.scanner.tokenStart),
                left: left,
                right: right
            };
        },
        generate: function(node) {
            this.chunk(node.left);
            this.chunk('/');
            this.chunk(node.right);
        }
    };

    var Raw = {
        name: 'Raw',
        structure: {
            value: String
        },
        parse: function(startToken, endTokenType1, endTokenType2, includeTokenType2, excludeWhiteSpace) {
            var startOffset = this.scanner.getTokenStart(startToken);
            var endOffset;

            this.scanner.skip(
                this.scanner.getRawLength(
                    startToken,
                    endTokenType1,
                    endTokenType2,
                    includeTokenType2
                )
            );

            if (excludeWhiteSpace && this.scanner.tokenStart > startOffset) {
                endOffset = this.scanner.getOffsetExcludeWS();
            } else {
                endOffset = this.scanner.tokenStart;
            }

            return {
                type: 'Raw',
                loc: this.getLocation(startOffset, endOffset),
                value: this.scanner.source.substring(startOffset, endOffset)
            };
        },
        generate: function(node) {
            this.chunk(node.value);
        }
    };

    var TYPE$q = tokenizer.TYPE;

    var LEFTCURLYBRACKET$5 = TYPE$q.LeftCurlyBracket;

    function consumeRaw$3(startToken) {
        return this.Raw(startToken, LEFTCURLYBRACKET$5, 0, false, true);
    }

    function consumePrelude() {
        var prelude = this.SelectorList();

        if (prelude.type !== 'Raw' &&
            this.scanner.eof === false &&
            this.scanner.tokenType !== LEFTCURLYBRACKET$5) {
            this.scanner.error();
        }

        return prelude;
    }

    var Rule = {
        name: 'Rule',
        structure: {
            prelude: ['SelectorList', 'Raw'],
            block: ['Block']
        },
        parse: function() {
            var startToken = this.scanner.currentToken;
            var startOffset = this.scanner.tokenStart;
            var prelude;
            var block;

            if (this.parseRulePrelude) {
                prelude = this.parseWithFallback(consumePrelude, consumeRaw$3);
            } else {
                prelude = consumeRaw$3.call(this, startToken);
            }

            block = this.Block(true);

            return {
                type: 'Rule',
                loc: this.getLocation(startOffset, this.scanner.tokenStart),
                prelude: prelude,
                block: block
            };
        },
        generate: function(node) {
            this.node(node.prelude);
            this.node(node.block);
        },
        walkContext: 'rule'
    };

    var Selector = {
        name: 'Selector',
        structure: {
            children: [[
                'TypeSelector',
                'IdSelector',
                'ClassSelector',
                'AttributeSelector',
                'PseudoClassSelector',
                'PseudoElementSelector',
                'Combinator',
                'WhiteSpace'
            ]]
        },
        parse: function() {
            var children = this.readSequence(this.scope.Selector);

            // nothing were consumed
            if (this.getFirstListNode(children) === null) {
                this.scanner.error('Selector is expected');
            }

            return {
                type: 'Selector',
                loc: this.getLocationFromList(children),
                children: children
            };
        },
        generate: function(node) {
            this.children(node);
        }
    };

    var TYPE$r = tokenizer.TYPE;

    var COMMA$2 = TYPE$r.Comma;

    var SelectorList = {
        name: 'SelectorList',
        structure: {
            children: [[
                'Selector',
                'Raw'
            ]]
        },
        parse: function() {
            var children = this.createList();

            while (!this.scanner.eof) {
                children.push(this.Selector());

                if (this.scanner.tokenType === COMMA$2) {
                    this.scanner.next();
                    continue;
                }

                break;
            }

            return {
                type: 'SelectorList',
                loc: this.getLocationFromList(children),
                children: children
            };
        },
        generate: function(node) {
            this.children(node, function() {
                this.chunk(',');
            });
        },
        walkContext: 'selector'
    };

    var STRING$3 = tokenizer.TYPE.String;

    var _String = {
        name: 'String',
        structure: {
            value: String
        },
        parse: function() {
            return {
                type: 'String',
                loc: this.getLocation(this.scanner.tokenStart, this.scanner.tokenEnd),
                value: this.scanner.consume(STRING$3)
            };
        },
        generate: function(node) {
            this.chunk(node.value);
        }
    };

    var TYPE$s = tokenizer.TYPE;

    var WHITESPACE$6 = TYPE$s.WhiteSpace;
    var COMMENT$6 = TYPE$s.Comment;
    var EXCLAMATIONMARK$3 = TYPE$s.ExclamationMark;
    var ATKEYWORD$4 = TYPE$s.AtKeyword;
    var CDO$3 = TYPE$s.CDO;
    var CDC$3 = TYPE$s.CDC;

    function consumeRaw$4(startToken) {
        return this.Raw(startToken, 0, 0, false, false);
    }

    var StyleSheet = {
        name: 'StyleSheet',
        structure: {
            children: [[
                'Comment',
                'CDO',
                'CDC',
                'Atrule',
                'Rule',
                'Raw'
            ]]
        },
        parse: function() {
            var start = this.scanner.tokenStart;
            var children = this.createList();
            var child;

            scan:
            while (!this.scanner.eof) {
                switch (this.scanner.tokenType) {
                    case WHITESPACE$6:
                        this.scanner.next();
                        continue;

                    case COMMENT$6:
                        // ignore comments except exclamation comments (i.e. /*! .. */) on top level
                        if (this.scanner.source.charCodeAt(this.scanner.tokenStart + 2) !== EXCLAMATIONMARK$3) {
                            this.scanner.next();
                            continue;
                        }

                        child = this.Comment();
                        break;

                    case CDO$3: // <!--
                        child = this.CDO();
                        break;

                    case CDC$3: // -->
                        child = this.CDC();
                        break;

                    // CSS Syntax Module Level 3
                    // §2.2 Error handling
                    // At the "top level" of a stylesheet, an <at-keyword-token> starts an at-rule.
                    case ATKEYWORD$4:
                        child = this.parseWithFallback(this.Atrule, consumeRaw$4);
                        break;

                    // Anything else starts a qualified rule ...
                    default:
                        child = this.parseWithFallback(this.Rule, consumeRaw$4);
                }

                children.push(child);
            }

            return {
                type: 'StyleSheet',
                loc: this.getLocation(start, this.scanner.tokenStart),
                children: children
            };
        },
        generate: function(node) {
            this.children(node);
        },
        walkContext: 'stylesheet'
    };

    var TYPE$t = tokenizer.TYPE;

    var IDENTIFIER$e = TYPE$t.Identifier;
    var ASTERISK$4 = TYPE$t.Asterisk;
    var VERTICALLINE$2 = TYPE$t.VerticalLine;

    function eatIdentifierOrAsterisk() {
        if (this.scanner.tokenType !== IDENTIFIER$e &&
            this.scanner.tokenType !== ASTERISK$4) {
            this.scanner.error('Identifier or asterisk is expected');
        }

        this.scanner.next();
    }

    // ident
    // ident|ident
    // ident|*
    // *
    // *|ident
    // *|*
    // |ident
    // |*
    var TypeSelector = {
        name: 'TypeSelector',
        structure: {
            name: String
        },
        parse: function() {
            var start = this.scanner.tokenStart;

            if (this.scanner.tokenType === VERTICALLINE$2) {
                this.scanner.next();
                eatIdentifierOrAsterisk.call(this);
            } else {
                eatIdentifierOrAsterisk.call(this);

                if (this.scanner.tokenType === VERTICALLINE$2) {
                    this.scanner.next();
                    eatIdentifierOrAsterisk.call(this);
                }
            }

            return {
                type: 'TypeSelector',
                loc: this.getLocation(start, this.scanner.tokenStart),
                name: this.scanner.substrToCursor(start)
            };
        },
        generate: function(node) {
            this.chunk(node.name);
        }
    };

    var isHex$3 = tokenizer.isHex;
    var TYPE$u = tokenizer.TYPE;

    var IDENTIFIER$f = TYPE$u.Identifier;
    var NUMBER$9 = TYPE$u.Number;
    var PLUSSIGN$7 = TYPE$u.PlusSign;
    var HYPHENMINUS$6 = TYPE$u.HyphenMinus;
    var FULLSTOP$4 = TYPE$u.FullStop;
    var QUESTIONMARK$1 = TYPE$u.QuestionMark;

    function scanUnicodeNumber(scanner) {
        for (var pos = scanner.tokenStart + 1; pos < scanner.tokenEnd; pos++) {
            var code = scanner.source.charCodeAt(pos);

            // break on fullstop or hyperminus/plussign after exponent
            if (code === FULLSTOP$4 || code === PLUSSIGN$7) {
                // break token, exclude symbol
                scanner.tokenStart = pos;
                return false;
            }
        }

        return true;
    }

    // https://drafts.csswg.org/css-syntax-3/#urange
    function scanUnicodeRange(scanner) {
        var hexStart = scanner.tokenStart + 1; // skip +
        var hexLength = 0;

        scan: {
            if (scanner.tokenType === NUMBER$9) {
                if (scanner.source.charCodeAt(scanner.tokenStart) !== FULLSTOP$4 && scanUnicodeNumber(scanner)) {
                    scanner.next();
                } else if (scanner.source.charCodeAt(scanner.tokenStart) !== HYPHENMINUS$6) {
                    break scan;
                }
            } else {
                scanner.next(); // PLUSSIGN
            }

            if (scanner.tokenType === HYPHENMINUS$6) {
                scanner.next();
            }

            if (scanner.tokenType === NUMBER$9) {
                scanner.next();
            }

            if (scanner.tokenType === IDENTIFIER$f) {
                scanner.next();
            }

            if (scanner.tokenStart === hexStart) {
                scanner.error('Unexpected input', hexStart);
            }
        }

        // validate for U+x{1,6} or U+x{1,6}-x{1,6}
        // where x is [0-9a-fA-F]
        for (var i = hexStart, wasHyphenMinus = false; i < scanner.tokenStart; i++) {
            var code = scanner.source.charCodeAt(i);

            if (isHex$3(code) === false && (code !== HYPHENMINUS$6 || wasHyphenMinus)) {
                scanner.error('Unexpected input', i);
            }

            if (code === HYPHENMINUS$6) {
                // hex sequence shouldn't be an empty
                if (hexLength === 0) {
                    scanner.error('Unexpected input', i);
                }

                wasHyphenMinus = true;
                hexLength = 0;
            } else {
                hexLength++;

                // too long hex sequence
                if (hexLength > 6) {
                    scanner.error('Too long hex sequence', i);
                }
            }

        }

        // check we have a non-zero sequence
        if (hexLength === 0) {
            scanner.error('Unexpected input', i - 1);
        }

        // U+abc???
        if (!wasHyphenMinus) {
            // consume as many U+003F QUESTION MARK (?) code points as possible
            for (; hexLength < 6 && !scanner.eof; scanner.next()) {
                if (scanner.tokenType !== QUESTIONMARK$1) {
                    break;
                }

                hexLength++;
            }
        }
    }

    var UnicodeRange = {
        name: 'UnicodeRange',
        structure: {
            value: String
        },
        parse: function() {
            var start = this.scanner.tokenStart;

            this.scanner.next(); // U or u
            scanUnicodeRange(this.scanner);

            return {
                type: 'UnicodeRange',
                loc: this.getLocation(start, this.scanner.tokenStart),
                value: this.scanner.substrToCursor(start)
            };
        },
        generate: function(node) {
            this.chunk(node.value);
        }
    };

    var TYPE$v = tokenizer.TYPE;

    var STRING$4 = TYPE$v.String;
    var URL$3 = TYPE$v.Url;
    var RAW$2 = TYPE$v.Raw;
    var RIGHTPARENTHESIS$8 = TYPE$v.RightParenthesis;

    // url '(' S* (string | raw) S* ')'
    var Url = {
        name: 'Url',
        structure: {
            value: ['String', 'Raw']
        },
        parse: function() {
            var start = this.scanner.tokenStart;
            var value;

            this.scanner.eat(URL$3);
            this.scanner.skipSC();

            switch (this.scanner.tokenType) {
                case STRING$4:
                    value = this.String();
                    break;

                case RAW$2:
                    value = this.Raw(this.scanner.currentToken, 0, RAW$2, true, false);
                    break;

                default:
                    this.scanner.error('String or Raw is expected');
            }

            this.scanner.skipSC();
            this.scanner.eat(RIGHTPARENTHESIS$8);

            return {
                type: 'Url',
                loc: this.getLocation(start, this.scanner.tokenStart),
                value: value
            };
        },
        generate: function(node) {
            this.chunk('url');
            this.chunk('(');
            this.node(node.value);
            this.chunk(')');
        }
    };

    var Value = {
        name: 'Value',
        structure: {
            children: [[]]
        },
        parse: function() {
            var start = this.scanner.tokenStart;
            var children = this.readSequence(this.scope.Value);

            return {
                type: 'Value',
                loc: this.getLocation(start, this.scanner.tokenStart),
                children: children
            };
        },
        generate: function(node) {
            this.children(node);
        }
    };

    var WHITESPACE$7 = tokenizer.TYPE.WhiteSpace;
    var SPACE$4 = Object.freeze({
        type: 'WhiteSpace',
        loc: null,
        value: ' '
    });

    var WhiteSpace = {
        name: 'WhiteSpace',
        structure: {
            value: String
        },
        parse: function() {
            this.scanner.eat(WHITESPACE$7);
            return SPACE$4;

            // return {
            //     type: 'WhiteSpace',
            //     loc: this.getLocation(this.scanner.tokenStart, this.scanner.tokenEnd),
            //     value: this.scanner.consume(WHITESPACE)
            // };
        },
        generate: function(node) {
            this.chunk(node.value);
        }
    };

    var node = {
        AnPlusB: AnPlusB,
        Atrule: Atrule,
        AtrulePrelude: AtrulePrelude,
        AttributeSelector: AttributeSelector,
        Block: Block,
        Brackets: Brackets,
        CDC: CDC_1,
        CDO: CDO_1,
        ClassSelector: ClassSelector,
        Combinator: Combinator,
        Comment: Comment,
        Declaration: Declaration,
        DeclarationList: DeclarationList,
        Dimension: Dimension,
        Function: _Function,
        HexColor: HexColor,
        Identifier: Identifier,
        IdSelector: IdSelector,
        MediaFeature: MediaFeature,
        MediaQuery: MediaQuery,
        MediaQueryList: MediaQueryList,
        Nth: Nth,
        Number: _Number,
        Operator: Operator,
        Parentheses: Parentheses,
        Percentage: Percentage,
        PseudoClassSelector: PseudoClassSelector,
        PseudoElementSelector: PseudoElementSelector,
        Ratio: Ratio,
        Raw: Raw,
        Rule: Rule,
        Selector: Selector,
        SelectorList: SelectorList,
        String: _String,
        StyleSheet: StyleSheet,
        TypeSelector: TypeSelector,
        UnicodeRange: UnicodeRange,
        Url: Url,
        Value: Value,
        WhiteSpace: WhiteSpace
    };

    var lexer = {
        generic: true,
        types: data.types,
        properties: data.properties,
        node: node
    };

    var cmpChar$2 = tokenizer.cmpChar;
    var TYPE$w = tokenizer.TYPE;

    var IDENTIFIER$g = TYPE$w.Identifier;
    var STRING$5 = TYPE$w.String;
    var NUMBER$a = TYPE$w.Number;
    var FUNCTION$4 = TYPE$w.Function;
    var URL$4 = TYPE$w.Url;
    var NUMBERSIGN$5 = TYPE$w.NumberSign;
    var LEFTPARENTHESIS$6 = TYPE$w.LeftParenthesis;
    var LEFTSQUAREBRACKET$4 = TYPE$w.LeftSquareBracket;
    var PLUSSIGN$8 = TYPE$w.PlusSign;
    var HYPHENMINUS$7 = TYPE$w.HyphenMinus;
    var COMMA$3 = TYPE$w.Comma;
    var SOLIDUS$5 = TYPE$w.Solidus;
    var ASTERISK$5 = TYPE$w.Asterisk;
    var PERCENTSIGN$1 = TYPE$w.PercentSign;
    var BACKSLASH = TYPE$w.Backslash;
    var U = 117; // 'u'.charCodeAt(0)

    var _default = function defaultRecognizer(context) {
        switch (this.scanner.tokenType) {
            case NUMBERSIGN$5:
                return this.HexColor();

            case COMMA$3:
                context.space = null;
                context.ignoreWSAfter = true;
                return this.Operator();

            case SOLIDUS$5:
            case ASTERISK$5:
            case PLUSSIGN$8:
            case HYPHENMINUS$7:
                return this.Operator();

            case LEFTPARENTHESIS$6:
                return this.Parentheses(this.readSequence, context.recognizer);

            case LEFTSQUAREBRACKET$4:
                return this.Brackets(this.readSequence, context.recognizer);

            case STRING$5:
                return this.String();

            case NUMBER$a:
                switch (this.scanner.lookupType(1)) {
                    case PERCENTSIGN$1:
                        return this.Percentage();

                    case IDENTIFIER$g:
                        // edge case: number with folowing \0 and \9 hack shouldn't to be a Dimension
                        if (cmpChar$2(this.scanner.source, this.scanner.tokenEnd, BACKSLASH)) {
                            return this.Number();
                        } else {
                            return this.Dimension();
                        }

                    default:
                        return this.Number();
                }

            case FUNCTION$4:
                return this.Function(this.readSequence, context.recognizer);

            case URL$4:
                return this.Url();

            case IDENTIFIER$g:
                // check for unicode range, it should start with u+ or U+
                if (cmpChar$2(this.scanner.source, this.scanner.tokenStart, U) &&
                    cmpChar$2(this.scanner.source, this.scanner.tokenStart + 1, PLUSSIGN$8)) {
                    return this.UnicodeRange();
                } else {
                    return this.Identifier();
                }
        }
    };

    var atrulePrelude = {
        getNode: _default
    };

    var TYPE$x = tokenizer.TYPE;

    var IDENTIFIER$h = TYPE$x.Identifier;
    var NUMBER$b = TYPE$x.Number;
    var NUMBERSIGN$6 = TYPE$x.NumberSign;
    var LEFTSQUAREBRACKET$5 = TYPE$x.LeftSquareBracket;
    var PLUSSIGN$9 = TYPE$x.PlusSign;
    var SOLIDUS$6 = TYPE$x.Solidus;
    var ASTERISK$6 = TYPE$x.Asterisk;
    var FULLSTOP$5 = TYPE$x.FullStop;
    var COLON$5 = TYPE$x.Colon;
    var GREATERTHANSIGN$3 = TYPE$x.GreaterThanSign;
    var VERTICALLINE$3 = TYPE$x.VerticalLine;
    var TILDE$2 = TYPE$x.Tilde;

    function getNode(context) {
        switch (this.scanner.tokenType) {
            case PLUSSIGN$9:
            case GREATERTHANSIGN$3:
            case TILDE$2:
                context.space = null;
                context.ignoreWSAfter = true;
                return this.Combinator();

            case SOLIDUS$6:  // /deep/
                return this.Combinator();

            case FULLSTOP$5:
                return this.ClassSelector();

            case LEFTSQUAREBRACKET$5:
                return this.AttributeSelector();

            case NUMBERSIGN$6:
                return this.IdSelector();

            case COLON$5:
                if (this.scanner.lookupType(1) === COLON$5) {
                    return this.PseudoElementSelector();
                } else {
                    return this.PseudoClassSelector();
                }

            case IDENTIFIER$h:
            case ASTERISK$6:
            case VERTICALLINE$3:
                return this.TypeSelector();

            case NUMBER$b:
                return this.Percentage();
        }
    }
    var selector = {
        getNode: getNode
    };

    // https://drafts.csswg.org/css-images-4/#element-notation
    // https://developer.mozilla.org/en-US/docs/Web/CSS/element
    var element = function() {
        this.scanner.skipSC();

        var children = this.createSingleNodeList(
            this.IdSelector()
        );

        this.scanner.skipSC();

        return children;
    };

    // legacy IE function
    // expression '(' raw ')'
    var expression$1 = function() {
        return this.createSingleNodeList(
            this.Raw(this.scanner.currentToken, 0, 0, false, false)
        );
    };

    var TYPE$y = tokenizer.TYPE;

    var IDENTIFIER$i = TYPE$y.Identifier;
    var COMMA$4 = TYPE$y.Comma;
    var SEMICOLON$5 = TYPE$y.Semicolon;
    var HYPHENMINUS$8 = TYPE$y.HyphenMinus;
    var EXCLAMATIONMARK$4 = TYPE$y.ExclamationMark;

    // var '(' ident (',' <value>? )? ')'
    var _var = function() {
        var children = this.createList();

        this.scanner.skipSC();

        var identStart = this.scanner.tokenStart;

        this.scanner.eat(HYPHENMINUS$8);
        if (this.scanner.source.charCodeAt(this.scanner.tokenStart) !== HYPHENMINUS$8) {
            this.scanner.error('HyphenMinus is expected');
        }
        this.scanner.eat(IDENTIFIER$i);

        children.push({
            type: 'Identifier',
            loc: this.getLocation(identStart, this.scanner.tokenStart),
            name: this.scanner.substrToCursor(identStart)
        });

        this.scanner.skipSC();

        if (this.scanner.tokenType === COMMA$4) {
            children.push(this.Operator());
            children.push(this.parseCustomProperty
                ? this.Value(null)
                : this.Raw(this.scanner.currentToken, EXCLAMATIONMARK$4, SEMICOLON$5, false, false)
            );
        }

        return children;
    };

    var value = {
        getNode: _default,
        '-moz-element': element,
        'element': element,
        'expression': expression$1,
        'var': _var
    };

    var scope = {
        AtrulePrelude: atrulePrelude,
        Selector: selector,
        Value: value
    };

    var fontFace = {
        parse: {
            prelude: null,
            block: function() {
                return this.Block(true);
            }
        }
    };

    var TYPE$z = tokenizer.TYPE;

    var STRING$6 = TYPE$z.String;
    var IDENTIFIER$j = TYPE$z.Identifier;
    var URL$5 = TYPE$z.Url;
    var LEFTPARENTHESIS$7 = TYPE$z.LeftParenthesis;

    var _import = {
        parse: {
            prelude: function() {
                var children = this.createList();

                this.scanner.skipSC();

                switch (this.scanner.tokenType) {
                    case STRING$6:
                        children.push(this.String());
                        break;

                    case URL$5:
                        children.push(this.Url());
                        break;

                    default:
                        this.scanner.error('String or url() is expected');
                }

                if (this.scanner.lookupNonWSType(0) === IDENTIFIER$j ||
                    this.scanner.lookupNonWSType(0) === LEFTPARENTHESIS$7) {
                    children.push(this.WhiteSpace());
                    children.push(this.MediaQueryList());
                }

                return children;
            },
            block: null
        }
    };

    var media = {
        parse: {
            prelude: function() {
                return this.createSingleNodeList(
                    this.MediaQueryList()
                );
            },
            block: function() {
                return this.Block(false);
            }
        }
    };

    var page = {
        parse: {
            prelude: function() {
                return this.createSingleNodeList(
                    this.SelectorList()
                );
            },
            block: function() {
                return this.Block(true);
            }
        }
    };

    var TYPE$A = tokenizer.TYPE;

    var WHITESPACE$8 = TYPE$A.WhiteSpace;
    var COMMENT$7 = TYPE$A.Comment;
    var IDENTIFIER$k = TYPE$A.Identifier;
    var FUNCTION$5 = TYPE$A.Function;
    var LEFTPARENTHESIS$8 = TYPE$A.LeftParenthesis;
    var HYPHENMINUS$9 = TYPE$A.HyphenMinus;
    var COLON$6 = TYPE$A.Colon;

    function consumeRaw$5() {
        return this.createSingleNodeList(
            this.Raw(this.scanner.currentToken, 0, 0, false, false)
        );
    }

    function parentheses() {
        var index = 0;

        this.scanner.skipSC();

        // TODO: make it simplier
        if (this.scanner.tokenType === IDENTIFIER$k) {
            index = 1;
        } else if (this.scanner.tokenType === HYPHENMINUS$9 &&
                   this.scanner.lookupType(1) === IDENTIFIER$k) {
            index = 2;
        }

        if (index !== 0 && this.scanner.lookupNonWSType(index) === COLON$6) {
            return this.createSingleNodeList(
                this.Declaration()
            );
        }

        return readSequence.call(this);
    }

    function readSequence() {
        var children = this.createList();
        var space = null;
        var child;

        this.scanner.skipSC();

        scan:
        while (!this.scanner.eof) {
            switch (this.scanner.tokenType) {
                case WHITESPACE$8:
                    space = this.WhiteSpace();
                    continue;

                case COMMENT$7:
                    this.scanner.next();
                    continue;

                case FUNCTION$5:
                    child = this.Function(consumeRaw$5, this.scope.AtrulePrelude);
                    break;

                case IDENTIFIER$k:
                    child = this.Identifier();
                    break;

                case LEFTPARENTHESIS$8:
                    child = this.Parentheses(parentheses, this.scope.AtrulePrelude);
                    break;

                default:
                    break scan;
            }

            if (space !== null) {
                children.push(space);
                space = null;
            }

            children.push(child);
        }

        return children;
    }

    var supports = {
        parse: {
            prelude: function() {
                var children = readSequence.call(this);

                if (this.getFirstListNode(children) === null) {
                    this.scanner.error('Condition is expected');
                }

                return children;
            },
            block: function() {
                return this.Block(false);
            }
        }
    };

    var atrule = {
        'font-face': fontFace,
        'import': _import,
        'media': media,
        'page': page,
        'supports': supports
    };

    var dir = {
        parse: function() {
            return this.createSingleNodeList(
                this.Identifier()
            );
        }
    };

    var has$1 = {
        parse: function() {
            return this.createSingleNodeList(
                this.SelectorList()
            );
        }
    };

    var lang = {
        parse: function() {
            return this.createSingleNodeList(
                this.Identifier()
            );
        }
    };

    var selectorList = {
        parse: function selectorList() {
            return this.createSingleNodeList(
                this.SelectorList()
            );
        }
    };

    var matches = selectorList;

    var not = selectorList;

    var ALLOW_OF_CLAUSE = true;

    var nthWithOfClause = {
        parse: function nthWithOfClause() {
            return this.createSingleNodeList(
                this.Nth(ALLOW_OF_CLAUSE)
            );
        }
    };

    var nthChild = nthWithOfClause;

    var nthLastChild = nthWithOfClause;

    var DISALLOW_OF_CLAUSE = false;

    var nth$1 = {
        parse: function nth() {
            return this.createSingleNodeList(
                this.Nth(DISALLOW_OF_CLAUSE)
            );
        }
    };

    var nthLastOfType = nth$1;

    var nthOfType = nth$1;

    var slotted = {
        parse: function compoundSelector() {
            return this.createSingleNodeList(
                this.Selector()
            );
        }
    };

    var pseudo = {
        'dir': dir,
        'has': has$1,
        'lang': lang,
        'matches': matches,
        'not': not,
        'nth-child': nthChild,
        'nth-last-child': nthLastChild,
        'nth-last-of-type': nthLastOfType,
        'nth-of-type': nthOfType,
        'slotted': slotted
    };

    var parser = {
        parseContext: {
            default: 'StyleSheet',
            stylesheet: 'StyleSheet',
            atrule: 'Atrule',
            atrulePrelude: function(options) {
                return this.AtrulePrelude(options.atrule ? String(options.atrule) : null);
            },
            mediaQueryList: 'MediaQueryList',
            mediaQuery: 'MediaQuery',
            rule: 'Rule',
            selectorList: 'SelectorList',
            selector: 'Selector',
            block: function() {
                return this.Block(true);
            },
            declarationList: 'DeclarationList',
            declaration: 'Declaration',
            value: 'Value'
        },
        scope: scope,
        atrule: atrule,
        pseudo: pseudo,
        node: node
    };

    var walker = {
        node: node
    };

    function merge() {
        var dest = {};

        for (var i = 0; i < arguments.length; i++) {
            var src = arguments[i];
            for (var key in src) {
                dest[key] = src[key];
            }
        }

        return dest;
    }

    var syntax = create$5.create(
        merge(
            lexer,
            parser,
            walker
        )
    );

    var lib = syntax;

    class Sheet {
        constructor(url, hooks) {

            if (hooks) {
                this.hooks = hooks;
            } else {
                this.hooks = {};
                this.hooks.onUrl = new Hook(this);
                this.hooks.onAtPage = new Hook(this);
                this.hooks.onAtMedia = new Hook(this);
                this.hooks.onRule = new Hook(this);
                this.hooks.onDeclaration = new Hook(this);
                this.hooks.onContent = new Hook(this);

                this.hooks.beforeTreeParse = new Hook(this);
                this.hooks.beforeTreeWalk = new Hook(this);
                this.hooks.afterTreeWalk = new Hook(this);
            }

            try {
                this.url = new URL(url, window.location.href);
            } catch (e) {
                this.url = new URL(window.location.href);
            }
        }



        // parse
        async parse(text) {
            this.text = text;

            await this.hooks.beforeTreeParse.trigger(this.text, this);

            // send to csstree
            this.ast = lib.parse(this._text);

            await this.hooks.beforeTreeWalk.trigger(this.ast);

            // Replace urls
            this.replaceUrls(this.ast);

            // Scope
            this.id = UUID();
            // this.addScope(this.ast, this.uuid);

            // Replace IDs with data-id
            this.replaceIds(this.ast);

            // Trigger Hooks
            this.urls(this.ast);
            this.rules(this.ast);
            this.atrules(this.ast);

            await this.hooks.afterTreeWalk.trigger(this.ast, this);

            // return ast
            return this.ast;
        }

        insertRule(rule) {
            let inserted = this.ast.children.appendData(rule);
            inserted.forEach((item) => {
                this.declarations(item);
            });
        }

        urls(ast) {
            lib.walk(ast, {
                visit: "Url",
                enter: (node, item, list) => {
                    this.hooks.onUrl.trigger(node, item, list);
                }
            });
        }

        atrules(ast) {
            lib.walk(ast, {
                visit: "Atrule",
                enter: (node, item, list) => {
                    const basename = lib.keyword(node.name).basename;

                    if (basename === "page") {
                        this.hooks.onAtPage.trigger(node, item, list);
                        this.declarations(node, item, list);
                    }

                    if (basename === "media") {
                        this.hooks.onAtMedia.trigger(node, item, list);
                        this.declarations(node, item, list);
                    }
                }
            });
        }


        rules(ast) {
            lib.walk(ast, {
                visit: "Rule",
                enter: (ruleNode, ruleItem, rulelist) => {
                    // console.log("rule", ruleNode);

                    this.hooks.onRule.trigger(ruleNode, ruleItem, rulelist);
                    this.declarations(ruleNode, ruleItem, rulelist);
                }
            });
        }

        declarations(ruleNode, ruleItem, rulelist) {
            lib.walk(ruleNode, {
                visit: "Declaration",
                enter: (declarationNode, dItem, dList) => {
                    // console.log(declarationNode);

                    this.hooks.onDeclaration.trigger(declarationNode, dItem, dList, {ruleNode, ruleItem, rulelist});

                    if (declarationNode.property === "content") {
                        lib.walk(declarationNode, {
                            visit: "Function",
                            enter: (funcNode, fItem, fList) => {
                                this.hooks.onContent.trigger(funcNode, fItem, fList, {declarationNode, dItem, dList}, {ruleNode, ruleItem, rulelist});
                            }
                        });
                    }

                }
            });
        }

        replaceUrls(ast) {
            lib.walk(ast, {
                visit: "Url",
                enter: (node, item, list) => {
                    let href = node.value.value.replace(/["']/g, "");
                    let url = new URL(href, this.url);
                    node.value.value = url.toString();
                }
            });
        }

        addScope(ast, id) {
            // Get all selector lists
            // add an id
            lib.walk(ast, {
                visit: "Selector",
                enter: (node, item, list) => {
                    let children = node.children;
                    children.prepend(children.createItem({
                        type: "WhiteSpace",
                        value: " "
                    }));
                    children.prepend(children.createItem({
                        type: "IdSelector",
                        name: id,
                        loc: null,
                        children: null
                    }));
                }
            });
        }

        getNamedPageSelectors(ast) {
            let namedPageSelectors = {};
            lib.walk(ast, {
                visit: "Rule",
                enter: (node, item, list) => {
                    lib.walk(node, {
                        visit: "Declaration",
                        enter: (declaration, dItem, dList) => {
                            if (declaration.property === "page") {
                                let value = declaration.value.children.first();
                                let name = value.name;
                                let selector = lib.generate(node.prelude);
                                namedPageSelectors[name] = {
                                    name: name,
                                    selector: selector
                                };

                                // dList.remove(dItem);

                                // Add in page break
                                declaration.property = "break-before";
                                value.type = "Identifier";
                                value.name = "always";

                            }
                        }
                    });
                }
            });
            return namedPageSelectors;
        }

        replaceIds(ast) {
            lib.walk(ast, {
                visit: "Rule",
                enter: (node, item, list) => {

                    lib.walk(node, {
                        visit: "IdSelector",
                        enter: (idNode, idItem, idList) => {
                            let name = idNode.name;
                            idNode.flags = null;
                            idNode.matcher = "=";
                            idNode.name = {type: "Identifier", loc: null, name: "data-id"};
                            idNode.type = "AttributeSelector";
                            idNode.value = {type: "String", loc: null, value: `"${name}"`};
                        }
                    });
                }
            });
        }

        set text(t) {
            this._text = t;
        }

        get text() {
            return this._text;
        }

        // generate string
        toString(ast) {
            return lib.generate(ast || this.ast);
        }
    }

    var baseStyles = `
:root {
    --width: 8.5in;
    --height: 11in;
    --margin-top: 1in;
    --margin-right: 1in;
    --margin-bottom: 1in;
    --margin-left: 1in;
    --page-count: 0;
}

@page {
    size: letter;
    margin: 0;
}

.pagedjs_page {
    box-sizing: border-box;
    width: var(--width);
    height: var(--height);
    overflow: hidden;
    position: relative;
    display: grid;
    grid-template-columns: [left] var(--margin-left) [center] calc(var(--width) - var(--margin-left) - var(--margin-right)) [right] var(--margin-right);
    grid-template-rows: [header] var(--margin-top) [page] calc(var(--height) - var(--margin-top) - var(--margin-bottom)) [footer] var(--margin-bottom);
}

.pagedjs_page * {
    box-sizing: border-box;
}

.pagedjs_margin-top {
    width: calc(var(--width) - var(--margin-left) - var(--margin-right));
    height: var(--margin-top);
    grid-column: center;
    grid-row: header;
    flex-wrap: nowrap;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: 100%;
}

.pagedjs_margin-top-left-corner-holder {
    width: var(--margin-left);
    height: var(--margin-top);
    display: flex;
    grid-column: left;
    grid-row: header;
}

.pagedjs_margin-top-right-corner-holder {
    width: var(--margin-right);
    height: var(--margin-top);
    display: flex;
    grid-column: right;
    grid-row: header;
}

.pagedjs_margin-top-left-corner {
    width: var(--margin-left);
}

.pagedjs_margin-top-right-corner {
    width: var(--margin-right);
}


.pagedjs_margin-right {
    height: calc(var(--height) - var(--margin-top) - var(--margin-bottom));
    width: var(--margin-right);
    right: 0;
    grid-column: right;
    grid-row: page;
    display: grid;
    grid-template-rows: repeat(3, 33.3333%);
    grid-template-columns: 100%;
}



.pagedjs_margin-bottom {
    width: calc(var(--width) - var(--margin-left) - var(--margin-right));
    height: var(--margin-bottom);
    grid-column: center;
    grid-row: footer;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: 100%;
}

.pagedjs_margin-bottom-left-corner-holder {
    width: var(--margin-left);
    height: var(--margin-bottom);
    display: flex;
    grid-column: left;
    grid-row: footer;
}

.pagedjs_margin-bottom-right-corner-holder {
    width: var(--margin-right);
    height: var(--margin-bottom);
    display: flex;
    grid-column: right;
    grid-row: footer;
}

.pagedjs_margin-bottom-left-corner {
    width: var(--margin-left);
}

.pagedjs_margin-bottom-right-corner {
    width: var(--margin-right);
}



.pagedjs_margin-left {
    height: calc(var(--height) - var(--margin-top) - var(--margin-bottom));
    width: var(--margin-left);
    grid-column: left;
    grid-row: page;
    display: grid;
    grid-template-rows: repeat(3, 33.33333%);
    grid-template-columns: 100%;
}

.pagedjs_pages .pagedjs_page .pagedjs_margin:not(.hasContent) {
    visibility: hidden;
}

.pagedjs_page > .pagedjs_area {
    grid-column: center;
    grid-row: page;
    width: 100%;
    height: 100%;
}

.pagedjs_page > .pagedjs_area > .pagedjs_page_content {
    width: 100%;
    height: 100%;
    position: relative;
    column-fill: auto;
}

.pagedjs_page {
    counter-increment: page;
}

.pagedjs_pages {
    counter-reset: pages var(--page-count);
}


.pagedjs_page .pagedjs_margin-top-left-corner,
.pagedjs_page .pagedjs_margin-top-right-corner,
.pagedjs_page .pagedjs_margin-bottom-left-corner,
.pagedjs_page .pagedjs_margin-bottom-right-corner,
.pagedjs_page .pagedjs_margin-top-left,
.pagedjs_page .pagedjs_margin-top-right,
.pagedjs_page .pagedjs_margin-bottom-left,
.pagedjs_page .pagedjs_margin-bottom-right,
.pagedjs_page .pagedjs_margin-top-center,
.pagedjs_page .pagedjs_margin-bottom-center,
.pagedjs_page .pagedjs_margin-top-center,
.pagedjs_page .pagedjs_margin-bottom-center,
.pagedjs_margin-right-middle,
.pagedjs_margin-left-middle  {
    display: flex;
    align-items: center;
}

.pagedjs_margin-right-top,
.pagedjs_margin-left-top  {
    display: flex;
    align-items: flex-top;
}


.pagedjs_margin-right-bottom,
.pagedjs_margin-left-bottom  {
    display: flex;
    align-items: flex-end;
}



/*
.pagedjs_page .pagedjs_margin-top-center,
.pagedjs_page .pagedjs_margin-bottom-center {
    height: 100%;
    display: none;
    align-items: center;
    flex: 1 0 33%;
    margin: 0 auto;
}

.pagedjs_page .pagedjs_margin-top-left-corner,
.pagedjs_page .pagedjs_margin-top-right-corner,
.pagedjs_page .pagedjs_margin-bottom-right-corner,
.pagedjs_page .pagedjs_margin-bottom-left-corner {
    display: none;
    align-items: center;
}

.pagedjs_page .pagedjs_margin-left-top,
.pagedjs_page .pagedjs_margin-right-top {
    display: none;
    align-items: flex-start;
}

.pagedjs_page .pagedjs_margin-right-middle,
.pagedjs_page .pagedjs_margin-left-middle {
    display: none;
    align-items: center;
}

.pagedjs_page .pagedjs_margin-left-bottom,
.pagedjs_page .pagedjs_margin-right-bottom {
    display: none;
    align-items: flex-end;
}
*/

.pagedjs_page .pagedjs_margin-top-left,
.pagedjs_page .pagedjs_margin-top-right-corner,
.pagedjs_page .pagedjs_margin-bottom-left,
.pagedjs_page .pagedjs_margin-bottom-right-corner { text-align: left; }

.pagedjs_page .pagedjs_margin-top-left-corner,
.pagedjs_page .pagedjs_margin-top-right,
.pagedjs_page .pagedjs_margin-bottom-left-corner,
.pagedjs_page .pagedjs_margin-bottom-right { text-align: right; }

.pagedjs_page .pagedjs_margin-top-center,
.pagedjs_page .pagedjs_margin-bottom-center,
.pagedjs_page .pagedjs_margin-left-top,
.pagedjs_page .pagedjs_margin-left-middle,
.pagedjs_page .pagedjs_margin-left-bottom,
.pagedjs_page .pagedjs_margin-right-top,
.pagedjs_page .pagedjs_margin-right-middle,
.pagedjs_page .pagedjs_margin-right-bottom { text-align: center; }

.pagedjs_pages .pagedjs_margin .pagedjs_margin-content {
    width: 100%;
}

.pagedjs_pages .pagedjs_margin-left .pagedjs_margin-content::after,
.pagedjs_pages .pagedjs_margin-top .pagedjs_margin-content::after,
.pagedjs_pages .pagedjs_margin-right .pagedjs_margin-content::after,
.pagedjs_pages .pagedjs_margin-bottom .pagedjs_margin-content::after {
    display: block;
}

.pagedjs_pages > .pagedjs_page > .pagedjs_area > div [data-split-to] {
    margin-bottom: unset;
    padding-bottom: unset;
}

.pagedjs_pages > .pagedjs_page > .pagedjs_area > div [data-split-from] {
    text-indent: unset;
    margin-top: unset;
    padding-top: unset;
    initial-letter: unset;
}

.pagedjs_pages > .pagedjs_page > .pagedjs_area > div [data-split-from] > *::first-letter,
.pagedjs_pages > .pagedjs_page > .pagedjs_area > div [data-split-from]::first-letter {
    color: unset;
    font-size: unset;
    font-weight: unset;
    font-family: unset;
    color: unset;
    line-height: unset;
    float: unset;
    padding: unset;
    margin: unset;
}

.pagedjs_pages > .pagedjs_page > .pagedjs_area > div [data-split-to]:after,
.pagedjs_pages > .pagedjs_page > .pagedjs_area > div [data-split-to]::after {
    content: unset;
}

.pagedjs_pages > .pagedjs_page > .pagedjs_area > div [data-split-from]:before,
.pagedjs_pages > .pagedjs_page > .pagedjs_area > div [data-split-from]::before {
    content: unset;
}

.pagedjs_pages > .pagedjs_page > .pagedjs_area > div li[data-split-from]:first-of-type {
    list-style: none;
}

/*
[data-page]:not([data-split-from]),
[data-break-before="page"]:not([data-split-from]),
[data-break-before="always"]:not([data-split-from]),
[data-break-before="left"]:not([data-split-from]),
[data-break-before="right"]:not([data-split-from]),
[data-break-before="recto"]:not([data-split-from]),
[data-break-before="verso"]:not([data-split-from])
{
    break-before: column;
}

[data-page]:not([data-split-to]),
[data-break-after="page"]:not([data-split-to]),
[data-break-after="always"]:not([data-split-to]),
[data-break-after="left"]:not([data-split-to]),
[data-break-after="right"]:not([data-split-to]),
[data-break-after="recto"]:not([data-split-to]),
[data-break-after="verso"]:not([data-split-to])
{
    break-after: column;
}
*/

.pagedjs_clear-after::after {
    content: none !important;
}

img {
    height: auto;
}

@media print {
    html {
        width: 100%;
        height: 100%;
    }
    body {
        margin: 0;
        padding: 0;
        width: 100% !important;
        height: 100% !important;
        min-width: 100%;
        max-width: 100%;
        min-height: 100%;
        max-height: 100%;
    }
    .pagedjs_pages {
        width: var(--width);
        display: block !important;
        transform: none !important;
        height: 100% !important;
        min-height: 100%;
        max-height: 100%;
        overflow: visible;
    }
    .pagedjs_page {
        margin: 0;
        padding: 0;
        max-height: 100%;
        min-height: 100%;
        height: 100% !important;
        page-break-after: always;
        break-after: page;
    }
}
`;

    class Polisher {
        constructor(setup) {
            this.sheets = [];
            this.inserted = [];

            this.hooks = {};
            this.hooks.onUrl = new Hook(this);
            this.hooks.onAtPage = new Hook(this);
            this.hooks.onAtMedia = new Hook(this);
            this.hooks.onRule = new Hook(this);
            this.hooks.onDeclaration = new Hook(this);
            this.hooks.onContent = new Hook(this);

            this.hooks.beforeTreeParse = new Hook(this);
            this.hooks.beforeTreeWalk = new Hook(this);
            this.hooks.afterTreeWalk = new Hook(this);

            if (setup !== false) {
                this.setup();
            }
        }

        setup() {
            this.base = this.insert(baseStyles);
            this.styleEl = document.createElement("style");
            document.head.appendChild(this.styleEl);
            this.styleSheet = this.styleEl.sheet;
            return this.styleSheet;
        }

        async add() {
            let fetched = [];
            let urls = [];

            for (var i = 0; i < arguments.length; i++) {
                let f;

                if (typeof arguments[i] === "object") {
                    for (let url in arguments[i]) {
                        let obj = arguments[i];
                        f = new Promise(function(resolve, reject) {
                            urls.push(url);
                            resolve(obj[url]);
                        });
                    }
                } else {
                    urls.push(arguments[i]);
                    f = fetch(arguments[i]).then((response) => {
                        return response.text();
                    });
                }


                fetched.push(f);
            }

            return await Promise.all(fetched)
                .then(async (originals) => {
                    let text = "";
                    for (let index = 0; index < originals.length; index++) {
                        text += await this.convertViaSheet(originals[index], urls[index]);
                    }
                    this.insert(text);
                    return text;
                });
        }

        async convertViaSheet(cssStr, href) {
            let sheet = new Sheet(href, this.hooks);
            await sheet.parse(cssStr);
            this.sheets.push(sheet);

            if (typeof sheet.width !== "undefined") {
                this.width = sheet.width;
            }
            if (typeof sheet.height !== "undefined") {
                this.height = sheet.height;
            }
            if (typeof sheet.orientation !== "undefined") {
                this.orientation = sheet.orientation;
            }
            return sheet.toString();
        }

        insert(text){
            let head = document.querySelector("head");
            let style = document.createElement("style");
            style.type = "text/css";
            style.setAttribute("data-pagedjs-inserted-styles", "true");

            style.appendChild(document.createTextNode(text));

            head.appendChild(style);

            this.inserted.push(style);
            return style;
        }

        destroy() {
            this.styleEl.remove();
            this.inserted.forEach((s) => {
                s.remove();
            });
            this.sheets = [];
        }
    }

    class Handler {
        constructor(chunker, polisher, caller) {
            let hooks = Object.assign({}, chunker && chunker.hooks, polisher && polisher.hooks, caller && caller.hooks);
            this.chunker = chunker;
            this.polisher = polisher;
            this.caller = caller;

            for (let name in hooks) {
                if (name in this) {
                    let hook = hooks[name];
                    hook.register(this[name].bind(this));
                }
            }
        }
    }

    eventEmitter(Handler.prototype);

    // https://www.w3.org/TR/css3-page/#page-size-prop

    var pageSizes = {
        "A0": {
            width: {
                value: 841,
                unit: "mm"
            },
            height: {
                value: 1189,
                unit: "mm"
            }
        },
        "A1": {
            width: {
                value: 594,
                unit: "mm"
            },
            height: {
                value: 841,
                unit: "mm"
            }
        },
        "A2": {
            width: {
                value: 420,
                unit: "mm"
            },
            height: {
                value: 594,
                unit: "mm"
            }
        },
        "A3": {
            width: {
                value: 297,
                unit: "mm"
            },
            height: {
                value: 420,
                unit: "mm"
            }
        },
        "A4": {
            width: {
                value: 210,
                unit: "mm"
            },
            height: {
                value: 297,
                unit: "mm"
            }
        },
        "A5": {
            width: {
                value: 148,
                unit: "mm"
            },
            height: {
                value: 210,
                unit: "mm"
            }
        },
        "A6": {
            width: {
                value: 105,
                unit: "mm"
            },
            height: {
                value: 148,
                unit: "mm"
            }
        },
        "A7": {
            width: {
                value: 74,
                unit: "mm"
            },
            height: {
                value: 105,
                unit: "mm"
            }
        },
        "A8": {
            width: {
                value: 52,
                unit: "mm"
            },
            height: {
                value: 74,
                unit: "mm"
            }
        },
        "A9": {
            width: {
                value: 37,
                unit: "mm"
            },
            height: {
                value: 52,
                unit: "mm"
            }
        },
        "A10": {
            width: {
                value: 26,
                unit: "mm"
            },
            height: {
                value: 37,
                unit: "mm"
            }
        },
        "B4": {
            width: {
                value: 250,
                unit: "mm"
            },
            height: {
                value: 353,
                unit: "mm"
            }
        },
        "B5": {
            width: {
                value: 250,
                unit: "mm"
            },
            height: {
                value: 250,
                unit: "mm"
            }
        },
        "letter": {
            width: {
                value: 8.5,
                unit: "in"
            },
            height: {
                value: 11,
                unit: "in"
            }
        },
        "legal": {
            width: {
                value: 8.5,
                unit: "mm"
            },
            height: {
                value: 14,
                unit: "mm"
            }
        },
        "ledger": {
            width: {
                value: 11,
                unit: "mm"
            },
            height: {
                value: 17,
                unit: "mm"
            }
        }
    };

    class AtPage extends Handler {
        constructor(chunker, polisher, caller) {
            super(chunker, polisher, caller);

            this.pages = {};

            this.width = undefined;
            this.height = undefined;
            this.orientation = undefined;

            this.marginalia = {};
        }

        pageModel(selector) {
            return {
                selector: selector,
                name: undefined,
                psuedo: undefined,
                nth: undefined,
                marginalia: {},
                width: undefined,
                height: undefined,
                orientation: undefined,
                margin : {
                    top: {},
                    right: {},
                    left: {},
                    bottom: {}
                },
                block: {},
                marks: undefined
            };
        }

        // Find and Remove @page rules
        onAtPage(node, item, list) {
            let page, marginalia;
            let selector = "";
            let named, psuedo, nth;
            let needsMerge = false;

            if (node.prelude) {
                named = this.getTypeSelector(node);
                psuedo = this.getPsuedoSelector(node);
                nth = this.getNthSelector(node);
                selector = lib.generate(node.prelude);
            } else {
                selector = "*";
            }

            if (selector in this.pages) {
                // this.pages[selector] = Object.assign(this.pages[selector], page);
                // console.log("after", selector, this.pages[selector]);

                // this.pages[selector].added = false;
                page = this.pages[selector];
                marginalia = this.replaceMarginalia(node);
                needsMerge = true;
            } else {
                page = this.pageModel(selector);
                marginalia = this.replaceMarginalia(node);
                this.pages[selector] = page;
            }

            page.name = named;
            page.psuedo = psuedo;
            page.nth = nth;

            if (needsMerge) {
                page.marginalia = Object.assign(page.marginalia, marginalia);
            } else {
                page.marginalia = marginalia;
            }

            let declarations = this.replaceDeclartations(node);

            if (declarations.size) {
                page.size = declarations.size;
                page.width = declarations.size.width;
                page.height = declarations.size.height;
                page.orientation = declarations.size.orientation;
                page.format = declarations.size.format;
            }

            if (declarations.margin) {
                page.margin = declarations.margin;
            }

            if (declarations.marks) {
                page.marks = declarations.marks;
            }

            if (needsMerge) {
                page.block.children.appendList(node.block.children);
            } else {
                page.block = node.block;
            }

            // Remove the rule
            list.remove(item);
        }

        /* Handled in breaks */
        /*
        afterParsed(parsed) {
            for (let b in this.named) {
                // Find elements
                let elements = parsed.querySelectorAll(b);
                // Add break data
                for (var i = 0; i < elements.length; i++) {
                    elements[i].setAttribute("data-page", this.named[b]);
                }
            }
        }
        */

        afterTreeWalk(ast, sheet) {
            this.addPageClasses(this.pages, ast, sheet);

            if ("*" in this.pages) {
                let width = this.pages["*"].width;
                let height = this.pages["*"].height;
                let format = this.pages["*"].format;
                let orientation = this.pages["*"].orientation;

                if ((width && height) &&
                        (this.width !== width || this.height !== height)) {
                    this.width = width;
                    this.height = height;
                    this.format = format;
                    this.orientation = orientation;

                    this.addRootVars(ast, width, height, orientation);
                    this.addRootPage(ast, this.pages["*"].size);

                    this.emit("size", { width, height, orientation, format });
                }

            }
        }

        getTypeSelector(ast) {
            // Find page name
            let name;

            lib.walk(ast, {
                visit: "TypeSelector",
                enter: (node, item, list) => {
                    name = node.name;
                }
            });

            return name;
        }

        getPsuedoSelector(ast) {
            // Find if it has :left & :right & :black & :first
            let name;
            lib.walk(ast, {
                visit: "PseudoClassSelector",
                enter: (node, item, list) => {
                    if (node.name !== "nth") {
                        name = node.name;
                    }
                }
            });

            return name;
        }

        getNthSelector(ast) {
            // Find if it has :nth
            let nth;
            lib.walk(ast, {
                visit: "PseudoClassSelector",
                enter: (node, item, list) => {
                    if (node.name === "nth" && node.children) {
                        let raw = node.children.first();
                        nth = raw.value;
                    }
                }
            });

            return nth;
        }

        replaceMarginalia(ast) {
            let parsed = {};

            lib.walk(ast.block, {
                visit: "Atrule",
                enter: (node, item, list) => {
                    let name = node.name;
                    if (name === "top") {
                        name = "top-center";
                    }
                    if (name === "right") {
                        name = "right-middle";
                    }
                    if (name === "left") {
                        name = "left-middle";
                    }
                    if (name === "bottom") {
                        name = "bottom-center";
                    }
                    parsed[name] = node.block;
                    list.remove(item);
                }
            });

            return parsed;
        }

        replaceDeclartations(ast) {
            let parsed = {};

            lib.walk(ast.block, {
                visit: "Declaration",
                enter: (declaration, dItem, dList) => {
                    let prop = lib.property(declaration.property).name;
                    let value = declaration.value;
                    if (prop === "marks") {
                        parsed.marks = value.children.first().name;
                        dList.remove(dItem);
                    } else if (prop === "margin") {
                        parsed.margin = this.getMargins(declaration);
                        dList.remove(dItem);
                    } else if (prop.indexOf("margin-") === 0) {
                        let m = prop.substring("margin-".length);
                        if (!parsed.margin) {
                            parsed.margin = {
                                top: {},
                                right: {},
                                left: {},
                                bottom: {}
                            };
                        }
                        parsed.margin[m] = declaration.value.children.first();
                        dList.remove(dItem);
                    } else if (prop === "size") {
                        parsed.size = this.getSize(declaration);
                        dList.remove(dItem);
                    }

                }
            });

            return parsed;
        }

        getSize(declaration) {
            let width, height, orientation, format;

            // Get size: Xmm Ymm
            lib.walk(declaration, {
                visit: "Dimension",
                enter: (node, item, list) => {
                    let {value, unit} = node;
                    if (typeof width === "undefined") {
                        width = { value, unit };
                    } else if (typeof height === "undefined") {
                        height = { value, unit };
                    }
                }
            });

            // Get size: "A4"
            lib.walk(declaration, {
                visit: "String",
                enter: (node, item, list) => {
                    let name = node.value.replace(/["|']/g, "");
                    let s = pageSizes[name];
                    if (s) {
                        width = s.width;
                        height = s.height;
                    }
                }
            });

            // Get Format or Landscape or Portrait
            lib.walk(declaration, {
                visit: "Identifier",
                enter: (node, item, list) => {
                    let name = node.name;
                    if (name === "landscape" || name === "portrait") {
                        orientation = node.name;
                    } else if (name !== "auto") {
                        let s = pageSizes[name];
                        if (s) {
                            width = s.width;
                            height = s.height;
                        }
                        format = name;
                    }
                }
            });

            return {
                width,
                height,
                orientation,
                format
            };
        }

        getMargins(declaration) {
            let margins = [];
            let margin = {
                top: {},
                right: {},
                left: {},
                bottom: {}
            };

            lib.walk(declaration, {
                visit: "Dimension",
                enter: (node, item, list) => {
                    margins.push(node);
                }
            });

            if (margins.length === 1) {
                for (let m in margin) {
                    margin[m] = margins[0];
                }
            } else if (margins.length === 2) {
                margin.top = margins[0];
                margin.right = margins[1];
                margin.bottom = margins[0];
                margin.left = margins[1];
            } else if (margins.length === 3) {
                margin.top = margins[0];
                margin.right = margins[1];
                margin.bottom = margins[2];
                margin.left = margins[1];
            } else if (margins.length === 4) {
                margin.top = margins[0];
                margin.right = margins[1];
                margin.bottom = margins[2];
                margin.left = margins[3];
            }

            return margin;
        }

        addPageClasses(pages, ast, sheet) {
            // First add * page
            if ("*" in pages && !pages["*"].added) {
                let p = this.createPage(pages["*"], ast.children, sheet);
                sheet.insertRule(p);
                pages["*"].added = true;
            }
            // Add :left & :right
            if (":left" in pages && !pages[":left"].added) {
                let left = this.createPage(pages[":left"], ast.children, sheet);
                sheet.insertRule(left);
                pages[":left"].added = true;
            }
            if (":right" in pages && !pages[":right"].added) {
                let right = this.createPage(pages[":right"], ast.children, sheet);
                sheet.insertRule(right);
                pages[":right"].added = true;
            }
            // Add :first & :blank
            if (":first" in pages && !pages[":first"].first) {
                let first = this.createPage(pages[":first"], ast.children, sheet);
                sheet.insertRule(first);
                pages[":first"].added = true;
            }
            if (":blank" in pages && !pages[":blank"].added) {
                let blank = this.createPage(pages[":blank"], ast.children, sheet);
                sheet.insertRule(blank);
                pages[":blank"].added = true;
            }
            // Add nth pages
            for (let pg in pages) {
                if (pages[pg].nth && !pages[pg].added) {
                    let nth = this.createPage(pages[pg], ast.children, sheet);
                    sheet.insertRule(nth);
                    pages[pg].added = true;
                }
            }

            // Add named pages
            for (let pg in pages) {
                if (pages[pg].name && !pages[pg].added) {
                    let named = this.createPage(pages[pg], ast.children, sheet);
                    sheet.insertRule(named);
                    pages[pg].added = true;
                }
            }

        }

        createPage(page, ruleList, sheet) {

            let selectors = this.selectorsForPage(page);
            let children = page.block.children.copy();
            let block = {
                type: "Block",
                loc: 0,
                children: children
            };
            let rule = this.createRule(selectors, block);

            this.addMarginVars(page.margin, children, children.first());

            if (page.width) {
                this.addDimensions(page.width, page.height, page.orientation, children, children.first());
            }

            if (page.marginalia) {
                this.addMarginaliaStyles(page, ruleList, rule, sheet);
                this.addMarginaliaContent(page, ruleList, rule, sheet);
            }

            return rule;
        }

        addMarginVars(margin, list, item) {
            // variables for margins
            for (let m in margin) {
                if (typeof margin[m].value !== "undefined") {
                    let value = margin[m].value + (margin[m].unit || "");
                    let mVar = list.createItem({
                        type: "Declaration",
                        property: "--margin-" + m,
                        value: {
                            type: "Raw",
                            value: value
                        }
                    });
                    list.append(mVar, item);
                }
            }
        }

        addDimensions(width, height, orientation, list, item) {

            let outputWidth, outputHeight;
            if (!orientation || orientation === "portrait") {
                outputWidth = width;
                outputHeight = height;
            } else {
                outputWidth = height;
                outputHeight = width;
            }

            // width variable
            let wVar = this.createVariable("--width", outputWidth.value + (outputWidth.unit || ""));
            list.appendData(wVar);

            // height variable
            let hVar = this.createVariable("--height", outputHeight.value + (outputHeight.unit || ""));
            list.appendData(hVar);

            // width dimension
            let w = this.createDimension("width", outputWidth.value, outputWidth.unit);
            list.appendData(w);

            // height dimension
            let h = this.createDimension("height", outputHeight.value, outputHeight.unit);
            list.appendData(h);

        }

        addMarginaliaStyles(page, list, item, sheet) {
            for (let loc in page.marginalia) {
                let block = lib.clone(page.marginalia[loc]);
                let hasContent$$1 = false;

                if(block.children.isEmpty()) {
                    continue;
                }

                lib.walk(block, {
                    visit: "Declaration",
                    enter: (node, item, list) => {
                        if (node.property === "content") {
                            if (node.value.children && node.value.children.first().name === "none") {
                                hasContent$$1 = false;
                            } else {
                                hasContent$$1 = true;
                            }
                            list.remove(item);
                        }
                        if (node.property === "vertical-align") {
                            lib.walk(node, {
                                visit: "Identifier",
                                enter: (identNode, identItem, identlist) => {
                                    let name = identNode.name;
                                    if (name === "top") {
                                        identNode.name = "flex-start";
                                    } else if (name === "middle") {
                                        identNode.name = "center";
                                    } else if (name === "bottom") {
                                        identNode.name = "flex-end";
                                    }
                                }
                            });
                            node.property = "align-items";
                        }

                        if (node.property === "width" &&
                            (loc === "top-left" ||
                             loc === "top-center" ||
                             loc === "top-right" ||
                             loc === "bottom-left" ||
                             loc === "bottom-center" ||
                             loc === "bottom-right")) {
                            let c = lib.clone(node);
                            c.property = "max-width";
                            list.appendData(c);
                        }

                        if (node.property === "height" &&
                            (loc === "left-top" ||
                             loc === "left-middle" ||
                             loc === "left-bottom" ||
                             loc === "right-top" ||
                             loc === "right-middle" ||
                             loc === "right-bottom")) {
                            let c = lib.clone(node);
                            c.property = "max-height";
                            list.appendData(c);
                        }
                    }
                });

                let marginSelectors = this.selectorsForPageMargin(page, loc);
                let marginRule = this.createRule(marginSelectors, block);

                list.appendData(marginRule);

                let sel = lib.generate({
                    type: "Selector",
                    children: marginSelectors
                });

                this.marginalia[sel] = {
                    page: page,
                    selector: sel,
                    block: page.marginalia[loc],
                    hasContent: hasContent$$1
                };

            }
        }

        addMarginaliaContent(page, list, item, sheet) {
            let displayNone;
            // Just content
            for (let loc in page.marginalia) {
                let content = lib.clone(page.marginalia[loc]);
                lib.walk(content, {
                    visit: "Declaration",
                    enter: (node, item, list) => {
                        if (node.property !== "content") {
                            list.remove(item);
                        }

                        if (node.value.children && node.value.children.first().name === "none") {
                            displayNone = true;
                        }
                    }
                });

                if(content.children.isEmpty()) {
                    continue;
                }

                let displaySelectors = this.selectorsForPageMargin(page, loc);
                let displayDeclaration;

                displaySelectors.insertData({
                    type: "Combinator",
                    name: ">"
                });

                displaySelectors.insertData({
                    type: "ClassSelector",
                    name: "pagedjs_margin-content"
                });

                displaySelectors.insertData({
                    type: "Combinator",
                    name: ">"
                });

                displaySelectors.insertData({
                    type: "TypeSelector",
                    name: "*"
                });

                if (displayNone) {
                    displayDeclaration = this.createDeclaration("display", "none");
                } else {
                    displayDeclaration = this.createDeclaration("display", "block");
                }

                let displayRule = this.createRule(displaySelectors, [displayDeclaration]);
                sheet.insertRule(displayRule);

                // insert content rule
                let contentSelectors = this.selectorsForPageMargin(page, loc);

                contentSelectors.insertData({
                    type: "Combinator",
                    name: ">"
                });

                contentSelectors.insertData({
                    type: "ClassSelector",
                    name: "pagedjs_margin-content"
                });

                contentSelectors.insertData({
                    type: "PseudoElementSelector",
                    name: "after",
                    children: null
                });

                let contentRule = this.createRule(contentSelectors, content);
                sheet.insertRule(contentRule);
            }
        }

        addRootVars(ast, width, height, orientation) {
            let selectors = new lib.List();
            selectors.insertData({
                type: "PseudoClassSelector",
                name: "root",
                children: null
            });

            // orientation variable
            let oVar = this.createVariable("--orientation", orientation || "");

            let widthString, heightString;
            if (!orientation || orientation === "portrait") {
                widthString = width.value + (width.unit || "");
                heightString = height.value + (height.unit || "");
            } else {
                widthString = height.value + (height.unit || "");
                heightString = width.value + (width.unit || "");
            }

            let wVar = this.createVariable("--width", widthString);
            let hVar = this.createVariable("--height", heightString);
            let rule = this.createRule(selectors, [wVar, hVar, oVar]);

            ast.children.appendData(rule);
        }

        /*
        @page {
            size: var(--width) var(--height);
            margin: 0;
            padding: 0;
        }
        */
        addRootPage(ast, size) {
            let { width, height, orientation, format } = size;
            let children = new lib.List();
            let dimensions = new lib.List();

            if (format) {
                dimensions.appendData({
                    type: "Identifier",
                    name: format
                });

                if (orientation) {
                    dimensions.appendData({
                        type: "WhiteSpace",
                        value: " "
                    });

                    dimensions.appendData({
                        type: "Identifier",
                        name: orientation
                    });
                }
            } else {
                dimensions.appendData({
                    type: "Dimension",
                    unit: width.unit,
                    value: width.value
                });

                dimensions.appendData({
                    type: "WhiteSpace",
                    value: " "
                });

                dimensions.appendData({
                    type: "Dimension",
                    unit: height.unit,
                    value: height.value
                });
            }

            children.appendData({
                type: "Declaration",
                property: "size",
                loc: null,
                value: {
                    type: "Value",
                    children: dimensions
                }
            });

            children.appendData({
                type: "Declaration",
                property: "margin",
                loc: null,
                value: {
                    type: "Value",
                    children: [{
                        type: "Dimension",
                        unit: "px",
                        value: 0
                    }]
                }
            });

            children.appendData({
                type: "Declaration",
                property: "padding",
                loc: null,
                value: {
                    type: "Value",
                    children: [{
                        type: "Dimension",
                        unit: "px",
                        value: 0
                    }]
                }
            });


            let rule = ast.children.createItem({
                type: "Atrule",
                prelude: null,
                name: "page",
                block: {
                    type: "Block",
                    loc: null,
                    children: children
                }
            });

            ast.children.append(rule);
        }

        getNth(nth) {
            let n = nth.indexOf("n");
            let plus = nth.indexOf("+");
            let splitN = nth.split("n");
            let splitP = nth.split("+");
            let a = null;
            let b = null;
            if (n > -1) {
                a = splitN[0];
                if (plus > -1) {
                    b = splitP[1];
                }
            } else {
                b = nth;
            }

            return {
                type: "Nth",
                loc: null,
                selector: null,
                nth: {
                    type: "AnPlusB",
                    loc: null,
                    a: a,
                    b: b
                }
            };
        }

        addPageAttributes(page, start, pages) {
            let named = start.dataset.page;

            if (named) {
                page.name = named;
                page.element.classList.add("pagedjs_named_page");
                page.element.classList.add("pagedjs_" + named + "_page");

                if (!start.dataset.splitFrom) {
                    page.element.classList.add("pagedjs_" + named + "_first_page");
                }
            }
        }

        getStartElement(content, breakToken) {
            let node = breakToken && breakToken.node;

            if (!content && !breakToken) {
                return;
            }

            // No break
            if (!node) {
                return content.children[0];
            }

            // Top level element
            if (node.nodeType === 1 && node.parentNode.nodeType === 11) {
                return node;
            }

            // Named page
            if (node.nodeType === 1 && node.dataset.page) {
                return node;
            }

            // Get top level Named parent
            let fragment = rebuildAncestors(node);
            let pages = fragment.querySelectorAll("[data-page]");

            if (pages.length) {
                return pages[pages.length - 1];
            } else {
                return fragment.children[0];
            }
        }

        beforePageLayout(page, contents, breakToken, chunker) {
            let start = this.getStartElement(contents, breakToken);
            if (start) {
                this.addPageAttributes(page, start, chunker.pages);
            }
        }

        afterPageLayout(fragment, page, breakToken, chunker) {
            for (let m in this.marginalia) {
                let margin = this.marginalia[m];
                let sels = m.split(" ");

                let content;
                if (page.element && page.element.matches(sels[0]) && margin.hasContent) {
                    content = page.element.querySelector(sels[1]);
                    content.classList.add("hasContent");
                }
            }

            // check center
            ["top", "bottom"].forEach((loc) => {
                if (page.element) {
                    let marginGroup = page.element.querySelector(".pagedjs_margin-" + loc);
                    let center = page.element.querySelector(".pagedjs_margin-" + loc + "-center");
                    let left = page.element.querySelector(".pagedjs_margin-" + loc + "-left");
                    let right = page.element.querySelector(".pagedjs_margin-" + loc + "-right");

                    let centerContent = center.classList.contains("hasContent");
                    let leftContent = left.classList.contains("hasContent");
                    let rightContent = right.classList.contains("hasContent");
                    let centerWidth, leftWidth, rightWidth;

                    if (leftContent) {
                        leftWidth = window.getComputedStyle(left)["max-width"];
                    }

                    if (rightContent) {
                        rightWidth = window.getComputedStyle(right)["max-width"];
                    }


                    if (centerContent) {
                        centerWidth = window.getComputedStyle(center)["max-width"];

                        if(centerWidth === "none" || centerWidth === "auto") {
                            if(!leftContent && !rightContent){
                                marginGroup.style["grid-template-columns"] = "0 1fr 0";
                            }else if(leftContent){
                                if(!rightContent){
                                    if(leftWidth !== "none" && leftWidth !== "auto"){
                                        marginGroup.style["grid-template-columns"] = leftWidth + " 1fr " + leftWidth;
                                    }else{
                                        marginGroup.style["grid-template-columns"] = "auto auto 1fr";
                                        left.style["white-space"] = "nowrap";
                                        center.style["white-space"] = "nowrap";
                                        let leftOuterWidth = left.offsetWidth;
                                        let centerOuterWidth = center.offsetWidth;
                                        let outerwidths = leftOuterWidth + centerOuterWidth;
                                        let newcenterWidth = centerOuterWidth * 100 / outerwidths;
                                        marginGroup.style["grid-template-columns"] = "minmax(16.66%, 1fr) minmax(33%, " + newcenterWidth + "%) minmax(16.66%, 1fr)";
                                        left.style["white-space"] = "normal";
                                        center.style["white-space"] = "normal";
                                    }
                                }else{
                                    if(leftWidth !== "none" && leftWidth !== "auto"){
                                        if(rightWidth !== "none" && rightWidth !== "auto"){
                                            marginGroup.style["grid-template-columns"] = leftWidth + " 1fr " + rightWidth;
                                        }else{
                                            marginGroup.style["grid-template-columns"] = leftWidth + " 1fr " + leftWidth;
                                        }
                                    }else{
                                        if(rightWidth !== "none" && rightWidth !== "auto"){
                                            marginGroup.style["grid-template-columns"] = rightWidth + " 1fr " + rightWidth;
                                        }else{
                                            marginGroup.style["grid-template-columns"] = "auto auto 1fr";
                                            left.style["white-space"] = "nowrap";
                                            center.style["white-space"] = "nowrap";
                                            right.style["white-space"] = "nowrap";
                                            let leftOuterWidth = left.offsetWidth;
                                            let centerOuterWidth = center.offsetWidth;
                                            let rightOuterWidth = right.offsetWidth;
                                            let outerwidths = leftOuterWidth + centerOuterWidth + rightOuterWidth;
                                            let newcenterWidth = centerOuterWidth * 100 / outerwidths;
                                            if(newcenterWidth > 40){
                                                marginGroup.style["grid-template-columns"] = "minmax(16.66%, 1fr) minmax(33%, " + newcenterWidth + "%) minmax(16.66%, 1fr)";
                                            }else{
                                                marginGroup.style["grid-template-columns"] = "repeat(3, 1fr)";
                                            }
                                            left.style["white-space"] = "normal";
                                            center.style["white-space"] = "normal";
                                            right.style["white-space"] = "normal";
                                        }
                                    }
                                }
                            }else{
                                if(rightWidth !== "none" && rightWidth !== "auto"){
                                    marginGroup.style["grid-template-columns"] = rightWidth + " 1fr " + rightWidth;
                                }else{
                                    marginGroup.style["grid-template-columns"] = "auto auto 1fr";
                                    right.style["white-space"] = "nowrap";
                                    center.style["white-space"] = "nowrap";
                                    let rightOuterWidth = right.offsetWidth;
                                    let centerOuterWidth = center.offsetWidth;
                                    let outerwidths = rightOuterWidth + centerOuterWidth;
                                    let newcenterWidth = centerOuterWidth * 100 / outerwidths;
                                    marginGroup.style["grid-template-columns"] = "minmax(16.66%, 1fr) minmax(33%, " + newcenterWidth + "%) minmax(16.66%, 1fr)";
                                    right.style["white-space"] = "normal";
                                    center.style["white-space"] = "normal";
                                }
                            }
                        }else if(centerWidth !== "none" && centerWidth !== "auto"){
                            if(leftContent && leftWidth !== "none" && leftWidth !== "auto"){
                                marginGroup.style["grid-template-columns"] = leftWidth + " " + centerWidth + " 1fr";
                            }else if(rightContent && rightWidth !== "none" && rightWidth !== "auto"){
                                marginGroup.style["grid-template-columns"] = "1fr " + centerWidth + " " + rightWidth;
                            }else{
                                marginGroup.style["grid-template-columns"] = "1fr " + centerWidth + " 1fr";
                            }

                        }

                    }else{
                        if(leftContent){
                            if(!rightContent){
                                marginGroup.style["grid-template-columns"] = "1fr 0 0";
                            }else{
                                if(leftWidth !== "none" && leftWidth !== "auto"){
                                    if(rightWidth !== "none" && rightWidth !== "auto"){
                                        marginGroup.style["grid-template-columns"] = leftWidth + " 1fr " + rightWidth;
                                    }else{
                                        marginGroup.style["grid-template-columns"] = leftWidth + " 0 1fr";
                                    }
                                }else{
                                    if(rightWidth !== "none" && rightWidth !== "auto"){
                                        marginGroup.style["grid-template-columns"] = "1fr 0 " + rightWidth;
                                    }else{
                                        marginGroup.style["grid-template-columns"] = "auto 1fr auto";
                                        left.style["white-space"] = "nowrap";
                                        right.style["white-space"] = "nowrap";
                                        let leftOuterWidth = left.offsetWidth;
                                        let rightOuterWidth = right.offsetWidth;
                                        let outerwidths = leftOuterWidth + rightOuterWidth;
                                        let newLeftWidth = leftOuterWidth * 100 / outerwidths;
                                        marginGroup.style["grid-template-columns"] = "minmax(16.66%, " + newLeftWidth  + "%) 0 1fr";
                                        left.style["white-space"] = "normal";
                                        right.style["white-space"] = "normal";
                                    }
                                }
                            }
                        }else{
                            if(rightWidth !== "none" && rightWidth !== "auto"){
                                marginGroup.style["grid-template-columns"] = "1fr 0 " + rightWidth;
                            }else{
                                marginGroup.style["grid-template-columns"] = "0 0 1fr";
                            }
                        }
                    }
                }
            });

            // check middle
            ["left", "right"].forEach((loc) => {
                if (page.element) {
                    let middle = page.element.querySelector(".pagedjs_margin-" + loc + "-middle.hasContent");
                    let marginGroup = page.element.querySelector(".pagedjs_margin-" + loc);
                    let top = page.element.querySelector(".pagedjs_margin-" + loc + "-top");
                    let bottom = page.element.querySelector(".pagedjs_margin-" + loc + "-bottom");
                    let topContent = top.classList.contains("hasContent");
                    let bottomContent = bottom.classList.contains("hasContent");
                    let middleHeight, topHeight, bottomHeight;

                    if (topContent) {
                        topHeight = window.getComputedStyle(top)["max-height"];
                    }

                    if (bottomContent) {
                        bottomHeight = window.getComputedStyle(bottom)["max-height"];
                    }

                    if (middle) {
                        middleHeight = window.getComputedStyle(middle)["max-height"];

                        if(middleHeight === "none" || middleHeight === "auto") {
                            if(!topContent && !bottomContent){
                                marginGroup.style["grid-template-rows"] = "0 1fr 0";
                            }else if(topContent){
                                if(!bottomContent){
                                    if(topHeight !== "none" && topHeight !== "auto"){
                                        marginGroup.style["grid-template-rows"] = topHeight + " calc(100% - " + topHeight + "*2) " + topHeight;
                                    }
                                }else{
                                    if(topHeight !== "none" && topHeight !== "auto"){
                                        if(bottomHeight !== "none" && bottomHeight !== "auto"){
                                            marginGroup.style["grid-template-rows"] = topHeight + " calc(100% - " + topHeight + " - " + bottomHeight + ") " + bottomHeight;
                                        }else{
                                            marginGroup.style["grid-template-rows"] = topHeight + " calc(100% - " + topHeight + "*2) " + topHeight;
                                        }
                                    }else{
                                        if(bottomHeight !== "none" && bottomHeight !== "auto"){
                                            marginGroup.style["grid-template-rows"] = bottomHeight + " calc(100% - " + bottomHeight + "*2) " + bottomHeight;
                                        }
                                    }
                                }
                            }else{
                                if(bottomHeight !== "none" && bottomHeight !== "auto"){
                                    marginGroup.style["grid-template-rows"] = bottomHeight + " calc(100% - " + bottomHeight + "*2) " + bottomHeight;
                                }
                            }
                        }else{
                            if(topContent && topHeight !== "none" && topHeight !== "auto"){
                                marginGroup.style["grid-template-rows"] = topHeight +" " + middleHeight + " calc(100% - (" + topHeight + " + " + middleHeight + "))";
                            }else if(bottomContent && bottomHeight !== "none" && bottomHeight !== "auto"){
                                marginGroup.style["grid-template-rows"] = "1fr " + middleHeight + " " + bottomHeight;
                            }else{
                                marginGroup.style["grid-template-rows"] = "calc((100% - " + middleHeight + ")/2) " + middleHeight + " calc((100% - " + middleHeight + ")/2)";
                            }

                        }

                    }else{
                        if(topContent){
                            if(!bottomContent){
                                marginGroup.style["grid-template-rows"] = "1fr 0 0";
                            }else{
                                if(topHeight !== "none" && topHeight !== "auto"){
                                    if(bottomHeight !== "none" && bottomHeight !== "auto"){
                                        marginGroup.style["grid-template-rows"] = topHeight + " 1fr " + bottomHeight;
                                    }else{
                                        marginGroup.style["grid-template-rows"] = topHeight + " 0 1fr";
                                    }
                                }else{
                                    if(bottomHeight !== "none" && bottomHeight !== "auto"){
                                        marginGroup.style["grid-template-rows"] = "1fr 0 " + bottomHeight;
                                    }else{
                                        marginGroup.style["grid-template-rows"] = "1fr 0 1fr";
                                    }
                                }
                            }
                        }else{
                            if(bottomHeight !== "none" && bottomHeight !== "auto"){
                                marginGroup.style["grid-template-rows"] = "1fr 0 " + bottomHeight;
                            }else{
                                marginGroup.style["grid-template-rows"] = "0 0 1fr";
                            }
                        }
                    }

                }


            });

        }

        // CSS Tree Helpers

        selectorsForPage(page) {
            let nthlist;
            let nth;

            let selectors = new lib.List();

            selectors.insertData({
                type: "ClassSelector",
                name: "pagedjs_page"
            });

            // Named page
            if (page.name) {
                selectors.insertData({
                    type: "ClassSelector",
                    name: "pagedjs_named_page"
                });

                selectors.insertData({
                    type: "ClassSelector",
                    name: "pagedjs_" + page.name + "_page"
                });
            }

            // PsuedoSelector
            if (page.psuedo && !(page.name && page.psuedo === "first")) {
                selectors.insertData({
                    type: "ClassSelector",
                    name: "pagedjs_" + page.psuedo + "_page"
                });
            }

            if (page.name && page.psuedo === "first") {
                selectors.insertData({
                    type: "ClassSelector",
                    name: "pagedjs_" + page.name + "_" + page.psuedo + "_page"
                });
            }

            // Nth
            if (page.nth) {
                nthlist = new lib.List();
                nth = this.getNth(page.nth);

                nthlist.insertData(nth);

                selectors.insertData({
                    type: "PseudoClassSelector",
                    name: "nth-of-type",
                    children: nthlist
                });
            }

            return selectors;
        }

        selectorsForPageMargin(page, margin) {
            let selectors = this.selectorsForPage(page);

            selectors.insertData({
                type: "Combinator",
                name: " "
            });

            selectors.insertData({
                type: "ClassSelector",
                name: "pagedjs_margin-" + margin
            });

            return selectors;
        }

        createDeclaration(property, value, important) {
            let children = new lib.List();

            children.insertData({
                type: "Identifier",
                loc: null,
                name: value
            });

            return {
                type: "Declaration",
                loc: null,
                important: important,
                property: property,
                value: {
                    type: "Value",
                    loc: null,
                    children: children
                }
            };
        }

        createVariable(property, value) {
            return {
                type: "Declaration",
                loc: null,
                property: property,
                value: {
                    type: "Raw",
                    value: value
                }
            };
        }

        createDimension(property, value, unit, important) {
            let children = new lib.List();

            children.insertData({
                type: "Dimension",
                loc: null,
                value: value,
                unit: unit
            });

            return {
                type: "Declaration",
                loc: null,
                important: important,
                property: property,
                value: {
                    type: "Value",
                    loc: null,
                    children: children
                }
            };
        }

        createBlock(declarations) {
            let block = new lib.List();

            declarations.forEach((declaration) => {
                block.insertData(declaration);
            });

            return {
                type: "Block",
                loc: null,
                children: block
            };
        }

        createRule(selectors, block) {
            let selectorList = new lib.List();
            selectorList.insertData({
                type: "Selector",
                children: selectors
            });

            if (Array.isArray(block)) {
                block = this.createBlock(block);
            }

            return {
                type: "Rule",
                prelude: {
                    type: "SelectorList",
                    children: selectorList
                },
                block: block
            };
        }

    }

    class Breaks extends Handler {
        constructor(chunker, polisher, caller) {
            super(chunker, polisher, caller);

            this.breaks = {};
        }

        onDeclaration(declaration, dItem, dList, rule) {
            let property = declaration.property;

            if (property === "page") {
                let children = declaration.value.children.first();
                let value = children.name;
                let selector = lib.generate(rule.ruleNode.prelude);
                let name = value;

                let breaker = {
                    property: property,
                    value: value,
                    selector: selector,
                    name: name
                };

                selector.split(",").forEach((s) => {
                    if (!this.breaks[s]) {
                        this.breaks[s] = [breaker];
                    } else {
                        this.breaks[s].push(breaker);
                    }
                });

                dList.remove(dItem);
            }

            if (property === "break-before" ||
                    property === "break-after" ||
                    property === "page-break-before" ||
                    property === "page-break-after"
            ) {
                let child$$1 = declaration.value.children.first();
                let value = child$$1.name;
                let selector = lib.generate(rule.ruleNode.prelude);

                if (property === "page-break-before") {
                    property = "break-before";
                } else if (property === "page-break-after") {
                    property = "break-after";
                }

                let breaker = {
                    property: property,
                    value: value,
                    selector: selector
                };

                selector.split(",").forEach((s) => {
                    if (!this.breaks[s]) {
                        this.breaks[s] = [breaker];
                    } else {
                        this.breaks[s].push(breaker);
                    }
                });

                // Remove from CSS -- handle right / left in module
                dList.remove(dItem);
            }
        }

        afterParsed(parsed) {
            this.processBreaks(parsed, this.breaks);
        }

        processBreaks(parsed, breaks) {
            for (let b in breaks) {
                // Find elements
                let elements = parsed.querySelectorAll(b);
                // Add break data
                for (var i = 0; i < elements.length; i++) {
                    for (let prop of breaks[b]) {

                        if (prop.property === "break-after") {
                            let nodeAfter$$1 = elementAfter(elements[i], parsed);

                            elements[i].setAttribute("data-break-after", prop.value);

                            if (nodeAfter$$1) {
                                nodeAfter$$1.setAttribute("data-previous-break-after", prop.value);
                            }
                        } else if (prop.property === "page") {
                            elements[i].setAttribute("data-page", prop.value);

                            let nodeAfter$$1 = elementAfter(elements[i], parsed);

                            if (nodeAfter$$1) {
                                nodeAfter$$1.setAttribute("data-after-page", prop.value);
                            }
                        } else {
                            elements[i].setAttribute("data-" + prop.property, prop.value);
                        }
                    }
                }
            }
        }

        mergeBreaks(pageBreaks, newBreaks) {
            for (let b in newBreaks) {
                if (b in pageBreaks) {
                    pageBreaks[b] = pageBreaks[b].concat(newBreaks[b]);
                } else {
                    pageBreaks[b] = newBreaks[b];
                }
            }
            return pageBreaks;
        }

        addBreakAttributes(pageElement, page) {
            if (page.element) {
                let before = pageElement.querySelector("[data-break-before]");
                let after = pageElement.querySelector("[data-break-after]");
                let previousBreakAfter = pageElement.querySelector("[data-previous-break-after]");

                if (before) {
                    if (before.dataset.splitFrom) {
                        page.splitFrom = before.dataset.splitFrom;
                        pageElement.setAttribute("data-split-from", before.dataset.splitFrom);
                    } else if (before.dataset.breakBefore && before.dataset.breakBefore !== "avoid") {
                        page.breakBefore = before.dataset.breakBefore;
                        pageElement.setAttribute("data-break-before", before.dataset.breakBefore);
                    }
                }

                if (after && after.dataset) {
                    if (after.dataset.splitTo) {
                        page.splitTo = after.dataset.splitTo;
                        pageElement.setAttribute("data-split-to", after.dataset.splitTo);
                    } else if (after.dataset.breakAfter && after.dataset.breakAfter !== "avoid") {
                        page.breakAfter = after.dataset.breakAfter;
                        pageElement.setAttribute("data-break-after", after.dataset.breakAfter);
                    }
                }

                if (previousBreakAfter && previousBreakAfter.dataset) {
                    if (previousBreakAfter.dataset.previousBreakAfter && previousBreakAfter.dataset.previousBreakAfter !== "avoid") {
                        page.previousBreakAfter = previousBreakAfter.dataset.previousBreakAfter;
                    }
                }
            }
        }

        afterPageLayout(pageElement, page) {
            this.addBreakAttributes(pageElement, page);
        }
    }

    class PrintMedia extends Handler {
        constructor(chunker, polisher, caller) {
            super(chunker, polisher, caller);
        }

        onAtMedia(node, item, list) {
            let media = this.getMediaName(node);
            let rules;

            if (media === "print") {
                rules = node.block.children;

                // Remove rules from the @media block
                node.block.children = new lib.List();

                // Append rules to the end of main rules list
                list.appendList(rules);
            }

        }

        getMediaName(node) {
            let media = "";

            if (typeof node.prelude === "undefined" ||
                    node.prelude.type !== "AtrulePrelude" ) {
                return;
            }

            lib.walk(node.prelude, {
                visit: "Identifier",
                enter: (identNode, iItem, iList) => {
                    media = identNode.name;
                }
            });
            return media;
        }


    }

    class Splits extends Handler {
        constructor(chunker, polisher, caller) {
            super(chunker, polisher, caller);
        }

        afterPageLayout(pageElement, page, breakToken, chunker) {
            if (page.element) {
                let splits = Array.from(pageElement.querySelectorAll("[data-split-from]"));
                let pages = pageElement.parentNode;
                let index = Array.prototype.indexOf.call(pages.children, pageElement);
                let prevPage;

                if (index === 0) {
                    return;
                }

                prevPage = pages.children[index - 1];

                splits.forEach((split) => {
                    let ref = split.dataset.ref;
                    let from = prevPage.querySelector("[data-ref='"+ ref +"']:not([data-split-to])");

                    if (from) {
                        from.dataset.splitTo = ref;

                        if (!from.dataset.splitFrom) {
                            from.dataset.splitOriginal = true;
                        }

                        this.handleAlignment(from);
                    }
                });
            }
        }

        handleAlignment(node) {
            let styles = window.getComputedStyle(node);
            let align = styles["text-align"];
            let alignLast = styles["text-align-last"];
            if (align === "justify" && alignLast === "auto") {
                node.style["text-align-last"] = "justify";
            }
        }

    }

    class Counters extends Handler {
        constructor(chunker, polisher, caller) {
            super(chunker, polisher, caller);

            this.styleSheet = polisher.styleSheet;
            this.counters = {};
        }

        onDeclaration(declaration, dItem, dList, rule) {
            let property = declaration.property;

            if (property === "counter-increment") {
                let inc = this.handleIncrement(declaration, rule);
                if (inc) {
                    dList.remove(dItem);
                }
            } else if (property === "counter-reset") {
                let reset = this.handleReset(declaration, rule);
                if (reset) {
                    dList.remove(dItem);
                }
            }
        }

        onContent(funcNode, fItem, fList, declaration, rule) {
            if (funcNode.name === "counter") ;
        }

        afterParsed(parsed) {
            this.processCounters(parsed, this.counters);
        }

        addCounter(name) {
            if (name in this.counters) {
                return this.counters[name];
            }

            this.counters[name] = {
                name: name,
                increments: {},
                resets: {}
            };

            return this.counters[name];
        }

        handleIncrement(declaration, rule) {
            let identifier = declaration.value.children.first();
            let number = declaration.value.children.getSize() > 1
                                && declaration.value.children.last().value;
            let name = identifier && identifier.name;

            if (name === "page" || name.indexOf("target-counter-") === 0) {
                return;
            }

            let selector = lib.generate(rule.ruleNode.prelude);

            let counter;
            if (!(name in this.counters)) {
                counter = this.addCounter(name);
            } else {
                counter = this.counters[name];
            }

            return counter.increments[selector] = {
                selector: selector,
                number: number || 1
            };
        }

        handleReset(declaration, rule) {
            let identifier = declaration.value.children.first();
            let number = declaration.value.children.getSize() > 1
                                && declaration.value.children.last().value;
            let name = identifier && identifier.name;
            let selector = lib.generate(rule.ruleNode.prelude);
            let counter;

            if (!(name in this.counters)) {
                counter = this.addCounter(name);
            } else {
                counter = this.counters[name];
            }

            return counter.resets[selector] = {
                selector: selector,
                number: number || 0
            };
        }

        processCounters(parsed, counters) {
            let counter;
            for (let c in counters) {
                counter = this.counters[c];
                this.processCounterIncrements(parsed, counter);
                this.processCounterResets(parsed, counter);
                this.addCounterValues(parsed, counter);
            }
        }

        processCounterIncrements(parsed, counter) {
            let increment;
            for (let inc in counter.increments) {
                increment = counter.increments[inc];
                // Find elements for increments
                let incrementElements = parsed.querySelectorAll(increment.selector);
                // Add counter data
                for (var i = 0; i < incrementElements.length; i++) {
                    incrementElements[i].setAttribute("data-counter-"+ counter.name +"-increment", increment.number);
                }
            }
        }

        processCounterResets(parsed, counter) {
            let reset;
            for (let r in counter.resets) {
                reset = counter.resets[r];
                // Find elements for resets
                let resetElements = parsed.querySelectorAll(reset.selector);
                // Add counter data
                for (var i = 0; i < resetElements.length; i++) {
                    resetElements[i].setAttribute("data-counter-"+ counter.name +"-reset", reset.number);
                }
            }
        }

        addCounterValues(parsed, counter) {
            let counterName = counter.name;
            let elements = parsed.querySelectorAll("[data-counter-"+ counterName +"-reset], [data-counter-"+ counterName +"-increment]");

            let count = 0;
            let element;
            let increment, reset;

            for (var i = 0; i < elements.length; i++) {
                element = elements[i];

                if (element.hasAttribute("data-counter-"+ counterName +"-reset")) {
                    reset = element.getAttribute("data-counter-"+ counterName +"-reset");
                    count = parseInt(reset);
                }

                if (element.hasAttribute("data-counter-"+ counterName +"-increment")) {

                    increment = element.getAttribute("data-counter-"+ counterName +"-increment");

                    this.styleSheet.insertRule(`[data-ref="${element.dataset.ref}"] { counter-reset: ${counterName} ${count} }`, this.styleSheet.cssRules.length);
                    this.styleSheet.insertRule(`[data-ref="${element.dataset.ref}"] { counter-increment: ${counterName} ${increment}}`, this.styleSheet.cssRules.length);

                    count += parseInt(increment);

                    element.setAttribute("data-counter-"+counterName+"-value", count);
                }

            }
        }

        afterPageLayout(pageElement, page) {
            if (pageElement) {
                let pgreset = pageElement.querySelectorAll("[data-counter-page-reset]");
                pgreset.forEach((reset) => {
                    let value = reset.datasetCounterPageReset;
                    this.styleSheet.insertRule(`[data-page-number="${pageElement.dataset.pageNumber}"] { counter-reset: page ${value} }`, this.styleSheet.cssRules.length);
                });
            }
        }

    }

    class Lists extends Handler {
        constructor(chunker, polisher, caller) {
            super(chunker, polisher, caller);
        }
        afterParsed(content) {
            const orderedLists = content.querySelectorAll("ol");

            for (var list of orderedLists) {
                this.addDataNumbers(list);
            }
        }

        afterPageLayout(pageElement, page, breakToken, chunker) {
            if (pageElement) {
                var orderedLists = pageElement.getElementsByTagName("ol");
                for (var list of orderedLists) {
                    list.start = list.firstElementChild.dataset.itemNum;
                }
            }
        }

        addDataNumbers(list) {
            let items = list.children;
            for (var i = 0; i < items.length; i++) {
                items[i].setAttribute("data-item-num", i + 1);
            }
        }

    }

    var pagedMediaHandlers = [
        AtPage,
        Breaks,
        PrintMedia,
        Splits,
        Counters,
        Lists
    ];

    class RunningHeaders extends Handler {
        constructor(chunker, polisher, caller) {
            super(chunker, polisher, caller);

            this.runningSelectors = {};
            this.elements = {};
        }

        onDeclaration(declaration, dItem, dList, rule) {
            if (declaration.property === "position") {
                let selector = lib.generate(rule.ruleNode.prelude);
                let identifier = declaration.value.children.first().name;

                if (identifier === "running") {
                    let value;
                    lib.walk(declaration, {
                        visit: "Function",
                        enter: (node, item, list) => {
                            value = node.children.first().name;
                        }
                    });

                    this.runningSelectors[value] = {
                        identifier: identifier,
                        value: value,
                        selector: selector
                    };
                }
            }

            if (declaration.property === "content") {

                lib.walk(declaration, {
                    visit: "Function",
                    enter: (funcNode, fItem, fList) => {

                        if (funcNode.name.indexOf("element") > -1) {

                            let selector = lib.generate(rule.ruleNode.prelude);

                            let func = funcNode.name;

                            let value = funcNode.children.first().name;

                            let args = [value];

                            // we only handle first for now
                            let style = "first";

                            selector.split(",").forEach((s) => {
                                // remove before / after
                                s = s.replace(/::after|::before/, "");

                                this.elements[s] = {
                                    func: func,
                                    args: args,
                                    value: value,
                                    style: style,
                                    selector: s,
                                    fullSelector: selector
                                };
                            });
                        }

                    }
                });
            }
        }

        afterParsed(fragment) {
            for (let name of Object.keys(this.runningSelectors)) {
                let set = this.runningSelectors[name];
                let selected = Array.from(fragment.querySelectorAll(set.selector));

                if (set.identifier === "running") {
                    for (let header of selected) {
                        header.style.display = "none";
                    }
                }

            }
        }

        afterPageLayout(fragment) {
            if (fragment) {
                for (let name of Object.keys(this.runningSelectors)) {
                    let set = this.runningSelectors[name];
                    let selected = fragment.querySelector(set.selector);
                    if (selected) {
                        // let cssVar;
                        if (set.identifier === "running") {
                            // cssVar = selected.textContent.replace(/\\([\s\S])|(["|'])/g,"\\$1$2");
                            // this.styleSheet.insertRule(`:root { --string-${name}: "${cssVar}"; }`, this.styleSheet.cssRules.length);
                            // fragment.style.setProperty(`--string-${name}`, `"${cssVar}"`);
                            set.first = selected;
                        } else {
                            console.warn(set.value + "needs css replacement");
                        }
                    }
                }

                // move elements
                if (!this.orderedSelectors) {
                    this.orderedSelectors = this.orderSelectors(this.elements);
                }

                for (let selector of this.orderedSelectors) {
                    if (selector) {

                        let el = this.elements[selector];
                        let selected = fragment.querySelector(selector);
                        if (selected) {
                            let running = this.runningSelectors[el.args[0]];
                            if (running && running.first) {
                                selected.innerHTML = ""; // Clear node
                                // selected.classList.add("pagedjs_clear-after"); // Clear ::after
                                let clone = running.first.cloneNode(true);
                                clone.style.display = null;
                                selected.appendChild(clone);
                            }
                        }
                    }
                }
            }
        }

        /**
        * Assign a weight to @page selector classes
        * 1) page
        * 2) left & right
        * 3) blank
        * 4) first & nth
        * 5) named page
        * 6) named left & right
        * 7) named first & nth
        * @param {string} [s] selector string
        * @return {int} weight
        */
        pageWeight(s) {
            let weight = 1;
            let selector = s.split(" ");
            let parts = selector.length && selector[0].split(".");

            parts.shift(); // remove empty first part

            switch (parts.length) {
                case 4:
                    if (parts[3] === "pagedjs_first_page") {
                        weight = 7;
                    } else if (parts[3] === "pagedjs_left_page" || parts[3] === "pagedjs_right_page") {
                        weight = 6;
                    }
                    break;
                case 3:
                    if (parts[1] === "pagedjs_named_page") {
                        if (parts[2].indexOf(":nth-of-type") > -1) {
                            weight = 7;
                        } else {
                            weight = 5;
                        }
                    }
                    break;
                case 2:
                    if (parts[1] === "pagedjs_first_page") {
                        weight = 4;
                    } else if (parts[1] === "pagedjs_blank_page") {
                        weight = 3;
                    } else if (parts[1] === "pagedjs_left_page" || parts[1] === "pagedjs_right_page") {
                        weight = 2;
                    }
                    break;
                default:
                    if (parts[0].indexOf(":nth-of-type") > -1) {
                        weight = 4;
                    } else {
                        weight = 1;
                    }
            }

            return weight;
        }

        /**
        * Orders the selectors based on weight
        *
        * Does not try to deduplicate base on specifity of the selector
        * Previous matched selector will just be overwritten
        * @param {obj} [obj] selectors object
        * @return {Array} orderedSelectors
        */
        orderSelectors(obj) {
            let selectors = Object.keys(obj);
            let weighted = {
                1: [],
                2: [],
                3: [],
                4: [],
                5: [],
                6: [],
                7: []
            };

            let orderedSelectors = [];

            for (let s of selectors) {
                let w = this.pageWeight(s);
                weighted[w].unshift(s);
            }

            for (var i = 1; i <= 7; i++) {
                orderedSelectors = orderedSelectors.concat(weighted[i]);
            }

            return orderedSelectors;
        }

        beforeTreeParse(text, sheet) {
            // element(x) is parsed as image element selector, so update element to element-ident
            sheet.text = text.replace(/element[\s]*\(([^|^#)]*)\)/g, "element-ident($1)");
        }
    }

    class StringSets extends Handler {
        constructor(chunker, polisher, caller) {
            super(chunker, polisher, caller);

            this.stringSetSelectors = {};
        }

        onDeclaration(declaration, dItem, dList, rule) {
            if (declaration.property === "string-set") {
                let selector = lib.generate(rule.ruleNode.prelude);

                let identifier = declaration.value.children.first().name;

                let value;
                lib.walk(declaration, {
                    visit: "Function",
                    enter: (node, item, list) => {
                        value = lib.generate(node);
                    }
                });

                this.stringSetSelectors[identifier] = {
                    identifier: identifier,
                    value: value,
                    selector: selector
                };
            }
        }

        onContent(funcNode, fItem, fList, declaration, rule) {
            if (funcNode.name === "string") {
                let identifier = funcNode.children && funcNode.children.first().name;
                funcNode.name = "var";
                funcNode.children = new lib.List();

                funcNode.children.append(funcNode.children.createItem({
                    type: "Identifier",
                    loc: null,
                    name: "--string-" + identifier
                }));
            }
        }

        afterPageLayout(fragment) {
            for (let name of Object.keys(this.stringSetSelectors)) {
                let set = this.stringSetSelectors[name];
                let selected = fragment.querySelector(set.selector);
                if (selected) {
                    let cssVar;
                    if (set.value === "content" || set.value === "content()" || set.value === "content(text)") {
                        cssVar = selected.textContent.replace(/\\([\s\S])|(["|'])/g,"\\$1$2");
                        // this.styleSheet.insertRule(`:root { --string-${name}: "${cssVar}"; }`, this.styleSheet.cssRules.length);
                        // fragment.style.setProperty(`--string-${name}`, `"${cssVar}"`);
                        set.first = cssVar;
                        fragment.style.setProperty(`--string-${name}`, `"${set.first}"`);
                    } else {
                        console.warn(set.value + "needs css replacement");
                    }
                } else {
                    // Use the previous values
                    if (set.first) {
                        fragment.style.setProperty(`--string-${name}`, `"${set.first}"`);
                    }
                }
            }
        }
    }

    class TargetCounters extends Handler {
        constructor(chunker, polisher, caller) {
            super(chunker, polisher, caller);

            this.styleSheet = polisher.styleSheet;

            this.counterTargets = {};
        }

        onContent(funcNode, fItem, fList, declaration, rule) {
            if (funcNode.name === "target-counter") {
                let selector = lib.generate(rule.ruleNode.prelude);
                let first = funcNode.children.first();
                let func = first.name;

                let value = lib.generate(funcNode);

                let args = [];

                first.children.forEach((child) => {
                    if (child.type === "Identifier") {
                        args.push(child.name);
                    }
                });

                let counter;
                let style;
                let styleIdentifier;

                funcNode.children.forEach((child) => {
                    if (child.type === "Identifier") {
                        if (!counter) {
                            counter = child.name;
                        } else if (!style) {
                            styleIdentifier = lib.clone(child);
                            style = child.name;
                        }
                    }
                });

                let variable = "target-counter-" + UUID();

                selector.split(",").forEach((s) => {
                    this.counterTargets[s] = {
                        func: func,
                        args: args,
                        value: value,
                        counter: counter,
                        style: style,
                        selector: s,
                        fullSelector: selector,
                        variable: variable
                    };
                });

                // Replace with counter
                funcNode.name = "counter";
                funcNode.children = new lib.List();
                funcNode.children.appendData({
                    type: "Identifier",
                    loc: 0,
                    name: variable
                });
                if (styleIdentifier) {
                    funcNode.children.appendData({type: "Operator", loc: null, value: ","});
                    funcNode.children.appendData(styleIdentifier);
                }
            }
        }

        afterPageLayout(fragment, page, breakToken, chunker) {
            Object.keys(this.counterTargets).forEach((name) => {
                let target = this.counterTargets[name];
                let split = target.selector.split("::");
                let query = split[0];

                let queried = chunker.pagesArea.querySelectorAll(query + ":not([data-" + target.variable + "])");

                queried.forEach((selected, index) => {
                    // TODO: handle func other than attr
                    if (target.func !== "attr") {
                        return;
                    }
                    let val = attr(selected, target.args);
                    let element = chunker.pagesArea.querySelector(querySelectorEscape(val));

                    if (element) {
                        let selector = UUID();
                        selected.setAttribute("data-" + target.variable, selector);
                        // TODO: handle other counter types (by query)
                        if (target.counter === "page") {
                            let pages = chunker.pagesArea.querySelectorAll(".pagedjs_page");
                            let pg = 0;
                            for (var i = 0; i < pages.length; i++) {
                                let styles = window.getComputedStyle(pages[i]);
                                let reset = styles["counter-reset"].replace("page", "").trim();

                                if (reset !== "none") {
                                    pg = parseInt(reset);
                                }
                                pg += 1;

                                if (pages[i].contains( element )){
                                    break;
                                }
                            }

                            // let psuedo = "";
                            // if (split.length > 1) {
                            //     psuedo += "::" + split[1];
                            // }

                            this.styleSheet.insertRule(`[data-${target.variable}="${selector}"] { counter-reset: ${target.variable} ${pg}; }`, this.styleSheet.cssRules.length);
                        } else {
                            let value = element.getAttribute(`data-counter-${target.counter}-value`);
                            if (value) {
                                this.styleSheet.insertRule(`[data-${target.variable}="${selector}"] { counter-reset: ${target.variable} ${target.variable} ${parseInt(value)}; }`, this.styleSheet.cssRules.length);
                            }
                        }
                    }
                });
            });
        }
    }

    class TargetText extends Handler {
        constructor(chunker, polisher, caller) {
            super(chunker, polisher, caller);

            this.styleSheet = polisher.styleSheet;
            this.textTargets = {};
        }

        onContent(funcNode, fItem, fList, declaration, rule) {
            if (funcNode.name === "target-text") {
                let selector = lib.generate(rule.ruleNode.prelude);
                let first = funcNode.children.first();
                let last = funcNode.children.last();
                let func = first.name;

                let value = lib.generate(funcNode);

                let args = [];

                first.children.forEach((child) => {
                    if (child.type === "Identifier") {
                        args.push(child.name);
                    }
                });

                let style;
                if (last !== first) {
                    style = last.name;
                }

                let variable = "--" + UUID();

                selector.split(",").forEach((s) => {
                    this.textTargets[s] = {
                        func: func,
                        args: args,
                        value: value,
                        style: style || "content",
                        selector: s,
                        fullSelector: selector,
                        variable: variable
                    };
                });

                // Replace with variable
                funcNode.name = "var";
                funcNode.children = new lib.List();
                funcNode.children.appendData({
                    type: "Identifier",
                    loc: 0,
                    name: variable
                });
            }
        }

        afterParsed(fragment) {
            Object.keys(this.textTargets).forEach((name) => {
                let target = this.textTargets[name];
                let split = target.selector.split("::");
                let query = split[0];
                let queried = fragment.querySelectorAll(query);
                queried.forEach((selected, index) => {
                    let val = attr(selected, target.args);
                    let element = fragment.querySelector(querySelectorEscape(val));
                    if (element) {
                        if (target.style === "content") {
                            let selector = UUID();
                            selected.setAttribute("data-target-text", selector);

                            let psuedo = "";
                            if (split.length > 1) {
                                psuedo += "::" + split[1];
                            }

                            let textContent = element.textContent.trim().replace(/["']/g, (match) => {
                                return "\\" + match;
                            }).replace(/[\n]/g, (match) => {
                                return "\\00000A";
                            });

                            // this.styleSheet.insertRule(`[data-target-text="${selector}"]${psuedo} { content: "${element.textContent}" }`, this.styleSheet.cssRules.length);
                            this.styleSheet.insertRule(`[data-target-text="${selector}"]${psuedo} { ${target.variable}: "${textContent}" }`, this.styleSheet.cssRules.length);

                        }
                    } else {
                        console.warn("missed target", val);
                    }
                });

            });
        }
    }

    var generatedContentHandlers = [
        RunningHeaders,
        StringSets,
        TargetCounters,
        TargetText
    ];

    var isImplemented$3 = function () {
        var from = Array.from, arr, result;
        if (typeof from !== "function") return false;
        arr = ["raz", "dwa"];
        result = from(arr);
        return Boolean(result && (result !== arr) && (result[1] === "dwa"));
    };

    var validTypes = { object: true, symbol: true };

    var isImplemented$4 = function () {
        if (typeof Symbol !== 'function') return false;
        try { } catch (e) { return false; }

        // Return 'true' also for polyfills
        if (!validTypes[typeof Symbol.iterator]) return false;
        if (!validTypes[typeof Symbol.toPrimitive]) return false;
        if (!validTypes[typeof Symbol.toStringTag]) return false;

        return true;
    };

    var isSymbol = function (x) {
        if (!x) return false;
        if (typeof x === 'symbol') return true;
        if (!x.constructor) return false;
        if (x.constructor.name !== 'Symbol') return false;
        return (x[x.constructor.toStringTag] === 'Symbol');
    };

    var validateSymbol = function (value) {
        if (!isSymbol(value)) throw new TypeError(value + " is not a symbol");
        return value;
    };

    var create$6 = Object.create, defineProperties = Object.defineProperties
      , defineProperty = Object.defineProperty, objPrototype = Object.prototype
      , NativeSymbol, SymbolPolyfill, HiddenSymbol, globalSymbols = create$6(null)
      , isNativeSafe;

    if (typeof Symbol === 'function') {
        NativeSymbol = Symbol;
        try {
            String(NativeSymbol());
            isNativeSafe = true;
        } catch (ignore) {}
    }

    var generateName = (function () {
        var created = create$6(null);
        return function (desc) {
            var postfix = 0, name, ie11BugWorkaround;
            while (created[desc + (postfix || '')]) ++postfix;
            desc += (postfix || '');
            created[desc] = true;
            name = '@@' + desc;
            defineProperty(objPrototype, name, d_1.gs(null, function (value) {
                // For IE11 issue see:
                // https://connect.microsoft.com/IE/feedbackdetail/view/1928508/
                //    ie11-broken-getters-on-dom-objects
                // https://github.com/medikoo/es6-symbol/issues/12
                if (ie11BugWorkaround) return;
                ie11BugWorkaround = true;
                defineProperty(this, name, d_1(value));
                ie11BugWorkaround = false;
            }));
            return name;
        };
    }());

    // Internal constructor (not one exposed) for creating Symbol instances.
    // This one is used to ensure that `someSymbol instanceof Symbol` always return false
    HiddenSymbol = function Symbol(description) {
        if (this instanceof HiddenSymbol) throw new TypeError('Symbol is not a constructor');
        return SymbolPolyfill(description);
    };

    // Exposed `Symbol` constructor
    // (returns instances of HiddenSymbol)
    var polyfill = SymbolPolyfill = function Symbol(description) {
        var symbol;
        if (this instanceof Symbol) throw new TypeError('Symbol is not a constructor');
        if (isNativeSafe) return NativeSymbol(description);
        symbol = create$6(HiddenSymbol.prototype);
        description = (description === undefined ? '' : String(description));
        return defineProperties(symbol, {
            __description__: d_1('', description),
            __name__: d_1('', generateName(description))
        });
    };
    defineProperties(SymbolPolyfill, {
        for: d_1(function (key) {
            if (globalSymbols[key]) return globalSymbols[key];
            return (globalSymbols[key] = SymbolPolyfill(String(key)));
        }),
        keyFor: d_1(function (s) {
            var key;
            validateSymbol(s);
            for (key in globalSymbols) if (globalSymbols[key] === s) return key;
        }),

        // To ensure proper interoperability with other native functions (e.g. Array.from)
        // fallback to eventual native implementation of given symbol
        hasInstance: d_1('', (NativeSymbol && NativeSymbol.hasInstance) || SymbolPolyfill('hasInstance')),
        isConcatSpreadable: d_1('', (NativeSymbol && NativeSymbol.isConcatSpreadable) ||
            SymbolPolyfill('isConcatSpreadable')),
        iterator: d_1('', (NativeSymbol && NativeSymbol.iterator) || SymbolPolyfill('iterator')),
        match: d_1('', (NativeSymbol && NativeSymbol.match) || SymbolPolyfill('match')),
        replace: d_1('', (NativeSymbol && NativeSymbol.replace) || SymbolPolyfill('replace')),
        search: d_1('', (NativeSymbol && NativeSymbol.search) || SymbolPolyfill('search')),
        species: d_1('', (NativeSymbol && NativeSymbol.species) || SymbolPolyfill('species')),
        split: d_1('', (NativeSymbol && NativeSymbol.split) || SymbolPolyfill('split')),
        toPrimitive: d_1('', (NativeSymbol && NativeSymbol.toPrimitive) || SymbolPolyfill('toPrimitive')),
        toStringTag: d_1('', (NativeSymbol && NativeSymbol.toStringTag) || SymbolPolyfill('toStringTag')),
        unscopables: d_1('', (NativeSymbol && NativeSymbol.unscopables) || SymbolPolyfill('unscopables'))
    });

    // Internal tweaks for real symbol producer
    defineProperties(HiddenSymbol.prototype, {
        constructor: d_1(SymbolPolyfill),
        toString: d_1('', function () { return this.__name__; })
    });

    // Proper implementation of methods exposed on Symbol.prototype
    // They won't be accessible on produced symbol instances as they derive from HiddenSymbol.prototype
    defineProperties(SymbolPolyfill.prototype, {
        toString: d_1(function () { return 'Symbol (' + validateSymbol(this).__description__ + ')'; }),
        valueOf: d_1(function () { return validateSymbol(this); })
    });
    defineProperty(SymbolPolyfill.prototype, SymbolPolyfill.toPrimitive, d_1('', function () {
        var symbol = validateSymbol(this);
        if (typeof symbol === 'symbol') return symbol;
        return symbol.toString();
    }));
    defineProperty(SymbolPolyfill.prototype, SymbolPolyfill.toStringTag, d_1('c', 'Symbol'));

    // Proper implementaton of toPrimitive and toStringTag for returned symbol instances
    defineProperty(HiddenSymbol.prototype, SymbolPolyfill.toStringTag,
        d_1('c', SymbolPolyfill.prototype[SymbolPolyfill.toStringTag]));

    // Note: It's important to define `toPrimitive` as last one, as some implementations
    // implement `toPrimitive` natively without implementing `toStringTag` (or other specified symbols)
    // And that may invoke error in definition flow:
    // See: https://github.com/medikoo/es6-symbol/issues/13#issuecomment-164146149
    defineProperty(HiddenSymbol.prototype, SymbolPolyfill.toPrimitive,
        d_1('c', SymbolPolyfill.prototype[SymbolPolyfill.toPrimitive]));

    var es6Symbol = isImplemented$4() ? Symbol : polyfill;

    var objToString = Object.prototype.toString
      , id = objToString.call(
        (function () {
            return arguments;
        })()
    );

    var isArguments = function (value) {
        return objToString.call(value) === id;
    };

    var objToString$1 = Object.prototype.toString, id$1 = objToString$1.call(noop);

    var isFunction = function (value) {
        return typeof value === "function" && objToString$1.call(value) === id$1;
    };

    var isImplemented$5 = function () {
        var sign = Math.sign;
        if (typeof sign !== "function") return false;
        return (sign(10) === 1) && (sign(-20) === -1);
    };

    var shim$3 = function (value) {
        value = Number(value);
        if (isNaN(value) || (value === 0)) return value;
        return value > 0 ? 1 : -1;
    };

    var sign = isImplemented$5()
        ? Math.sign
        : shim$3;

    var abs = Math.abs, floor = Math.floor;

    var toInteger = function (value) {
        if (isNaN(value)) return 0;
        value = Number(value);
        if ((value === 0) || !isFinite(value)) return value;
        return sign(value) * floor(abs(value));
    };

    var max$1 = Math.max;

    var toPosInteger = function (value) {
     return max$1(0, toInteger(value));
    };

    var objToString$2 = Object.prototype.toString, id$2 = objToString$2.call("");

    var isString = function (value) {
        return (
            typeof value === "string" ||
            (value &&
                typeof value === "object" &&
                (value instanceof String || objToString$2.call(value) === id$2)) ||
            false
        );
    };

    var iteratorSymbol = es6Symbol.iterator
      , isArray        = Array.isArray
      , call           = Function.prototype.call
      , desc           = { configurable: true, enumerable: true, writable: true, value: null }
      , defineProperty$1 = Object.defineProperty;

    // eslint-disable-next-line complexity
    var shim$4 = function (arrayLike /*, mapFn, thisArg*/) {
        var mapFn = arguments[1]
          , thisArg = arguments[2]
          , Context
          , i
          , j
          , arr
          , length
          , code
          , iterator
          , result
          , getIterator
          , value;

        arrayLike = Object(validValue(arrayLike));

        if (isValue(mapFn)) validCallable(mapFn);
        if (!this || this === Array || !isFunction(this)) {
            // Result: Plain array
            if (!mapFn) {
                if (isArguments(arrayLike)) {
                    // Source: Arguments
                    length = arrayLike.length;
                    if (length !== 1) return Array.apply(null, arrayLike);
                    arr = new Array(1);
                    arr[0] = arrayLike[0];
                    return arr;
                }
                if (isArray(arrayLike)) {
                    // Source: Array
                    arr = new Array(length = arrayLike.length);
                    for (i = 0; i < length; ++i) arr[i] = arrayLike[i];
                    return arr;
                }
            }
            arr = [];
        } else {
            // Result: Non plain array
            Context = this;
        }

        if (!isArray(arrayLike)) {
            if ((getIterator = arrayLike[iteratorSymbol]) !== undefined) {
                // Source: Iterator
                iterator = validCallable(getIterator).call(arrayLike);
                if (Context) arr = new Context();
                result = iterator.next();
                i = 0;
                while (!result.done) {
                    value = mapFn ? call.call(mapFn, thisArg, result.value, i) : result.value;
                    if (Context) {
                        desc.value = value;
                        defineProperty$1(arr, i, desc);
                    } else {
                        arr[i] = value;
                    }
                    result = iterator.next();
                    ++i;
                }
                length = i;
            } else if (isString(arrayLike)) {
                // Source: String
                length = arrayLike.length;
                if (Context) arr = new Context();
                for (i = 0, j = 0; i < length; ++i) {
                    value = arrayLike[i];
                    if (i + 1 < length) {
                        code = value.charCodeAt(0);
                        // eslint-disable-next-line max-depth
                        if (code >= 0xd800 && code <= 0xdbff) value += arrayLike[++i];
                    }
                    value = mapFn ? call.call(mapFn, thisArg, value, j) : value;
                    if (Context) {
                        desc.value = value;
                        defineProperty$1(arr, j, desc);
                    } else {
                        arr[j] = value;
                    }
                    ++j;
                }
                length = j;
            }
        }
        if (length === undefined) {
            // Source: array or array-like
            length = toPosInteger(arrayLike.length);
            if (Context) arr = new Context(length);
            for (i = 0; i < length; ++i) {
                value = mapFn ? call.call(mapFn, thisArg, arrayLike[i], i) : arrayLike[i];
                if (Context) {
                    desc.value = value;
                    defineProperty$1(arr, i, desc);
                } else {
                    arr[i] = value;
                }
            }
        }
        if (Context) {
            desc.value = null;
            arr.length = length;
        }
        return arr;
    };

    var from = isImplemented$3()
        ? Array.from
        : shim$4;

    var isImplemented$6 = function () {
        var numberIsNaN = Number.isNaN;
        if (typeof numberIsNaN !== "function") return false;
        return !numberIsNaN({}) && numberIsNaN(NaN) && !numberIsNaN(34);
    };

    var shim$5 = function (value) {
        // eslint-disable-next-line no-self-compare
        return value !== value;
    };

    var isNan = isImplemented$6()
        ? Number.isNaN
        : shim$5;

    var indexOf$2           = Array.prototype.indexOf
      , objHasOwnProperty = Object.prototype.hasOwnProperty
      , abs$1               = Math.abs
      , floor$1             = Math.floor;

    var eIndexOf = function (searchElement /*, fromIndex*/) {
        var i, length, fromIndex, val;
        if (!isNan(searchElement)) return indexOf$2.apply(this, arguments);

        length = toPosInteger(validValue(this).length);
        fromIndex = arguments[1];
        if (isNaN(fromIndex)) fromIndex = 0;
        else if (fromIndex >= 0) fromIndex = floor$1(fromIndex);
        else fromIndex = toPosInteger(this.length) - floor$1(abs$1(fromIndex));

        for (i = fromIndex; i < length; ++i) {
            if (objHasOwnProperty.call(this, i)) {
                val = this[i];
                if (isNan(val)) return i; // Jslint: ignore
            }
        }
        return -1;
    };

    var forEach$1 = Array.prototype.forEach
      , splice  = Array.prototype.splice;

    // eslint-disable-next-line no-unused-vars
    var remove = function (itemToRemove /*, …item*/) {
        forEach$1.call(
            arguments,
            function (item) {
                var index = eIndexOf.call(this, item);
                if (index !== -1) splice.call(this, index, 1);
            },
            this
        );
    };

    var map = { function: true, object: true };

    var isObject$1 = function (value) {
        return (isValue(value) && map[typeof value]) || false;
    };

    var validObject = function (value) {
        if (!isObject$1(value)) throw new TypeError(value + " is not an Object");
        return value;
    };

    var emit           = eventEmitter.methods.emit

      , defineProperty$2 = Object.defineProperty
      , hasOwnProperty$6 = Object.prototype.hasOwnProperty
      , getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

    var pipe = function (e1, e2/*, name*/) {
        var pipes, pipe, desc, name;

        (validObject(e1) && validObject(e2));
        name = arguments[2];
        if (name === undefined) name = 'emit';

        pipe = {
            close: function () { remove.call(pipes, e2); }
        };
        if (hasOwnProperty$6.call(e1, '__eePipes__')) {
            (pipes = e1.__eePipes__).push(e2);
            return pipe;
        }
        defineProperty$2(e1, '__eePipes__', d_1('c', pipes = [e2]));
        desc = getOwnPropertyDescriptor(e1, name);
        if (!desc) {
            desc = d_1('c', undefined);
        } else {
            delete desc.get;
            delete desc.set;
        }
        desc.value = function () {
            var i, emitter, data = from(pipes);
            emit.apply(this, arguments);
            for (i = 0; (emitter = data[i]); ++i) emit.apply(emitter, arguments);
        };
        defineProperty$2(e1, name, desc);
        return pipe;
    };

    let registeredHandlers = [...pagedMediaHandlers, ...generatedContentHandlers];

    class Handlers {
        constructor(chunker, polisher, caller) {

            registeredHandlers.forEach((Handler) => {
                let handler = new Handler(chunker, polisher, caller);
                pipe(handler, this);
            });
        }
    }

    eventEmitter(Handlers.prototype);

    function registerHandlers() {
        for (var i = 0; i < arguments.length; i++) {
            registeredHandlers.push(arguments[i]);
        }
    }

    function initializeHandlers(chunker, polisher, caller) {
        let handlers = new Handlers(chunker, polisher, caller);
        return handlers;
    }

    class Previewer {
        constructor() {
            // this.preview = this.getParams("preview") !== "false";

            // Process styles
            this.polisher = new Polisher(false);

            // Chunk contents
            this.chunker = new Chunker();

            // Hooks
            this.hooks = {};

            // default size
            this.size = {
                width: {
                    value: 8.5,
                    unit: "in"
                },
                height: {
                    value: 11,
                    unit: "in"
                },
                format: undefined,
                orientation: undefined
            };

            let counter = 0;
            this.chunker.on("page", (page) => {
                counter += 1;
                this.emit("page", page);
                if (typeof window.PuppeteerLogger !== "undefined") {
                    window.PuppeteerLogger("page", counter);
                }
            });

            this.chunker.on("rendering", () => {
                this.emit("rendering", this.chunker);
            });
        }

        initializeHandlers() {
            let handlers = initializeHandlers(this.chunker, this.polisher, this);

            handlers.on("size", (size) => {
                this.size = size;
                this.emit("size", size);
            });

            return handlers;
        }

        registerHandlers() {
            return registerHandlers.apply(registerHandlers, arguments);
        }

        getParams(name) {
            let param;
            let url = new URL(window.location);
            let params = new URLSearchParams(url.search);
            for(var pair of params.entries()) {
                if(pair[0] === name) {
                    param = pair[1];
                }
            }

            return param;
        }

        wrapContent() {
            // Wrap body in template tag
            let body = document.querySelector("body");

            // Check if a template exists
            let template;
            template = body.querySelector(":scope > template");

            if (!template) {
                // Otherwise create one
                template = document.createElement("template");
                template.innerHTML = body.innerHTML;
                body.innerHTML = "";
                body.appendChild(template);
            }

            return template.content;
        }

        removeStyles(doc=document) {
            // Get all stylesheets
            let stylesheets = Array.from(doc.querySelectorAll("link[rel='stylesheet']"));
            let hrefs = stylesheets.map((sheet) => {
                sheet.remove();
                return sheet.href;
            });

            // Get inline styles
            let inlineStyles = Array.from(doc.querySelectorAll("style:not([data-pagedjs-inserted-styles])"));
            inlineStyles.forEach((inlineStyle) => {
                let obj = {};
                obj[window.location.href] = inlineStyle.textContent;
                hrefs.push(obj);
                inlineStyle.remove();
            });

            return hrefs;
        }

        async preview(content, stylesheets, renderTo) {

            if (!content) {
                content = this.wrapContent();
            }

            if (!stylesheets) {
                stylesheets = this.removeStyles();
            }

            this.polisher.setup();

            this.handlers = this.initializeHandlers();

            await this.polisher.add(...stylesheets);

            let startTime = performance.now();

            // Render flow
            let flow = await this.chunker.flow(content, renderTo);

            let endTime = performance.now();
            let msg = "Rendering " + flow.total + " pages took " + (endTime - startTime) + " milliseconds.";

            flow.performance = (endTime - startTime);
            flow.size = this.size;

            this.emit("rendered", msg, this.size.width && this.size.width.value + this.size.width.unit, this.size.height && this.size.height.value + this.size.height.unit, this.size.orientation, this.size.format);
            if (typeof window.onPagesRendered !== "undefined") {
                window.onPagesRendered(msg, this.size.width && this.size.width.value + this.size.width.unit, this.size.height && this.size.height.value + this.size.height.unit, this.size.orientation, this.size.format);
            }

            return flow;
        }
    }

    eventEmitter(Previewer.prototype);

    exports.Chunker = Chunker;
    exports.Polisher = Polisher;
    exports.Previewer = Previewer;
    exports.Handler = Handler;
    exports.registerHandlers = registerHandlers;
    exports.initializeHandlers = initializeHandlers;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
