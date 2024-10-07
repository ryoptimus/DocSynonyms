console.log("content.js is loaded")

// TODO: this still isn't working fuck my entire life
// https://stackoverflow.com/questions/74497762/how-to-get-the-selected-text-inside-google-docs-document-into-a-chrome-extension
// https://stackoverflow.com/questions/75019646/get-selected-text

// Inject script into the page context
// var script = document.createElement('script');
// script.src = chrome.runtime.getURL('script.js');
// script.onload = function() {
//   this.remove();
//   console.log('Script loaded and removed');
// };
// (document.head || document.documentElement).appendChild(script);
// console.log('Script appended');

// Function to handle Google Docs text selection
function getSelectedTextFromGoogleDocs() {
  // Ensure gDocs and getSelection are defined before calling
  if (window.gDocs && typeof window.gDocs.getSelection === 'function') {
      const selectedText = window.gDocs.getSelection();
      console.log("Selected text: " + selectedText);
      return selectedText;
  } else {
      console.error("gDocs or getSelection is not available yet.");
      return "";
  }
}

// Example event listener for context menu (or any other event)
document.addEventListener('mouseup', function() {
  getSelectedTextFromGoogleDocs();
});


// Helper function to filter visible elements
function filterHiddenElements(nodeList) {
    return Array.from(nodeList).filter(v => v.style.display !== "none" && !["hidden", "collapse"].includes(v.style.visibility));
  }
  
  // Helper function to find Google Docs' context menu
  function getContextMenuElement() {
    const contextMenus = filterHiddenElements(document.querySelectorAll(".goog-menu.goog-menu-vertical.apps-menu-hide-mnemonics"));
    return contextMenus.length > 0 ? contextMenus[0] : null;
  }
  
  // Event handler to inject a custom context menu option in Google Docs
  function contextMenuEventHandler() {
    console.log("Context menu event handler called");
    const id = "context-menu-id";
    const selectedText = getSelectedTextFromGoogleDocs();
    const customContextMenuName = `Examine '${selectedText}'`;  // Your custom name
    const customContextMenuHint = "Get definition & synonyms";  // Custom hint for Google Docs
  
    const contextMenuElement = getContextMenuElement();
    if (contextMenuElement) {
      const preExisting = document.querySelector("#" + id);
      if (preExisting) {
        preExisting.parentElement.removeChild(preExisting);  // Clean up the previous custom item
      }
  
      const separators = filterHiddenElements(contextMenuElement.querySelectorAll(".apps-hoverable-menu-separator-container"));
      if (separators.length) {
        const innerHTML = `
          <div class="goog-menuitem-content">
            <div class="docs-icon goog-inline-block goog-menuitem-icon" aria-hidden="true">
              <div class="docs-icon-img-container docs-icon-img docs-icon-cut"></div>
            </div>
            <span class="goog-menuitem-label">${customContextMenuName}</span>
            <span class="goog-menuitem-accel" aria-label="⌘X">${customContextMenuHint}</span>
          </div>`;
        
        const div = document.createElement("div");
        console.log("Div element created:", div);
        div.innerHTML = innerHTML;
        div.className = "goog-menuitem apps-menuitem";
        div.id = id;
        div.setAttribute("role", "menuitem");
  
        // Add hover events for the custom menu item
        div.addEventListener("mouseenter", e => e.target.classList.add("goog-menuitem-highlight"));
        div.addEventListener("mouseleave", e => e.target.classList.remove("goog-menuitem-highlight"));
  
        // Custom click event handling: Send a message to the background script to execute the script
        div.addEventListener("click", () => {
            console.log("Click event detected");
            // Debug the selectedText variable
            console.log("Selected text is: ", selectedText || "default");

            chrome.runtime.sendMessage({
                action: 'fetchWordData',
                selectedText: selectedText || "default"
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Runtime error:", chrome.runtime.lastError.message);
                } else if (response.success) {
                    console.log("Message sent successfully.", response);
                    // Send a message to popup.js to show the popup
                    chrome.runtime.sendMessage({
                      action: 'showPopup',
                      word: response.data.word,
                      meanings: response.data.meanings
                    });
                } else {
                  console.error("Error fetching word data: ", response.error);
                }
            });
        });
  
        // Insert the custom item before the first separator
        separators[0].parentElement.insertBefore(div, separators[0]);
      }
    } else {
      console.log("Could not find Google Docs context menu");
    }
  }
  
// Add context menu event listener
document.body.addEventListener('contextmenu', contextMenuEventHandler);

// Listener to handle messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelectedText') {
    const selectedText = getSelectedTextFromGoogleDocs();
    sendResponse({ text: selectedText });
  }
});

// add a test to see if messaging is working
chrome.runtime.sendMessage({
  action: 'testMessage',
  selectedText: "Test"
}, (response) => {
  if (chrome.runtime.lastError) {
      console.error("Runtime error:", chrome.runtime.lastError.message);
  } else {
      console.log("Message sent successfully:", response);
  }
});