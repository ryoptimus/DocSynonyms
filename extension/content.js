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


// functions filterHiddenElements, getContextMenuElement, and contextMenuEventHandler (detailed below) developed from source:
// https://stackoverflow.com/questions/58212111/adding-a-new-item-on-google-documents-context-menu-using-chrome-extension

// Helper function to filter visible elements
function filterHiddenElements(nodeList) {
  const arrayFromNodeList = Array.from(nodeList);
  const filteredElements = arrayFromNodeList.filter(element => {
    // Check element's display is not none
    const isDisplayed = element.style.display !== "none";
    // Check visibility is not "hidden" or "collapse"
    const isVisible = !["hidden", "collapse"].includes(element.style.visibility);
    return isDisplayed && isVisible;
  });
  // Return array of visible elements
  return filteredElements;
  }
  
  // Helper function to find Google Docs' context menu
  function getContextMenuElement() {
    // CSS class selector (.goog-menu.goog-menu-vertical.apps-menu-hide-mnemonics)
    //  .goog-menu: Refers to a generic Google menu
    //  .goog-menu-vertical: Indicates that the menu is vertically-aligned
    //  .apps-menu-hide-mnemonics: Google Docs menu class, hides keyboard shortcuts and hints
    const selector = ".goog-menu.goog-menu-vertical.apps-menu-hide-mnemonics";
    // Get all context menu elements that match selector, visible or hidden
    const nodeList = document.querySelectorAll(selector);
    // Filter out hidden elements
    const contextMenus = filterHiddenElements(nodeList)
    // Check if there are visible context menus
    const hasVisibleMenus = contextMenus.length > 0;
    // Return first visible context menu if any exist, otherwise return null
    return hasVisibleMenus ? contextMenus[0] : null;
  }
  
  // Event handler to dynamically insert custom context menu item when context menu event in Google Docs is triggered
  function contextMenuEventHandler() {
    console.log("Context menu event handler called");
    // Create unique identifier for custom context menu item
    const id = "context-menu-id";
    // Get highlighted/selected text from Google Docs
    const selectedText = getSelectedTextFromGoogleDocs();
    // Context menu item customized name and menu hint
    const customContextMenuName = `Examine '${selectedText}'`; 
    const customContextMenuHint = "Get definition & synonyms";
    
    // Fetch context menu element
    const contextMenuElement = getContextMenuElement();
    // Check that contextMenuElement exists
    if (contextMenuElement) {
      const preExisting = document.querySelector("#" + id);
      if (preExisting) {
        // Clean up the previous custom item
        preExisting.parentElement.removeChild(preExisting);  
      }
  
      const separators = filterHiddenElements(contextMenuElement.querySelectorAll(".apps-hoverable-menu-separator-container"));
      if (separators.length) {
        // Configure custom menu item appearance
        const iconURL = chrome.runtime.getURL('/images/menuIcon.png');
        const innerHTML = `
          <div class="goog-menuitem-content" style="display: flex; align-items: center; justify-content: flex-start;">
            <div class="docs-icon goog-inline-block goog-menuitem-icon" aria-hidden="true" style="width: 24px; height: 24px;">
              <img src="${iconURL}" style="width: 24px; height: 24px; margin: 0; padding: 0; transform: translate(-4px, -3px);">
            </div>
            <span class="goog-menuitem-label">${customContextMenuName}</span>
            <span class="goog-menuitem-accel" aria-label="⌘X">${customContextMenuHint}</span>
          </div>`;

        // Create <div> element in the document object model (DOM)
        const div = document.createElement("div");
        console.log("Div element created:", div);
        div.innerHTML = innerHTML;
        // Add CSS classes to style like a Google Docs menu item
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

            // Send message to background script, ask it to fetch word data
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