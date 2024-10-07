// Listen for the message sent from content.js to show the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showPopup') {
      const wordTitle = document.getElementById('word-title');
      const wordMeanings = document.getElementById('word-meanings');

      // Update popup content with the received word data
      wordTitle.textContent = message.word;

      // Clear any previous meanings
      wordMeanings.innerHTML = '';

      // Add each meaning to the list
      message.meanings.forEach(meaning => {
          const li = document.createElement('li');
          li.textContent = `${meaning.partOfSpeech}: ${meaning.definitions[0].definition}`;
          wordMeanings.appendChild(li);
      });

      sendResponse({ success: true });
  }
});
