// popup.js

document.addEventListener('DOMContentLoaded', function () {
  chrome.storage.local.get(['wordData'], function (result) {
      if (result.wordData && result.wordData.action === 'showPopup') {
          console.log("Popup received word data:", result.wordData);

          const wordTitle = document.getElementById('word-title');
          const wordMeanings = document.getElementById('word-meanings');

          // Update popup content with the received word data
          wordTitle.textContent = result.wordData.word;

          // Clear any previous meanings
          wordMeanings.innerHTML = '';

          // Add each meaning to the list
          result.wordData.meanings.forEach(meaning => {
              const li = document.createElement('li');
              li.textContent = `${meaning.partOfSpeech}: ${meaning.definitions[0].definition}`;
              wordMeanings.appendChild(li);
          });
      }
  });
});


// document.addEventListener('DOMContentLoaded', function () {
//   // Retrieve the stored word data from chrome.storage.local
//   chrome.storage.local.get(['wordData'], function (result) {
//       if (result.wordData) {
//           console.log("Popup received word data:", result.wordData);

//           const wordTitle = document.getElementById('word-title');
//           const wordMeanings = document.getElementById('word-meanings');

//           // Update popup content with the received word data
//           wordTitle.textContent = result.wordData.word;

//           // Clear any previous meanings
//           wordMeanings.innerHTML = '';

//           // Add each meaning to the list
//           result.wordData.meanings.forEach(meaning => {
//               const li = document.createElement('li');
//               li.textContent = `${meaning.partOfSpeech}: ${meaning.definitions[0].definition}`;
//               wordMeanings.appendChild(li);
//           });
//       } else {
//           console.log("No word data available in storage.");
//       }
//   });
// });

