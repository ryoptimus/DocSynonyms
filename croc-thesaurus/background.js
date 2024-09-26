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

  function fetchWordData(selectedText) {
    
  }