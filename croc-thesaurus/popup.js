chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "showPopup") {
      const { word, organizedDefinitions } = message;
  
      // Display the word data in the popup
      document.getElementById('content').innerHTML = `
        <h3>Word: ${word}</h3>
        <p><strong>Definitions:</strong> ${organizedDefinitions.map(def => def.definitions.join(', ')).join('; ')}</p>
      `;
    }
  });