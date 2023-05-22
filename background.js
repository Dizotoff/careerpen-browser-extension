// Getter for JWT

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "contentToBackground") {
    port.onMessage.addListener(async (message) => {
      if (message.type === "onCoverLetterRequest") {
        // Get the tabId from the sender's tab
        const tabId = port.sender.tab.id;

        // Handle the request and store the tabId for later use
        const { jobPost } = message;

        // Your existing logic to handle the request
        // ...

        console.log("requesting cover letter...");
        const url = "https://careerpen.org/api/create/cover-letter";
        const options = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "C-Source": "extension",
          },
          body: JSON.stringify({
            jobPostText: jobPost,
          }),
        };

        let response;
        try {
          response = await fetch(url, options);
        } catch (error) {
          console.log("failed to fetch", error);
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: "onCoverLetterError",
              error,
            });
          });
        }

        if (response.status === 401) {
          console.log("jwt expired");
          chrome.tabs.sendMessage(tabId, {
            type: "onJwtExpired",
          });
        } else if (response.status === 200) {
          console.log("letter received");
          const data = await response.json();
          const coverLetterContent = data.savedCoverLetter.content;

          chrome.tabs.sendMessage(tabId, {
            type: "onCoverLetterGenerated",
            coverLetterContent: coverLetterContent,
          });
        } else if (response.status === 402) {
          chrome.tabs.sendMessage(tabId, {
            type: "onNoCredits",
          });
        } else if (response.status === 404) {
          chrome.tabs.sendMessage(tabId, {
            type: "onProfileNotFound",
          });
        } else {
          chrome.tabs.sendMessage(tabId, {
            type: "onCoverLetterError",
          });
        }
      }
    });
  }
});

chrome.runtime.onMessage.addListener(
  async (request, sender, sendResponse) => {}
);
