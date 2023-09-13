chrome.runtime.sendMessage({ type: "getJwt" }, (response) => {
  console.log("Received JWT response");

  let observer;
  let buttonInjected = false;

  const startObserver = () => {
    if (observer) {
      observer.disconnect();
    }

    observer = new MutationObserver((mutationsList) => {
      const targetNode = document.querySelector(".jobs-unified-top-card");
      if (targetNode && !buttonInjected) {
        onPageLoad();
      }
    });
  
    observer.observe(document.body, { childList: true, subtree: true });
  };

  const onPageLoad = () => {
    console.log("Page is loaded");
    const style = document.createElement("style");
    style.textContent = `
  .primary-button {
    display: inline-flex;
    min-width: 80px;
    height: 40px;
    cursor: pointer;
    padding: 0.5rem 1rem;
    margin-left: 8px;
    justify-content: center;
    align-items: center; 
    font-weight: 500;
    border: 1px solid black;
    white-space: nowrap;
    border-radius: 0.375rem;
    transition-property: background-color, color, border-color;
    transition-duration: 150ms;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    background-color: black;
    color: white;
  }

  .primary-button:hover {
    background-color: white;
    color: black;
  }
`;

    document.head.appendChild(style);

    const jobsSaveButton = document.querySelector(".jobs-save-button");
    if (jobsSaveButton) {
      console.log("Found save button");

      // Check if the "Write Cover Letter" button already exists
      const existingButton = document.getElementById("writeCoverLetter");
      if (existingButton) {
        console.log("Write Cover Letter button already exists");
        return;
      }

      const writeCoverLetterButton = document.createElement("button");
      writeCoverLetterButton.textContent = "Write Cover Letter";
      writeCoverLetterButton.id = "writeCoverLetter";
      writeCoverLetterButton.className = "primary-button";
      writeCoverLetterButton.onclick = () => {
        displaySpinnerModal();

        const port = chrome.runtime.connect({ name: "contentToBackground" });

        port.postMessage({
          type: "onCoverLetterRequest",
          jobPost: parseJobPost(),
        });

        // Close the port when you're done
        port.disconnect();
      };
      jobsSaveButton.parentNode.insertBefore(
        writeCoverLetterButton,
        jobsSaveButton.nextSibling
      );
      buttonInjected = true;
      observer.disconnect();

      const buttonObserver = new MutationObserver(() => {
        if (!document.contains(jobsSaveButton)) {
          buttonInjected = false;
          startObserver();
          buttonObserver.disconnect();
        }
      });

      buttonObserver.observe(document.body, { childList: true, subtree: true });
    } else {
      console.log("Save button not found");

    }
  };

  startObserver();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "onCoverLetterGenerated") {
    const data = request.coverLetterContent;
    console.log("Cover letter data received", request);
    displayCoverLetterData(data);
  } else if (request.type === "onCoverLetterError") {
    displayErrorMessageModal(
      "Sorry, something went wrong.",
      undefined
    );
  } else if (request.type === "onProfileNotFound") {
    displayErrorMessageModal(
      "Connect your Linkedin profile first on careerpen.org to use this feature",
      "https://careerpen.org/dashboard"
    );
  } else if (request.type === "onNoCredits") {
    displayErrorMessageModal(
      "Sorry, you have no credits left. Please purchase more credits on careerpen.org to use this feature",
      "https://careerpen.org/dashboard"
    );
  } else if (request.type === "onJwtExpired") {
    displayErrorMessageModal(
      "You have to log in for the extension to work",
      "https://careerpen.org/"
    );
  }
});

