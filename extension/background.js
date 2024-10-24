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

      //   chrome.storage.local.set({ wordData: message }, () => {
      //     console.log("Word data stored, opening popup...");
      // });
      })
      .catch(error => {
        console.error("Error fetching data:", error);
        sendResponse({ success: false, error });
      });

    return true; // Return true to indicate an asynchronous response
  }

  // Relay the message to open the popup and store the word data
  if (message.action === 'showPopup') {
    console.log("Relaying showPopup message to popup");

    // Store the data to be retrieved in popup.js
    chrome.storage.local.set({ wordData: message }, () => {
        console.log("Word data stored, opening popup...");

        // TODO: Get rid of this. Don't want new popup window every time
        // Programmatically open the popup window
        chrome.windows.create({
            url: "popup.html",
            type: "popup",
            width: 400,
            height: 300
        }, (newWindow) => {
            console.log("Popup opened:", newWindow);
        });
    });
}
});

async function fetchWordData(selectedText) {
  // Return a promise that resolves when the API call completes
  // return fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${selectedText}`)
  //     .then(response => {
  //         if (!response.ok) {
  //             throw new Error(`Error: ${response.statusText}`);
  //         }
  //         return response.json();
  //     })
  //     .then(definitionData => {
  //         const meanings = definitionData[0]?.meanings || [];
  //         return { word: selectedText, meanings: meanings };
  //     })
  //     .catch(error => {
  //         console.error('Error fetching definitions from Dictionary API:', error);
  //         throw error;
  //     });
  
// TODO: Unfinished. still gotta fix this shit
  try {
    const [dictionaryResponse, synonymsResponse] = await Promise.all([
      fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${selectedText}`),
      fetch(`${process.env.BACKEND}/get_synonyms?word=${selectedText}`)
    ]);

    if (!dictionaryResponse.ok) {
      throw new Error(`Error from Dictionary API: ${dictionaryResponse.statusText}`);
    }
    const definitionData = await dictionaryResponse.json();
    const meanings = definitionData[0]?.meanings || [];

    if (!synonymsResponse.ok) {
      throw new Error(`Error from Synonyms API: ${synonymsResponse.statusText}`);
    }
    const synonymsData = await synonymsResponse.json();
    console.log(synonymsData);
  } catch (error) {
    console.error('Error fetching word data: ', error);
    throw error;
  }
}

  // TEST: is messaging working?
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'testMessage') {
        console.log("Message received in background.js:", message.selectedText);
        sendResponse({ success: true, data: "Received your test message!" });
    }
});
