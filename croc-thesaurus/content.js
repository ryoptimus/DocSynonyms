console.log("content.js is loaded")

//TODO: this still isn't working fuck my entire life

let selectedText = "";  // Store the selected text globally

document.addEventListener('mouseup', function() {
    const linesData = GoogleDocsUtils.getSelection();  // Get the selection data from GoogleDocsUtils
    let selectionData = null;

    // Iterate through linesData and get the first available selection (if any)
    for (const lineData of linesData) {
        if (lineData) {
            selectionData = lineData;
            // Handle only a single selection
            break;
        }
    }

    // If there's a valid selection, update the selectedText variable
    if (selectionData) {
        selectedText = selectionData.selectedText.trim();
    } else {
        selectedText = "";  // Clear if no selection
    }

    console.log("Selected text updated: ", selectedText);
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
    const id = "custom-context-menu-id";
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
            console.log("Click event detected, but message sending is disabled for now.");
            // Debug the selectedText variable
            console.log("Selected text is: ", selectedText || "default");

            chrome.runtime.sendMessage({
                action: 'fetchWordData',
                selectedText: selectedText || "default"
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Runtime error:", chrome.runtime.lastError.message);
                } else {
                    console.log("Message sent successfully.", response);
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