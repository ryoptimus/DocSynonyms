// TODO: not showing up in the context menu
// chrome.runtime.onInstalled.addListener(() => {
//   console.log("Extension installed")
//   chrome.contextMenus.create({
//     id: "examineWord",
//     title: "Examine '%s'",
//     contexts: ["selection"]
//   });
// });
  
//   chrome.contextMenus.onClicked.addListener((info, tab) => {
//     if (info.menuItemId === "examineWord") {
//       console.log("Selected word:", info.selectionText);
//       chrome.scripting.executeScript({
//         target: {tabId: tab.id},
//         func: fetchWordData,
//         args: [info.selectionText]
//       });
//     }
//   });

// TODO: scrap the right click context menu. use keyboard shortcut maybe?
// TODO: implement node-wordnet for synonyms
chrome.action.onClicked.addListener((tab) => {
  // Run a script in the current tab to get the selected text
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: getSelectedText,
  }, (result) => {
    const selectedText = result[0].result;
    if (selectedText) {
      console.log("Selected word:", selectedText);
      
      // Store the selected word and fetch data for it
      fetchWordData(selectedText);
    } else {
      console.error("No text selected");
    }
  });
});

// Function to get selected text in the current tab
function getSelectedText() {
  return window.getSelection().toString();
}

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