chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'context-menu-id') {
    chrome.tabs.sendMessage(tab.id, { action: 'getSelectedText' }, (response) => {
      console.log("Selected text:", response.text);
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetchWordData') {
    console.log("Message received in background.js:", message.selectedText);
    const selectedText = message.selectedText;  // Get the selected text from the message

    // Fetch the word data here (e.g., using fetch API)
    fetchWordData(selectedText)
      .then(response => {
        console.log("Data fetched for:", selectedText, response);
        // You can also send a response back to the content script if needed
        sendResponse({ success: true, data: response });
      })
      .catch(error => {
        console.error("Error fetching data:", error);
        sendResponse({ success: false, error });
      });

    return true; // Return true to indicate an asynchronous response
  }
});

function fetchWordData(selectedText) {
  // Return a promise that resolves when the API call completes
  return fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${selectedText}`)
      .then(response => {
          if (!response.ok) {
              throw new Error(`Error: ${response.statusText}`);
          }
          return response.json();
      })
      .then(definitionData => {
          const meanings = definitionData[0]?.meanings || [];
          return { word: selectedText, meanings: meanings };
      })
      .catch(error => {
          console.error('Error fetching definitions from Dictionary API:', error);
          throw error; // Propagate the error to be handled in the .catch block in the background script
      });
}

  // TEST: is messaging working?
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'testMessage') {
        console.log("Message received in background.js:", message.selectedText);
        sendResponse({ success: true, data: "Received your test message!" });
    }
});
