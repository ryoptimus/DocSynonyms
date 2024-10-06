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
  function contextMenuEventHandler(selectedText) {
    const id = "custom-context-menu-id";
    const customContextMenuName = "Examine '${selectedText}'";  // Your custom name
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
        div.innerHTML = innerHTML;
        div.className = "goog-menuitem apps-menuitem";
        div.id = id;
        div.setAttribute("role", "menuitem");
  
        // Add hover events for the custom menu item
        div.addEventListener("mouseenter", e => e.target.classList.add("goog-menuitem-highlight"));
        div.addEventListener("mouseleave", e => e.target.classList.remove("goog-menuitem-highlight"));
  
        // Custom click event handling: Send a message to the background script to execute the script
        div.addEventListener("click", () => {
            chrome.runtime.sendMessage({
            action: 'fetchWordData',
            selectedText: selectedText  // Send the selected text as part of the message
            });
        });
  
        // Insert the custom item before the first separator
        separators[0].parentElement.insertBefore(div, separators[0]);
      }
    } else {
      console.log("Could not find Google Docs context menu");
    }
  }
  
// Add an event listener to handle the custom context menu in Google Docs
document.body.addEventListener('contextmenu', (e) => {
    // Dynamically call the event handler with the selected word
    const selectedText = window.getSelection().toString().trim();
    console.log("Trying to get selected text")
    if (selectedText) {
        console.log("Got selected text")
        contextMenuEventHandler(selectedText);
    }
  });