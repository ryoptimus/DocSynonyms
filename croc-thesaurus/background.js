

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetchWordData') {
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

// TODO: popup not displaying anything 
  function fetchWordData(selectedText) {
    // Fetch word definitions from Dictionary API
    // https://dictionaryapi.dev/
    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${selectedText}`)
      .then(response => response.json())
      .then(definitionData => {
        const meanings = definitionData[0]?.meanings || [];
        showPopup(selectedText, meanings)
    })
    .catch(error => console.error('Error fetching definitions from Dictionary API:', error));
  }

  function showPopup(word, meanings) {
    const organizedDefinitions = meanings.map(meaning => ({
      partOfSpeech: meaning.partOfSpeech,
      definitions: meaning.definitions.map(def => def.definition),
    }));

    chrome.runtime.sendMessage({
      action: "showPopup",
      word,
      organizedDefinitions
    });
  }