function displayCoverLetterData(data) {
  //Remove spinner modal if it exists
  const spinnerModal = document.getElementById("spinnerModal");
  if (spinnerModal) {
    spinnerModal.remove();
  }

  const modal = document.createElement("div");
  modal.style.position = "fixed";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100%";
  modal.style.height = "100%";
  modal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  modal.style.display = "flex";
  modal.style.justifyContent = "center";
  modal.style.alignItems = "center";
  modal.style.zIndex = "10000";

  const modalContent = document.createElement("div");
  modalContent.style.backgroundColor = "white";
  modalContent.style.padding = "20px";
  modalContent.style.borderRadius = "5px";
  modalContent.style.maxWidth = "80%"; // Limit the modal width to 80% of the viewport
  modalContent.style.maxHeight = "80%"; // Limit the modal height to 80% of the viewport
  modalContent.style.overflowY = "auto"; // Add a scrollbar if the content overflows

  const closeButton = document.createElement("button");
  closeButton.textContent = "Close and Copy";
  closeButton.className = "primary-button";
  closeButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(dataElement.innerText);
      console.log("Cover letter copied to clipboard");
    } catch (err) {
      console.error("Failed to copy cover letter: ", err);
    }
    modal.remove();
  });

  closeButton.style.display = "block";
  closeButton.style.margin = "10px auto";

  const dataElement = document.createElement("pre");
  dataElement.style.whiteSpace = "pre-wrap"; // Wrap the content within the element
  dataElement.style.wordBreak = "break-all"; // Break words if needed

  const parsedData = JSON.parse(JSON.stringify(data));
  dataElement.innerHTML = JSON.stringify(parsedData, null, 2)
    .replace(/\\n/g, "<br>")
    .slice(1, -1);

  modalContent.appendChild(dataElement);
  modalContent.appendChild(closeButton);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
}

function parseJobPost() {
  const selector = "#job-details";

  const rootContainer = document.body;
  const jobDetailDiv = rootContainer.querySelector(selector);

  if (jobDetailDiv) {
    let jobDetailString = "";
    for (let i = 0; i < jobDetailDiv.childNodes.length; i++) {
      const node = jobDetailDiv.childNodes[i];

      if (node.nodeType === Node.ELEMENT_NODE) {
        jobDetailString += node.textContent;
      }
    }
    console.log("Job parsed!");
    return jobDetailString;
  } else {
    console.log("The div was not found on the page.");
    return null;
  }
}

function displaySpinnerModal() {
  const spinnerModal = document.createElement("div");
  spinnerModal.id = "spinnerModal";
  spinnerModal.style.position = "fixed";
  spinnerModal.style.top = "0";
  spinnerModal.style.left = "0";
  spinnerModal.style.width = "100%";
  spinnerModal.style.height = "100%";
  spinnerModal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  spinnerModal.style.display = "flex";
  spinnerModal.style.justifyContent = "center";
  spinnerModal.style.alignItems = "center";
  spinnerModal.style.zIndex = "10000";

  const spinner = document.createElement("div");
  spinner.style.border = "16px solid #f3f3f3";
  spinner.style.borderTop = "16px solid #000000";
  spinner.style.borderRadius = "50%";
  spinner.style.width = "120px";
  spinner.style.height = "120px";
  spinner.style.animation = "spin 2s linear infinite";

  spinnerModal.appendChild(spinner);
  document.body.appendChild(spinnerModal);

  // Add the spinner animation style
  const style = document.createElement("style");
  style.innerHTML = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  return spinnerModal;
}

function displayErrorMessageModal(errorMessage, redirectUrl) {
  //Remove spinner modal if it exists
  const spinnerModal = document.getElementById("spinnerModal");
  if (spinnerModal) {
    spinnerModal.remove();
  }

  const errorModal = document.createElement("div");
  errorModal.id = "errorModal";
  errorModal.style.position = "fixed";
  errorModal.style.top = "0";
  errorModal.style.left = "0";
  errorModal.style.width = "100%";
  errorModal.style.height = "100%";
  errorModal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  errorModal.style.display = "flex";
  errorModal.style.justifyContent = "center";
  errorModal.style.alignItems = "center";
  errorModal.style.zIndex = "10000";

  const errorContent = document.createElement("div");
  errorContent.style.backgroundColor = "white";
  errorContent.style.padding = "20px";
  errorContent.style.borderRadius = "4px";
  errorContent.style.maxWidth = "80%";
  errorContent.style.textAlign = "center";

  const errorMessageElement = document.createElement("p");
  errorMessageElement.textContent = errorMessage;
  errorContent.appendChild(errorMessageElement);

  if (redirectUrl) {
    const redirectLink = document.createElement("a");
    redirectLink.href = redirectUrl;
    redirectLink.textContent = redirectUrl;
    redirectLink.target = "_blank";
    redirectLink.style.display = "block";
    redirectLink.style.margin = "10px 0";
    errorContent.appendChild(redirectLink);
  }

  const closeButton = document.createElement("button");
  closeButton.textContent = "Close";
  closeButton.style.marginTop = "10px";
  closeButton.className = "primary-button";
  closeButton.addEventListener("click", () => {
    errorModal.remove();
  });

  errorContent.appendChild(closeButton);
  errorModal.appendChild(errorContent);
  document.body.appendChild(errorModal);
}
