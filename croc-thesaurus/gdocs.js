// ==UserScript==
// @name         gDocs injection
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  .
// @match        https://docs.google.com/document/d/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=google.com
// @run-at       document-start
// @grant        none
// @noframes
// ==/UserScript==

// https://stackoverflow.com/questions/77314817/how-does-spelling-check-extensions-like-grammarly-and-languagetool-work-on-a

window._docs_annotate_canvas_by_ext = "kbfnbcaeplbcioakkpcpgfkobkghlhen";

(async function() {
    // await new Promise(resolve => window.addEventListener('DOMContentLoaded', resolve));
    console.log("Document readyState:", document.readyState);
    // Check if the DOM is already loaded
    if (document.readyState === 'loading') {
        console.log("Awaiting DOMContent...");
        // If still loading, wait for the DOMContentLoaded event
        await new Promise(resolve => window.addEventListener('DOMContentLoaded', resolve));
        console.log("DOMContent is loaded.")
    } else {
        // If already loaded, proceed without waiting
        console.log("DOM is already loaded.");
    }

    const contentFrame = document.querySelector('.docs-texteventtarget-iframe').contentDocument;

    function getText() {
        const rects = document.querySelectorAll('div.kix-canvas-tile-content > svg > g > rect');
        return Array.from(rects, r => r.ariaLabel).join('\n');
    }

    function getSelection() {
        const contentDiv = contentFrame.querySelector('div[aria-label="Document content"]');
        contentDiv.dispatchEvent(new Event('copy'));
        const nodes = contentDiv.firstChild?.children || [];
        return Array.from(nodes, c => c.innerText).join('\n');
    }

    function insertText(text) {
        for (let i=0; i < text.length; i++){
            const keyEvent = new KeyboardEvent("keypress", {charCode: text.codePointAt(i)})
            contentFrame.dispatchEvent(keyEvent);
        }
    }


    window.gDocs = {getText, getSelection, insertText};

    console.log("gDocs is initialized:", window.gDocs);
})();