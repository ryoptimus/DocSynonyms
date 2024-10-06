/**
* @license MIT
* @see https://github.com/Amaimersion/google-docs-utils
*/
var GoogleDocsUtils = (function (exports) {
    'use strict';

    /**
     * Selectors to find element in the page.
     *
     * Use array of strings, not just single string value.
     * It is means there can be multiple selectors for single
     * element, in descending order of priority.
     * For example, if selector № 1 returned some result, then
     * that result will be used, otherwise selector № 2 will
     * be used to try to get valid result, etc.
     * If there only one value, then use array with one element.
     */


    const docsEditorContainer = [
        '#docs-editor-container'
    ];

    const docsEditor = [
        '#docs-editor',
        ...docsEditorContainer
    ];

    const textEventTarget = [
        'iframe.docs-texteventtarget-iframe',
        '.docs-texteventtarget-iframe'
    ];

    const kixPage = [
        '.kix-page',
        '.docs-page'
    ];

    const kixLine = [
        '.kix-lineview',
        '.kix-paragraphrenderer'
    ];

    const kixLineText = [
        '.kix-lineview-text-block'
    ];

    const kixWordNone = [
        '.kix-wordhtmlgenerator-word-node'
    ];

    const kixSelectionOverlay = [
        '.kix-selection-overlay'
    ];

    const kixCursor = [
        '.kix-cursor'
    ];

    const kixActiveCursor = [
        '.docs-text-ui-cursor-blink'
    ];

    const kixCursorCaret = [
        '.kix-cursor-caret'
    ];

    /**
     * Gets HTML element using `querySelector`.
     *
     * @param {string[]} selectors
     * Array of possible selectors.
     * If selector results to some element,
     * then that element will be returned,
     * otherwise next selector will be used.
     * @param {document | HTMLElement} root
     * A root in which the element will be searched.
     * Defaults to `document`.
     *
     * @returns {HTMLElement | null}
     * HTML element if finded, `null` otherwise.
     *
     * @throws
     * Throws an error if `root == null`.
     */
    function querySelector(
        selectors,
        root = document
    ) {
        if (root == null) {
            throw new Error('Passed root element does not exists');
        }

        let value = null;

        for (const selector of selectors) {
            value = root.querySelector(selector);

            if (value) {
                break;
            }
        }

        return value;
    }


    /**
     * Gets all HTML elements using `querySelectorAll`.
     *
     * @param {string[]} selectors
     * Array of possible selectors.
     * If selector results to some elements,
     * then these elements will be returned,
     * otherwise next selector will be used.
     * @param {document | HTMLElement} root
     * A root in which elements will be searched.
     * Defaults to `document`.
     *
     * @returns {HTMLElement[]}
     * HTML elements if finded, otherwise empty array.
     *
     * @throws
     * Throws an error if `root == null`.
     */
    function querySelectorAll(
        selectors,
        root = document
    ) {
        if (root == null) {
            throw new Error('Passed root element does not exists');
        }

        let value = null;

        for (const selector of selectors) {
            value = root.querySelectorAll(selector);

            if (value.length > 0) {
                break;
            }
        }

        if (value) {
            return Array.from(value);
        }

        return [];
    }

    /**
     * @returns
     * Current active editor element.
     * NOTE: it contains only editor element itself,
     * not bar and other elements.
     */
    function getEditorElement() {
        return querySelector(docsEditor);
    }

    /**
     * Joins text using separator.
     */


    /**
     * @param {HTMLElement} element
     */
    function isIframe(element) {
        return (element.nodeName.toLowerCase() === 'iframe');
    }


    /**
     * NOTE: during execution temp element will be added
     * in the DOM. That element will be invisible to user,
     * and that element will be removed in the end of execution.
     *
     * @param {string} char
     * Single character is expected.
     * You can pass more than one character,
     * but result will be not so accurate, because,
     * for example, different characters may have different width.
     * @param {string} css
     * Using that CSS `char` was rendered.
     * It is important to provide exactly CSS
     * that was used for rendering, because
     * different CSS may lead to different rect.
     *
     * @returns {DOMRectReadOnly}
     * Rect of rendered character.
     */
    function getCharRect(char, css) {
        const element = document.createElement('span');

        element.textContent = char;
        element.style.cssText = css;

        // sequences of white spaces should be preserved
        element.style.whiteSpace = 'pre';

        // don't display this element this element
        element.style.position = 'absolute';
        element.style.top = '-100px';

        // need to render this element in order to get valid rect
        document.body.appendChild(element);

        const rect = element.getBoundingClientRect();

        element.remove();

        return rect;
    }


    /**
     * @param {DOMRectReadOnly} a
     * @param {DOMRectReadOnly} b
     *
     * @returns {boolean}
     * Two rects overlaps each other.
     *
     * @see https://stackoverflow.com/a/306332/8445442
     */
    function isRectsOverlap(a, b) {
        return (
            (a.left <= b.right) &&
            (a.right >= b.left) &&
            (a.top <= b.bottom) &&
            (a.bottom >= b.top)
        );
    }


    /**
     * Similar to RegExp `\w`, but also supports non-ASCII characters
     *
     * WARNING:
     * it will not work for Chinese, Japanese, Arabic, Hebrew and most
     * other scripts which doesn't have upper and lower latters.
     *
     * @param {string} char
     * Char to check.
     */
    function charIsWordChar(char) {
        // ASCII, numbers, underscores and other symbols
        if (char.match(/[\w]/)) {
            return true;
        }

        // https://stackoverflow.com/a/32567789/8445442
        if (char.toLowerCase() !== char.toUpperCase()) {
            return true;
        }

        return false;
    }


    /**
     * Runs a method when page is fully loaded.
     *
     * @param {Function} method
     * Method to run.
     */
    function runOnPageLoaded(method) {
        // inherit `this` context.
        const mthd = () => {
            method();
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', mthd);
        } else {
            mthd();
        }
    }


    /**
     * Converts selectors (`selectors.js`) to list of class names.
     *
     * @param {string[]} selectors
     * Selectors variable from `selectors.js` file.
     *
     * @returns
     * Class names one by one, without dot.
     * See example for more.
     *
     * @example
     * ([
     *  '.test', '.test2.iframe', '#nide.hide',
     *  'div.div1.div2', '#tag'
     * ]) => [
     *  'test', 'test2', 'iframe', 'hide',
     *  'div1', 'div2'
     * ]
     */
    function selectorsToClassList(selectors) {
        const result = [];

        for (let selector of selectors) {
            if (!selector.startsWith('.')) {
                selector = selector.slice(
                    selector.indexOf('.')
                );
            }

            selector = selector.slice(1);
            const classNames = selector.split('.');

            for (const className of classNames) {
                if (className) {
                    result.push(className);
                }
            }
        }

        return result;
    }

    /**
     * - Google Docs uses special target to handle
     * text events. So, for example, you cannot send
     * text event just to current document. You
     * should use special target for that.
     *
     * @returns {HTMLElement | Document}
     * A target that can be used to send text events
     * and listens for text events (in particular, keyboard events).
     */
    function getTextEventTarget() {
        /**
         * @type {HTMLElement & HTMLIFrameElement}
         */
        const element = querySelector(textEventTarget);

        if (isIframe(element)) {
            return element.contentDocument;
        }

        return element;
    }

    /**
     * @returns
     * All rendered pages of editor.
     */
    function getPagesElements() {
        const editor = getEditorElement();

        return querySelectorAll(kixPage, editor);
    }

    /**
     * @returns {HTMLElement[]}
     * All rendered pages of editor.
     */
    function getLinesElements() {
        const pages = getPagesElements();
        let result = [];

        for (const page of pages) {
            const lines = querySelectorAll(kixLine, page);
            result = [
                ...result,
                ...lines
            ];
        }

        return result;
    }

    /**
     * @returns {HTMLElement[]}
     * Text elements of each line.
     * Every text element contains all word elements
     * (there can be multiple word elements for one text element).
     */
    function getLinesTextElements() {
        const lines = getLinesElements();
        const result = [];

        for (const line of lines) {
            const textElement = querySelector(kixLineText, line);

            result.push(textElement);
        }

        return result;
    }

    /**
     * Clears a text extracted from element
     * using `textContent` property.
     *
     * - you may want to use this function because
     * Google Docs adds special symbols (ZWNJ, NBSP, etc.)
     * to display text correctly across all browsers.
     * - no sense to use this function for `innertText`.
     *
     * @param {string} textContent
     */
    function clearTextContent(textContent) {
        textContent = removeZWNJ(textContent);
        textContent = removeNBSP(textContent);

        return textContent;
    }


    /**
     * Removes all ZWNJ characters.
     *
     * - https://en.wikipedia.org/wiki/Zero-width_non-joiner
     *
     * @param {string} value
     */
    function removeZWNJ(value) {
        return value.replace(/\u200C/g, '');
    }


    /**
     * Removes all NBSP characters.
     *
     * - https://en.wikipedia.org/wiki/Non-breaking_space
     *
     * @param {string} value
     */
    function removeNBSP(value) {
        return value.replace(/\u00A0/g, '');
    }

    /**
     * @returns
     * Text of every editor line.
     * If line is empty, then zero length string
     * will be returned for that line.
     */
    function getLinesText() {
        const lines = getLinesTextElements();
        const result = [];

        for (const line of lines) {
            // difference between `textContent` and `innerText` is matters!
            let value = line.textContent;

            value = clearTextContent(value);
            value = clearLineText(value);

            result.push(value);
        }

        return result;
    }


    /**
     * @param {string} value
     */
    function clearLineText(value) {
        return value.trim();
    }

    /**
     * @param {number} lineIndex
     * @param {number} startIndex
     * @param {number} endIndex
     *
     * @returns
     * Text of specific line.
     */
    function getLineText(
        lineIndex,
        startIndex = undefined,
        endIndex = undefined
    ) {
        const linesText = getLinesText();

        if (lineIndex >= linesText.length) {
            return null;
        }

        const text = linesText[lineIndex];

        if (startIndex == null) {
            startIndex = 0;
        }

        if (endIndex == null) {
            endIndex = text.length;
        }

        return text.substring(startIndex, endIndex);
    }

    /**
     * @returns {Array<HTMLElement[]>}
     * Each element is a line, each of elements
     * of that line is a word node of that line.
     * These word nodes contains actual text of line.
     *
     * NOTE:
     * if text of line contains various formatting (font, bold, etc.),
     * then it will be splitted into several word nodes.
     * For example, "some [Arial font] text [Roboto font]" will be
     * splitted into two nodes, "some text [Arial font]" will be
     * represented as one node and "another [Arial font, normal]
     * text [Arial font, bold]" will be splitted into two nodes.
     */
    function getWordElements() {
        const lines = getLinesElements();
        const result = [];

        for (const line of lines) {
            const nodes = querySelectorAll(kixWordNone, line);
            result.push(nodes);
        }

        return result;
    }

    /**
     * Google Docs creates separate element to display
     * selection. It is no actual selection of text, it is
     * just an element with some style that emulates selection.
     *
     * Because of this, for example, you cannot just remove
     * selection overlay element from DOM in order to remove selection,
     * because Google Docs will restore selection at next user selection.
     *
     * @returns {HTMLElement[]}
     * Selection overlay element for each line.
     * If there are no selection for that line,
     * then `null` will be used.
     */
    function getSelectionOverlayElements() {
        const lines = getLinesElements();
        const result = [];

        for (const line of lines) {
            const element = querySelector(kixSelectionOverlay, line);
            result.push(element);
        }

        return result;
    }

    /**
     * @returns {Array<null | Array<object | null>>}
     * Selection data for every rendered line.
     * `[]` - represents line, `[][]` - represents all
     * selected word nodes.
     * `[]` - element will be `null` if that line doesn't
     * contains selection at all, otherwise it will be array.
     * `[][]` - it is all selected word nodes (see `getWordElements()`
     * documentation for more). If word node not selected (i.e., selection
     * don't overlaps that node), then value will be `null`, otherwise
     * it will be an object that describes selection of that word node.
     *
     * @throws
     * Throws an error if unable to get information
     * about current selection for at least one line.
     */
    function getSelection() {
        const selectionElements = getSelectionOverlayElements();
        const wordElements = getWordElements();

        if (selectionElements.length !== wordElements.length) {
            throw new Error(
                'Unable to map selection elements and word elements'
            );
        }

        const count = Math.min(
            selectionElements.length,
            wordElements.length
        );
        const result = [];
        const emptyValue = null;

        for (let i = 0; i !== count; i++) {
            const selectionElement = selectionElements[i];

            if (!selectionElement) {
                result.push(emptyValue);

                continue;
            }

            const line = wordElements[i];
            const lineSelection = [];

            for (const wordElement of line) {
                if (!wordElement) {
                    lineSelection.push(emptyValue);

                    continue;
                }

                const originalText = clearTextContent(wordElement.textContent);
                const textCSS = wordElement.style.cssText;
                const wordRect = wordElement.getBoundingClientRect();
                const selectionRect = selectionElement.getBoundingClientRect();
                const selectionIndexes = calculateSelectionIndexes(
                    originalText,
                    textCSS,
                    wordRect,
                    selectionRect
                );
                const notSelected = (!selectionIndexes);

                if (notSelected) {
                    lineSelection.push(emptyValue);

                    continue;
                }

                const selectedText = originalText.substring(
                    selectionIndexes.start,
                    selectionIndexes.end
                );

                lineSelection.push({
                    text: originalText,
                    selectedText: selectedText,
                    selectionStart: selectionIndexes.start,
                    selectionEnd: selectionIndexes.end,
                    textRect: wordRect,
                    selectionRect: selectionRect,
                    textElement: wordElement,
                    selectionElement: selectionElement
                });
            }

            result.push(lineSelection);
        }

        return result;
    }


    /**
     * Calculates text selection indexes based on
     * DOM rect of text element and selection element.
     *
     * @param {string} text
     * Original text.
     * @param {string} textCSS
     * CSS of rendered original text.
     * @param {DOMRectReadOnly} textRect
     * DOM rect of text element.
     * @param {DOMRectReadOnly} selectionRect
     * DOM rect of selection element.
     *
     * @returns
     * Indexes of current text selection.
     * They can be used, for example, for `substring()`.
     * `null` will be returned if nothing is selected.
     */
    function calculateSelectionIndexes(
        text,
        textCSS,
        textRect,
        selectionRect
    ) {
        let virtualCaretLeft = textRect.left;
        let selected = false;
        let selectionStart = 0;
        let selectionEnd = text.length;

        for (let i = 0; i !== text.length; i++) {
            const isOverlap = (
                (selectionRect.left <= virtualCaretLeft) &&
                (virtualCaretLeft < selectionRect.right)
            );

            if (isOverlap) {
                if (!selected) {
                    selectionStart = i;
                    selected = true;
                }
            } else {
                if (selected) {
                    selectionEnd = i;
                    break;
                }
            }

            const char = text[i];
            const charRect = getCharRect(char, textCSS);
            virtualCaretLeft += charRect.width;
        }

        const selectionIndexes = {
            start: selectionStart,
            end: selectionEnd,
        };

        return (selected ? selectionIndexes : null);
    }

    /**
     * @returns {HTMLElement}
     * User cursor.
     */
    function getCursorElement() {
        const editor = getEditorElement();

        return querySelector(kixCursor, editor);
    }

    /**
     * @returns {HTMLElement}
     * User active blinked cursor.
     */
    function getActiveCursorElement() {
        const editor = getEditorElement();

        return querySelector(kixActiveCursor, editor);
    }

    /**
     * @returns {HTMLElement | null}
     * Caret of user active cursor.
     */
    function getCaretElement() {
        const activeCursor = getCursorElement();

        if (!activeCursor) {
            return null;
        }

        return querySelector(kixCursorCaret, activeCursor);
    }

    /**
     * @returns
     * Information about caret.
     * `null` if unable to get information.
     */
    function getCaret() {
        const caretElement = getCaretElement();

        if (!caretElement) {
            return null;
        }

        const wordElements = getWordElements();

        if (!wordElements.length) {
            return null;
        }

        const caretRect = caretElement.getBoundingClientRect();
        const result = {
            element: null,
            wordElement: null,
            lineIndex: null,
            positionIndexRelativeToWord: null
        };
        let resultFound = false;

        for (let lineIndex = 0; lineIndex !== wordElements.length; lineIndex++) {
            const line = wordElements[lineIndex];

            for (let wordIndex = 0; wordIndex !== line.length; wordIndex++) {
                const wordElement = line[wordIndex];
                const wordRect = wordElement.getBoundingClientRect();
                const isOverlap = isRectsOverlap(caretRect, wordRect);

                if (!isOverlap) {
                    continue;
                }

                result.element = caretElement;
                result.wordElement = wordElement;
                result.lineIndex = lineIndex;
                result.positionIndexRelativeToWord = calculatePositionIndex(
                    wordRect,
                    caretRect,
                    wordElement.textContent,
                    wordElement.style.cssText
                );
                resultFound = true;

                break;
            }

            if (resultFound) {
                break;
            }
        }

        return result;
    }


    /**
     * @param {DOMRectReadOnly} wordRect
     * @param {DOMRectReadOnly} caretRect
     * @param {string} text
     * "Dirty" `textContent` is expected.
     * In case of "Dirty" empty spaces will be
     * handled correctly.
     * @param {string} textCSS
     *
     * @returns
     * On what position caret is placed on a line.
     * For example, `1` means caret is placed before
     * second character of line text.
     */
    function calculatePositionIndex(wordRect, caretRect, text, textCSS) {
        let virtualCaretLeft = wordRect.left - caretRect.width;
        let localIndex = 0;

        for (const char of text) {
            const charRect = getCharRect(char, textCSS);

            // we should ignore special invisible
            // characters like ZWNJ or NBSP
            if (charRect.width === 0) {
                continue;
            }

            virtualCaretLeft += charRect.width;

            if (virtualCaretLeft >= caretRect.left) {
                break;
            }

            localIndex += 1;
        }

        return localIndex;
    }

    /**
     * @returns
     * A word on which caret is currently located.
     */
    function getCaretWord() {
        const caret = getCaret();

        if (!caret) {
            return null;
        }

        const caretText = clearTextContent(caret.wordElement.textContent);
        const result = {
            word: '',
            text: caretText,
            indexStart: caret.positionIndexRelativeToWord,
            indexEnd: caret.positionIndexRelativeToWord
        };

        // not strict `>=`, because we may shift
        // by one to the left in further
        if (caret.positionIndexRelativeToWord > caretText.length) {
            return result;
        }

        const indexStart = getBoundaryIndex(
            caret.positionIndexRelativeToWord,
            caretText,
            true
        );
        const indexEnd = getBoundaryIndex(
            caret.positionIndexRelativeToWord,
            caretText,
            false
        );

        result.indexStart = indexStart;
        result.indexEnd = indexEnd;
        result.word = caretText.substring(indexStart, indexEnd);

        return result;
    }


    /**
     * @param {number} startIndex
     * From where to start search a word boundary.
     * @param {string} text
     * Full text.
     * @param {bool} toLeft
     * `true` for left direction,
     * `false` for right direction.
     *
     * @returns {number}
     * Index of word boundary that can be used for `substring()`.
     *
     * @example
     * ```
     * const text = 'one two three';
     * const start = getBoundaryIndex(5, text, true) // => 4;
     * const end = getBoundaryIndex(5, text, false) // => 7;
     *
     * text.substring(start, end); // => 'two'
     * ```
     *
     * @example
     * ```
     * const text = 'one two three';
     * const start = getBoundaryIndex(3, text, true) // => 0;
     * const end = getBoundaryIndex(3, text, false) // => 3;
     *
     * text.substring(start, end); // => 'one'
     * ```
     *
     * @example
     * ```
     * const text = 'one  two three'; // notice extra space
     * const start = getBoundaryIndex(4, text, true) // => 4;
     * const end = getBoundaryIndex(4, text, false) // => 4;
     *
     * text.substring(start, end); // => ''
     * ```
     *
     * @example
     * ```
     * const text = '  one two three'; // notice extra spaces
     * const start = getBoundaryIndex(1, text, true) // => 1;
     * const end = getBoundaryIndex(1, text, false) // => 1;
     *
     * text.substring(start, end); // => 'one'
     * ```
     */
    function getBoundaryIndex(startIndex, text, toLeft) {
        let isEnd = undefined;
        let move = undefined;
        let undoMove = undefined;

        if (toLeft) {
            isEnd = (index) => (index <= 0);
            move = (index) => (index - 1);
            undoMove = (index) => (index + 1);
        } else {
            isEnd = (index) => (index >= text.length);
            move = (index) => (index + 1);
            undoMove = (index) => (index - 1);
        }

        let boundaryIndex = startIndex;
        let character = text[boundaryIndex];

        // in case if we at the end of word,
        // let's shift to the left by one in order
        // next `while` algorithm handle that case correctly
        if (
            toLeft &&
            charIsOutOfWord(character) &&
            !isEnd(boundaryIndex)
        ) {
            boundaryIndex = move(boundaryIndex);
            character = text[boundaryIndex];

            // there is no word boundary after shift by one,
            // we should initial start index without move
            if (charIsOutOfWord(character)) {
                return startIndex;
            }
        }

        while (
            !charIsOutOfWord(character) &&
            !isEnd(boundaryIndex)
        ) {
            boundaryIndex = move(boundaryIndex);
            character = text[boundaryIndex];
        }

        // if previous `while` ended because of `charIsOutOfWord`,
        // then now we have boundary index for invalid character.
        // It is expected result for `toLeft = false` because in that
        // case we want exclude such character from `substring()`,
        // but in case of `toLeft = true` we don't want include invalid
        // word boundary character in `substring()`.
        if (
            toLeft &&
            !isEnd(boundaryIndex)
        ) {
            boundaryIndex = undoMove(boundaryIndex);
        }

        return boundaryIndex;
    }


    /**
     * @param {string} character
     *
     * @returns
     * Character is outside of word boundary.
     */
    function charIsOutOfWord(character) {
        if (character == null) {
            return true;
        }

        return !charIsWordChar(character);
    }

    /**
     * This module can be used to imitate physical keyboard press events.
     *
     * - use `keypress` for letter characters,
     * - use `keydown` for special keys (ArrowLeft, Delete, etc.).
     *
     * It is important to provide valid `target`, because Google Docs
     * uses special target for text events, not default `document`.
     *
     * Use this for help - https://keycode.info
     */


    /**
     * Creates keyboard event.
     *
     * @param {'keypress' | 'keydown' | 'keyup'} name
     * Name of event.
     * @param {Document | HTMLElement} target
     * Target of event.
     * @param {string} key
     * Name of key.
     * @param {string | null} code
     * Code of `key`. Specify `null` for autodetect.
     * Autodetect works correctly only for letters.
     * @param {number | null} keyCode
     * "Numerical code identifying the unmodified value of the pressed key".
     * Specify `null` for autodetect.
     * @param {KeyboardEventInit} eventOptions
     * Custom options to add/overwrite event options.
     */
    function createKeyboardEvent(
        name,
        target,
        key,
        code,
        keyCode,
        eventOptions
    ) {
        if (code == null) {
            code = 'Key' + key.toUpperCase();
        }

        if (keyCode == null) {
            // `codePointAt`, not `charCodeAt`, because of
            // eslint-disable-next-line max-len
            // https://github.com/Amaimersion/google-docs-utils/issues/8#issuecomment-824117587
            keyCode = key.codePointAt(0);
        }

        return new KeyboardEvent(
            name,
            {
                repeat: false,
                isComposing: false,
                bubbles: true,
                cancelable: true,
                ctrlKey: false,
                shiftKey: false,
                altKey: false,
                metaKey: false,
                target: target,
                currentTarget: target,
                key: key,
                code: code,

                // it is important to also specify
                // these deprecated properties
                keyCode: keyCode,
                charCode: keyCode,
                which: keyCode,

                ...eventOptions
            }
        );
    }


    /**
     * @param {Document | HTMLElement} target
     * @param {string} key
     * @param {string | null} code
     * @param {number | null} keyCode
     * @param {KeyboardEventInit} eventOptions
     */
    function keypress(
        target,
        key,
        code = null,
        keyCode = null,
        eventOptions = {}
    ) {
        const event = createKeyboardEvent(
            'keypress',
            target,
            key,
            code,
            keyCode,
            eventOptions
        );

        target.dispatchEvent(event);
    }


    /**
     * @param {Document | HTMLElement} target
     * @param {string} key
     * @param {string | null} code
     * @param {number | null} keyCode
     * @param {KeyboardEventInit} eventOptions
     */
    function keydown(
        target,
        key,
        code = null,
        keyCode = null,
        eventOptions = {}
    ) {
        const event = createKeyboardEvent(
            'keydown',
            target,
            key,
            code,
            keyCode,
            eventOptions
        );

        target.dispatchEvent(event);
    }

    //#region Base

    /**
     * Imitates physical press on single character.
     */
    function Character(char, {
        ctrlKey = false,
        shiftKey = false
    } = {}) {
        // Google Docs handles `keydown` event in case of
        // "ctrl" or "shift" modificators, otherwise `keypress`
        // event should be used for normal characters
        if (ctrlKey || shiftKey) {
            keydown(
                getTextEventTarget(),
                char,
                null,
                null,
                {
                    ctrlKey,
                    shiftKey
                }
            );
        } else {
            keypress(
                getTextEventTarget(),
                char
            );
        }
    }

    /**
     * Imitates physical press on "Backspace".
     *
     * @param {boolean} ctrlKey
     */
    function Backspace({
        ctrlKey = false
    } = {}) {
        keydown(
            getTextEventTarget(),
            'Backspace',
            'Backspace',
            8,
            {
                ctrlKey
            }
        );
    }

    /**
     * Imitates physical press on "Tab".
     */
    function Tab() {
        keydown(
            getTextEventTarget(),
            'Tab',
            'Tab',
            9
        );
    }

    /**
     * Imitates physical press on "Enter".
     */
    function Enter() {
        keydown(
            getTextEventTarget(),
            'Enter',
            'Enter',
            13
        );
    }

    /**
     * Imitates physical press on space character.
     */
    function Space() {
        keypress(
            getTextEventTarget(),
            '\u0020',
            'Space',
            32
        );
    }

    /**
     * Imitates physical press on "End" button.
     */
    function End({
        ctrlKey = false,
        shiftKey = false
    } = {}) {
        keydown(
            getTextEventTarget(),
            'End',
            'End',
            35,
            {
                ctrlKey,
                shiftKey
            }
        );
    }

    /**
     * Imitates physical press on "Home" button.
     */
    function Home({
        ctrlKey = false,
        shiftKey = false
    } = {}) {
        keydown(
            getTextEventTarget(),
            'Home',
            'Home',
            36,
            {
                ctrlKey,
                shiftKey
            }
        );
    }

    /**
     * Imitates physical press on left arrow.
     */
    function ArrowLeft({
        ctrlKey = false,
        shiftKey = false
    } = {}) {
        keydown(
            getTextEventTarget(),
            'ArrowLeft',
            'ArrowLeft',
            37,
            {
                ctrlKey,
                shiftKey
            }
        );
    }

    /**
     * Imitates physical press on up arrow.
     */
    function ArrowUp({
        ctrlKey = false,
        shiftKey = false
    } = {}) {
        keydown(
            getTextEventTarget(),
            'ArrowUp',
            'ArrowUp',
            38,
            {
                ctrlKey,
                shiftKey
            }
        );
    }

    /**
     * Imitates physical press on right arrow.
     */
    function ArrowRight({
        ctrlKey = false,
        shiftKey = false
    } = {}) {
        keydown(
            getTextEventTarget(),
            'ArrowRight',
            'ArrowRight',
            39,
            {
                ctrlKey,
                shiftKey
            }
        );
    }

    /**
     * Imitates physical press on down arrow.
     */
    function ArrowDown({
        ctrlKey = false,
        shiftKey = false
    } = {}) {
        keydown(
            getTextEventTarget(),
            'ArrowDown',
            'ArrowDown',
            40,
            {
                ctrlKey,
                shiftKey
            }
        );
    }

    /**
     * Imitates physical press on "Delete" ("Del").
     */
    function Delete({
        ctrlKey = false
    } = {}) {
        keydown(
            getTextEventTarget(),
            'Delete',
            'Delete',
            46,
            {
                ctrlKey
            }
        );
    }

    //#endregion


    //#region Dependence

    /**
     * Imitates physical press on "Undo" button.
     */
    function Undo() {
        Character('z', {
            ctrlKey: true
        });
    }

    /**
     * Imitates physical press on "Redo" button.
     */
    function Redo() {
        Character('y', {
            ctrlKey: true
        });
    }

    /**
     * Imitates physical press on "Print" button
     * (print dialog, not print of character).
     */
    function PrintDialog() {
        Character('p', {
            ctrlKey: true
        });
    }

    /**
     * Imitates physical press on "Bold" button.
     */
    function Bold() {
        Character('b', {
            ctrlKey: true
        });
    }

    /**
     * Imitates physical press on "Italic" button.
     */
    function Italic() {
        Character('i', {
            ctrlKey: true
        });
    }

    /**
     * Imitates physical press on "Underline" button.
     */
    function Underline() {
        Character('u', {
            ctrlKey: true
        });
    }

    //#endregion

    var pressOn = /*#__PURE__*/Object.freeze({
        __proto__: null,
        Character: Character,
        Backspace: Backspace,
        Tab: Tab,
        Enter: Enter,
        Space: Space,
        End: End,
        Home: Home,
        ArrowLeft: ArrowLeft,
        ArrowUp: ArrowUp,
        ArrowRight: ArrowRight,
        ArrowDown: ArrowDown,
        Delete: Delete,
        Undo: Undo,
        Redo: Redo,
        PrintDialog: PrintDialog,
        Bold: Bold,
        Italic: Italic,
        Underline: Underline
    });

    /**
     * Types text at current caret position.
     *
     * - imitates physical typing
     *
     * @param {string} text
     * Text to type.
     */
    function typeText(text) {
        type(text);
    }


    /**
     * Types text at current caret position.
     *
     * - imitates key press char by char,
     * can take a long time for long text.
     *
     * @param {string} text
     */
    function type(text) {
        for (const char of text) {
            Character(char);
        }
    }

    /**
     * @returns {boolean}
     * Text selection is exists (at least one line).
     */
    function isTextSelected() {
        const selectionElements = getSelectionOverlayElements();
        const isSelected = selectionElements.some((i) => !!i);

        return isSelected;
    }

    /**
     * @returns {boolean}
     * Document is focused and active.
     * It is means that cursor is blinked.
     */
    function isDocumentActive() {
        const activeCursor = getActiveCursorElement();
        const documentIsActive = !!activeCursor;

        return documentIsActive;
    }

    /**
     * Focuses on current document.
     *
     * "Focus" means that document is active and available for editing:
     * cursor is blinking or selection active.
     *
     * @returns {boolean}
     * `true` if there was any actions to perform a focus,
     * `false` if document already was active and nothing was performed.
     */
    function focusDocument() {
        if (isDocumentActive()) {
            return false;
        }

        // character that is acceptable by Google Docs should be used.
        // For example, `\u0000` is not acceptable and will be not typed.
        // Use something from this plane:
        // https://www.compart.com/en/unicode/plane/U+0000
        const randomCharToCreateFocus = '\u003F';

        const textSelected = isTextSelected();

        Character(randomCharToCreateFocus);

        // if selection existed, then at the moment we removed it.
        // lets restore it, otherwise we will delete typed character
        if (textSelected) {
            Undo();
        } else {
            Backspace();
        }

        return true;
    }

    /**
     * Moves cursor to character that is placed to the left
     * of current cursor position. If that character placed
     * on previous line, then previous line will be used
     */
    function PrevCharacter() {
        ArrowLeft();
    }


    /**
     * Moves cursor to character that is placed to the right
     * of current cursor position. If that character placed
     * on next line, then next line will be used
     */
    function NextCharacter() {
        ArrowRight();
    }


    /**
     * Moves cursor to the previous line and tries to keep
     * cursor position. If there is no previous line, then moves
     * cursor to the start of current paragraph
     */
    function PrevLine() {
        ArrowUp();
    }


    /**
     * Moves cursor to the next line and tries to keep
     * cursor position. If there is no next line, then moves
     * cursor to the end of current paragraph
     */
    function NextLine() {
        ArrowDown();
    }


    /**
     * Moves cursor to:
     * - if it is start of current line, then to
     * the end of previous word on previous line
     * - else if it is start of current word, then to
     * the start of previous word
     * - else moves to the start of current word
     */
    function PrevWord() {
        ArrowLeft({
            ctrlKey: true
        });
    }


    /**
     * Moves cursor to:
     * - if it is end of current line, then to
     * the start of next word on next line
     * - else if it is end of current word, then to
     * the end of next word
     * - else moves to the end of current word
     */
    function NextWord() {
        ArrowRight({
            ctrlKey: true
        });
    }


    /**
     * Moves cursor to:
     * - if it is start of current paragraph, then to
     * the start of previous paragraph
     * - else moves to the start of current paragraph
     */
    function PrevParagraph() {
        ArrowUp({
            ctrlKey: true
        });
    }


    /**
     * Moves cursor to:
     * - if it is end of current paragraph, then to
     * the end of next paragraph
     * - else moves to the end of current paragraph
     */
    function NextParagraph() {
        ArrowDown({
            ctrlKey: true
        });
    }


    /**
     * Moves cursor to the start of current line.
     */
    function LineStart() {
        // focus is needed in order to behave properly
        focusDocument();

        Home();
    }


    /**
     * Moves cursor to the end of current line.
     */
    function LineEnd() {
        // focus is needed in order to behave properly
        focusDocument();

        End();
    }


    /**
     * Moves cursor to the start of document.
     */
    function DocumentStart() {
        Home({
            ctrlKey: true
        });
    }


    /**
     * Moves cursor to the end of document.
     */
    function DocumentEnd() {
        End({
            ctrlKey: true
        });
    }

    var moveCursorTo = /*#__PURE__*/Object.freeze({
        __proto__: null,
        PrevCharacter: PrevCharacter,
        NextCharacter: NextCharacter,
        PrevLine: PrevLine,
        NextLine: NextLine,
        PrevWord: PrevWord,
        NextWord: NextWord,
        PrevParagraph: PrevParagraph,
        NextParagraph: NextParagraph,
        LineStart: LineStart,
        LineEnd: LineEnd,
        DocumentStart: DocumentStart,
        DocumentEnd: DocumentEnd
    });

    /**
     * Removes:
     * - if prev word is present, then it will be removed
     * - else content from current line will be divided with prev line
     */
    function PrevWord$1() {
        Backspace({
            ctrlKey: true
        });
    }


    /**
     * Removes:
     * - if next word is present, then it will be removed
     * - else content from current line will be divided with next line
     */
    function NextWord$1() {
        Delete({
            ctrlKey: true
        });
    }


    /**
     * Removes active selection.
     *
     * @returns {boolean}
     * `true` - selection was removed,
     * `false` - nothing to remove (nothing is selected)
     */
     function Selection() {
        if (!isTextSelected()) {
            return false;
        }

        // "Delete" should be used, not "Backspace".
        Delete();

        return true;
    }

    var remove = /*#__PURE__*/Object.freeze({
        __proto__: null,
        PrevWord: PrevWord$1,
        NextWord: NextWord$1,
        Selection: Selection
    });

    /**
     * Selects text of entire document.
     */
    function All() {
        Character('a', {
            ctrlKey: true
        });
    }


    /**
     * Selects a character that is placed to the left of
     * current cursor position. Following logic will be used,
     * with priority of actions from top to bottom:
     * - if at least one character already selected with reverse selection
     * (opposite direction), then lastly selected character will be deselected
     * - if at least one character already selected, then next one will
     * be selected. If that next character located on previous line,
     * than that previous line will be used
     * - if nothing selected, then first character will be selected
     */
    function PrevCharacter$1() {
        ArrowLeft({
            shiftKey: true
        });
    }


    /**
     * Selects a character that is placed to the right of
     * current cursor position. Following logic will be used,
     * with priority of actions from top to bottom:
     * - if at least one character already selected with reverse selection
     * (opposite direction), then lastly selected character will be deselected
     * - if at least one character already selected, then next one will
     * be selected. If that next character located on next line,
     * than that next line will be used
     * - if nothing selected, then first character will be selected
     */
    function NextCharacter$1() {
        ArrowRight({
            shiftKey: true
        });
    }


    /**
     * Same as `PrevCharacter`, but performs an action with word.
     */
    function PrevWord$2() {
        ArrowLeft({
            shiftKey: true,
            ctrlKey: true
        });
    }


    /**
     * Same as `NextCharacter`, but performs an action with word.
     */
    function NextWord$2() {
        ArrowRight({
            shiftKey: true,
            ctrlKey: true
        });
    }


    /**
     * Selects N number of characters to the left where N
     * is a max length of line.
     */
    function PrevLine$1() {
        // requires focus to behave correctly
        focusDocument();

        ArrowUp({
            shiftKey: true
        });
    }


    /**
     * Same as `PrevLine`, but uses right direction.
     */
    function NextLine$1() {
        // requires focus to behave correctly
        focusDocument();

        ArrowDown({
            shiftKey: true
        });
    }


    /**
     * Selects a paragraph that is placed to the left of
     * current cursor position. Following logic will be used,
     * with priority of actions from top to bottom:
     * - if it is start of current paragraph, then previous
     * paragraph will be selected
     * - else text between current paragraph start and current
     * cursor position will be selected
     */
    function PrevParagraph$1() {
        ArrowUp({
            shiftKey: true,
            ctrlKey: true
        });
    }


    /**
     * Selects a paragraph that is placed to the right of
     * current cursor position. Following logic will be used,
     * with priority of actions from top to bottom:
     * - if it is end of current paragraph, then next
     * paragraph will be NOT selected
     * - else text between current paragraph end and current
     * cursor position will be selected
     */
    function NextParagraph$1() {
        ArrowDown({
            shiftKey: true,
            ctrlKey: true
        });
    }


    /**
     * Selects a text between current cursor position and
     * current line start.
     */
    function TextBetweenCursorAndLineStart() {
        // requires focus to behave correctly
        focusDocument();

        Home({
            shiftKey: true
        });
    }


    /**
     * Same as `TextBetweenCursorAndLineStart`, but interacts
     * with current line end.
     */
    function TextBetweenCursorAndLineEnd() {
        // requires focus to behave correctly
        focusDocument();

        End({
            shiftKey: true
        });
    }


    /**
     * Same as `TextBetweenCursorAndLineStart`, but interacts
     * with document start.
     */
    function TextBetweenCursorAndDocumentStart() {
        Home({
            shiftKey: true,
            ctrlKey: true
        });
    }


    /**
     * Same as `TextBetweenCursorAndLineStart`, but interacts
     * with document end.
     */
    function TextBetweenCursorAndDocumentEnd() {
        End({
            shiftKey: true,
            ctrlKey: true
        });
    }

    var select = /*#__PURE__*/Object.freeze({
        __proto__: null,
        All: All,
        PrevCharacter: PrevCharacter$1,
        NextCharacter: NextCharacter$1,
        PrevWord: PrevWord$2,
        NextWord: NextWord$2,
        PrevLine: PrevLine$1,
        NextLine: NextLine$1,
        PrevParagraph: PrevParagraph$1,
        NextParagraph: NextParagraph$1,
        TextBetweenCursorAndLineStart: TextBetweenCursorAndLineStart,
        TextBetweenCursorAndLineEnd: TextBetweenCursorAndLineEnd,
        TextBetweenCursorAndDocumentStart: TextBetweenCursorAndDocumentStart,
        TextBetweenCursorAndDocumentEnd: TextBetweenCursorAndDocumentEnd
    });

    /**
     * Type of Google Docs event.
     */
    const EVENT_TYPE = {
        selectionChange: 'selectionchange'
    };

    /**
     * Google Docs event listeners.
     *
     * Structure:
     * - key: event type
     * - value: all registered listeners for that event
     *
     * @type {{[key: string]: Function[]}}
     */
    const EVENT_LISTENERS = {};


    //#region Precalculated values

    const KIX_SELECTION_OVERLAY_CLASS_LIST = selectorsToClassList(
        kixSelectionOverlay
    );

    //#endregion


    /**
     * Runs on script inject.
     */
    function main() {
        runOnPageLoaded(bindObserver);
    }


    /**
     * Creates mutation observer and starts observing Google Docs container.
     * The container element should be created at that stage.
     */
    function bindObserver() {
        const docsEditorContainer$1 = querySelector(docsEditorContainer);

        if (docsEditorContainer$1 == null) {
            throw new Error('Unable to observe missing docsEditorContainer');
        }

        const observer = new MutationObserver(mutationCallback);

        observer.observe(
            docsEditorContainer$1,
            {
                subtree: true,
                childList: true,
                attributes: false,
                characterData: false
            }
        );
    }


    /**
     * Callback which will be called on every Google Docs mutation.
     */
    function mutationCallback(mutationList) {
        let selectionChangeEvent = false;

        // TODO: refactoring of that entire loop if there will be more events
        for (const mutation of mutationList) {
            for (const addedNode of mutation.addedNodes) {
                const addedNodeClassList = Array.from(
                    addedNode.classList || []
                );

                selectionChangeEvent = (
                    selectionChangeEvent ||
                    KIX_SELECTION_OVERLAY_CLASS_LIST.some(
                        (value) => addedNodeClassList.includes(value)
                    )
                );
            }

            for (const removedNode of mutation.removedNodes) {
                const removedNodeClassList = Array.from(
                    removedNode.classList || []
                );

                selectionChangeEvent = (
                    selectionChangeEvent ||
                    KIX_SELECTION_OVERLAY_CLASS_LIST.some(
                        (value) => removedNodeClassList.includes(value)
                    )
                );
            }
        }

        if (selectionChangeEvent) {
            callEventListener(EVENT_TYPE.selectionChange);
        }
    }


    /**
     * Adds listener for specific event.
     *
     * There can be many listeners for single event.
     * Order of calling is same as order of adding.
     *
     * @param {string} type
     * Type of event. Use `EVENT_TYPE`.
     * @param {(event: object) => any} listener
     * Callback that will be called.
     * Information about event will be passed as argument.
     */
    function addEventListener(type, listener) {
        if (!EVENT_LISTENERS[type]) {
            EVENT_LISTENERS[type] = [];
        }

        EVENT_LISTENERS[type].push(listener);
    }


    /**
     * Calls all registered event listeners for specific event.
     *
     * @param {string} type
     * Type of event. Use `EVENT_TYPE`.
     */
    function callEventListener(type) {
        const listeners = EVENT_LISTENERS[type];

        if (!listeners) {
            return;
        }

        for (const listener of listeners) {
            try {
                listener({
                    type: type
                });
            } catch (error) {
                console.error(error);
            }
        }
    }


    main();

    exports.addEventListener = addEventListener;
    exports.clearTextContent = clearTextContent;
    exports.focusDocument = focusDocument;
    exports.getActiveCursorElement = getActiveCursorElement;
    exports.getCaret = getCaret;
    exports.getCaretElement = getCaretElement;
    exports.getCaretWord = getCaretWord;
    exports.getCursorElement = getCursorElement;
    exports.getEditorElement = getEditorElement;
    exports.getLineText = getLineText;
    exports.getLinesElements = getLinesElements;
    exports.getLinesText = getLinesText;
    exports.getLinesTextElements = getLinesTextElements;
    exports.getPagesElements = getPagesElements;
    exports.getSelection = getSelection;
    exports.getSelectionOverlayElements = getSelectionOverlayElements;
    exports.getTextEventTarget = getTextEventTarget;
    exports.getWordElements = getWordElements;
    exports.isDocumentActive = isDocumentActive;
    exports.isTextSelected = isTextSelected;
    exports.moveCursorTo = moveCursorTo;
    exports.pressOn = pressOn;
    exports.remove = remove;
    exports.select = select;
    exports.typeText = typeText;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

}({}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb21tb24vc2VsZWN0b3JzLmpzIiwiLi4vLi4vc3JjL2NvbW1vbi9xdWVyeS1zZWxlY3Rvci5qcyIsIi4uLy4uL3NyYy9nZXQtZWRpdG9yLWVsZW1lbnQuanMiLCIuLi8uLi9zcmMvY29tbW9uL3V0aWxzLmpzIiwiLi4vLi4vc3JjL2dldC10ZXh0LWV2ZW50LXRhcmdldC5qcyIsIi4uLy4uL3NyYy9nZXQtcGFnZXMtZWxlbWVudHMuanMiLCIuLi8uLi9zcmMvZ2V0LWxpbmVzLWVsZW1lbnRzLmpzIiwiLi4vLi4vc3JjL2dldC1saW5lcy10ZXh0LWVsZW1lbnRzLmpzIiwiLi4vLi4vc3JjL2NsZWFyLXRleHQtY29udGVudC5qcyIsIi4uLy4uL3NyYy9nZXQtbGluZXMtdGV4dC5qcyIsIi4uLy4uL3NyYy9nZXQtbGluZS10ZXh0LmpzIiwiLi4vLi4vc3JjL2dldC13b3JkLWVsZW1lbnRzLmpzIiwiLi4vLi4vc3JjL2dldC1zZWxlY3Rpb24tb3ZlcmxheS1lbGVtZW50cy5qcyIsIi4uLy4uL3NyYy9nZXQtc2VsZWN0aW9uLmpzIiwiLi4vLi4vc3JjL2dldC1jdXJzb3ItZWxlbWVudC5qcyIsIi4uLy4uL3NyYy9nZXQtYWN0aXZlLWN1cnNvci1lbGVtZW50LmpzIiwiLi4vLi4vc3JjL2dldC1jYXJldC1lbGVtZW50LmpzIiwiLi4vLi4vc3JjL2dldC1jYXJldC5qcyIsIi4uLy4uL3NyYy9nZXQtY2FyZXQtd29yZC5qcyIsIi4uLy4uL3NyYy9jb21tb24va2V5Ym9hcmQtZXZlbnQuanMiLCIuLi8uLi9zcmMvcHJlc3Mtb24uanMiLCIuLi8uLi9zcmMvdHlwZS10ZXh0LmpzIiwiLi4vLi4vc3JjL2lzLXRleHQtc2VsZWN0ZWQuanMiLCIuLi8uLi9zcmMvaXMtZG9jdW1lbnQtYWN0aXZlLmpzIiwiLi4vLi4vc3JjL2ZvY3VzLWRvY3VtZW50LmpzIiwiLi4vLi4vc3JjL21vdmUtY3Vyc29yLXRvLmpzIiwiLi4vLi4vc3JjL3JlbW92ZS5qcyIsIi4uLy4uL3NyYy9zZWxlY3QuanMiLCIuLi8uLi9zcmMvbXV0YXRpb24tb2JzZXJ2ZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBTZWxlY3RvcnMgdG8gZmluZCBlbGVtZW50IGluIHRoZSBwYWdlLlxuICpcbiAqIFVzZSBhcnJheSBvZiBzdHJpbmdzLCBub3QganVzdCBzaW5nbGUgc3RyaW5nIHZhbHVlLlxuICogSXQgaXMgbWVhbnMgdGhlcmUgY2FuIGJlIG11bHRpcGxlIHNlbGVjdG9ycyBmb3Igc2luZ2xlXG4gKiBlbGVtZW50LCBpbiBkZXNjZW5kaW5nIG9yZGVyIG9mIHByaW9yaXR5LlxuICogRm9yIGV4YW1wbGUsIGlmIHNlbGVjdG9yIOKEliAxIHJldHVybmVkIHNvbWUgcmVzdWx0LCB0aGVuXG4gKiB0aGF0IHJlc3VsdCB3aWxsIGJlIHVzZWQsIG90aGVyd2lzZSBzZWxlY3RvciDihJYgMiB3aWxsXG4gKiBiZSB1c2VkIHRvIHRyeSB0byBnZXQgdmFsaWQgcmVzdWx0LCBldGMuXG4gKiBJZiB0aGVyZSBvbmx5IG9uZSB2YWx1ZSwgdGhlbiB1c2UgYXJyYXkgd2l0aCBvbmUgZWxlbWVudC5cbiAqL1xuXG5cbmV4cG9ydCBjb25zdCBkb2NzRWRpdG9yQ29udGFpbmVyID0gW1xuICAgICcjZG9jcy1lZGl0b3ItY29udGFpbmVyJ1xuXTtcblxuZXhwb3J0IGNvbnN0IGRvY3NFZGl0b3IgPSBbXG4gICAgJyNkb2NzLWVkaXRvcicsXG4gICAgLi4uZG9jc0VkaXRvckNvbnRhaW5lclxuXTtcblxuZXhwb3J0IGNvbnN0IHRleHRFdmVudFRhcmdldCA9IFtcbiAgICAnaWZyYW1lLmRvY3MtdGV4dGV2ZW50dGFyZ2V0LWlmcmFtZScsXG4gICAgJy5kb2NzLXRleHRldmVudHRhcmdldC1pZnJhbWUnXG5dO1xuXG5leHBvcnQgY29uc3Qga2l4UGFnZSA9IFtcbiAgICAnLmtpeC1wYWdlJyxcbiAgICAnLmRvY3MtcGFnZSdcbl07XG5cbmV4cG9ydCBjb25zdCBraXhMaW5lID0gW1xuICAgICcua2l4LWxpbmV2aWV3JyxcbiAgICAnLmtpeC1wYXJhZ3JhcGhyZW5kZXJlcidcbl07XG5cbmV4cG9ydCBjb25zdCBraXhMaW5lVGV4dCA9IFtcbiAgICAnLmtpeC1saW5ldmlldy10ZXh0LWJsb2NrJ1xuXTtcblxuZXhwb3J0IGNvbnN0IGtpeFdvcmROb25lID0gW1xuICAgICcua2l4LXdvcmRodG1sZ2VuZXJhdG9yLXdvcmQtbm9kZSdcbl07XG5cbmV4cG9ydCBjb25zdCBraXhTZWxlY3Rpb25PdmVybGF5ID0gW1xuICAgICcua2l4LXNlbGVjdGlvbi1vdmVybGF5J1xuXTtcblxuZXhwb3J0IGNvbnN0IGtpeEN1cnNvciA9IFtcbiAgICAnLmtpeC1jdXJzb3InXG5dO1xuXG5leHBvcnQgY29uc3Qga2l4QWN0aXZlQ3Vyc29yID0gW1xuICAgICcuZG9jcy10ZXh0LXVpLWN1cnNvci1ibGluaydcbl07XG5cbmV4cG9ydCBjb25zdCBraXhDdXJzb3JDYXJldCA9IFtcbiAgICAnLmtpeC1jdXJzb3ItY2FyZXQnXG5dO1xuIiwiLyoqXG4gKiBHZXRzIEhUTUwgZWxlbWVudCB1c2luZyBgcXVlcnlTZWxlY3RvcmAuXG4gKlxuICogQHBhcmFtIHtzdHJpbmdbXX0gc2VsZWN0b3JzXG4gKiBBcnJheSBvZiBwb3NzaWJsZSBzZWxlY3RvcnMuXG4gKiBJZiBzZWxlY3RvciByZXN1bHRzIHRvIHNvbWUgZWxlbWVudCxcbiAqIHRoZW4gdGhhdCBlbGVtZW50IHdpbGwgYmUgcmV0dXJuZWQsXG4gKiBvdGhlcndpc2UgbmV4dCBzZWxlY3RvciB3aWxsIGJlIHVzZWQuXG4gKiBAcGFyYW0ge2RvY3VtZW50IHwgSFRNTEVsZW1lbnR9IHJvb3RcbiAqIEEgcm9vdCBpbiB3aGljaCB0aGUgZWxlbWVudCB3aWxsIGJlIHNlYXJjaGVkLlxuICogRGVmYXVsdHMgdG8gYGRvY3VtZW50YC5cbiAqXG4gKiBAcmV0dXJucyB7SFRNTEVsZW1lbnQgfCBudWxsfVxuICogSFRNTCBlbGVtZW50IGlmIGZpbmRlZCwgYG51bGxgIG90aGVyd2lzZS5cbiAqXG4gKiBAdGhyb3dzXG4gKiBUaHJvd3MgYW4gZXJyb3IgaWYgYHJvb3QgPT0gbnVsbGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBxdWVyeVNlbGVjdG9yKFxuICAgIHNlbGVjdG9ycyxcbiAgICByb290ID0gZG9jdW1lbnRcbikge1xuICAgIGlmIChyb290ID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQYXNzZWQgcm9vdCBlbGVtZW50IGRvZXMgbm90IGV4aXN0cycpO1xuICAgIH1cblxuICAgIGxldCB2YWx1ZSA9IG51bGw7XG5cbiAgICBmb3IgKGNvbnN0IHNlbGVjdG9yIG9mIHNlbGVjdG9ycykge1xuICAgICAgICB2YWx1ZSA9IHJvb3QucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG5cbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB2YWx1ZTtcbn1cblxuXG4vKipcbiAqIEdldHMgYWxsIEhUTUwgZWxlbWVudHMgdXNpbmcgYHF1ZXJ5U2VsZWN0b3JBbGxgLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nW119IHNlbGVjdG9yc1xuICogQXJyYXkgb2YgcG9zc2libGUgc2VsZWN0b3JzLlxuICogSWYgc2VsZWN0b3IgcmVzdWx0cyB0byBzb21lIGVsZW1lbnRzLFxuICogdGhlbiB0aGVzZSBlbGVtZW50cyB3aWxsIGJlIHJldHVybmVkLFxuICogb3RoZXJ3aXNlIG5leHQgc2VsZWN0b3Igd2lsbCBiZSB1c2VkLlxuICogQHBhcmFtIHtkb2N1bWVudCB8IEhUTUxFbGVtZW50fSByb290XG4gKiBBIHJvb3QgaW4gd2hpY2ggZWxlbWVudHMgd2lsbCBiZSBzZWFyY2hlZC5cbiAqIERlZmF1bHRzIHRvIGBkb2N1bWVudGAuXG4gKlxuICogQHJldHVybnMge0hUTUxFbGVtZW50W119XG4gKiBIVE1MIGVsZW1lbnRzIGlmIGZpbmRlZCwgb3RoZXJ3aXNlIGVtcHR5IGFycmF5LlxuICpcbiAqIEB0aHJvd3NcbiAqIFRocm93cyBhbiBlcnJvciBpZiBgcm9vdCA9PSBudWxsYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHF1ZXJ5U2VsZWN0b3JBbGwoXG4gICAgc2VsZWN0b3JzLFxuICAgIHJvb3QgPSBkb2N1bWVudFxuKSB7XG4gICAgaWYgKHJvb3QgPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Bhc3NlZCByb290IGVsZW1lbnQgZG9lcyBub3QgZXhpc3RzJyk7XG4gICAgfVxuXG4gICAgbGV0IHZhbHVlID0gbnVsbDtcblxuICAgIGZvciAoY29uc3Qgc2VsZWN0b3Igb2Ygc2VsZWN0b3JzKSB7XG4gICAgICAgIHZhbHVlID0gcm9vdC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcblxuICAgICAgICBpZiAodmFsdWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIEFycmF5LmZyb20odmFsdWUpO1xuICAgIH1cblxuICAgIHJldHVybiBbXTtcbn1cbiIsImltcG9ydCB7ZG9jc0VkaXRvcn0gZnJvbSAnLi9jb21tb24vc2VsZWN0b3JzJztcbmltcG9ydCB7cXVlcnlTZWxlY3Rvcn0gZnJvbSAnLi9jb21tb24vcXVlcnktc2VsZWN0b3InO1xuXG5cbi8qKlxuICogQHJldHVybnNcbiAqIEN1cnJlbnQgYWN0aXZlIGVkaXRvciBlbGVtZW50LlxuICogTk9URTogaXQgY29udGFpbnMgb25seSBlZGl0b3IgZWxlbWVudCBpdHNlbGYsXG4gKiBub3QgYmFyIGFuZCBvdGhlciBlbGVtZW50cy5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZ2V0RWRpdG9yRWxlbWVudCgpIHtcbiAgICByZXR1cm4gcXVlcnlTZWxlY3Rvcihkb2NzRWRpdG9yKTtcbn1cbiIsIi8qKlxuICogSm9pbnMgdGV4dCB1c2luZyBzZXBhcmF0b3IuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBqb2luVGV4dChzZXBhcmF0b3IsIC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gYXJncy5qb2luKHNlcGFyYXRvcik7XG59XG5cblxuLyoqXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbGVtZW50XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0lmcmFtZShlbGVtZW50KSB7XG4gICAgcmV0dXJuIChlbGVtZW50Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdpZnJhbWUnKTtcbn1cblxuXG4vKipcbiAqIE5PVEU6IGR1cmluZyBleGVjdXRpb24gdGVtcCBlbGVtZW50IHdpbGwgYmUgYWRkZWRcbiAqIGluIHRoZSBET00uIFRoYXQgZWxlbWVudCB3aWxsIGJlIGludmlzaWJsZSB0byB1c2VyLFxuICogYW5kIHRoYXQgZWxlbWVudCB3aWxsIGJlIHJlbW92ZWQgaW4gdGhlIGVuZCBvZiBleGVjdXRpb24uXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGNoYXJcbiAqIFNpbmdsZSBjaGFyYWN0ZXIgaXMgZXhwZWN0ZWQuXG4gKiBZb3UgY2FuIHBhc3MgbW9yZSB0aGFuIG9uZSBjaGFyYWN0ZXIsXG4gKiBidXQgcmVzdWx0IHdpbGwgYmUgbm90IHNvIGFjY3VyYXRlLCBiZWNhdXNlLFxuICogZm9yIGV4YW1wbGUsIGRpZmZlcmVudCBjaGFyYWN0ZXJzIG1heSBoYXZlIGRpZmZlcmVudCB3aWR0aC5cbiAqIEBwYXJhbSB7c3RyaW5nfSBjc3NcbiAqIFVzaW5nIHRoYXQgQ1NTIGBjaGFyYCB3YXMgcmVuZGVyZWQuXG4gKiBJdCBpcyBpbXBvcnRhbnQgdG8gcHJvdmlkZSBleGFjdGx5IENTU1xuICogdGhhdCB3YXMgdXNlZCBmb3IgcmVuZGVyaW5nLCBiZWNhdXNlXG4gKiBkaWZmZXJlbnQgQ1NTIG1heSBsZWFkIHRvIGRpZmZlcmVudCByZWN0LlxuICpcbiAqIEByZXR1cm5zIHtET01SZWN0UmVhZE9ubHl9XG4gKiBSZWN0IG9mIHJlbmRlcmVkIGNoYXJhY3Rlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENoYXJSZWN0KGNoYXIsIGNzcykge1xuICAgIGNvbnN0IGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG5cbiAgICBlbGVtZW50LnRleHRDb250ZW50ID0gY2hhcjtcbiAgICBlbGVtZW50LnN0eWxlLmNzc1RleHQgPSBjc3M7XG5cbiAgICAvLyBzZXF1ZW5jZXMgb2Ygd2hpdGUgc3BhY2VzIHNob3VsZCBiZSBwcmVzZXJ2ZWRcbiAgICBlbGVtZW50LnN0eWxlLndoaXRlU3BhY2UgPSAncHJlJztcblxuICAgIC8vIGRvbid0IGRpc3BsYXkgdGhpcyBlbGVtZW50IHRoaXMgZWxlbWVudFxuICAgIGVsZW1lbnQuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgIGVsZW1lbnQuc3R5bGUudG9wID0gJy0xMDBweCc7XG5cbiAgICAvLyBuZWVkIHRvIHJlbmRlciB0aGlzIGVsZW1lbnQgaW4gb3JkZXIgdG8gZ2V0IHZhbGlkIHJlY3RcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGVsZW1lbnQpO1xuXG4gICAgY29uc3QgcmVjdCA9IGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICBlbGVtZW50LnJlbW92ZSgpO1xuXG4gICAgcmV0dXJuIHJlY3Q7XG59XG5cblxuLyoqXG4gKiBAcGFyYW0ge0RPTVJlY3RSZWFkT25seX0gYVxuICogQHBhcmFtIHtET01SZWN0UmVhZE9ubHl9IGJcbiAqXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqIFR3byByZWN0cyBvdmVybGFwcyBlYWNoIG90aGVyLlxuICpcbiAqIEBzZWUgaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9hLzMwNjMzMi84NDQ1NDQyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1JlY3RzT3ZlcmxhcChhLCBiKSB7XG4gICAgcmV0dXJuIChcbiAgICAgICAgKGEubGVmdCA8PSBiLnJpZ2h0KSAmJlxuICAgICAgICAoYS5yaWdodCA+PSBiLmxlZnQpICYmXG4gICAgICAgIChhLnRvcCA8PSBiLmJvdHRvbSkgJiZcbiAgICAgICAgKGEuYm90dG9tID49IGIudG9wKVxuICAgICk7XG59XG5cblxuLyoqXG4gKiBTaW1pbGFyIHRvIFJlZ0V4cCBgXFx3YCwgYnV0IGFsc28gc3VwcG9ydHMgbm9uLUFTQ0lJIGNoYXJhY3RlcnNcbiAqXG4gKiBXQVJOSU5HOlxuICogaXQgd2lsbCBub3Qgd29yayBmb3IgQ2hpbmVzZSwgSmFwYW5lc2UsIEFyYWJpYywgSGVicmV3IGFuZCBtb3N0XG4gKiBvdGhlciBzY3JpcHRzIHdoaWNoIGRvZXNuJ3QgaGF2ZSB1cHBlciBhbmQgbG93ZXIgbGF0dGVycy5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gY2hhclxuICogQ2hhciB0byBjaGVjay5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNoYXJJc1dvcmRDaGFyKGNoYXIpIHtcbiAgICAvLyBBU0NJSSwgbnVtYmVycywgdW5kZXJzY29yZXMgYW5kIG90aGVyIHN5bWJvbHNcbiAgICBpZiAoY2hhci5tYXRjaCgvW1xcd10vKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMzI1Njc3ODkvODQ0NTQ0MlxuICAgIGlmIChjaGFyLnRvTG93ZXJDYXNlKCkgIT09IGNoYXIudG9VcHBlckNhc2UoKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cblxuLyoqXG4gKiBSdW5zIGEgbWV0aG9kIHdoZW4gcGFnZSBpcyBmdWxseSBsb2FkZWQuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gbWV0aG9kXG4gKiBNZXRob2QgdG8gcnVuLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcnVuT25QYWdlTG9hZGVkKG1ldGhvZCkge1xuICAgIC8vIGluaGVyaXQgYHRoaXNgIGNvbnRleHQuXG4gICAgY29uc3QgbXRoZCA9ICgpID0+IHtcbiAgICAgICAgbWV0aG9kKCk7XG4gICAgfTtcblxuICAgIGlmIChkb2N1bWVudC5yZWFkeVN0YXRlID09PSAnbG9hZGluZycpIHtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIG10aGQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIG10aGQoKTtcbiAgICB9XG59XG5cblxuLyoqXG4gKiBDb252ZXJ0cyBzZWxlY3RvcnMgKGBzZWxlY3RvcnMuanNgKSB0byBsaXN0IG9mIGNsYXNzIG5hbWVzLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nW119IHNlbGVjdG9yc1xuICogU2VsZWN0b3JzIHZhcmlhYmxlIGZyb20gYHNlbGVjdG9ycy5qc2AgZmlsZS5cbiAqXG4gKiBAcmV0dXJuc1xuICogQ2xhc3MgbmFtZXMgb25lIGJ5IG9uZSwgd2l0aG91dCBkb3QuXG4gKiBTZWUgZXhhbXBsZSBmb3IgbW9yZS5cbiAqXG4gKiBAZXhhbXBsZVxuICogKFtcbiAqICAnLnRlc3QnLCAnLnRlc3QyLmlmcmFtZScsICcjbmlkZS5oaWRlJyxcbiAqICAnZGl2LmRpdjEuZGl2MicsICcjdGFnJ1xuICogXSkgPT4gW1xuICogICd0ZXN0JywgJ3Rlc3QyJywgJ2lmcmFtZScsICdoaWRlJyxcbiAqICAnZGl2MScsICdkaXYyJ1xuICogXVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2VsZWN0b3JzVG9DbGFzc0xpc3Qoc2VsZWN0b3JzKSB7XG4gICAgY29uc3QgcmVzdWx0ID0gW107XG5cbiAgICBmb3IgKGxldCBzZWxlY3RvciBvZiBzZWxlY3RvcnMpIHtcbiAgICAgICAgaWYgKCFzZWxlY3Rvci5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgICAgICAgIHNlbGVjdG9yID0gc2VsZWN0b3Iuc2xpY2UoXG4gICAgICAgICAgICAgICAgc2VsZWN0b3IuaW5kZXhPZignLicpXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgc2VsZWN0b3IgPSBzZWxlY3Rvci5zbGljZSgxKTtcbiAgICAgICAgY29uc3QgY2xhc3NOYW1lcyA9IHNlbGVjdG9yLnNwbGl0KCcuJyk7XG5cbiAgICAgICAgZm9yIChjb25zdCBjbGFzc05hbWUgb2YgY2xhc3NOYW1lcykge1xuICAgICAgICAgICAgaWYgKGNsYXNzTmFtZSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKGNsYXNzTmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuIiwiaW1wb3J0IHt0ZXh0RXZlbnRUYXJnZXR9IGZyb20gJy4vY29tbW9uL3NlbGVjdG9ycyc7XG5pbXBvcnQge3F1ZXJ5U2VsZWN0b3J9IGZyb20gJy4vY29tbW9uL3F1ZXJ5LXNlbGVjdG9yJztcbmltcG9ydCB7aXNJZnJhbWV9IGZyb20gJy4vY29tbW9uL3V0aWxzJztcblxuXG4vKipcbiAqIC0gR29vZ2xlIERvY3MgdXNlcyBzcGVjaWFsIHRhcmdldCB0byBoYW5kbGVcbiAqIHRleHQgZXZlbnRzLiBTbywgZm9yIGV4YW1wbGUsIHlvdSBjYW5ub3Qgc2VuZFxuICogdGV4dCBldmVudCBqdXN0IHRvIGN1cnJlbnQgZG9jdW1lbnQuIFlvdVxuICogc2hvdWxkIHVzZSBzcGVjaWFsIHRhcmdldCBmb3IgdGhhdC5cbiAqXG4gKiBAcmV0dXJucyB7SFRNTEVsZW1lbnQgfCBEb2N1bWVudH1cbiAqIEEgdGFyZ2V0IHRoYXQgY2FuIGJlIHVzZWQgdG8gc2VuZCB0ZXh0IGV2ZW50c1xuICogYW5kIGxpc3RlbnMgZm9yIHRleHQgZXZlbnRzIChpbiBwYXJ0aWN1bGFyLCBrZXlib2FyZCBldmVudHMpLlxuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBnZXRUZXh0RXZlbnRUYXJnZXQoKSB7XG4gICAgLyoqXG4gICAgICogQHR5cGUge0hUTUxFbGVtZW50ICYgSFRNTElGcmFtZUVsZW1lbnR9XG4gICAgICovXG4gICAgY29uc3QgZWxlbWVudCA9IHF1ZXJ5U2VsZWN0b3IodGV4dEV2ZW50VGFyZ2V0KTtcblxuICAgIGlmIChpc0lmcmFtZShlbGVtZW50KSkge1xuICAgICAgICByZXR1cm4gZWxlbWVudC5jb250ZW50RG9jdW1lbnQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVsZW1lbnQ7XG59XG4iLCJpbXBvcnQge2tpeFBhZ2V9IGZyb20gJy4vY29tbW9uL3NlbGVjdG9ycyc7XG5pbXBvcnQge3F1ZXJ5U2VsZWN0b3JBbGx9IGZyb20gJy4vY29tbW9uL3F1ZXJ5LXNlbGVjdG9yJztcbmltcG9ydCBnZXRFZGl0b3JFbGVtZW50IGZyb20gJy4vZ2V0LWVkaXRvci1lbGVtZW50JztcblxuXG4vKipcbiAqIEByZXR1cm5zXG4gKiBBbGwgcmVuZGVyZWQgcGFnZXMgb2YgZWRpdG9yLlxuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBnZXRQYWdlc0VsZW1lbnRzKCkge1xuICAgIGNvbnN0IGVkaXRvciA9IGdldEVkaXRvckVsZW1lbnQoKTtcblxuICAgIHJldHVybiBxdWVyeVNlbGVjdG9yQWxsKGtpeFBhZ2UsIGVkaXRvcik7XG59XG4iLCJpbXBvcnQge2tpeExpbmV9IGZyb20gJy4vY29tbW9uL3NlbGVjdG9ycyc7XG5pbXBvcnQge3F1ZXJ5U2VsZWN0b3JBbGx9IGZyb20gJy4vY29tbW9uL3F1ZXJ5LXNlbGVjdG9yJztcbmltcG9ydCBnZXRQYWdlc0VsZW1lbnRzIGZyb20gJy4vZ2V0LXBhZ2VzLWVsZW1lbnRzJztcblxuXG4vKipcbiAqIEByZXR1cm5zIHtIVE1MRWxlbWVudFtdfVxuICogQWxsIHJlbmRlcmVkIHBhZ2VzIG9mIGVkaXRvci5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZ2V0TGluZXNFbGVtZW50cygpIHtcbiAgICBjb25zdCBwYWdlcyA9IGdldFBhZ2VzRWxlbWVudHMoKTtcbiAgICBsZXQgcmVzdWx0ID0gW107XG5cbiAgICBmb3IgKGNvbnN0IHBhZ2Ugb2YgcGFnZXMpIHtcbiAgICAgICAgY29uc3QgbGluZXMgPSBxdWVyeVNlbGVjdG9yQWxsKGtpeExpbmUsIHBhZ2UpO1xuICAgICAgICByZXN1bHQgPSBbXG4gICAgICAgICAgICAuLi5yZXN1bHQsXG4gICAgICAgICAgICAuLi5saW5lc1xuICAgICAgICBdO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59XG4iLCJpbXBvcnQge2tpeExpbmVUZXh0fSBmcm9tICcuL2NvbW1vbi9zZWxlY3RvcnMnO1xuaW1wb3J0IHtxdWVyeVNlbGVjdG9yfSBmcm9tICcuL2NvbW1vbi9xdWVyeS1zZWxlY3Rvcic7XG5pbXBvcnQgZ2V0TGluZXNFbGVtZW50cyBmcm9tICcuL2dldC1saW5lcy1lbGVtZW50cyc7XG5cblxuLyoqXG4gKiBAcmV0dXJucyB7SFRNTEVsZW1lbnRbXX1cbiAqIFRleHQgZWxlbWVudHMgb2YgZWFjaCBsaW5lLlxuICogRXZlcnkgdGV4dCBlbGVtZW50IGNvbnRhaW5zIGFsbCB3b3JkIGVsZW1lbnRzXG4gKiAodGhlcmUgY2FuIGJlIG11bHRpcGxlIHdvcmQgZWxlbWVudHMgZm9yIG9uZSB0ZXh0IGVsZW1lbnQpLlxuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBnZXRMaW5lc1RleHRFbGVtZW50cygpIHtcbiAgICBjb25zdCBsaW5lcyA9IGdldExpbmVzRWxlbWVudHMoKTtcbiAgICBjb25zdCByZXN1bHQgPSBbXTtcblxuICAgIGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xuICAgICAgICBjb25zdCB0ZXh0RWxlbWVudCA9IHF1ZXJ5U2VsZWN0b3Ioa2l4TGluZVRleHQsIGxpbmUpO1xuXG4gICAgICAgIHJlc3VsdC5wdXNoKHRleHRFbGVtZW50KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuIiwiLyoqXG4gKiBDbGVhcnMgYSB0ZXh0IGV4dHJhY3RlZCBmcm9tIGVsZW1lbnRcbiAqIHVzaW5nIGB0ZXh0Q29udGVudGAgcHJvcGVydHkuXG4gKlxuICogLSB5b3UgbWF5IHdhbnQgdG8gdXNlIHRoaXMgZnVuY3Rpb24gYmVjYXVzZVxuICogR29vZ2xlIERvY3MgYWRkcyBzcGVjaWFsIHN5bWJvbHMgKFpXTkosIE5CU1AsIGV0Yy4pXG4gKiB0byBkaXNwbGF5IHRleHQgY29ycmVjdGx5IGFjcm9zcyBhbGwgYnJvd3NlcnMuXG4gKiAtIG5vIHNlbnNlIHRvIHVzZSB0aGlzIGZ1bmN0aW9uIGZvciBgaW5uZXJ0VGV4dGAuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHRleHRDb250ZW50XG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNsZWFyVGV4dENvbnRlbnQodGV4dENvbnRlbnQpIHtcbiAgICB0ZXh0Q29udGVudCA9IHJlbW92ZVpXTkoodGV4dENvbnRlbnQpO1xuICAgIHRleHRDb250ZW50ID0gcmVtb3ZlTkJTUCh0ZXh0Q29udGVudCk7XG5cbiAgICByZXR1cm4gdGV4dENvbnRlbnQ7XG59XG5cblxuLyoqXG4gKiBSZW1vdmVzIGFsbCBaV05KIGNoYXJhY3RlcnMuXG4gKlxuICogLSBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9aZXJvLXdpZHRoX25vbi1qb2luZXJcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWVcbiAqL1xuZnVuY3Rpb24gcmVtb3ZlWldOSih2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZS5yZXBsYWNlKC9cXHUyMDBDL2csICcnKTtcbn1cblxuXG4vKipcbiAqIFJlbW92ZXMgYWxsIE5CU1AgY2hhcmFjdGVycy5cbiAqXG4gKiAtIGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL05vbi1icmVha2luZ19zcGFjZVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZVxuICovXG5mdW5jdGlvbiByZW1vdmVOQlNQKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlLnJlcGxhY2UoL1xcdTAwQTAvZywgJycpO1xufVxuIiwiaW1wb3J0IGdldExpbmVzVGV4dEVsZW1lbnRzIGZyb20gJy4vZ2V0LWxpbmVzLXRleHQtZWxlbWVudHMnO1xuaW1wb3J0IGNsZWFyVGV4dENvbnRlbnQgZnJvbSAnLi9jbGVhci10ZXh0LWNvbnRlbnQnO1xuXG5cbi8qKlxuICogQHJldHVybnNcbiAqIFRleHQgb2YgZXZlcnkgZWRpdG9yIGxpbmUuXG4gKiBJZiBsaW5lIGlzIGVtcHR5LCB0aGVuIHplcm8gbGVuZ3RoIHN0cmluZ1xuICogd2lsbCBiZSByZXR1cm5lZCBmb3IgdGhhdCBsaW5lLlxuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBnZXRMaW5lc1RleHQoKSB7XG4gICAgY29uc3QgbGluZXMgPSBnZXRMaW5lc1RleHRFbGVtZW50cygpO1xuICAgIGNvbnN0IHJlc3VsdCA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBsaW5lIG9mIGxpbmVzKSB7XG4gICAgICAgIC8vIGRpZmZlcmVuY2UgYmV0d2VlbiBgdGV4dENvbnRlbnRgIGFuZCBgaW5uZXJUZXh0YCBpcyBtYXR0ZXJzIVxuICAgICAgICBsZXQgdmFsdWUgPSBsaW5lLnRleHRDb250ZW50O1xuXG4gICAgICAgIHZhbHVlID0gY2xlYXJUZXh0Q29udGVudCh2YWx1ZSk7XG4gICAgICAgIHZhbHVlID0gY2xlYXJMaW5lVGV4dCh2YWx1ZSk7XG5cbiAgICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cblxuLyoqXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWVcbiAqL1xuZnVuY3Rpb24gY2xlYXJMaW5lVGV4dCh2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZS50cmltKCk7XG59XG4iLCJpbXBvcnQgZ2V0TGluZXNUZXh0IGZyb20gJy4vZ2V0LWxpbmVzLXRleHQnO1xuXG5cbi8qKlxuICogQHBhcmFtIHtudW1iZXJ9IGxpbmVJbmRleFxuICogQHBhcmFtIHtudW1iZXJ9IHN0YXJ0SW5kZXhcbiAqIEBwYXJhbSB7bnVtYmVyfSBlbmRJbmRleFxuICpcbiAqIEByZXR1cm5zXG4gKiBUZXh0IG9mIHNwZWNpZmljIGxpbmUuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGdldExpbmVUZXh0KFxuICAgIGxpbmVJbmRleCxcbiAgICBzdGFydEluZGV4ID0gdW5kZWZpbmVkLFxuICAgIGVuZEluZGV4ID0gdW5kZWZpbmVkXG4pIHtcbiAgICBjb25zdCBsaW5lc1RleHQgPSBnZXRMaW5lc1RleHQoKTtcblxuICAgIGlmIChsaW5lSW5kZXggPj0gbGluZXNUZXh0Lmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCB0ZXh0ID0gbGluZXNUZXh0W2xpbmVJbmRleF07XG5cbiAgICBpZiAoc3RhcnRJbmRleCA9PSBudWxsKSB7XG4gICAgICAgIHN0YXJ0SW5kZXggPSAwO1xuICAgIH1cblxuICAgIGlmIChlbmRJbmRleCA9PSBudWxsKSB7XG4gICAgICAgIGVuZEluZGV4ID0gdGV4dC5sZW5ndGg7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRleHQuc3Vic3RyaW5nKHN0YXJ0SW5kZXgsIGVuZEluZGV4KTtcbn1cbiIsImltcG9ydCB7a2l4V29yZE5vbmV9IGZyb20gJy4vY29tbW9uL3NlbGVjdG9ycyc7XG5pbXBvcnQge3F1ZXJ5U2VsZWN0b3JBbGx9IGZyb20gJy4vY29tbW9uL3F1ZXJ5LXNlbGVjdG9yJztcbmltcG9ydCBnZXRMaW5lc0VsZW1lbnRzIGZyb20gJy4vZ2V0LWxpbmVzLWVsZW1lbnRzJztcblxuXG4vKipcbiAqIEByZXR1cm5zIHtBcnJheTxIVE1MRWxlbWVudFtdPn1cbiAqIEVhY2ggZWxlbWVudCBpcyBhIGxpbmUsIGVhY2ggb2YgZWxlbWVudHNcbiAqIG9mIHRoYXQgbGluZSBpcyBhIHdvcmQgbm9kZSBvZiB0aGF0IGxpbmUuXG4gKiBUaGVzZSB3b3JkIG5vZGVzIGNvbnRhaW5zIGFjdHVhbCB0ZXh0IG9mIGxpbmUuXG4gKlxuICogTk9URTpcbiAqIGlmIHRleHQgb2YgbGluZSBjb250YWlucyB2YXJpb3VzIGZvcm1hdHRpbmcgKGZvbnQsIGJvbGQsIGV0Yy4pLFxuICogdGhlbiBpdCB3aWxsIGJlIHNwbGl0dGVkIGludG8gc2V2ZXJhbCB3b3JkIG5vZGVzLlxuICogRm9yIGV4YW1wbGUsIFwic29tZSBbQXJpYWwgZm9udF0gdGV4dCBbUm9ib3RvIGZvbnRdXCIgd2lsbCBiZVxuICogc3BsaXR0ZWQgaW50byB0d28gbm9kZXMsIFwic29tZSB0ZXh0IFtBcmlhbCBmb250XVwiIHdpbGwgYmVcbiAqIHJlcHJlc2VudGVkIGFzIG9uZSBub2RlIGFuZCBcImFub3RoZXIgW0FyaWFsIGZvbnQsIG5vcm1hbF1cbiAqIHRleHQgW0FyaWFsIGZvbnQsIGJvbGRdXCIgd2lsbCBiZSBzcGxpdHRlZCBpbnRvIHR3byBub2Rlcy5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZ2V0V29yZEVsZW1lbnRzKCkge1xuICAgIGNvbnN0IGxpbmVzID0gZ2V0TGluZXNFbGVtZW50cygpO1xuICAgIGNvbnN0IHJlc3VsdCA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBsaW5lIG9mIGxpbmVzKSB7XG4gICAgICAgIGNvbnN0IG5vZGVzID0gcXVlcnlTZWxlY3RvckFsbChraXhXb3JkTm9uZSwgbGluZSk7XG4gICAgICAgIHJlc3VsdC5wdXNoKG5vZGVzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuIiwiaW1wb3J0IHtraXhTZWxlY3Rpb25PdmVybGF5fSBmcm9tICcuL2NvbW1vbi9zZWxlY3RvcnMnO1xuaW1wb3J0IHtxdWVyeVNlbGVjdG9yfSBmcm9tICcuL2NvbW1vbi9xdWVyeS1zZWxlY3Rvcic7XG5pbXBvcnQgZ2V0TGluZXNFbGVtZW50cyBmcm9tICcuL2dldC1saW5lcy1lbGVtZW50cyc7XG5cblxuLyoqXG4gKiBHb29nbGUgRG9jcyBjcmVhdGVzIHNlcGFyYXRlIGVsZW1lbnQgdG8gZGlzcGxheVxuICogc2VsZWN0aW9uLiBJdCBpcyBubyBhY3R1YWwgc2VsZWN0aW9uIG9mIHRleHQsIGl0IGlzXG4gKiBqdXN0IGFuIGVsZW1lbnQgd2l0aCBzb21lIHN0eWxlIHRoYXQgZW11bGF0ZXMgc2VsZWN0aW9uLlxuICpcbiAqIEJlY2F1c2Ugb2YgdGhpcywgZm9yIGV4YW1wbGUsIHlvdSBjYW5ub3QganVzdCByZW1vdmVcbiAqIHNlbGVjdGlvbiBvdmVybGF5IGVsZW1lbnQgZnJvbSBET00gaW4gb3JkZXIgdG8gcmVtb3ZlIHNlbGVjdGlvbixcbiAqIGJlY2F1c2UgR29vZ2xlIERvY3Mgd2lsbCByZXN0b3JlIHNlbGVjdGlvbiBhdCBuZXh0IHVzZXIgc2VsZWN0aW9uLlxuICpcbiAqIEByZXR1cm5zIHtIVE1MRWxlbWVudFtdfVxuICogU2VsZWN0aW9uIG92ZXJsYXkgZWxlbWVudCBmb3IgZWFjaCBsaW5lLlxuICogSWYgdGhlcmUgYXJlIG5vIHNlbGVjdGlvbiBmb3IgdGhhdCBsaW5lLFxuICogdGhlbiBgbnVsbGAgd2lsbCBiZSB1c2VkLlxuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBnZXRTZWxlY3Rpb25PdmVybGF5RWxlbWVudHMoKSB7XG4gICAgY29uc3QgbGluZXMgPSBnZXRMaW5lc0VsZW1lbnRzKCk7XG4gICAgY29uc3QgcmVzdWx0ID0gW107XG5cbiAgICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICAgICAgY29uc3QgZWxlbWVudCA9IHF1ZXJ5U2VsZWN0b3Ioa2l4U2VsZWN0aW9uT3ZlcmxheSwgbGluZSk7XG4gICAgICAgIHJlc3VsdC5wdXNoKGVsZW1lbnQpO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59XG4iLCJpbXBvcnQge2dldENoYXJSZWN0fSBmcm9tICcuL2NvbW1vbi91dGlscyc7XG5pbXBvcnQgZ2V0U2VsZWN0aW9uRWxlbWVudHMgZnJvbSAnLi9nZXQtc2VsZWN0aW9uLW92ZXJsYXktZWxlbWVudHMnO1xuaW1wb3J0IGdldFdvcmRFbGVtZW50cyBmcm9tICcuL2dldC13b3JkLWVsZW1lbnRzJztcbmltcG9ydCBjbGVhclRleHRDb250ZW50IGZyb20gJy4vY2xlYXItdGV4dC1jb250ZW50JztcblxuXG4vKipcbiAqIEByZXR1cm5zIHtBcnJheTxudWxsIHwgQXJyYXk8b2JqZWN0IHwgbnVsbD4+fVxuICogU2VsZWN0aW9uIGRhdGEgZm9yIGV2ZXJ5IHJlbmRlcmVkIGxpbmUuXG4gKiBgW11gIC0gcmVwcmVzZW50cyBsaW5lLCBgW11bXWAgLSByZXByZXNlbnRzIGFsbFxuICogc2VsZWN0ZWQgd29yZCBub2Rlcy5cbiAqIGBbXWAgLSBlbGVtZW50IHdpbGwgYmUgYG51bGxgIGlmIHRoYXQgbGluZSBkb2Vzbid0XG4gKiBjb250YWlucyBzZWxlY3Rpb24gYXQgYWxsLCBvdGhlcndpc2UgaXQgd2lsbCBiZSBhcnJheS5cbiAqIGBbXVtdYCAtIGl0IGlzIGFsbCBzZWxlY3RlZCB3b3JkIG5vZGVzIChzZWUgYGdldFdvcmRFbGVtZW50cygpYFxuICogZG9jdW1lbnRhdGlvbiBmb3IgbW9yZSkuIElmIHdvcmQgbm9kZSBub3Qgc2VsZWN0ZWQgKGkuZS4sIHNlbGVjdGlvblxuICogZG9uJ3Qgb3ZlcmxhcHMgdGhhdCBub2RlKSwgdGhlbiB2YWx1ZSB3aWxsIGJlIGBudWxsYCwgb3RoZXJ3aXNlXG4gKiBpdCB3aWxsIGJlIGFuIG9iamVjdCB0aGF0IGRlc2NyaWJlcyBzZWxlY3Rpb24gb2YgdGhhdCB3b3JkIG5vZGUuXG4gKlxuICogQHRocm93c1xuICogVGhyb3dzIGFuIGVycm9yIGlmIHVuYWJsZSB0byBnZXQgaW5mb3JtYXRpb25cbiAqIGFib3V0IGN1cnJlbnQgc2VsZWN0aW9uIGZvciBhdCBsZWFzdCBvbmUgbGluZS5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZ2V0U2VsZWN0aW9uKCkge1xuICAgIGNvbnN0IHNlbGVjdGlvbkVsZW1lbnRzID0gZ2V0U2VsZWN0aW9uRWxlbWVudHMoKTtcbiAgICBjb25zdCB3b3JkRWxlbWVudHMgPSBnZXRXb3JkRWxlbWVudHMoKTtcblxuICAgIGlmIChzZWxlY3Rpb25FbGVtZW50cy5sZW5ndGggIT09IHdvcmRFbGVtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgJ1VuYWJsZSB0byBtYXAgc2VsZWN0aW9uIGVsZW1lbnRzIGFuZCB3b3JkIGVsZW1lbnRzJ1xuICAgICAgICApO1xuICAgIH1cblxuICAgIGNvbnN0IGNvdW50ID0gTWF0aC5taW4oXG4gICAgICAgIHNlbGVjdGlvbkVsZW1lbnRzLmxlbmd0aCxcbiAgICAgICAgd29yZEVsZW1lbnRzLmxlbmd0aFxuICAgICk7XG4gICAgY29uc3QgcmVzdWx0ID0gW107XG4gICAgY29uc3QgZW1wdHlWYWx1ZSA9IG51bGw7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSAhPT0gY291bnQ7IGkrKykge1xuICAgICAgICBjb25zdCBzZWxlY3Rpb25FbGVtZW50ID0gc2VsZWN0aW9uRWxlbWVudHNbaV07XG5cbiAgICAgICAgaWYgKCFzZWxlY3Rpb25FbGVtZW50KSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaChlbXB0eVZhbHVlKTtcblxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBsaW5lID0gd29yZEVsZW1lbnRzW2ldO1xuICAgICAgICBjb25zdCBsaW5lU2VsZWN0aW9uID0gW107XG5cbiAgICAgICAgZm9yIChjb25zdCB3b3JkRWxlbWVudCBvZiBsaW5lKSB7XG4gICAgICAgICAgICBpZiAoIXdvcmRFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgbGluZVNlbGVjdGlvbi5wdXNoKGVtcHR5VmFsdWUpO1xuXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsVGV4dCA9IGNsZWFyVGV4dENvbnRlbnQod29yZEVsZW1lbnQudGV4dENvbnRlbnQpO1xuICAgICAgICAgICAgY29uc3QgdGV4dENTUyA9IHdvcmRFbGVtZW50LnN0eWxlLmNzc1RleHQ7XG4gICAgICAgICAgICBjb25zdCB3b3JkUmVjdCA9IHdvcmRFbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgY29uc3Qgc2VsZWN0aW9uUmVjdCA9IHNlbGVjdGlvbkVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICBjb25zdCBzZWxlY3Rpb25JbmRleGVzID0gY2FsY3VsYXRlU2VsZWN0aW9uSW5kZXhlcyhcbiAgICAgICAgICAgICAgICBvcmlnaW5hbFRleHQsXG4gICAgICAgICAgICAgICAgdGV4dENTUyxcbiAgICAgICAgICAgICAgICB3b3JkUmVjdCxcbiAgICAgICAgICAgICAgICBzZWxlY3Rpb25SZWN0XG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgY29uc3Qgbm90U2VsZWN0ZWQgPSAoIXNlbGVjdGlvbkluZGV4ZXMpO1xuXG4gICAgICAgICAgICBpZiAobm90U2VsZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICBsaW5lU2VsZWN0aW9uLnB1c2goZW1wdHlWYWx1ZSk7XG5cbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWRUZXh0ID0gb3JpZ2luYWxUZXh0LnN1YnN0cmluZyhcbiAgICAgICAgICAgICAgICBzZWxlY3Rpb25JbmRleGVzLnN0YXJ0LFxuICAgICAgICAgICAgICAgIHNlbGVjdGlvbkluZGV4ZXMuZW5kXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICBsaW5lU2VsZWN0aW9uLnB1c2goe1xuICAgICAgICAgICAgICAgIHRleHQ6IG9yaWdpbmFsVGV4dCxcbiAgICAgICAgICAgICAgICBzZWxlY3RlZFRleHQ6IHNlbGVjdGVkVGV4dCxcbiAgICAgICAgICAgICAgICBzZWxlY3Rpb25TdGFydDogc2VsZWN0aW9uSW5kZXhlcy5zdGFydCxcbiAgICAgICAgICAgICAgICBzZWxlY3Rpb25FbmQ6IHNlbGVjdGlvbkluZGV4ZXMuZW5kLFxuICAgICAgICAgICAgICAgIHRleHRSZWN0OiB3b3JkUmVjdCxcbiAgICAgICAgICAgICAgICBzZWxlY3Rpb25SZWN0OiBzZWxlY3Rpb25SZWN0LFxuICAgICAgICAgICAgICAgIHRleHRFbGVtZW50OiB3b3JkRWxlbWVudCxcbiAgICAgICAgICAgICAgICBzZWxlY3Rpb25FbGVtZW50OiBzZWxlY3Rpb25FbGVtZW50XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlc3VsdC5wdXNoKGxpbmVTZWxlY3Rpb24pO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cblxuLyoqXG4gKiBDYWxjdWxhdGVzIHRleHQgc2VsZWN0aW9uIGluZGV4ZXMgYmFzZWQgb25cbiAqIERPTSByZWN0IG9mIHRleHQgZWxlbWVudCBhbmQgc2VsZWN0aW9uIGVsZW1lbnQuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHRleHRcbiAqIE9yaWdpbmFsIHRleHQuXG4gKiBAcGFyYW0ge3N0cmluZ30gdGV4dENTU1xuICogQ1NTIG9mIHJlbmRlcmVkIG9yaWdpbmFsIHRleHQuXG4gKiBAcGFyYW0ge0RPTVJlY3RSZWFkT25seX0gdGV4dFJlY3RcbiAqIERPTSByZWN0IG9mIHRleHQgZWxlbWVudC5cbiAqIEBwYXJhbSB7RE9NUmVjdFJlYWRPbmx5fSBzZWxlY3Rpb25SZWN0XG4gKiBET00gcmVjdCBvZiBzZWxlY3Rpb24gZWxlbWVudC5cbiAqXG4gKiBAcmV0dXJuc1xuICogSW5kZXhlcyBvZiBjdXJyZW50IHRleHQgc2VsZWN0aW9uLlxuICogVGhleSBjYW4gYmUgdXNlZCwgZm9yIGV4YW1wbGUsIGZvciBgc3Vic3RyaW5nKClgLlxuICogYG51bGxgIHdpbGwgYmUgcmV0dXJuZWQgaWYgbm90aGluZyBpcyBzZWxlY3RlZC5cbiAqL1xuZnVuY3Rpb24gY2FsY3VsYXRlU2VsZWN0aW9uSW5kZXhlcyhcbiAgICB0ZXh0LFxuICAgIHRleHRDU1MsXG4gICAgdGV4dFJlY3QsXG4gICAgc2VsZWN0aW9uUmVjdFxuKSB7XG4gICAgbGV0IHZpcnR1YWxDYXJldExlZnQgPSB0ZXh0UmVjdC5sZWZ0O1xuICAgIGxldCBzZWxlY3RlZCA9IGZhbHNlO1xuICAgIGxldCBzZWxlY3Rpb25TdGFydCA9IDA7XG4gICAgbGV0IHNlbGVjdGlvbkVuZCA9IHRleHQubGVuZ3RoO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgIT09IHRleHQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgaXNPdmVybGFwID0gKFxuICAgICAgICAgICAgKHNlbGVjdGlvblJlY3QubGVmdCA8PSB2aXJ0dWFsQ2FyZXRMZWZ0KSAmJlxuICAgICAgICAgICAgKHZpcnR1YWxDYXJldExlZnQgPCBzZWxlY3Rpb25SZWN0LnJpZ2h0KVxuICAgICAgICApO1xuXG4gICAgICAgIGlmIChpc092ZXJsYXApIHtcbiAgICAgICAgICAgIGlmICghc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICBzZWxlY3Rpb25TdGFydCA9IGk7XG4gICAgICAgICAgICAgICAgc2VsZWN0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHNlbGVjdGVkKSB7XG4gICAgICAgICAgICAgICAgc2VsZWN0aW9uRW5kID0gaTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNoYXIgPSB0ZXh0W2ldO1xuICAgICAgICBjb25zdCBjaGFyUmVjdCA9IGdldENoYXJSZWN0KGNoYXIsIHRleHRDU1MpO1xuICAgICAgICB2aXJ0dWFsQ2FyZXRMZWZ0ICs9IGNoYXJSZWN0LndpZHRoO1xuICAgIH1cblxuICAgIGNvbnN0IHNlbGVjdGlvbkluZGV4ZXMgPSB7XG4gICAgICAgIHN0YXJ0OiBzZWxlY3Rpb25TdGFydCxcbiAgICAgICAgZW5kOiBzZWxlY3Rpb25FbmQsXG4gICAgfTtcblxuICAgIHJldHVybiAoc2VsZWN0ZWQgPyBzZWxlY3Rpb25JbmRleGVzIDogbnVsbCk7XG59XG4iLCJpbXBvcnQge3F1ZXJ5U2VsZWN0b3J9IGZyb20gJy4vY29tbW9uL3F1ZXJ5LXNlbGVjdG9yJztcbmltcG9ydCB7a2l4Q3Vyc29yfSBmcm9tICcuL2NvbW1vbi9zZWxlY3RvcnMnO1xuaW1wb3J0IGdldEVkaXRvckVsZW1lbnQgZnJvbSAnLi9nZXQtZWRpdG9yLWVsZW1lbnQnO1xuXG5cbi8qKlxuICogQHJldHVybnMge0hUTUxFbGVtZW50fVxuICogVXNlciBjdXJzb3IuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGdldEN1cnNvckVsZW1lbnQoKSB7XG4gICAgY29uc3QgZWRpdG9yID0gZ2V0RWRpdG9yRWxlbWVudCgpO1xuXG4gICAgcmV0dXJuIHF1ZXJ5U2VsZWN0b3Ioa2l4Q3Vyc29yLCBlZGl0b3IpO1xufVxuIiwiaW1wb3J0IHtxdWVyeVNlbGVjdG9yfSBmcm9tICcuL2NvbW1vbi9xdWVyeS1zZWxlY3Rvcic7XG5pbXBvcnQge2tpeEFjdGl2ZUN1cnNvcn0gZnJvbSAnLi9jb21tb24vc2VsZWN0b3JzJztcbmltcG9ydCBnZXRFZGl0b3JFbGVtZW50IGZyb20gJy4vZ2V0LWVkaXRvci1lbGVtZW50JztcblxuXG4vKipcbiAqIEByZXR1cm5zIHtIVE1MRWxlbWVudH1cbiAqIFVzZXIgYWN0aXZlIGJsaW5rZWQgY3Vyc29yLlxuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBnZXRBY3RpdmVDdXJzb3JFbGVtZW50KCkge1xuICAgIGNvbnN0IGVkaXRvciA9IGdldEVkaXRvckVsZW1lbnQoKTtcblxuICAgIHJldHVybiBxdWVyeVNlbGVjdG9yKGtpeEFjdGl2ZUN1cnNvciwgZWRpdG9yKTtcbn1cbiIsImltcG9ydCB7cXVlcnlTZWxlY3Rvcn0gZnJvbSAnLi9jb21tb24vcXVlcnktc2VsZWN0b3InO1xuaW1wb3J0IHtraXhDdXJzb3JDYXJldH0gZnJvbSAnLi9jb21tb24vc2VsZWN0b3JzJztcbmltcG9ydCBnZXRDdXJzb3JFbGVtZW50IGZyb20gJy4vZ2V0LWN1cnNvci1lbGVtZW50JztcblxuXG4vKipcbiAqIEByZXR1cm5zIHtIVE1MRWxlbWVudCB8IG51bGx9XG4gKiBDYXJldCBvZiB1c2VyIGFjdGl2ZSBjdXJzb3IuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGdldENhcmV0RWxlbWVudCgpIHtcbiAgICBjb25zdCBhY3RpdmVDdXJzb3IgPSBnZXRDdXJzb3JFbGVtZW50KCk7XG5cbiAgICBpZiAoIWFjdGl2ZUN1cnNvcikge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gcXVlcnlTZWxlY3RvcihraXhDdXJzb3JDYXJldCwgYWN0aXZlQ3Vyc29yKTtcbn1cbiIsImltcG9ydCB7aXNSZWN0c092ZXJsYXAsIGdldENoYXJSZWN0fSBmcm9tICcuL2NvbW1vbi91dGlscyc7XG5pbXBvcnQgZ2V0Q2FyZXRFbGVtZW50IGZyb20gJy4vZ2V0LWNhcmV0LWVsZW1lbnQnO1xuaW1wb3J0IGdldFdvcmRFbGVtZW50cyBmcm9tICcuL2dldC13b3JkLWVsZW1lbnRzJztcblxuXG4vKipcbiAqIEByZXR1cm5zXG4gKiBJbmZvcm1hdGlvbiBhYm91dCBjYXJldC5cbiAqIGBudWxsYCBpZiB1bmFibGUgdG8gZ2V0IGluZm9ybWF0aW9uLlxuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBnZXRDYXJldCgpIHtcbiAgICBjb25zdCBjYXJldEVsZW1lbnQgPSBnZXRDYXJldEVsZW1lbnQoKTtcblxuICAgIGlmICghY2FyZXRFbGVtZW50KSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHdvcmRFbGVtZW50cyA9IGdldFdvcmRFbGVtZW50cygpO1xuXG4gICAgaWYgKCF3b3JkRWxlbWVudHMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGNhcmV0UmVjdCA9IGNhcmV0RWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBjb25zdCByZXN1bHQgPSB7XG4gICAgICAgIGVsZW1lbnQ6IG51bGwsXG4gICAgICAgIHdvcmRFbGVtZW50OiBudWxsLFxuICAgICAgICBsaW5lSW5kZXg6IG51bGwsXG4gICAgICAgIHBvc2l0aW9uSW5kZXhSZWxhdGl2ZVRvV29yZDogbnVsbFxuICAgIH07XG4gICAgbGV0IHJlc3VsdEZvdW5kID0gZmFsc2U7XG5cbiAgICBmb3IgKGxldCBsaW5lSW5kZXggPSAwOyBsaW5lSW5kZXggIT09IHdvcmRFbGVtZW50cy5sZW5ndGg7IGxpbmVJbmRleCsrKSB7XG4gICAgICAgIGNvbnN0IGxpbmUgPSB3b3JkRWxlbWVudHNbbGluZUluZGV4XTtcblxuICAgICAgICBmb3IgKGxldCB3b3JkSW5kZXggPSAwOyB3b3JkSW5kZXggIT09IGxpbmUubGVuZ3RoOyB3b3JkSW5kZXgrKykge1xuICAgICAgICAgICAgY29uc3Qgd29yZEVsZW1lbnQgPSBsaW5lW3dvcmRJbmRleF07XG4gICAgICAgICAgICBjb25zdCB3b3JkUmVjdCA9IHdvcmRFbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgY29uc3QgaXNPdmVybGFwID0gaXNSZWN0c092ZXJsYXAoY2FyZXRSZWN0LCB3b3JkUmVjdCk7XG5cbiAgICAgICAgICAgIGlmICghaXNPdmVybGFwKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlc3VsdC5lbGVtZW50ID0gY2FyZXRFbGVtZW50O1xuICAgICAgICAgICAgcmVzdWx0LndvcmRFbGVtZW50ID0gd29yZEVsZW1lbnQ7XG4gICAgICAgICAgICByZXN1bHQubGluZUluZGV4ID0gbGluZUluZGV4O1xuICAgICAgICAgICAgcmVzdWx0LnBvc2l0aW9uSW5kZXhSZWxhdGl2ZVRvV29yZCA9IGNhbGN1bGF0ZVBvc2l0aW9uSW5kZXgoXG4gICAgICAgICAgICAgICAgd29yZFJlY3QsXG4gICAgICAgICAgICAgICAgY2FyZXRSZWN0LFxuICAgICAgICAgICAgICAgIHdvcmRFbGVtZW50LnRleHRDb250ZW50LFxuICAgICAgICAgICAgICAgIHdvcmRFbGVtZW50LnN0eWxlLmNzc1RleHRcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICByZXN1bHRGb3VuZCA9IHRydWU7XG5cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlc3VsdEZvdW5kKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cblxuLyoqXG4gKiBAcGFyYW0ge0RPTVJlY3RSZWFkT25seX0gd29yZFJlY3RcbiAqIEBwYXJhbSB7RE9NUmVjdFJlYWRPbmx5fSBjYXJldFJlY3RcbiAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0XG4gKiBcIkRpcnR5XCIgYHRleHRDb250ZW50YCBpcyBleHBlY3RlZC5cbiAqIEluIGNhc2Ugb2YgXCJEaXJ0eVwiIGVtcHR5IHNwYWNlcyB3aWxsIGJlXG4gKiBoYW5kbGVkIGNvcnJlY3RseS5cbiAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0Q1NTXG4gKlxuICogQHJldHVybnNcbiAqIE9uIHdoYXQgcG9zaXRpb24gY2FyZXQgaXMgcGxhY2VkIG9uIGEgbGluZS5cbiAqIEZvciBleGFtcGxlLCBgMWAgbWVhbnMgY2FyZXQgaXMgcGxhY2VkIGJlZm9yZVxuICogc2Vjb25kIGNoYXJhY3RlciBvZiBsaW5lIHRleHQuXG4gKi9cbmZ1bmN0aW9uIGNhbGN1bGF0ZVBvc2l0aW9uSW5kZXgod29yZFJlY3QsIGNhcmV0UmVjdCwgdGV4dCwgdGV4dENTUykge1xuICAgIGxldCB2aXJ0dWFsQ2FyZXRMZWZ0ID0gd29yZFJlY3QubGVmdCAtIGNhcmV0UmVjdC53aWR0aDtcbiAgICBsZXQgbG9jYWxJbmRleCA9IDA7XG5cbiAgICBmb3IgKGNvbnN0IGNoYXIgb2YgdGV4dCkge1xuICAgICAgICBjb25zdCBjaGFyUmVjdCA9IGdldENoYXJSZWN0KGNoYXIsIHRleHRDU1MpO1xuXG4gICAgICAgIC8vIHdlIHNob3VsZCBpZ25vcmUgc3BlY2lhbCBpbnZpc2libGVcbiAgICAgICAgLy8gY2hhcmFjdGVycyBsaWtlIFpXTkogb3IgTkJTUFxuICAgICAgICBpZiAoY2hhclJlY3Qud2lkdGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmlydHVhbENhcmV0TGVmdCArPSBjaGFyUmVjdC53aWR0aDtcblxuICAgICAgICBpZiAodmlydHVhbENhcmV0TGVmdCA+PSBjYXJldFJlY3QubGVmdCkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBsb2NhbEluZGV4ICs9IDE7XG4gICAgfVxuXG4gICAgcmV0dXJuIGxvY2FsSW5kZXg7XG59XG4iLCJpbXBvcnQge2NoYXJJc1dvcmRDaGFyfSBmcm9tICcuL2NvbW1vbi91dGlscyc7XG5pbXBvcnQgZ2V0Q2FyZXQgZnJvbSAnLi9nZXQtY2FyZXQnO1xuaW1wb3J0IGNsZWFyVGV4dENvbnRlbnQgZnJvbSAnLi9jbGVhci10ZXh0LWNvbnRlbnQnO1xuXG5cbi8qKlxuICogQHJldHVybnNcbiAqIEEgd29yZCBvbiB3aGljaCBjYXJldCBpcyBjdXJyZW50bHkgbG9jYXRlZC5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZ2V0Q2FyZXRXb3JkKCkge1xuICAgIGNvbnN0IGNhcmV0ID0gZ2V0Q2FyZXQoKTtcblxuICAgIGlmICghY2FyZXQpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgY2FyZXRUZXh0ID0gY2xlYXJUZXh0Q29udGVudChjYXJldC53b3JkRWxlbWVudC50ZXh0Q29udGVudCk7XG4gICAgY29uc3QgcmVzdWx0ID0ge1xuICAgICAgICB3b3JkOiAnJyxcbiAgICAgICAgdGV4dDogY2FyZXRUZXh0LFxuICAgICAgICBpbmRleFN0YXJ0OiBjYXJldC5wb3NpdGlvbkluZGV4UmVsYXRpdmVUb1dvcmQsXG4gICAgICAgIGluZGV4RW5kOiBjYXJldC5wb3NpdGlvbkluZGV4UmVsYXRpdmVUb1dvcmRcbiAgICB9O1xuXG4gICAgLy8gbm90IHN0cmljdCBgPj1gLCBiZWNhdXNlIHdlIG1heSBzaGlmdFxuICAgIC8vIGJ5IG9uZSB0byB0aGUgbGVmdCBpbiBmdXJ0aGVyXG4gICAgaWYgKGNhcmV0LnBvc2l0aW9uSW5kZXhSZWxhdGl2ZVRvV29yZCA+IGNhcmV0VGV4dC5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBjb25zdCBpbmRleFN0YXJ0ID0gZ2V0Qm91bmRhcnlJbmRleChcbiAgICAgICAgY2FyZXQucG9zaXRpb25JbmRleFJlbGF0aXZlVG9Xb3JkLFxuICAgICAgICBjYXJldFRleHQsXG4gICAgICAgIHRydWVcbiAgICApO1xuICAgIGNvbnN0IGluZGV4RW5kID0gZ2V0Qm91bmRhcnlJbmRleChcbiAgICAgICAgY2FyZXQucG9zaXRpb25JbmRleFJlbGF0aXZlVG9Xb3JkLFxuICAgICAgICBjYXJldFRleHQsXG4gICAgICAgIGZhbHNlXG4gICAgKTtcblxuICAgIHJlc3VsdC5pbmRleFN0YXJ0ID0gaW5kZXhTdGFydDtcbiAgICByZXN1bHQuaW5kZXhFbmQgPSBpbmRleEVuZDtcbiAgICByZXN1bHQud29yZCA9IGNhcmV0VGV4dC5zdWJzdHJpbmcoaW5kZXhTdGFydCwgaW5kZXhFbmQpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuXG4vKipcbiAqIEBwYXJhbSB7bnVtYmVyfSBzdGFydEluZGV4XG4gKiBGcm9tIHdoZXJlIHRvIHN0YXJ0IHNlYXJjaCBhIHdvcmQgYm91bmRhcnkuXG4gKiBAcGFyYW0ge3N0cmluZ30gdGV4dFxuICogRnVsbCB0ZXh0LlxuICogQHBhcmFtIHtib29sfSB0b0xlZnRcbiAqIGB0cnVlYCBmb3IgbGVmdCBkaXJlY3Rpb24sXG4gKiBgZmFsc2VgIGZvciByaWdodCBkaXJlY3Rpb24uXG4gKlxuICogQHJldHVybnMge251bWJlcn1cbiAqIEluZGV4IG9mIHdvcmQgYm91bmRhcnkgdGhhdCBjYW4gYmUgdXNlZCBmb3IgYHN1YnN0cmluZygpYC5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgXG4gKiBjb25zdCB0ZXh0ID0gJ29uZSB0d28gdGhyZWUnO1xuICogY29uc3Qgc3RhcnQgPSBnZXRCb3VuZGFyeUluZGV4KDUsIHRleHQsIHRydWUpIC8vID0+IDQ7XG4gKiBjb25zdCBlbmQgPSBnZXRCb3VuZGFyeUluZGV4KDUsIHRleHQsIGZhbHNlKSAvLyA9PiA3O1xuICpcbiAqIHRleHQuc3Vic3RyaW5nKHN0YXJ0LCBlbmQpOyAvLyA9PiAndHdvJ1xuICogYGBgXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYFxuICogY29uc3QgdGV4dCA9ICdvbmUgdHdvIHRocmVlJztcbiAqIGNvbnN0IHN0YXJ0ID0gZ2V0Qm91bmRhcnlJbmRleCgzLCB0ZXh0LCB0cnVlKSAvLyA9PiAwO1xuICogY29uc3QgZW5kID0gZ2V0Qm91bmRhcnlJbmRleCgzLCB0ZXh0LCBmYWxzZSkgLy8gPT4gMztcbiAqXG4gKiB0ZXh0LnN1YnN0cmluZyhzdGFydCwgZW5kKTsgLy8gPT4gJ29uZSdcbiAqIGBgYFxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGBcbiAqIGNvbnN0IHRleHQgPSAnb25lICB0d28gdGhyZWUnOyAvLyBub3RpY2UgZXh0cmEgc3BhY2VcbiAqIGNvbnN0IHN0YXJ0ID0gZ2V0Qm91bmRhcnlJbmRleCg0LCB0ZXh0LCB0cnVlKSAvLyA9PiA0O1xuICogY29uc3QgZW5kID0gZ2V0Qm91bmRhcnlJbmRleCg0LCB0ZXh0LCBmYWxzZSkgLy8gPT4gNDtcbiAqXG4gKiB0ZXh0LnN1YnN0cmluZyhzdGFydCwgZW5kKTsgLy8gPT4gJydcbiAqIGBgYFxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGBcbiAqIGNvbnN0IHRleHQgPSAnICBvbmUgdHdvIHRocmVlJzsgLy8gbm90aWNlIGV4dHJhIHNwYWNlc1xuICogY29uc3Qgc3RhcnQgPSBnZXRCb3VuZGFyeUluZGV4KDEsIHRleHQsIHRydWUpIC8vID0+IDE7XG4gKiBjb25zdCBlbmQgPSBnZXRCb3VuZGFyeUluZGV4KDEsIHRleHQsIGZhbHNlKSAvLyA9PiAxO1xuICpcbiAqIHRleHQuc3Vic3RyaW5nKHN0YXJ0LCBlbmQpOyAvLyA9PiAnb25lJ1xuICogYGBgXG4gKi9cbmZ1bmN0aW9uIGdldEJvdW5kYXJ5SW5kZXgoc3RhcnRJbmRleCwgdGV4dCwgdG9MZWZ0KSB7XG4gICAgbGV0IGlzRW5kID0gdW5kZWZpbmVkO1xuICAgIGxldCBtb3ZlID0gdW5kZWZpbmVkO1xuICAgIGxldCB1bmRvTW92ZSA9IHVuZGVmaW5lZDtcblxuICAgIGlmICh0b0xlZnQpIHtcbiAgICAgICAgaXNFbmQgPSAoaW5kZXgpID0+IChpbmRleCA8PSAwKTtcbiAgICAgICAgbW92ZSA9IChpbmRleCkgPT4gKGluZGV4IC0gMSk7XG4gICAgICAgIHVuZG9Nb3ZlID0gKGluZGV4KSA9PiAoaW5kZXggKyAxKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpc0VuZCA9IChpbmRleCkgPT4gKGluZGV4ID49IHRleHQubGVuZ3RoKTtcbiAgICAgICAgbW92ZSA9IChpbmRleCkgPT4gKGluZGV4ICsgMSk7XG4gICAgICAgIHVuZG9Nb3ZlID0gKGluZGV4KSA9PiAoaW5kZXggLSAxKTtcbiAgICB9XG5cbiAgICBsZXQgYm91bmRhcnlJbmRleCA9IHN0YXJ0SW5kZXg7XG4gICAgbGV0IGNoYXJhY3RlciA9IHRleHRbYm91bmRhcnlJbmRleF07XG5cbiAgICAvLyBpbiBjYXNlIGlmIHdlIGF0IHRoZSBlbmQgb2Ygd29yZCxcbiAgICAvLyBsZXQncyBzaGlmdCB0byB0aGUgbGVmdCBieSBvbmUgaW4gb3JkZXJcbiAgICAvLyBuZXh0IGB3aGlsZWAgYWxnb3JpdGhtIGhhbmRsZSB0aGF0IGNhc2UgY29ycmVjdGx5XG4gICAgaWYgKFxuICAgICAgICB0b0xlZnQgJiZcbiAgICAgICAgY2hhcklzT3V0T2ZXb3JkKGNoYXJhY3RlcikgJiZcbiAgICAgICAgIWlzRW5kKGJvdW5kYXJ5SW5kZXgpXG4gICAgKSB7XG4gICAgICAgIGJvdW5kYXJ5SW5kZXggPSBtb3ZlKGJvdW5kYXJ5SW5kZXgpO1xuICAgICAgICBjaGFyYWN0ZXIgPSB0ZXh0W2JvdW5kYXJ5SW5kZXhdO1xuXG4gICAgICAgIC8vIHRoZXJlIGlzIG5vIHdvcmQgYm91bmRhcnkgYWZ0ZXIgc2hpZnQgYnkgb25lLFxuICAgICAgICAvLyB3ZSBzaG91bGQgaW5pdGlhbCBzdGFydCBpbmRleCB3aXRob3V0IG1vdmVcbiAgICAgICAgaWYgKGNoYXJJc091dE9mV29yZChjaGFyYWN0ZXIpKSB7XG4gICAgICAgICAgICByZXR1cm4gc3RhcnRJbmRleDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHdoaWxlIChcbiAgICAgICAgIWNoYXJJc091dE9mV29yZChjaGFyYWN0ZXIpICYmXG4gICAgICAgICFpc0VuZChib3VuZGFyeUluZGV4KVxuICAgICkge1xuICAgICAgICBib3VuZGFyeUluZGV4ID0gbW92ZShib3VuZGFyeUluZGV4KTtcbiAgICAgICAgY2hhcmFjdGVyID0gdGV4dFtib3VuZGFyeUluZGV4XTtcbiAgICB9XG5cbiAgICAvLyBpZiBwcmV2aW91cyBgd2hpbGVgIGVuZGVkIGJlY2F1c2Ugb2YgYGNoYXJJc091dE9mV29yZGAsXG4gICAgLy8gdGhlbiBub3cgd2UgaGF2ZSBib3VuZGFyeSBpbmRleCBmb3IgaW52YWxpZCBjaGFyYWN0ZXIuXG4gICAgLy8gSXQgaXMgZXhwZWN0ZWQgcmVzdWx0IGZvciBgdG9MZWZ0ID0gZmFsc2VgIGJlY2F1c2UgaW4gdGhhdFxuICAgIC8vIGNhc2Ugd2Ugd2FudCBleGNsdWRlIHN1Y2ggY2hhcmFjdGVyIGZyb20gYHN1YnN0cmluZygpYCxcbiAgICAvLyBidXQgaW4gY2FzZSBvZiBgdG9MZWZ0ID0gdHJ1ZWAgd2UgZG9uJ3Qgd2FudCBpbmNsdWRlIGludmFsaWRcbiAgICAvLyB3b3JkIGJvdW5kYXJ5IGNoYXJhY3RlciBpbiBgc3Vic3RyaW5nKClgLlxuICAgIGlmIChcbiAgICAgICAgdG9MZWZ0ICYmXG4gICAgICAgICFpc0VuZChib3VuZGFyeUluZGV4KVxuICAgICkge1xuICAgICAgICBib3VuZGFyeUluZGV4ID0gdW5kb01vdmUoYm91bmRhcnlJbmRleCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGJvdW5kYXJ5SW5kZXg7XG59XG5cblxuLyoqXG4gKiBAcGFyYW0ge3N0cmluZ30gY2hhcmFjdGVyXG4gKlxuICogQHJldHVybnNcbiAqIENoYXJhY3RlciBpcyBvdXRzaWRlIG9mIHdvcmQgYm91bmRhcnkuXG4gKi9cbmZ1bmN0aW9uIGNoYXJJc091dE9mV29yZChjaGFyYWN0ZXIpIHtcbiAgICBpZiAoY2hhcmFjdGVyID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuICFjaGFySXNXb3JkQ2hhcihjaGFyYWN0ZXIpO1xufVxuIiwiLyoqXG4gKiBUaGlzIG1vZHVsZSBjYW4gYmUgdXNlZCB0byBpbWl0YXRlIHBoeXNpY2FsIGtleWJvYXJkIHByZXNzIGV2ZW50cy5cbiAqXG4gKiAtIHVzZSBga2V5cHJlc3NgIGZvciBsZXR0ZXIgY2hhcmFjdGVycyxcbiAqIC0gdXNlIGBrZXlkb3duYCBmb3Igc3BlY2lhbCBrZXlzIChBcnJvd0xlZnQsIERlbGV0ZSwgZXRjLikuXG4gKlxuICogSXQgaXMgaW1wb3J0YW50IHRvIHByb3ZpZGUgdmFsaWQgYHRhcmdldGAsIGJlY2F1c2UgR29vZ2xlIERvY3NcbiAqIHVzZXMgc3BlY2lhbCB0YXJnZXQgZm9yIHRleHQgZXZlbnRzLCBub3QgZGVmYXVsdCBgZG9jdW1lbnRgLlxuICpcbiAqIFVzZSB0aGlzIGZvciBoZWxwIC0gaHR0cHM6Ly9rZXljb2RlLmluZm9cbiAqL1xuXG5cbi8qKlxuICogQ3JlYXRlcyBrZXlib2FyZCBldmVudC5cbiAqXG4gKiBAcGFyYW0geydrZXlwcmVzcycgfCAna2V5ZG93bicgfCAna2V5dXAnfSBuYW1lXG4gKiBOYW1lIG9mIGV2ZW50LlxuICogQHBhcmFtIHtEb2N1bWVudCB8IEhUTUxFbGVtZW50fSB0YXJnZXRcbiAqIFRhcmdldCBvZiBldmVudC5cbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXlcbiAqIE5hbWUgb2Yga2V5LlxuICogQHBhcmFtIHtzdHJpbmcgfCBudWxsfSBjb2RlXG4gKiBDb2RlIG9mIGBrZXlgLiBTcGVjaWZ5IGBudWxsYCBmb3IgYXV0b2RldGVjdC5cbiAqIEF1dG9kZXRlY3Qgd29ya3MgY29ycmVjdGx5IG9ubHkgZm9yIGxldHRlcnMuXG4gKiBAcGFyYW0ge251bWJlciB8IG51bGx9IGtleUNvZGVcbiAqIFwiTnVtZXJpY2FsIGNvZGUgaWRlbnRpZnlpbmcgdGhlIHVubW9kaWZpZWQgdmFsdWUgb2YgdGhlIHByZXNzZWQga2V5XCIuXG4gKiBTcGVjaWZ5IGBudWxsYCBmb3IgYXV0b2RldGVjdC5cbiAqIEBwYXJhbSB7S2V5Ym9hcmRFdmVudEluaXR9IGV2ZW50T3B0aW9uc1xuICogQ3VzdG9tIG9wdGlvbnMgdG8gYWRkL292ZXJ3cml0ZSBldmVudCBvcHRpb25zLlxuICovXG5mdW5jdGlvbiBjcmVhdGVLZXlib2FyZEV2ZW50KFxuICAgIG5hbWUsXG4gICAgdGFyZ2V0LFxuICAgIGtleSxcbiAgICBjb2RlLFxuICAgIGtleUNvZGUsXG4gICAgZXZlbnRPcHRpb25zXG4pIHtcbiAgICBpZiAoY29kZSA9PSBudWxsKSB7XG4gICAgICAgIGNvZGUgPSAnS2V5JyArIGtleS50b1VwcGVyQ2FzZSgpO1xuICAgIH1cblxuICAgIGlmIChrZXlDb2RlID09IG51bGwpIHtcbiAgICAgICAgLy8gYGNvZGVQb2ludEF0YCwgbm90IGBjaGFyQ29kZUF0YCwgYmVjYXVzZSBvZlxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxlblxuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vQW1haW1lcnNpb24vZ29vZ2xlLWRvY3MtdXRpbHMvaXNzdWVzLzgjaXNzdWVjb21tZW50LTgyNDExNzU4N1xuICAgICAgICBrZXlDb2RlID0ga2V5LmNvZGVQb2ludEF0KDApO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgS2V5Ym9hcmRFdmVudChcbiAgICAgICAgbmFtZSxcbiAgICAgICAge1xuICAgICAgICAgICAgcmVwZWF0OiBmYWxzZSxcbiAgICAgICAgICAgIGlzQ29tcG9zaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIGJ1YmJsZXM6IHRydWUsXG4gICAgICAgICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgICAgICAgY3RybEtleTogZmFsc2UsXG4gICAgICAgICAgICBzaGlmdEtleTogZmFsc2UsXG4gICAgICAgICAgICBhbHRLZXk6IGZhbHNlLFxuICAgICAgICAgICAgbWV0YUtleTogZmFsc2UsXG4gICAgICAgICAgICB0YXJnZXQ6IHRhcmdldCxcbiAgICAgICAgICAgIGN1cnJlbnRUYXJnZXQ6IHRhcmdldCxcbiAgICAgICAgICAgIGtleToga2V5LFxuICAgICAgICAgICAgY29kZTogY29kZSxcblxuICAgICAgICAgICAgLy8gaXQgaXMgaW1wb3J0YW50IHRvIGFsc28gc3BlY2lmeVxuICAgICAgICAgICAgLy8gdGhlc2UgZGVwcmVjYXRlZCBwcm9wZXJ0aWVzXG4gICAgICAgICAgICBrZXlDb2RlOiBrZXlDb2RlLFxuICAgICAgICAgICAgY2hhckNvZGU6IGtleUNvZGUsXG4gICAgICAgICAgICB3aGljaDoga2V5Q29kZSxcblxuICAgICAgICAgICAgLi4uZXZlbnRPcHRpb25zXG4gICAgICAgIH1cbiAgICApO1xufVxuXG5cbi8qKlxuICogQHBhcmFtIHtEb2N1bWVudCB8IEhUTUxFbGVtZW50fSB0YXJnZXRcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7c3RyaW5nIHwgbnVsbH0gY29kZVxuICogQHBhcmFtIHtudW1iZXIgfCBudWxsfSBrZXlDb2RlXG4gKiBAcGFyYW0ge0tleWJvYXJkRXZlbnRJbml0fSBldmVudE9wdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGtleXByZXNzKFxuICAgIHRhcmdldCxcbiAgICBrZXksXG4gICAgY29kZSA9IG51bGwsXG4gICAga2V5Q29kZSA9IG51bGwsXG4gICAgZXZlbnRPcHRpb25zID0ge31cbikge1xuICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlS2V5Ym9hcmRFdmVudChcbiAgICAgICAgJ2tleXByZXNzJyxcbiAgICAgICAgdGFyZ2V0LFxuICAgICAgICBrZXksXG4gICAgICAgIGNvZGUsXG4gICAgICAgIGtleUNvZGUsXG4gICAgICAgIGV2ZW50T3B0aW9uc1xuICAgICk7XG5cbiAgICB0YXJnZXQuZGlzcGF0Y2hFdmVudChldmVudCk7XG59XG5cblxuLyoqXG4gKiBAcGFyYW0ge0RvY3VtZW50IHwgSFRNTEVsZW1lbnR9IHRhcmdldFxuICogQHBhcmFtIHtzdHJpbmd9IGtleVxuICogQHBhcmFtIHtzdHJpbmcgfCBudWxsfSBjb2RlXG4gKiBAcGFyYW0ge251bWJlciB8IG51bGx9IGtleUNvZGVcbiAqIEBwYXJhbSB7S2V5Ym9hcmRFdmVudEluaXR9IGV2ZW50T3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24ga2V5ZG93bihcbiAgICB0YXJnZXQsXG4gICAga2V5LFxuICAgIGNvZGUgPSBudWxsLFxuICAgIGtleUNvZGUgPSBudWxsLFxuICAgIGV2ZW50T3B0aW9ucyA9IHt9XG4pIHtcbiAgICBjb25zdCBldmVudCA9IGNyZWF0ZUtleWJvYXJkRXZlbnQoXG4gICAgICAgICdrZXlkb3duJyxcbiAgICAgICAgdGFyZ2V0LFxuICAgICAgICBrZXksXG4gICAgICAgIGNvZGUsXG4gICAgICAgIGtleUNvZGUsXG4gICAgICAgIGV2ZW50T3B0aW9uc1xuICAgICk7XG5cbiAgICB0YXJnZXQuZGlzcGF0Y2hFdmVudChldmVudCk7XG59XG4iLCJpbXBvcnQge2tleXByZXNzLCBrZXlkb3dufSBmcm9tICcuL2NvbW1vbi9rZXlib2FyZC1ldmVudCc7XG5pbXBvcnQgZ2V0VGV4dEV2ZW50VGFyZ2V0IGZyb20gJy4vZ2V0LXRleHQtZXZlbnQtdGFyZ2V0JztcblxuXG4vLyNyZWdpb24gQmFzZVxuXG4vKipcbiAqIEltaXRhdGVzIHBoeXNpY2FsIHByZXNzIG9uIHNpbmdsZSBjaGFyYWN0ZXIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBDaGFyYWN0ZXIoY2hhciwge1xuICAgIGN0cmxLZXkgPSBmYWxzZSxcbiAgICBzaGlmdEtleSA9IGZhbHNlXG59ID0ge30pIHtcbiAgICAvLyBHb29nbGUgRG9jcyBoYW5kbGVzIGBrZXlkb3duYCBldmVudCBpbiBjYXNlIG9mXG4gICAgLy8gXCJjdHJsXCIgb3IgXCJzaGlmdFwiIG1vZGlmaWNhdG9ycywgb3RoZXJ3aXNlIGBrZXlwcmVzc2BcbiAgICAvLyBldmVudCBzaG91bGQgYmUgdXNlZCBmb3Igbm9ybWFsIGNoYXJhY3RlcnNcbiAgICBpZiAoY3RybEtleSB8fCBzaGlmdEtleSkge1xuICAgICAgICBrZXlkb3duKFxuICAgICAgICAgICAgZ2V0VGV4dEV2ZW50VGFyZ2V0KCksXG4gICAgICAgICAgICBjaGFyLFxuICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY3RybEtleSxcbiAgICAgICAgICAgICAgICBzaGlmdEtleVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGtleXByZXNzKFxuICAgICAgICAgICAgZ2V0VGV4dEV2ZW50VGFyZ2V0KCksXG4gICAgICAgICAgICBjaGFyXG4gICAgICAgICk7XG4gICAgfVxufVxuXG4vKipcbiAqIEltaXRhdGVzIHBoeXNpY2FsIHByZXNzIG9uIFwiQmFja3NwYWNlXCIuXG4gKlxuICogQHBhcmFtIHtib29sZWFufSBjdHJsS2V5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBCYWNrc3BhY2Uoe1xuICAgIGN0cmxLZXkgPSBmYWxzZVxufSA9IHt9KSB7XG4gICAga2V5ZG93bihcbiAgICAgICAgZ2V0VGV4dEV2ZW50VGFyZ2V0KCksXG4gICAgICAgICdCYWNrc3BhY2UnLFxuICAgICAgICAnQmFja3NwYWNlJyxcbiAgICAgICAgOCxcbiAgICAgICAge1xuICAgICAgICAgICAgY3RybEtleVxuICAgICAgICB9XG4gICAgKTtcbn1cblxuLyoqXG4gKiBJbWl0YXRlcyBwaHlzaWNhbCBwcmVzcyBvbiBcIlRhYlwiLlxuICovXG5leHBvcnQgZnVuY3Rpb24gVGFiKCkge1xuICAgIGtleWRvd24oXG4gICAgICAgIGdldFRleHRFdmVudFRhcmdldCgpLFxuICAgICAgICAnVGFiJyxcbiAgICAgICAgJ1RhYicsXG4gICAgICAgIDlcbiAgICApO1xufVxuXG4vKipcbiAqIEltaXRhdGVzIHBoeXNpY2FsIHByZXNzIG9uIFwiRW50ZXJcIi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIEVudGVyKCkge1xuICAgIGtleWRvd24oXG4gICAgICAgIGdldFRleHRFdmVudFRhcmdldCgpLFxuICAgICAgICAnRW50ZXInLFxuICAgICAgICAnRW50ZXInLFxuICAgICAgICAxM1xuICAgICk7XG59XG5cbi8qKlxuICogSW1pdGF0ZXMgcGh5c2ljYWwgcHJlc3Mgb24gc3BhY2UgY2hhcmFjdGVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gU3BhY2UoKSB7XG4gICAga2V5cHJlc3MoXG4gICAgICAgIGdldFRleHRFdmVudFRhcmdldCgpLFxuICAgICAgICAnXFx1MDAyMCcsXG4gICAgICAgICdTcGFjZScsXG4gICAgICAgIDMyXG4gICAgKTtcbn1cblxuLyoqXG4gKiBJbWl0YXRlcyBwaHlzaWNhbCBwcmVzcyBvbiBcIkVuZFwiIGJ1dHRvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIEVuZCh7XG4gICAgY3RybEtleSA9IGZhbHNlLFxuICAgIHNoaWZ0S2V5ID0gZmFsc2Vcbn0gPSB7fSkge1xuICAgIGtleWRvd24oXG4gICAgICAgIGdldFRleHRFdmVudFRhcmdldCgpLFxuICAgICAgICAnRW5kJyxcbiAgICAgICAgJ0VuZCcsXG4gICAgICAgIDM1LFxuICAgICAgICB7XG4gICAgICAgICAgICBjdHJsS2V5LFxuICAgICAgICAgICAgc2hpZnRLZXlcbiAgICAgICAgfVxuICAgICk7XG59XG5cbi8qKlxuICogSW1pdGF0ZXMgcGh5c2ljYWwgcHJlc3Mgb24gXCJIb21lXCIgYnV0dG9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gSG9tZSh7XG4gICAgY3RybEtleSA9IGZhbHNlLFxuICAgIHNoaWZ0S2V5ID0gZmFsc2Vcbn0gPSB7fSkge1xuICAgIGtleWRvd24oXG4gICAgICAgIGdldFRleHRFdmVudFRhcmdldCgpLFxuICAgICAgICAnSG9tZScsXG4gICAgICAgICdIb21lJyxcbiAgICAgICAgMzYsXG4gICAgICAgIHtcbiAgICAgICAgICAgIGN0cmxLZXksXG4gICAgICAgICAgICBzaGlmdEtleVxuICAgICAgICB9XG4gICAgKTtcbn1cblxuLyoqXG4gKiBJbWl0YXRlcyBwaHlzaWNhbCBwcmVzcyBvbiBsZWZ0IGFycm93LlxuICovXG5leHBvcnQgZnVuY3Rpb24gQXJyb3dMZWZ0KHtcbiAgICBjdHJsS2V5ID0gZmFsc2UsXG4gICAgc2hpZnRLZXkgPSBmYWxzZVxufSA9IHt9KSB7XG4gICAga2V5ZG93bihcbiAgICAgICAgZ2V0VGV4dEV2ZW50VGFyZ2V0KCksXG4gICAgICAgICdBcnJvd0xlZnQnLFxuICAgICAgICAnQXJyb3dMZWZ0JyxcbiAgICAgICAgMzcsXG4gICAgICAgIHtcbiAgICAgICAgICAgIGN0cmxLZXksXG4gICAgICAgICAgICBzaGlmdEtleVxuICAgICAgICB9XG4gICAgKTtcbn1cblxuLyoqXG4gKiBJbWl0YXRlcyBwaHlzaWNhbCBwcmVzcyBvbiB1cCBhcnJvdy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIEFycm93VXAoe1xuICAgIGN0cmxLZXkgPSBmYWxzZSxcbiAgICBzaGlmdEtleSA9IGZhbHNlXG59ID0ge30pIHtcbiAgICBrZXlkb3duKFxuICAgICAgICBnZXRUZXh0RXZlbnRUYXJnZXQoKSxcbiAgICAgICAgJ0Fycm93VXAnLFxuICAgICAgICAnQXJyb3dVcCcsXG4gICAgICAgIDM4LFxuICAgICAgICB7XG4gICAgICAgICAgICBjdHJsS2V5LFxuICAgICAgICAgICAgc2hpZnRLZXlcbiAgICAgICAgfVxuICAgICk7XG59XG5cbi8qKlxuICogSW1pdGF0ZXMgcGh5c2ljYWwgcHJlc3Mgb24gcmlnaHQgYXJyb3cuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBBcnJvd1JpZ2h0KHtcbiAgICBjdHJsS2V5ID0gZmFsc2UsXG4gICAgc2hpZnRLZXkgPSBmYWxzZVxufSA9IHt9KSB7XG4gICAga2V5ZG93bihcbiAgICAgICAgZ2V0VGV4dEV2ZW50VGFyZ2V0KCksXG4gICAgICAgICdBcnJvd1JpZ2h0JyxcbiAgICAgICAgJ0Fycm93UmlnaHQnLFxuICAgICAgICAzOSxcbiAgICAgICAge1xuICAgICAgICAgICAgY3RybEtleSxcbiAgICAgICAgICAgIHNoaWZ0S2V5XG4gICAgICAgIH1cbiAgICApO1xufVxuXG4vKipcbiAqIEltaXRhdGVzIHBoeXNpY2FsIHByZXNzIG9uIGRvd24gYXJyb3cuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBBcnJvd0Rvd24oe1xuICAgIGN0cmxLZXkgPSBmYWxzZSxcbiAgICBzaGlmdEtleSA9IGZhbHNlXG59ID0ge30pIHtcbiAgICBrZXlkb3duKFxuICAgICAgICBnZXRUZXh0RXZlbnRUYXJnZXQoKSxcbiAgICAgICAgJ0Fycm93RG93bicsXG4gICAgICAgICdBcnJvd0Rvd24nLFxuICAgICAgICA0MCxcbiAgICAgICAge1xuICAgICAgICAgICAgY3RybEtleSxcbiAgICAgICAgICAgIHNoaWZ0S2V5XG4gICAgICAgIH1cbiAgICApO1xufVxuXG4vKipcbiAqIEltaXRhdGVzIHBoeXNpY2FsIHByZXNzIG9uIFwiRGVsZXRlXCIgKFwiRGVsXCIpLlxuICovXG5leHBvcnQgZnVuY3Rpb24gRGVsZXRlKHtcbiAgICBjdHJsS2V5ID0gZmFsc2Vcbn0gPSB7fSkge1xuICAgIGtleWRvd24oXG4gICAgICAgIGdldFRleHRFdmVudFRhcmdldCgpLFxuICAgICAgICAnRGVsZXRlJyxcbiAgICAgICAgJ0RlbGV0ZScsXG4gICAgICAgIDQ2LFxuICAgICAgICB7XG4gICAgICAgICAgICBjdHJsS2V5XG4gICAgICAgIH1cbiAgICApO1xufVxuXG4vLyNlbmRyZWdpb25cblxuXG4vLyNyZWdpb24gRGVwZW5kZW5jZVxuXG4vKipcbiAqIEltaXRhdGVzIHBoeXNpY2FsIHByZXNzIG9uIFwiVW5kb1wiIGJ1dHRvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIFVuZG8oKSB7XG4gICAgQ2hhcmFjdGVyKCd6Jywge1xuICAgICAgICBjdHJsS2V5OiB0cnVlXG4gICAgfSk7XG59XG5cbi8qKlxuICogSW1pdGF0ZXMgcGh5c2ljYWwgcHJlc3Mgb24gXCJSZWRvXCIgYnV0dG9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gUmVkbygpIHtcbiAgICBDaGFyYWN0ZXIoJ3knLCB7XG4gICAgICAgIGN0cmxLZXk6IHRydWVcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBJbWl0YXRlcyBwaHlzaWNhbCBwcmVzcyBvbiBcIlByaW50XCIgYnV0dG9uXG4gKiAocHJpbnQgZGlhbG9nLCBub3QgcHJpbnQgb2YgY2hhcmFjdGVyKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIFByaW50RGlhbG9nKCkge1xuICAgIENoYXJhY3RlcigncCcsIHtcbiAgICAgICAgY3RybEtleTogdHJ1ZVxuICAgIH0pO1xufVxuXG4vKipcbiAqIEltaXRhdGVzIHBoeXNpY2FsIHByZXNzIG9uIFwiQm9sZFwiIGJ1dHRvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIEJvbGQoKSB7XG4gICAgQ2hhcmFjdGVyKCdiJywge1xuICAgICAgICBjdHJsS2V5OiB0cnVlXG4gICAgfSk7XG59XG5cbi8qKlxuICogSW1pdGF0ZXMgcGh5c2ljYWwgcHJlc3Mgb24gXCJJdGFsaWNcIiBidXR0b24uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBJdGFsaWMoKSB7XG4gICAgQ2hhcmFjdGVyKCdpJywge1xuICAgICAgICBjdHJsS2V5OiB0cnVlXG4gICAgfSk7XG59XG5cbi8qKlxuICogSW1pdGF0ZXMgcGh5c2ljYWwgcHJlc3Mgb24gXCJVbmRlcmxpbmVcIiBidXR0b24uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBVbmRlcmxpbmUoKSB7XG4gICAgQ2hhcmFjdGVyKCd1Jywge1xuICAgICAgICBjdHJsS2V5OiB0cnVlXG4gICAgfSk7XG59XG5cbi8vI2VuZHJlZ2lvblxuIiwiaW1wb3J0ICogYXMgcHJlc3NPbiBmcm9tICcuL3ByZXNzLW9uJztcblxuXG4vKipcbiAqIFR5cGVzIHRleHQgYXQgY3VycmVudCBjYXJldCBwb3NpdGlvbi5cbiAqXG4gKiAtIGltaXRhdGVzIHBoeXNpY2FsIHR5cGluZ1xuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0XG4gKiBUZXh0IHRvIHR5cGUuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHR5cGVUZXh0KHRleHQpIHtcbiAgICB0eXBlKHRleHQpO1xufVxuXG5cbi8qKlxuICogVHlwZXMgdGV4dCBhdCBjdXJyZW50IGNhcmV0IHBvc2l0aW9uLlxuICpcbiAqIC0gaW1pdGF0ZXMga2V5IHByZXNzIGNoYXIgYnkgY2hhcixcbiAqIGNhbiB0YWtlIGEgbG9uZyB0aW1lIGZvciBsb25nIHRleHQuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHRleHRcbiAqL1xuZnVuY3Rpb24gdHlwZSh0ZXh0KSB7XG4gICAgZm9yIChjb25zdCBjaGFyIG9mIHRleHQpIHtcbiAgICAgICAgcHJlc3NPbi5DaGFyYWN0ZXIoY2hhcik7XG4gICAgfVxufVxuIiwiaW1wb3J0IGdldFNlbGVjdGlvbkVsZW1lbnRzIGZyb20gJy4vZ2V0LXNlbGVjdGlvbi1vdmVybGF5LWVsZW1lbnRzJztcblxuXG4vKipcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICogVGV4dCBzZWxlY3Rpb24gaXMgZXhpc3RzIChhdCBsZWFzdCBvbmUgbGluZSkuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGlzVGV4dFNlbGVjdGVkKCkge1xuICAgIGNvbnN0IHNlbGVjdGlvbkVsZW1lbnRzID0gZ2V0U2VsZWN0aW9uRWxlbWVudHMoKTtcbiAgICBjb25zdCBpc1NlbGVjdGVkID0gc2VsZWN0aW9uRWxlbWVudHMuc29tZSgoaSkgPT4gISFpKTtcblxuICAgIHJldHVybiBpc1NlbGVjdGVkO1xufVxuIiwiaW1wb3J0IGdldEFjdGl2ZUN1cnNvckVsZW1lbnQgZnJvbSAnLi9nZXQtYWN0aXZlLWN1cnNvci1lbGVtZW50JztcblxuXG4vKipcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICogRG9jdW1lbnQgaXMgZm9jdXNlZCBhbmQgYWN0aXZlLlxuICogSXQgaXMgbWVhbnMgdGhhdCBjdXJzb3IgaXMgYmxpbmtlZC5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaXNEb2N1bWVudEFjdGl2ZSgpIHtcbiAgICBjb25zdCBhY3RpdmVDdXJzb3IgPSBnZXRBY3RpdmVDdXJzb3JFbGVtZW50KCk7XG4gICAgY29uc3QgZG9jdW1lbnRJc0FjdGl2ZSA9ICEhYWN0aXZlQ3Vyc29yO1xuXG4gICAgcmV0dXJuIGRvY3VtZW50SXNBY3RpdmU7XG59XG4iLCJpbXBvcnQgaXNEb2N1bWVudEFjdGl2ZSBmcm9tICcuL2lzLWRvY3VtZW50LWFjdGl2ZSc7XG5pbXBvcnQgaXNUZXh0U2VsZWN0ZWQgZnJvbSAnLi9pcy10ZXh0LXNlbGVjdGVkJztcbmltcG9ydCB7XG4gICAgQ2hhcmFjdGVyIGFzIFByZXNzT25DaGFyYWN0ZXIsXG4gICAgVW5kbyBhcyBQcmVzc09uVW5kbyxcbiAgICBCYWNrc3BhY2UgYXMgUHJlc3NPbkJhY2tzcGFjZVxufSBmcm9tICcuL3ByZXNzLW9uJztcblxuXG4vKipcbiAqIEZvY3VzZXMgb24gY3VycmVudCBkb2N1bWVudC5cbiAqXG4gKiBcIkZvY3VzXCIgbWVhbnMgdGhhdCBkb2N1bWVudCBpcyBhY3RpdmUgYW5kIGF2YWlsYWJsZSBmb3IgZWRpdGluZzpcbiAqIGN1cnNvciBpcyBibGlua2luZyBvciBzZWxlY3Rpb24gYWN0aXZlLlxuICpcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICogYHRydWVgIGlmIHRoZXJlIHdhcyBhbnkgYWN0aW9ucyB0byBwZXJmb3JtIGEgZm9jdXMsXG4gKiBgZmFsc2VgIGlmIGRvY3VtZW50IGFscmVhZHkgd2FzIGFjdGl2ZSBhbmQgbm90aGluZyB3YXMgcGVyZm9ybWVkLlxuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBmb2N1c0RvY3VtZW50KCkge1xuICAgIGlmIChpc0RvY3VtZW50QWN0aXZlKCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIGNoYXJhY3RlciB0aGF0IGlzIGFjY2VwdGFibGUgYnkgR29vZ2xlIERvY3Mgc2hvdWxkIGJlIHVzZWQuXG4gICAgLy8gRm9yIGV4YW1wbGUsIGBcXHUwMDAwYCBpcyBub3QgYWNjZXB0YWJsZSBhbmQgd2lsbCBiZSBub3QgdHlwZWQuXG4gICAgLy8gVXNlIHNvbWV0aGluZyBmcm9tIHRoaXMgcGxhbmU6XG4gICAgLy8gaHR0cHM6Ly93d3cuY29tcGFydC5jb20vZW4vdW5pY29kZS9wbGFuZS9VKzAwMDBcbiAgICBjb25zdCByYW5kb21DaGFyVG9DcmVhdGVGb2N1cyA9ICdcXHUwMDNGJztcblxuICAgIGNvbnN0IHRleHRTZWxlY3RlZCA9IGlzVGV4dFNlbGVjdGVkKCk7XG5cbiAgICBQcmVzc09uQ2hhcmFjdGVyKHJhbmRvbUNoYXJUb0NyZWF0ZUZvY3VzKTtcblxuICAgIC8vIGlmIHNlbGVjdGlvbiBleGlzdGVkLCB0aGVuIGF0IHRoZSBtb21lbnQgd2UgcmVtb3ZlZCBpdC5cbiAgICAvLyBsZXRzIHJlc3RvcmUgaXQsIG90aGVyd2lzZSB3ZSB3aWxsIGRlbGV0ZSB0eXBlZCBjaGFyYWN0ZXJcbiAgICBpZiAodGV4dFNlbGVjdGVkKSB7XG4gICAgICAgIFByZXNzT25VbmRvKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgUHJlc3NPbkJhY2tzcGFjZSgpO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xufVxuIiwiaW1wb3J0ICogYXMgcHJlc3NPbiBmcm9tICcuL3ByZXNzLW9uJztcbmltcG9ydCBmb2N1c0RvY3VtZW50IGZyb20gJy4vZm9jdXMtZG9jdW1lbnQnO1xuXG5cbi8qKlxuICogTW92ZXMgY3Vyc29yIHRvIGNoYXJhY3RlciB0aGF0IGlzIHBsYWNlZCB0byB0aGUgbGVmdFxuICogb2YgY3VycmVudCBjdXJzb3IgcG9zaXRpb24uIElmIHRoYXQgY2hhcmFjdGVyIHBsYWNlZFxuICogb24gcHJldmlvdXMgbGluZSwgdGhlbiBwcmV2aW91cyBsaW5lIHdpbGwgYmUgdXNlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gUHJldkNoYXJhY3RlcigpIHtcbiAgICBwcmVzc09uLkFycm93TGVmdCgpO1xufVxuXG5cbi8qKlxuICogTW92ZXMgY3Vyc29yIHRvIGNoYXJhY3RlciB0aGF0IGlzIHBsYWNlZCB0byB0aGUgcmlnaHRcbiAqIG9mIGN1cnJlbnQgY3Vyc29yIHBvc2l0aW9uLiBJZiB0aGF0IGNoYXJhY3RlciBwbGFjZWRcbiAqIG9uIG5leHQgbGluZSwgdGhlbiBuZXh0IGxpbmUgd2lsbCBiZSB1c2VkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBOZXh0Q2hhcmFjdGVyKCkge1xuICAgIHByZXNzT24uQXJyb3dSaWdodCgpO1xufVxuXG5cbi8qKlxuICogTW92ZXMgY3Vyc29yIHRvIHRoZSBwcmV2aW91cyBsaW5lIGFuZCB0cmllcyB0byBrZWVwXG4gKiBjdXJzb3IgcG9zaXRpb24uIElmIHRoZXJlIGlzIG5vIHByZXZpb3VzIGxpbmUsIHRoZW4gbW92ZXNcbiAqIGN1cnNvciB0byB0aGUgc3RhcnQgb2YgY3VycmVudCBwYXJhZ3JhcGhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIFByZXZMaW5lKCkge1xuICAgIHByZXNzT24uQXJyb3dVcCgpO1xufVxuXG5cbi8qKlxuICogTW92ZXMgY3Vyc29yIHRvIHRoZSBuZXh0IGxpbmUgYW5kIHRyaWVzIHRvIGtlZXBcbiAqIGN1cnNvciBwb3NpdGlvbi4gSWYgdGhlcmUgaXMgbm8gbmV4dCBsaW5lLCB0aGVuIG1vdmVzXG4gKiBjdXJzb3IgdG8gdGhlIGVuZCBvZiBjdXJyZW50IHBhcmFncmFwaFxuICovXG5leHBvcnQgZnVuY3Rpb24gTmV4dExpbmUoKSB7XG4gICAgcHJlc3NPbi5BcnJvd0Rvd24oKTtcbn1cblxuXG4vKipcbiAqIE1vdmVzIGN1cnNvciB0bzpcbiAqIC0gaWYgaXQgaXMgc3RhcnQgb2YgY3VycmVudCBsaW5lLCB0aGVuIHRvXG4gKiB0aGUgZW5kIG9mIHByZXZpb3VzIHdvcmQgb24gcHJldmlvdXMgbGluZVxuICogLSBlbHNlIGlmIGl0IGlzIHN0YXJ0IG9mIGN1cnJlbnQgd29yZCwgdGhlbiB0b1xuICogdGhlIHN0YXJ0IG9mIHByZXZpb3VzIHdvcmRcbiAqIC0gZWxzZSBtb3ZlcyB0byB0aGUgc3RhcnQgb2YgY3VycmVudCB3b3JkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBQcmV2V29yZCgpIHtcbiAgICBwcmVzc09uLkFycm93TGVmdCh7XG4gICAgICAgIGN0cmxLZXk6IHRydWVcbiAgICB9KTtcbn1cblxuXG4vKipcbiAqIE1vdmVzIGN1cnNvciB0bzpcbiAqIC0gaWYgaXQgaXMgZW5kIG9mIGN1cnJlbnQgbGluZSwgdGhlbiB0b1xuICogdGhlIHN0YXJ0IG9mIG5leHQgd29yZCBvbiBuZXh0IGxpbmVcbiAqIC0gZWxzZSBpZiBpdCBpcyBlbmQgb2YgY3VycmVudCB3b3JkLCB0aGVuIHRvXG4gKiB0aGUgZW5kIG9mIG5leHQgd29yZFxuICogLSBlbHNlIG1vdmVzIHRvIHRoZSBlbmQgb2YgY3VycmVudCB3b3JkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBOZXh0V29yZCgpIHtcbiAgICBwcmVzc09uLkFycm93UmlnaHQoe1xuICAgICAgICBjdHJsS2V5OiB0cnVlXG4gICAgfSk7XG59XG5cblxuLyoqXG4gKiBNb3ZlcyBjdXJzb3IgdG86XG4gKiAtIGlmIGl0IGlzIHN0YXJ0IG9mIGN1cnJlbnQgcGFyYWdyYXBoLCB0aGVuIHRvXG4gKiB0aGUgc3RhcnQgb2YgcHJldmlvdXMgcGFyYWdyYXBoXG4gKiAtIGVsc2UgbW92ZXMgdG8gdGhlIHN0YXJ0IG9mIGN1cnJlbnQgcGFyYWdyYXBoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBQcmV2UGFyYWdyYXBoKCkge1xuICAgIHByZXNzT24uQXJyb3dVcCh7XG4gICAgICAgIGN0cmxLZXk6IHRydWVcbiAgICB9KTtcbn1cblxuXG4vKipcbiAqIE1vdmVzIGN1cnNvciB0bzpcbiAqIC0gaWYgaXQgaXMgZW5kIG9mIGN1cnJlbnQgcGFyYWdyYXBoLCB0aGVuIHRvXG4gKiB0aGUgZW5kIG9mIG5leHQgcGFyYWdyYXBoXG4gKiAtIGVsc2UgbW92ZXMgdG8gdGhlIGVuZCBvZiBjdXJyZW50IHBhcmFncmFwaFxuICovXG5leHBvcnQgZnVuY3Rpb24gTmV4dFBhcmFncmFwaCgpIHtcbiAgICBwcmVzc09uLkFycm93RG93bih7XG4gICAgICAgIGN0cmxLZXk6IHRydWVcbiAgICB9KTtcbn1cblxuXG4vKipcbiAqIE1vdmVzIGN1cnNvciB0byB0aGUgc3RhcnQgb2YgY3VycmVudCBsaW5lLlxuICovXG5leHBvcnQgZnVuY3Rpb24gTGluZVN0YXJ0KCkge1xuICAgIC8vIGZvY3VzIGlzIG5lZWRlZCBpbiBvcmRlciB0byBiZWhhdmUgcHJvcGVybHlcbiAgICBmb2N1c0RvY3VtZW50KCk7XG5cbiAgICBwcmVzc09uLkhvbWUoKTtcbn1cblxuXG4vKipcbiAqIE1vdmVzIGN1cnNvciB0byB0aGUgZW5kIG9mIGN1cnJlbnQgbGluZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIExpbmVFbmQoKSB7XG4gICAgLy8gZm9jdXMgaXMgbmVlZGVkIGluIG9yZGVyIHRvIGJlaGF2ZSBwcm9wZXJseVxuICAgIGZvY3VzRG9jdW1lbnQoKTtcblxuICAgIHByZXNzT24uRW5kKCk7XG59XG5cblxuLyoqXG4gKiBNb3ZlcyBjdXJzb3IgdG8gdGhlIHN0YXJ0IG9mIGRvY3VtZW50LlxuICovXG5leHBvcnQgZnVuY3Rpb24gRG9jdW1lbnRTdGFydCgpIHtcbiAgICBwcmVzc09uLkhvbWUoe1xuICAgICAgICBjdHJsS2V5OiB0cnVlXG4gICAgfSk7XG59XG5cblxuLyoqXG4gKiBNb3ZlcyBjdXJzb3IgdG8gdGhlIGVuZCBvZiBkb2N1bWVudC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIERvY3VtZW50RW5kKCkge1xuICAgIHByZXNzT24uRW5kKHtcbiAgICAgICAgY3RybEtleTogdHJ1ZVxuICAgIH0pO1xufVxuIiwiaW1wb3J0ICogYXMgcHJlc3NPbiBmcm9tICcuL3ByZXNzLW9uJztcbmltcG9ydCBpc1RleHRTZWxlY3RlZCBmcm9tICcuL2lzLXRleHQtc2VsZWN0ZWQnO1xuXG5cbi8qKlxuICogUmVtb3ZlczpcbiAqIC0gaWYgcHJldiB3b3JkIGlzIHByZXNlbnQsIHRoZW4gaXQgd2lsbCBiZSByZW1vdmVkXG4gKiAtIGVsc2UgY29udGVudCBmcm9tIGN1cnJlbnQgbGluZSB3aWxsIGJlIGRpdmlkZWQgd2l0aCBwcmV2IGxpbmVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIFByZXZXb3JkKCkge1xuICAgIHByZXNzT24uQmFja3NwYWNlKHtcbiAgICAgICAgY3RybEtleTogdHJ1ZVxuICAgIH0pO1xufVxuXG5cbi8qKlxuICogUmVtb3ZlczpcbiAqIC0gaWYgbmV4dCB3b3JkIGlzIHByZXNlbnQsIHRoZW4gaXQgd2lsbCBiZSByZW1vdmVkXG4gKiAtIGVsc2UgY29udGVudCBmcm9tIGN1cnJlbnQgbGluZSB3aWxsIGJlIGRpdmlkZWQgd2l0aCBuZXh0IGxpbmVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIE5leHRXb3JkKCkge1xuICAgIHByZXNzT24uRGVsZXRlKHtcbiAgICAgICAgY3RybEtleTogdHJ1ZVxuICAgIH0pO1xufVxuXG5cbi8qKlxuICogUmVtb3ZlcyBhY3RpdmUgc2VsZWN0aW9uLlxuICpcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICogYHRydWVgIC0gc2VsZWN0aW9uIHdhcyByZW1vdmVkLFxuICogYGZhbHNlYCAtIG5vdGhpbmcgdG8gcmVtb3ZlIChub3RoaW5nIGlzIHNlbGVjdGVkKVxuICovXG4gZXhwb3J0IGZ1bmN0aW9uIFNlbGVjdGlvbigpIHtcbiAgICBpZiAoIWlzVGV4dFNlbGVjdGVkKCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIFwiRGVsZXRlXCIgc2hvdWxkIGJlIHVzZWQsIG5vdCBcIkJhY2tzcGFjZVwiLlxuICAgIHByZXNzT24uRGVsZXRlKCk7XG5cbiAgICByZXR1cm4gdHJ1ZTtcbn1cbiIsImltcG9ydCAqIGFzIHByZXNzT24gZnJvbSAnLi9wcmVzcy1vbic7XG5pbXBvcnQgZm9jdXNEb2N1bWVudCBmcm9tICcuL2ZvY3VzLWRvY3VtZW50JztcblxuXG4vKipcbiAqIFNlbGVjdHMgdGV4dCBvZiBlbnRpcmUgZG9jdW1lbnQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBBbGwoKSB7XG4gICAgcHJlc3NPbi5DaGFyYWN0ZXIoJ2EnLCB7XG4gICAgICAgIGN0cmxLZXk6IHRydWVcbiAgICB9KTtcbn1cblxuXG4vKipcbiAqIFNlbGVjdHMgYSBjaGFyYWN0ZXIgdGhhdCBpcyBwbGFjZWQgdG8gdGhlIGxlZnQgb2ZcbiAqIGN1cnJlbnQgY3Vyc29yIHBvc2l0aW9uLiBGb2xsb3dpbmcgbG9naWMgd2lsbCBiZSB1c2VkLFxuICogd2l0aCBwcmlvcml0eSBvZiBhY3Rpb25zIGZyb20gdG9wIHRvIGJvdHRvbTpcbiAqIC0gaWYgYXQgbGVhc3Qgb25lIGNoYXJhY3RlciBhbHJlYWR5IHNlbGVjdGVkIHdpdGggcmV2ZXJzZSBzZWxlY3Rpb25cbiAqIChvcHBvc2l0ZSBkaXJlY3Rpb24pLCB0aGVuIGxhc3RseSBzZWxlY3RlZCBjaGFyYWN0ZXIgd2lsbCBiZSBkZXNlbGVjdGVkXG4gKiAtIGlmIGF0IGxlYXN0IG9uZSBjaGFyYWN0ZXIgYWxyZWFkeSBzZWxlY3RlZCwgdGhlbiBuZXh0IG9uZSB3aWxsXG4gKiBiZSBzZWxlY3RlZC4gSWYgdGhhdCBuZXh0IGNoYXJhY3RlciBsb2NhdGVkIG9uIHByZXZpb3VzIGxpbmUsXG4gKiB0aGFuIHRoYXQgcHJldmlvdXMgbGluZSB3aWxsIGJlIHVzZWRcbiAqIC0gaWYgbm90aGluZyBzZWxlY3RlZCwgdGhlbiBmaXJzdCBjaGFyYWN0ZXIgd2lsbCBiZSBzZWxlY3RlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gUHJldkNoYXJhY3RlcigpIHtcbiAgICBwcmVzc09uLkFycm93TGVmdCh7XG4gICAgICAgIHNoaWZ0S2V5OiB0cnVlXG4gICAgfSk7XG59XG5cblxuLyoqXG4gKiBTZWxlY3RzIGEgY2hhcmFjdGVyIHRoYXQgaXMgcGxhY2VkIHRvIHRoZSByaWdodCBvZlxuICogY3VycmVudCBjdXJzb3IgcG9zaXRpb24uIEZvbGxvd2luZyBsb2dpYyB3aWxsIGJlIHVzZWQsXG4gKiB3aXRoIHByaW9yaXR5IG9mIGFjdGlvbnMgZnJvbSB0b3AgdG8gYm90dG9tOlxuICogLSBpZiBhdCBsZWFzdCBvbmUgY2hhcmFjdGVyIGFscmVhZHkgc2VsZWN0ZWQgd2l0aCByZXZlcnNlIHNlbGVjdGlvblxuICogKG9wcG9zaXRlIGRpcmVjdGlvbiksIHRoZW4gbGFzdGx5IHNlbGVjdGVkIGNoYXJhY3RlciB3aWxsIGJlIGRlc2VsZWN0ZWRcbiAqIC0gaWYgYXQgbGVhc3Qgb25lIGNoYXJhY3RlciBhbHJlYWR5IHNlbGVjdGVkLCB0aGVuIG5leHQgb25lIHdpbGxcbiAqIGJlIHNlbGVjdGVkLiBJZiB0aGF0IG5leHQgY2hhcmFjdGVyIGxvY2F0ZWQgb24gbmV4dCBsaW5lLFxuICogdGhhbiB0aGF0IG5leHQgbGluZSB3aWxsIGJlIHVzZWRcbiAqIC0gaWYgbm90aGluZyBzZWxlY3RlZCwgdGhlbiBmaXJzdCBjaGFyYWN0ZXIgd2lsbCBiZSBzZWxlY3RlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gTmV4dENoYXJhY3RlcigpIHtcbiAgICBwcmVzc09uLkFycm93UmlnaHQoe1xuICAgICAgICBzaGlmdEtleTogdHJ1ZVxuICAgIH0pO1xufVxuXG5cbi8qKlxuICogU2FtZSBhcyBgUHJldkNoYXJhY3RlcmAsIGJ1dCBwZXJmb3JtcyBhbiBhY3Rpb24gd2l0aCB3b3JkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gUHJldldvcmQoKSB7XG4gICAgcHJlc3NPbi5BcnJvd0xlZnQoe1xuICAgICAgICBzaGlmdEtleTogdHJ1ZSxcbiAgICAgICAgY3RybEtleTogdHJ1ZVxuICAgIH0pO1xufVxuXG5cbi8qKlxuICogU2FtZSBhcyBgTmV4dENoYXJhY3RlcmAsIGJ1dCBwZXJmb3JtcyBhbiBhY3Rpb24gd2l0aCB3b3JkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gTmV4dFdvcmQoKSB7XG4gICAgcHJlc3NPbi5BcnJvd1JpZ2h0KHtcbiAgICAgICAgc2hpZnRLZXk6IHRydWUsXG4gICAgICAgIGN0cmxLZXk6IHRydWVcbiAgICB9KTtcbn1cblxuXG4vKipcbiAqIFNlbGVjdHMgTiBudW1iZXIgb2YgY2hhcmFjdGVycyB0byB0aGUgbGVmdCB3aGVyZSBOXG4gKiBpcyBhIG1heCBsZW5ndGggb2YgbGluZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIFByZXZMaW5lKCkge1xuICAgIC8vIHJlcXVpcmVzIGZvY3VzIHRvIGJlaGF2ZSBjb3JyZWN0bHlcbiAgICBmb2N1c0RvY3VtZW50KCk7XG5cbiAgICBwcmVzc09uLkFycm93VXAoe1xuICAgICAgICBzaGlmdEtleTogdHJ1ZVxuICAgIH0pO1xufVxuXG5cbi8qKlxuICogU2FtZSBhcyBgUHJldkxpbmVgLCBidXQgdXNlcyByaWdodCBkaXJlY3Rpb24uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBOZXh0TGluZSgpIHtcbiAgICAvLyByZXF1aXJlcyBmb2N1cyB0byBiZWhhdmUgY29ycmVjdGx5XG4gICAgZm9jdXNEb2N1bWVudCgpO1xuXG4gICAgcHJlc3NPbi5BcnJvd0Rvd24oe1xuICAgICAgICBzaGlmdEtleTogdHJ1ZVxuICAgIH0pO1xufVxuXG5cbi8qKlxuICogU2VsZWN0cyBhIHBhcmFncmFwaCB0aGF0IGlzIHBsYWNlZCB0byB0aGUgbGVmdCBvZlxuICogY3VycmVudCBjdXJzb3IgcG9zaXRpb24uIEZvbGxvd2luZyBsb2dpYyB3aWxsIGJlIHVzZWQsXG4gKiB3aXRoIHByaW9yaXR5IG9mIGFjdGlvbnMgZnJvbSB0b3AgdG8gYm90dG9tOlxuICogLSBpZiBpdCBpcyBzdGFydCBvZiBjdXJyZW50IHBhcmFncmFwaCwgdGhlbiBwcmV2aW91c1xuICogcGFyYWdyYXBoIHdpbGwgYmUgc2VsZWN0ZWRcbiAqIC0gZWxzZSB0ZXh0IGJldHdlZW4gY3VycmVudCBwYXJhZ3JhcGggc3RhcnQgYW5kIGN1cnJlbnRcbiAqIGN1cnNvciBwb3NpdGlvbiB3aWxsIGJlIHNlbGVjdGVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBQcmV2UGFyYWdyYXBoKCkge1xuICAgIHByZXNzT24uQXJyb3dVcCh7XG4gICAgICAgIHNoaWZ0S2V5OiB0cnVlLFxuICAgICAgICBjdHJsS2V5OiB0cnVlXG4gICAgfSk7XG59XG5cblxuLyoqXG4gKiBTZWxlY3RzIGEgcGFyYWdyYXBoIHRoYXQgaXMgcGxhY2VkIHRvIHRoZSByaWdodCBvZlxuICogY3VycmVudCBjdXJzb3IgcG9zaXRpb24uIEZvbGxvd2luZyBsb2dpYyB3aWxsIGJlIHVzZWQsXG4gKiB3aXRoIHByaW9yaXR5IG9mIGFjdGlvbnMgZnJvbSB0b3AgdG8gYm90dG9tOlxuICogLSBpZiBpdCBpcyBlbmQgb2YgY3VycmVudCBwYXJhZ3JhcGgsIHRoZW4gbmV4dFxuICogcGFyYWdyYXBoIHdpbGwgYmUgTk9UIHNlbGVjdGVkXG4gKiAtIGVsc2UgdGV4dCBiZXR3ZWVuIGN1cnJlbnQgcGFyYWdyYXBoIGVuZCBhbmQgY3VycmVudFxuICogY3Vyc29yIHBvc2l0aW9uIHdpbGwgYmUgc2VsZWN0ZWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIE5leHRQYXJhZ3JhcGgoKSB7XG4gICAgcHJlc3NPbi5BcnJvd0Rvd24oe1xuICAgICAgICBzaGlmdEtleTogdHJ1ZSxcbiAgICAgICAgY3RybEtleTogdHJ1ZVxuICAgIH0pO1xufVxuXG5cbi8qKlxuICogU2VsZWN0cyBhIHRleHQgYmV0d2VlbiBjdXJyZW50IGN1cnNvciBwb3NpdGlvbiBhbmRcbiAqIGN1cnJlbnQgbGluZSBzdGFydC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIFRleHRCZXR3ZWVuQ3Vyc29yQW5kTGluZVN0YXJ0KCkge1xuICAgIC8vIHJlcXVpcmVzIGZvY3VzIHRvIGJlaGF2ZSBjb3JyZWN0bHlcbiAgICBmb2N1c0RvY3VtZW50KCk7XG5cbiAgICBwcmVzc09uLkhvbWUoe1xuICAgICAgICBzaGlmdEtleTogdHJ1ZVxuICAgIH0pO1xufVxuXG5cbi8qKlxuICogU2FtZSBhcyBgVGV4dEJldHdlZW5DdXJzb3JBbmRMaW5lU3RhcnRgLCBidXQgaW50ZXJhY3RzXG4gKiB3aXRoIGN1cnJlbnQgbGluZSBlbmQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBUZXh0QmV0d2VlbkN1cnNvckFuZExpbmVFbmQoKSB7XG4gICAgLy8gcmVxdWlyZXMgZm9jdXMgdG8gYmVoYXZlIGNvcnJlY3RseVxuICAgIGZvY3VzRG9jdW1lbnQoKTtcblxuICAgIHByZXNzT24uRW5kKHtcbiAgICAgICAgc2hpZnRLZXk6IHRydWVcbiAgICB9KTtcbn1cblxuXG4vKipcbiAqIFNhbWUgYXMgYFRleHRCZXR3ZWVuQ3Vyc29yQW5kTGluZVN0YXJ0YCwgYnV0IGludGVyYWN0c1xuICogd2l0aCBkb2N1bWVudCBzdGFydC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIFRleHRCZXR3ZWVuQ3Vyc29yQW5kRG9jdW1lbnRTdGFydCgpIHtcbiAgICBwcmVzc09uLkhvbWUoe1xuICAgICAgICBzaGlmdEtleTogdHJ1ZSxcbiAgICAgICAgY3RybEtleTogdHJ1ZVxuICAgIH0pO1xufVxuXG5cbi8qKlxuICogU2FtZSBhcyBgVGV4dEJldHdlZW5DdXJzb3JBbmRMaW5lU3RhcnRgLCBidXQgaW50ZXJhY3RzXG4gKiB3aXRoIGRvY3VtZW50IGVuZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIFRleHRCZXR3ZWVuQ3Vyc29yQW5kRG9jdW1lbnRFbmQoKSB7XG4gICAgcHJlc3NPbi5FbmQoe1xuICAgICAgICBzaGlmdEtleTogdHJ1ZSxcbiAgICAgICAgY3RybEtleTogdHJ1ZVxuICAgIH0pO1xufVxuIiwiaW1wb3J0IHtcbiAgICBydW5PblBhZ2VMb2FkZWQsXG4gICAgc2VsZWN0b3JzVG9DbGFzc0xpc3Rcbn0gZnJvbSAnLi9jb21tb24vdXRpbHMnO1xuaW1wb3J0IHtxdWVyeVNlbGVjdG9yfSBmcm9tICcuL2NvbW1vbi9xdWVyeS1zZWxlY3Rvcic7XG5pbXBvcnQgKiBhcyBzZWxlY3RvcnMgZnJvbSAnLi9jb21tb24vc2VsZWN0b3JzJztcblxuXG4vKipcbiAqIFR5cGUgb2YgR29vZ2xlIERvY3MgZXZlbnQuXG4gKi9cbmNvbnN0IEVWRU5UX1RZUEUgPSB7XG4gICAgc2VsZWN0aW9uQ2hhbmdlOiAnc2VsZWN0aW9uY2hhbmdlJ1xufTtcblxuLyoqXG4gKiBHb29nbGUgRG9jcyBldmVudCBsaXN0ZW5lcnMuXG4gKlxuICogU3RydWN0dXJlOlxuICogLSBrZXk6IGV2ZW50IHR5cGVcbiAqIC0gdmFsdWU6IGFsbCByZWdpc3RlcmVkIGxpc3RlbmVycyBmb3IgdGhhdCBldmVudFxuICpcbiAqIEB0eXBlIHt7W2tleTogc3RyaW5nXTogRnVuY3Rpb25bXX19XG4gKi9cbmNvbnN0IEVWRU5UX0xJU1RFTkVSUyA9IHt9O1xuXG5cbi8vI3JlZ2lvbiBQcmVjYWxjdWxhdGVkIHZhbHVlc1xuXG5jb25zdCBLSVhfU0VMRUNUSU9OX09WRVJMQVlfQ0xBU1NfTElTVCA9IHNlbGVjdG9yc1RvQ2xhc3NMaXN0KFxuICAgIHNlbGVjdG9ycy5raXhTZWxlY3Rpb25PdmVybGF5XG4pO1xuXG4vLyNlbmRyZWdpb25cblxuXG4vKipcbiAqIFJ1bnMgb24gc2NyaXB0IGluamVjdC5cbiAqL1xuZnVuY3Rpb24gbWFpbigpIHtcbiAgICBydW5PblBhZ2VMb2FkZWQoYmluZE9ic2VydmVyKTtcbn1cblxuXG4vKipcbiAqIENyZWF0ZXMgbXV0YXRpb24gb2JzZXJ2ZXIgYW5kIHN0YXJ0cyBvYnNlcnZpbmcgR29vZ2xlIERvY3MgY29udGFpbmVyLlxuICogVGhlIGNvbnRhaW5lciBlbGVtZW50IHNob3VsZCBiZSBjcmVhdGVkIGF0IHRoYXQgc3RhZ2UuXG4gKi9cbmZ1bmN0aW9uIGJpbmRPYnNlcnZlcigpIHtcbiAgICBjb25zdCBkb2NzRWRpdG9yQ29udGFpbmVyID0gcXVlcnlTZWxlY3RvcihzZWxlY3RvcnMuZG9jc0VkaXRvckNvbnRhaW5lcik7XG5cbiAgICBpZiAoZG9jc0VkaXRvckNvbnRhaW5lciA9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIG9ic2VydmUgbWlzc2luZyBkb2NzRWRpdG9yQ29udGFpbmVyJyk7XG4gICAgfVxuXG4gICAgY29uc3Qgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihtdXRhdGlvbkNhbGxiYWNrKTtcblxuICAgIG9ic2VydmVyLm9ic2VydmUoXG4gICAgICAgIGRvY3NFZGl0b3JDb250YWluZXIsXG4gICAgICAgIHtcbiAgICAgICAgICAgIHN1YnRyZWU6IHRydWUsXG4gICAgICAgICAgICBjaGlsZExpc3Q6IHRydWUsXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiBmYWxzZSxcbiAgICAgICAgICAgIGNoYXJhY3RlckRhdGE6IGZhbHNlXG4gICAgICAgIH1cbiAgICApO1xufVxuXG5cbi8qKlxuICogQ2FsbGJhY2sgd2hpY2ggd2lsbCBiZSBjYWxsZWQgb24gZXZlcnkgR29vZ2xlIERvY3MgbXV0YXRpb24uXG4gKi9cbmZ1bmN0aW9uIG11dGF0aW9uQ2FsbGJhY2sobXV0YXRpb25MaXN0KSB7XG4gICAgbGV0IHNlbGVjdGlvbkNoYW5nZUV2ZW50ID0gZmFsc2U7XG5cbiAgICAvLyBUT0RPOiByZWZhY3RvcmluZyBvZiB0aGF0IGVudGlyZSBsb29wIGlmIHRoZXJlIHdpbGwgYmUgbW9yZSBldmVudHNcbiAgICBmb3IgKGNvbnN0IG11dGF0aW9uIG9mIG11dGF0aW9uTGlzdCkge1xuICAgICAgICBmb3IgKGNvbnN0IGFkZGVkTm9kZSBvZiBtdXRhdGlvbi5hZGRlZE5vZGVzKSB7XG4gICAgICAgICAgICBjb25zdCBhZGRlZE5vZGVDbGFzc0xpc3QgPSBBcnJheS5mcm9tKFxuICAgICAgICAgICAgICAgIGFkZGVkTm9kZS5jbGFzc0xpc3QgfHwgW11cbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIHNlbGVjdGlvbkNoYW5nZUV2ZW50ID0gKFxuICAgICAgICAgICAgICAgIHNlbGVjdGlvbkNoYW5nZUV2ZW50IHx8XG4gICAgICAgICAgICAgICAgS0lYX1NFTEVDVElPTl9PVkVSTEFZX0NMQVNTX0xJU1Quc29tZShcbiAgICAgICAgICAgICAgICAgICAgKHZhbHVlKSA9PiBhZGRlZE5vZGVDbGFzc0xpc3QuaW5jbHVkZXModmFsdWUpXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgcmVtb3ZlZE5vZGUgb2YgbXV0YXRpb24ucmVtb3ZlZE5vZGVzKSB7XG4gICAgICAgICAgICBjb25zdCByZW1vdmVkTm9kZUNsYXNzTGlzdCA9IEFycmF5LmZyb20oXG4gICAgICAgICAgICAgICAgcmVtb3ZlZE5vZGUuY2xhc3NMaXN0IHx8IFtdXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICBzZWxlY3Rpb25DaGFuZ2VFdmVudCA9IChcbiAgICAgICAgICAgICAgICBzZWxlY3Rpb25DaGFuZ2VFdmVudCB8fFxuICAgICAgICAgICAgICAgIEtJWF9TRUxFQ1RJT05fT1ZFUkxBWV9DTEFTU19MSVNULnNvbWUoXG4gICAgICAgICAgICAgICAgICAgICh2YWx1ZSkgPT4gcmVtb3ZlZE5vZGVDbGFzc0xpc3QuaW5jbHVkZXModmFsdWUpXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzZWxlY3Rpb25DaGFuZ2VFdmVudCkge1xuICAgICAgICBjYWxsRXZlbnRMaXN0ZW5lcihFVkVOVF9UWVBFLnNlbGVjdGlvbkNoYW5nZSk7XG4gICAgfVxufVxuXG5cbi8qKlxuICogQWRkcyBsaXN0ZW5lciBmb3Igc3BlY2lmaWMgZXZlbnQuXG4gKlxuICogVGhlcmUgY2FuIGJlIG1hbnkgbGlzdGVuZXJzIGZvciBzaW5nbGUgZXZlbnQuXG4gKiBPcmRlciBvZiBjYWxsaW5nIGlzIHNhbWUgYXMgb3JkZXIgb2YgYWRkaW5nLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlXG4gKiBUeXBlIG9mIGV2ZW50LiBVc2UgYEVWRU5UX1RZUEVgLlxuICogQHBhcmFtIHsoZXZlbnQ6IG9iamVjdCkgPT4gYW55fSBsaXN0ZW5lclxuICogQ2FsbGJhY2sgdGhhdCB3aWxsIGJlIGNhbGxlZC5cbiAqIEluZm9ybWF0aW9uIGFib3V0IGV2ZW50IHdpbGwgYmUgcGFzc2VkIGFzIGFyZ3VtZW50LlxuICovXG5leHBvcnQgZnVuY3Rpb24gYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcikge1xuICAgIGlmICghRVZFTlRfTElTVEVORVJTW3R5cGVdKSB7XG4gICAgICAgIEVWRU5UX0xJU1RFTkVSU1t0eXBlXSA9IFtdO1xuICAgIH1cblxuICAgIEVWRU5UX0xJU1RFTkVSU1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbn1cblxuXG4vKipcbiAqIENhbGxzIGFsbCByZWdpc3RlcmVkIGV2ZW50IGxpc3RlbmVycyBmb3Igc3BlY2lmaWMgZXZlbnQuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGVcbiAqIFR5cGUgb2YgZXZlbnQuIFVzZSBgRVZFTlRfVFlQRWAuXG4gKi9cbmZ1bmN0aW9uIGNhbGxFdmVudExpc3RlbmVyKHR5cGUpIHtcbiAgICBjb25zdCBsaXN0ZW5lcnMgPSBFVkVOVF9MSVNURU5FUlNbdHlwZV07XG5cbiAgICBpZiAoIWxpc3RlbmVycykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBsaXN0ZW5lciBvZiBsaXN0ZW5lcnMpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGxpc3RlbmVyKHtcbiAgICAgICAgICAgICAgICB0eXBlOiB0eXBlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbm1haW4oKTtcbiJdLCJuYW1lcyI6WyJnZXRTZWxlY3Rpb25FbGVtZW50cyIsInByZXNzT24uQ2hhcmFjdGVyIiwiUHJlc3NPbkNoYXJhY3RlciIsIlByZXNzT25VbmRvIiwiUHJlc3NPbkJhY2tzcGFjZSIsInByZXNzT24uQXJyb3dMZWZ0IiwicHJlc3NPbi5BcnJvd1JpZ2h0IiwicHJlc3NPbi5BcnJvd1VwIiwicHJlc3NPbi5BcnJvd0Rvd24iLCJwcmVzc09uLkhvbWUiLCJwcmVzc09uLkVuZCIsIlByZXZXb3JkIiwicHJlc3NPbi5CYWNrc3BhY2UiLCJOZXh0V29yZCIsInByZXNzT24uRGVsZXRlIiwiUHJldkNoYXJhY3RlciIsIk5leHRDaGFyYWN0ZXIiLCJQcmV2TGluZSIsIk5leHRMaW5lIiwiUHJldlBhcmFncmFwaCIsIk5leHRQYXJhZ3JhcGgiLCJzZWxlY3RvcnMua2l4U2VsZWN0aW9uT3ZlcmxheSIsImRvY3NFZGl0b3JDb250YWluZXIiLCJzZWxlY3RvcnMuZG9jc0VkaXRvckNvbnRhaW5lciJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztJQUFBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7QUFDQTtBQUNBO0lBQ08sTUFBTSxtQkFBbUIsR0FBRztJQUNuQyxJQUFJLHdCQUF3QjtJQUM1QixDQUFDLENBQUM7QUFDRjtJQUNPLE1BQU0sVUFBVSxHQUFHO0lBQzFCLElBQUksY0FBYztJQUNsQixJQUFJLEdBQUcsbUJBQW1CO0lBQzFCLENBQUMsQ0FBQztBQUNGO0lBQ08sTUFBTSxlQUFlLEdBQUc7SUFDL0IsSUFBSSxvQ0FBb0M7SUFDeEMsSUFBSSw4QkFBOEI7SUFDbEMsQ0FBQyxDQUFDO0FBQ0Y7SUFDTyxNQUFNLE9BQU8sR0FBRztJQUN2QixJQUFJLFdBQVc7SUFDZixJQUFJLFlBQVk7SUFDaEIsQ0FBQyxDQUFDO0FBQ0Y7SUFD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
