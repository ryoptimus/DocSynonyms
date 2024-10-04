// TODO: not showing up in the context menu
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "examineWord",
      title: "Examine '%s'",
      contexts: ["selection"]
    });
  });
  
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "examineWord") {
      chrome.scripting.executeScript({
        target: {tabId: tab.id},
        func: fetchWordData,
        args: [info.selectionText]
      });
    }
  });

  var thesaurus = require('powerthesaurus-api')

  function fetchWordData(selectedText) {
    // Fetch word definitions from Dictionary API
    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${selectedText}`)
      .then(response => response.json())
      .then(definitionData => {
        const meanings = definitionData[0]?.meanings || [];
    // Fetch synonyms using PowerThesaurus API (as a promise)
      thesaurus(selectedText, 'synonyms').then(
        synonymData => {
          // Structure the synonyms along with their parts of speech
          const synonyms = synonymData.map(item => ({
            word: item.word,
            partsOfSpeech: item.parts
          }));

          // Call the function to display the popup
          showPopup(selectedText, meanings, synonyms);
        },
        err => {
          console.error('Error fetching synonyms from PowerThesaurus:', err);
        }
      );
    })
    .catch(error => console.error('Error fetching definitions from Dictionary API:', error));
  }

  function showPopup(word, meanings, synonyms) {
    const organizedDefinitions = meanings.map(meaning => ({
      partOfSpeech: meaning.partOfSpeech,
      definitions: meaning.definitions.map(def => def.definition),
    }));
    const organizedSynonyms = synonyms

    chrome.runtime.sendMessage({
      action: "showPopup",
      word,
      organizedDefinitions,
      organizedSynonyms,
    });
  }