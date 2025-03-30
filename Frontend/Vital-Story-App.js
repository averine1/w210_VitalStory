// Error handling at the top of the file
window.onerror = function(msg) {
  console.log("Error occurred:", msg);
  return true;
};
/**
 * Generates a prompt for the AI model to create follow-up questions based on a health log
 * @param {string} logText - The user's health log text
 * @returns {string} - A formatted prompt for the AI model
 */
function generateFollowUpQuestionsPrompt(logText) {
  // Create a structured prompt that gives the model clear instructions
  const prompt = `
You are an AI assistant for a healthcare app. The user has logged the following health information:

"${logText}"

Based on this health log, generate exactly 3 relevant follow-up questions that would help gather important additional medical context.

Each question should:
1. Be directly related to symptoms or concerns mentioned in the log
2. Help clarify severity, duration, or other clinically relevant details
3. Be phrased conversationally but precisely

Format your response as a JSON array with exactly 3 objects, each containing:
- id: A unique number (1, 2, or 3)
- number: The ID formatted as a two-digit string ("01", "02", or "03")
- question: The full text of the follow-up question

Example format:
[
  {
    "id": 1,
    "number": "01",
    "question": "How long have you been experiencing these symptoms?"
  },
  {
    "id": 2, 
    "number": "02",
    "question": "Have you tried any medications for relief?"
  },
  {
    "id": 3,
    "number": "03",
    "question": "Does anything make the symptoms better or worse?"
  }
]

Respond ONLY with the JSON array and nothing else.
`;

  return prompt;
}
async function callAPI(endpoint, method = 'GET', data = null) {
  const API_URL = 'https://0oh0zinoi8.execute-api.us-west-2.amazonaws.com/vitalstory-apiendpoint/vitalstory';
  
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json'  // Changed back to application/json
    }
  };
  
  if (data && (method === 'POST' || method === 'PUT')) {
    // Format exactly like your teammate's code
    const payload = { "inputs": data };
    console.log("Request payload:", JSON.stringify(payload, null, 2));
    options.body = JSON.stringify(payload);
  }
  
  try {
    const response = await fetch(API_URL, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API call failed with status ${response.status}:`, errorText);
      throw new Error(`API call failed: ${response.status}`);
    }
    
    const responseText = await response.text();
    console.log("Raw API Response:", responseText);
    
    // Process the response similar to your teammate's code
    let processedResponse;
    
    if (responseText.includes("Vitalstory:")) {
      const predictionStart = responseText.indexOf("Vitalstory:");
      const predictionText = responseText.substring(predictionStart + "Vitalstory:".length).trim();
      processedResponse = { Prediction: predictionText };
    } else {
      // Try to parse as JSON if possible
      try {
        processedResponse = JSON.parse(responseText);
      } catch (e) {
        processedResponse = { Prediction: responseText };
      }
    }
    
    return processedResponse;
  } catch (error) {
    console.error('Detailed API call error:', error);
    throw error;
  }
}

/**
 * Test follow-up questions generation
 * @param {string} logText - The user's health log text
 * @returns {Array} - Array of generated follow-up questions
 */
async function testFollowUpQuestions(logText) {
  try {
    console.log("Attempting to generate follow-up questions");
    
    // Generate follow-up questions
    const questions = await getFollowUpQuestions(logText);
    
    console.log('Generated follow-up questions:', questions);
    
    // Always log the source of questions
    if (questions.length === 3 && questions[0].id === 1) {
      console.warn('FALLBACK QUESTIONS USED');
    }
    
    // If questions are successfully generated, display them
    if (questions && questions.length > 0) {
      displayFollowUpQuestions(questions);
    }
    
    return questions;
  } catch (error) {
    console.error('Completely failed to generate follow-up questions:', error);
    
    // Fallback to hardcoded default questions
    const defaultQuestions = [
      {
        id: 1,
        number: "01",
        question: "Has the fatigue improved or gotten worse throughout the day?"
      },
      {
        id: 2,
        number: "02",
        question: "Are you eating and drinking enough?"
      },
      {
        id: 3,
        number: "03",
        question: "Any nausea?"
      }
    ];
    
    console.warn('USING HARDCODED DEFAULT QUESTIONS');
    displayFollowUpQuestions(defaultQuestions);
    return defaultQuestions;
  }
}

/**
 * Gets follow-up questions from the AI model based on the health log text
 * @param {string} logText - The user's health log text
 * @returns {Array} - Array of generated follow-up questions
 */
async function getFollowUpQuestions(logText) {
  try {
    console.log("Attempting to get follow-up questions for log:", logText);
    
    // Use the empty string for endpoint
    const response = await callAPI('', 'POST', logText);
    
    console.log("Full API response:", response);
    
    // Check for the specific format from your API response
    if (response.Prediction) {
      try {
        // If the prediction contains "Vitalstory:" extract it
        let predictionText = response.Prediction;
        if (typeof predictionText === 'string' && predictionText.includes('Vitalstory:')) {
          predictionText = predictionText.split('Vitalstory:')[1].trim();
        }
        
        // Try to extract JSON if present
        const jsonMatch = predictionText.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          try {
            const questions = JSON.parse(jsonMatch[0]);
            if (questions && questions.length >= 3) {
              return questions.slice(0, 3).map((q, index) => ({
                id: index + 1,
                number: String(index + 1).padStart(2, '0'),
                question: typeof q === 'object' ? q.question : q
              }));
            }
          } catch (jsonError) {
            console.error('Error parsing JSON from prediction:', jsonError);
          }
        }
      } catch (parseError) {
        console.error('Error parsing Prediction:', parseError);
      }
    }
    
    // Use fallback questions if needed
    return [
      {
        id: 1,
        number: "01",
        question: "How long have you been experiencing these symptoms?"
      },
      {
        id: 2,
        number: "02",
        question: "Have you tried any medications for relief?"
      },
      {
        id: 3,
        number: "03",
        question: "Have you noticed any patterns with your symptoms?"
      }
    ];
  } catch (error) {
    console.error('Error getting questions from API:', error);
    throw error;
  }
}


// Function to display the follow-up questions in the UI
function displayFollowUpQuestions(questions) {
  const carousel = document.querySelector('.question-card-carousel');
  if (!carousel) {
    console.error("Question carousel not found");
    return;
  }
  
  // Clear existing cards
  carousel.innerHTML = '';
  
  // Create cards for each question
  questions.forEach((question, index) => {
    const card = createQuestionCard({
      id: question.id || index + 1,
      number: question.number || String(index + 1).padStart(2, '0'),
      question: question.question
    }, index);
    
    carousel.appendChild(card);
  });
  
  // Initialize the carousel
  carousel.style.transform = 'translateX(0)';
  
  // Setup interactions
  setupQuestionCardInteractions();
}

// Wait for DOM to be fully loaded before initializing
document.addEventListener("DOMContentLoaded", function() {
  console.log("DOM fully loaded, initializing app");
  initializeApp();

  if (document.getElementById("healthHistoryPage")) {
    initializeHealthHistoryPage();
  }

  // Set up prep notes button handler
  setupPrepNotesButtonHandler();

});

// Main app initialization
function initializeApp() {
  // Configure startup page transition
  setupStartupTransition();
  
  // Set up all event listeners
  setupEventListeners();
  
  // Initialize user data
  loadUserData();

  // Initialize page-specific functionality
  initializeNewHealthLogPage();

  initializePrepVisitPage();

  debugPageElements();

  addMenuToApp();

  addMenuButtonListeners();

  setupMenuToggleListeners();

  // Update user info
  updateHealthHistoryUserInfo();

  // Set up event listeners for the page
  setupHealthHistoryEventListeners();

  // Add this line to your initializeApp function
  setupHealthHistoryFooterButtons();

  fixFooterPositioning();

  setupPrepVisitTransition();
  console.log("Health History page initialized");
  
  console.log("App initialization completed");

  // Add this to your initializeApp function to check
  console.log("openEditModal function exists:", typeof openEditModal === 'function');
}


// Handle startup page transition to login page
function setupStartupTransition() {
  const startupPage = document.getElementById("startupPage");
  const loginPage = document.getElementById("loginPage");
  
  if (!startupPage || !loginPage) {
    console.error("Startup or login page not found");
    return;
  }
  
  // Ensure startup page is visible
  startupPage.style.display = "block";
  startupPage.classList.add("visible");
  
  // Hide login page initially
  loginPage.style.display = "none";
  loginPage.classList.add("hidden");
  
  // After 3 seconds, transition from startup to login
  setTimeout(function() {
    console.log("Starting transition to login page");
    startupPage.classList.add("fade-out");
    
    setTimeout(function() {
      // Hide startup page completely
      startupPage.style.display = "none";
      
      // Show login page
      loginPage.style.display = "block";
      loginPage.classList.remove("hidden");
      
      // Force a reflow
      void loginPage.offsetWidth;
      
      // Fade in the login page
      loginPage.classList.add("fade-in");
    }, 500); // Match to CSS transition duration
  }, 3000); // 3 second delay
}

// Set up all event listeners for the app
function setupEventListeners() {
  // Login page to signup page transition
  const signupLink = document.getElementById("signupLink");
  if (signupLink) {
    signupLink.addEventListener("click", function() {
      transitionPages("loginPage", "signupPage");
    });
  }
  
  // Avatar dropdown toggle
  const dropdownIcon = document.querySelector(".dropdown-icon");
  if (dropdownIcon) {
    dropdownIcon.addEventListener("click", toggleAvatarDropdown);
  }

  // event listeners for avatar selection
  document.querySelectorAll(".avatar-item").forEach(item => {
    item.addEventListener("click", function() {
      // Extract the image URL from the img src
      const imgElement = this.querySelector("img");
      if (imgElement) {
        const imgUrl = imgElement.src;
        selectAvatar(imgUrl);
      }
    });
  });
  // event listener for the close dropdown button
  // event listener for the close dropdown button
  const closeDropdown = document.querySelector(".close-dropdown");
  if (closeDropdown) {
    closeDropdown.addEventListener("click", function(e) {
      e.stopPropagation(); // Prevent event from bubbling
      
      // Directly close the dropdown
      const dropdown = document.getElementById('avatarDropdown');
      if (dropdown) {
        dropdown.style.display = 'none';
      }
    });
  }
  
  // Signup page to details page transition
  const createAccountButton = document.getElementById("createAccountButton");
  if (createAccountButton) {
    createAccountButton.addEventListener("click", function() {
      saveUserInfo();
      transitionPages("signupPage", "detailsPage");
    });
  }
  
  // Details page to HIPAA page transition
  const getStartedButton = document.getElementById("getStartedButton");
  if (getStartedButton) {
    getStartedButton.addEventListener("click", function() {
      transitionPages("detailsPage", "hipaaPage");
    });
  }
  
  // HIPAA page to tutorial page transition
  const agreeButton = document.getElementById("agreeButton");
  if (agreeButton) {
    agreeButton.addEventListener("click", function() {
      console.log("Agreed to HIPAA terms, transitioning to tutorial page");
      transitionPages("hipaaPage", "tutorialPage2");
    });
  }
  
  // HIPAA cancel button
  const cancelButton = document.getElementById("cancelButton");
  if (cancelButton) {
    cancelButton.addEventListener("click", function() {
      console.log("Cancelled HIPAA agreement");
      alert("Signup cancelled. Exiting...");
    });
  }


  // Tutorial page navigation (clicking anywhere on the tutorial page)
  const tutorialPage2 = document.getElementById("tutorialPage2");
  if (tutorialPage2) {
    tutorialPage2.addEventListener("click", function() {
      console.log("Tutorial page 2.0 clicked, transitioning to page 2.1");
      transitionPages("tutorialPage2", "tutorialPage21");
    });
  }

  // Setup more tutorial page transitions
  setupTutorialPageTransitions();

  // Find all health history buttons in footers across the app
  const healthHistoryButtons = document.querySelectorAll('.footer-btn:not(.active)');
  healthHistoryButtons.forEach(button => {
    // Check if this is a health history button by looking at its text content
    if (button.textContent.includes('Health History')) {
      button.addEventListener('click', function() {
        console.log("Health History button clicked");
        const currentPage = document.querySelector('.page.visible');
        if (currentPage && currentPage.id !== "healthHistoryPage") {
          transitionPages(currentPage.id, "healthHistoryPage");
        }
      });
    }
  });

}

// Add this as a new separate function after setupEventListeners
function setupHealthHistoryFooterButtons() {
  // Target specifically the first button in each footer (Health History)
  const healthHistoryButtons = document.querySelectorAll('.footer-btn:first-child');
  
  healthHistoryButtons.forEach(button => {
    // Check if this is a health history button
    if (button.textContent.includes('Health History') || button.querySelector('span')?.textContent.includes('Health History')) {
      // Make sure we're not adding duplicate listeners
      const clonedButton = button.cloneNode(true);
      button.parentNode.replaceChild(clonedButton, button);
      
      clonedButton.addEventListener('click', function() {
        console.log("Health History footer button clicked");
        const currentPage = document.querySelector('.page.visible');
        if (currentPage && currentPage.id !== "healthHistoryPage") {
          transitionPages(currentPage.id, "healthHistoryPage");
        }
      });
    }
  });
  
  console.log("Health History footer buttons initialized");
}
  // Setup tutorial page transitions

function setupTutorialPageTransitions() {
  const tutorialPage21 = document.getElementById("tutorialPage21");
  if (tutorialPage21) {
    tutorialPage21.addEventListener("click", function() {
      transitionPages("tutorialPage21", "tutorialPage22");
    });
  }

  const tutorialPage22 = document.getElementById("tutorialPage22");
  if (tutorialPage22) {
    tutorialPage22.addEventListener("click", function() {
      transitionPages("tutorialPage22", "tutorialPage23");
    });
  }

  const tutorialPage23 = document.getElementById("tutorialPage23");
  if (tutorialPage23) {
    tutorialPage23.addEventListener("click", function() {
      transitionPages("tutorialPage23", "tutorialPage24");
    });
  }

  // Setup the "New Log" buttons to work from any page
  const newLogButtons = document.querySelectorAll(".footer-btn.main");
  newLogButtons.forEach(button => {
    button.addEventListener("click", function() {
      console.log("New Log button clicked");
      
      // Find the current visible page
      const currentPage = document.querySelector('.page.visible');
      
      if (currentPage) {
        // Transition to the new health log page from the current page
        transitionPages(currentPage.id, "newHealthLogPage");
      }
    });
  });
}  

// Add this to your existing page transition setup
function setupPrepVisitTransition() {
  // Find all prep visit buttons in footers across the app
  const prepVisitButtons = document.querySelectorAll('.footer-btn:not(.active)');
  prepVisitButtons.forEach(button => {
    const buttonText = button.textContent.trim();
    
    // Check if this is a prep visit button
    if (buttonText.includes('Prep Visit')) {
      button.addEventListener('click', function() {
        console.log("Prep Visit button clicked");
        
        // Debug: Check if logs exist in session storage
        const logs = JSON.parse(sessionStorage.getItem("healthLogs") || "[]");
        console.log("Current logs in sessionStorage:", logs.length, logs);
        
        const currentPage = document.querySelector('.page.visible');
        if (currentPage && currentPage.id !== "prepVisitPage") {
          transitionPages(currentPage.id, "prepVisitPage");
          // Initialize the page after transition
          setTimeout(() => {
            console.log("About to initialize prep visit page");
            initializePrepVisitPage();
          }, 100);
        }
      });
    }
  });
}

  // Generic function to transition between pages
function transitionPages(fromPageId, toPageId) {
  const fromPage = document.getElementById(fromPageId);
  const toPage = document.getElementById(toPageId);
  
  console.log("Attempting transition:", fromPageId, "→", toPageId);
  console.log("From page exists:", !!fromPage);
  console.log("To page exists:", !!toPage);

  if (!fromPage || !toPage) {
    console.error(`Page transition failed: ${fromPageId} to ${toPageId}`);
    return;
  }
  
  console.log(`Transitioning from ${fromPageId} to ${toPageId}`);
  
  // Hide from page
  fromPage.style.display = "none";
  fromPage.classList.remove("visible");
  fromPage.classList.add("hidden");
  
  // Show to page
  toPage.style.display = "block";
  toPage.classList.remove("hidden");
  toPage.classList.add("visible");
  
  // If going to details page, update welcome message
  if (toPageId === "detailsPage") {
    updateWelcomeName();
  }
}

// Add the new function right after
function enhanceTransitionPages() {
  const originalTransitionPages = window.transitionPages;
  
  window.transitionPages = function(fromPageId, toPageId) {
    // Call original function
    originalTransitionPages(fromPageId, toPageId);
    
    // Apply avatar and user name updates after transition
    setTimeout(() => {
      console.log(`Transition complete from ${fromPageId} to ${toPageId}, updating avatars`);
      updateAllAvatars();
      updateUserNames();
    }, 100);
  };
}

// Toggle avatar dropdown visibility
function toggleAvatarDropdown() {
  const dropdown = document.getElementById('avatarDropdown');
  if (dropdown) {
    dropdown.style.display = (dropdown.style.display === 'block') ? 'none' : 'block';
  }
}
// Function to ensure avatar consistency across the app
function updateAllAvatars() {
  console.log("Updating all avatar images throughout the app");
  
  // Get stored avatar or use default
  const storedAvatar = sessionStorage.getItem("selectedAvatar") || "https://placehold.co/103x103";
  console.log("Using avatar:", storedAvatar);
  
  // List of all avatar elements in the app
  const avatarElementIds = [
    "chosenAvatar",             // Signup page
    "detailsAvatar",            // Details page
    "userAvatar",               // New Health Log page
    "followupUserAvatar",       // Follow-up page header
    "logUserAvatar",            // Follow-up page log card
    "healthHistoryAvatar",      // Health History page
    "prepVisitAvatar",          // Prep Visit page
    "prepVisitUserImage",       // Prep Visit main image
    "menuUserAvatar"            // Menu component
  ];
  
  // Update each avatar element if it exists
  avatarElementIds.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      console.log(`Updating avatar for element: ${id}`);
      element.src = storedAvatar;
      
      // Check if the element has a specific size requirement
      if (id === "healthHistoryAvatar") {
        // This is a smaller avatar
        element.style.objectFit = "cover";
        element.style.borderRadius = "50%";
      } else if (id === "logUserAvatar") {
        // This is a smaller avatar
        element.style.objectFit = "cover";
        element.style.borderRadius = "50%";
        element.style.border = "3px solid #20B5C4";
      } else if (id === "menuUserAvatar") {
        // Menu avatar is larger
        element.style.objectFit = "cover";
        element.style.width = "134px";
        element.style.height = "134px";
      }
    }
  });
  
  // Also update any avatar placeholders in newly created elements
  const avatarPlaceholders = document.querySelectorAll('.avatar:not([id])');
  avatarPlaceholders.forEach(element => {
    element.src = storedAvatar;
  });
  
  console.log("Avatar update complete");
}

// Then, add the updateUserNames function right after it
function updateUserNames() {
  // Get stored name or use default
  const storedName = sessionStorage.getItem("userName") || "James Quinn";
  const firstName = storedName.split(" ")[0];
  const lastName = storedName.split(" ")[1] || "";
  
  console.log("Using name:", storedName);
  
  // Update welcome message
  const welcomeName = document.getElementById('welcomeName');
  if (welcomeName) {
    welcomeName.innerText = `Welcome ${storedName} 👋`;
  }
  
  // Update user name in header
  const userName = document.getElementById('userName');
  if (userName) {
    userName.textContent = firstName;
  }
  
  // Update follow-up page user name
  const followupUserName = document.getElementById('followupUserName');
  if (followupUserName) {
    followupUserName.textContent = firstName;
  }
  
  // Update health history user name
  const healthHistoryUserName = document.getElementById('healthHistoryUserName');
  if (healthHistoryUserName) {
    healthHistoryUserName.textContent = firstName + "!";
  }

  const prepVisitUserName = document.getElementById('prepVisitUserName');
  if (prepVisitUserName) {
    prepVisitUserName.textContent = firstName + "!";
  }
  
  // Update menu user name and family
  const menuUserName = document.getElementById('menuUserName');
  const menuUserFamily = document.querySelector('.user-family');
  
  if (menuUserName) {
    menuUserName.textContent = firstName + ",";
  }
  
  if (menuUserFamily && lastName) {
    menuUserFamily.textContent = "The " + lastName + " Family";
  }
}


// Handle avatar selection
function selectAvatar(imgUrl) {
  console.log("Avatar selected:", imgUrl);
  
  // Store the selected avatar URL
  sessionStorage.setItem("selectedAvatar", imgUrl);
  
  // Update all avatars in the app
  updateAllAvatars();
  
  // Close dropdown
  toggleAvatarDropdown();
}

// Save user info from signup form
function saveUserInfo() {
  const firstName = document.getElementById('firstName')?.value || 'James';
  const lastName = document.getElementById('lastName')?.value || 'Quinn';
  const fullName = `${firstName} ${lastName}`;
  
  // Save to sessionStorage
  sessionStorage.setItem('userName', fullName);
  console.log('User info saved:', fullName);
  
  // Update welcome name on details page
  updateWelcomeName();
}

// Update welcome message on details page
function updateWelcomeName() {
  const welcomeName = document.getElementById('welcomeName');
  const storedName = sessionStorage.getItem('userName') || 'James Quinn';
  
  if (welcomeName) {
    welcomeName.innerText = `Welcome ${storedName} 👋`;
  }
}

// Load user data from sessionStorage
function loadUserData() {
  // Load avatar
  const storedAvatar = sessionStorage.getItem("selectedAvatar") || "https://placehold.co/103x103";
  
  // Update all avatars with a centralized function
  updateAllAvatars();
  
  // Load name
  updateUserNames();
}

// Function to initialize toggle and text input functionality
function initializeToggleAndTextInput() {
  const toggleInput = document.getElementById("toggleInput");
  const textInputSection = document.getElementById("textInputSection");
  const closeTextInput = document.getElementById("closeTextInput");
  const submitButton = document.querySelector(".submit-button");
  
  if (!toggleInput || !textInputSection) {
    console.error("Toggle or text input elements not found");
    return;
  }
  
  console.log("Initializing toggle and text input");
  
  // Show typing area when toggle is ON
  toggleInput.addEventListener("change", function() {
    console.log("Toggle changed, checked:", toggleInput.checked);
    
    if (toggleInput.checked) {
      // First display the container
      textInputSection.style.display = "block";
      
      // Force a browser reflow to make sure display change takes effect
      void textInputSection.offsetWidth;
      
      // Then animate it up
      setTimeout(() => {
        textInputSection.style.bottom = "0";
      }, 10);
    } else {
      // Animate it down first
      textInputSection.style.bottom = "-497px";
      
      // Then hide it after animation completes
      setTimeout(() => {
        textInputSection.style.display = "none";
      }, 300); // Match this to your transition duration
    }
  });
  
  // Close typing area when X button is clicked
  if (closeTextInput) {
    closeTextInput.addEventListener("click", function() {
      console.log("Close button clicked");
      
      // Uncheck toggle
      toggleInput.checked = false;
      
      // Animate down
      textInputSection.style.bottom = "-497px";
      
      // Hide after animation
      setTimeout(() => {
        textInputSection.style.display = "none";
      }, 300);
    });
  }
  
  // Handle submit button click
  if (submitButton) {
    submitButton.addEventListener("click", function() {
      const symptomInput = document.getElementById("symptomInput");
      
      if (!symptomInput || !symptomInput.value.trim()) {
        alert("Please enter your symptoms before submitting.");
        return;
      }
      
      console.log("Symptom submitted:", symptomInput.value);
      
      // Here you would normally process the input,
      // possibly send it to a server or store it locally
      
      // For now, just alert the user and close the typing area
     // alert("Your health log has been saved: " + symptomInput.value);
      
      // Toggle off the typing area
      toggleInput.checked = false;
      textInputSection.style.bottom = "-497px";
      
      setTimeout(() => {
        textInputSection.style.display = "none";
        symptomInput.value = ""; // Clear the input
      }, 300);
    });
  }
}

// Function to create the typing area content when needed
function createTextInputContent() {
  const textInputSection = document.getElementById("textInputSection");
  
  if (!textInputSection) {
    console.error("Text input section not found");
    return;
  }
  
  // Create the content for the text input area
  textInputSection.innerHTML = `
    <!-- Close Button -->
    <button id="closeTextInput" class="close-button">
      <img src="./imgs/white-x-button.png" alt="Close">
    </button>
    
    <!-- Typing Area -->
    <div class="type-box">
      <textarea id="symptomInput" placeholder="Type here..."></textarea>
    </div>
    
    <!-- Submit Log -->
    <div class="submit-container">
      <span class="submit-text">Submit Log</span>
      <button id="submitSymptom" class="submit-button">
        <img src="./imgs/record-button.png" alt="Submit">
      </button>
    </div>
  `;
  
  // Add event listener for close button
  const closeTextInput = document.getElementById("closeTextInput");
  const toggleInput = document.getElementById("toggleInput");
  
  if (closeTextInput && toggleInput) {
    closeTextInput.addEventListener("click", function() {
      console.log("Close button clicked");
      
      // Uncheck toggle
      toggleInput.checked = false;
      
      // Animate down
      textInputSection.style.bottom = "-400px";
      
      // Hide after animation
      setTimeout(() => {
        textInputSection.style.display = "none";
      }, 300);
    });
  }
  // Add event listener for submit button
  const submitSymptom = document.getElementById("submitSymptom");
  
  if (submitSymptom) {
    submitSymptom.addEventListener("click", function() {
      const symptomInput = document.getElementById("symptomInput");
      
      if (!symptomInput || !symptomInput.value.trim()) {
        alert("Please enter your symptoms before submitting.");
        return;
      }
      
      //console.log("Symptom submitted:", symptomInput.value);
      
      // Here you would normally process the input,
      // possibly send it to a server or store it locally
      
      // For now, just alert the user
    //  alert("Your health log has been saved.");
      
      // Toggle off the typing area
      if (toggleInput) {
        toggleInput.checked = false;
        textInputSection.style.bottom = "-400px";
        
        setTimeout(() => {
          textInputSection.style.display = "none";
          symptomInput.value = ""; // Clear the input
        }, 300);
      }
    });
  }
}
function initializePrepVisitPage() {
  console.log("STARTING initializePrepVisitPage function");
  
  // Update user info
  updatePrepVisitUserInfo();
  
  refreshPrepVisitLogs();

  // Set up event listeners
  setupPrepVisitEventListeners();
  
  console.log("Prep visit page initialized");
}
// Function to initialize the New Health Log page
function initializeNewHealthLogPage() {
  // Create the content for the text input area
  createTextInputContent();
  
  // Initialize toggle functionality
  initializeToggleAndTextInput();

   // Update user info
  const userAvatar = document.getElementById("userAvatar");
  const userName = document.getElementById("userName");
  
  if (userAvatar && userName) {
    // Get stored user data
    const storedAvatar = sessionStorage.getItem("selectedAvatar") || "https://placehold.co/51x51";
    const storedName = sessionStorage.getItem("userName") || "James";
    
    // Update UI
    userAvatar.src = storedAvatar;
    userName.textContent = storedName.split(" ")[0]; // Just show first name
  }
 
  fixSubmitButtonTransition();
 }
 function saveNewHealthLog(logText) {
  // Get existing logs or create empty array
  const existingLogs = JSON.parse(sessionStorage.getItem("healthLogs") || "[]");
  
  // Create new log entry
  const newLog = {
    date: new Date().toISOString(),
    text: logText,
    avatar: sessionStorage.getItem("selectedAvatar") || "https://placehold.co/67x67"
  };
  
  // Add new log to the beginning of array (newest first)
  existingLogs.unshift(newLog);
  
  // Save updated logs
  sessionStorage.setItem("healthLogs", JSON.stringify(existingLogs));
  
  console.log("Health log saved:", newLog);
}

// Modify the initializeHealthHistoryPage function to properly clear and display saved logs
function initializeHealthHistoryPage() {
  console.log("Initializing Health History page");
  
  // Update user info
  updateHealthHistoryUserInfo();
  
  // Clear existing hardcoded logs
  const healthLogsContainer = document.querySelector('.health-history-content');
  // Keep only important elements like the title, search, and filter buttons
  const elementsToKeep = ['history-title', 'search-container', 'filter-buttons'];
  Array.from(healthLogsContainer.children).forEach(child => {
    if (!elementsToKeep.some(cls => child.classList.contains(cls)) && 
        !child.classList.contains('filter-btn')) {
      child.remove();
    }
  });
  
  // Now display dynamic logs from sessionStorage
  displayHealthLogs();

  // Set up event listeners for the page
  setupHealthHistoryEventListeners();
  
  console.log("Health History page initialized");
}

// Add this to initializeHealthHistoryPage function
function displayHealthLogs() {
  const healthLogsContainer = document.querySelector('.health-history-content');
  const existingLogs = JSON.parse(sessionStorage.getItem("healthLogs") || "[]");
  
  // If no logs yet, show a message
  if (existingLogs.length === 0) {
    // Keep the search and filter elements
    const endSection = document.createElement('div');
    endSection.className = 'end-of-logs';
    endSection.innerHTML = `
      <img src="./imgs/logo.png" alt="No logs yet" class="end-icon">
      <div class="end-text">No logs yet</div>
    `;
    healthLogsContainer.appendChild(endSection);
    return;
  }
  
  // Clear existing log cards (but keep title, search and filter)
  const elementsToKeep = ['history-title', 'search-container', 'filter-buttons'];
  Array.from(healthLogsContainer.children).forEach(child => {
    if (!elementsToKeep.some(cls => child.classList.contains(cls))) {
      child.remove();
    }
  });
  
  // Group logs by month
  const logsByMonth = {};
  
  existingLogs.forEach(log => {
    const date = new Date(log.date);
    const monthYear = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
    
    if (!logsByMonth[monthYear]) {
      logsByMonth[monthYear] = [];
    }
    logsByMonth[monthYear].push(log);
  });
  
  // Display logs by month
  Object.keys(logsByMonth).forEach(monthYear => {
    // Create month title
    const monthTitle = document.createElement('h2');
    monthTitle.className = 'month-title';
    monthTitle.textContent = monthYear;
    healthLogsContainer.appendChild(monthTitle);
    
    // Create log cards for this month
    logsByMonth[monthYear].forEach(log => {
      const date = new Date(log.date);
      const formattedDate = `${date.toLocaleString('default', { month: 'long' })} ${date.getDate()}${getOrdinalSuffix(date.getDate())}, ${date.getFullYear()}`;
      
      const logCard = document.createElement('div');
      logCard.className = 'health-log-card';
      logCard.innerHTML = `
        <div class="log-avatar-container">
          <img src="${log.avatar}" alt="User" class="log-avatar">
        </div>
        <div class="log-content">
          <h3 class="log-date">${formattedDate}</h3>
          <p class="log-text">${truncateText(log.text, 60)}</p>
        </div>
        <div class="log-arrow">
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
            <path d="M1 1L7 7L1 13" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      `;
      
      healthLogsContainer.appendChild(logCard);
    });
  });
  
  // Add "End of logs" marker
  const endSection = document.createElement('div');
  endSection.className = 'end-of-logs';
  endSection.innerHTML = `
    <img src="./imgs/logo.png" alt="End of Logs Icon" class="end-icon">
    <div class="end-text">End of Logs</div>
  `;
  healthLogsContainer.appendChild(endSection);
}

// Function to display user logs on the Prep Visit page
// Function to display user logs on the Prep Visit page
function displayPrepVisitLogs() {
  console.log("%c STARTING displayPrepVisitLogs function", "background: #f00; color: #fff; padding: 5px;");
  
  // 1. Find the content area and prep notes button
  const prepVisitContent = document.querySelector('.prep-visit-content');
  if (!prepVisitContent) {
    console.error("ERROR: Prep visit content area not found");
    // Add visual feedback for debugging
    alert("Prep visit content area not found!");
    return;
  }
  
  const prepNotesButton = document.querySelector('.prep-notes-button');
  if (!prepNotesButton) {
    console.error("ERROR: Prep notes button not found");
    // Add visual feedback for debugging
    alert("Prep notes button not found!");
    return;
  }
  
  console.log("Found content area and prep notes button");
  
  // 2. Get logs from sessionStorage with visual feedback
  let existingLogs = [];
  try {
    existingLogs = JSON.parse(sessionStorage.getItem("healthLogs") || "[]");
    console.log(`Retrieved ${existingLogs.length} logs from sessionStorage:`, existingLogs);
    
    // Add visual feedback
    if (existingLogs.length > 0) {
      // Insert a temporary visible debug element
      const debugElement = document.createElement('div');
      debugElement.style.background = 'red';
      debugElement.style.color = 'white';
      debugElement.style.padding = '10px';
      debugElement.style.margin = '10px 0';
      debugElement.textContent = `Found ${existingLogs.length} logs in storage. Check console for details.`;
      prepVisitContent.insertBefore(debugElement, prepNotesButton);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        try {
          if (debugElement.parentNode) {
            debugElement.parentNode.removeChild(debugElement);
          }
        } catch (e) {}
      }, 5000);
    }
  } catch (error) {
    console.error("Error retrieving logs:", error);
    existingLogs = [];
  }
  
  // Display a message and stop if no logs
  if (!existingLogs || existingLogs.length === 0) {
    console.log("No logs available to display");
    const noLogsMsg = document.createElement('div');
    noLogsMsg.style.textAlign = 'center';
    noLogsMsg.style.margin = '40px 0';
    noLogsMsg.style.color = 'black';
    noLogsMsg.style.fontFamily = 'Urbanist, sans-serif';
    noLogsMsg.style.fontSize = '18px';
    noLogsMsg.style.fontWeight = '600';
    noLogsMsg.innerHTML = 'No user logs found.<br>Create a new log to prepare for your visit.';
    prepVisitContent.insertBefore(noLogsMsg, prepNotesButton);
    return;
  }
  
  // 3. Clear existing log elements
  const existingMonthTitles = prepVisitContent.querySelectorAll('.month-title');
  const existingLogCards = prepVisitContent.querySelectorAll('.health-log-card');
  
  console.log(`Found ${existingMonthTitles.length} existing month titles and ${existingLogCards.length} existing log cards`);
  
  existingMonthTitles.forEach(title => {
    console.log(`Removing month title: ${title.textContent}`);
    title.remove();
  });
  
  existingLogCards.forEach(card => {
    console.log("Removing log card");
    card.remove();
  });
  
  // 4. Group logs by month
  const logsByMonth = {};
  
  existingLogs.forEach(log => {
    try {
      const date = new Date(log.date);
      if (isNaN(date.getTime())) {
        console.error("Invalid date in log:", log);
        return;
      }
      
      const monthYear = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
      
      if (!logsByMonth[monthYear]) {
        logsByMonth[monthYear] = [];
      }
      logsByMonth[monthYear].push(log);
    } catch (error) {
      console.error("Error processing log:", log, error);
    }
  });
  
  console.log("Logs grouped by month:", Object.keys(logsByMonth));
  
  // 5. Display logs by month
  Object.keys(logsByMonth).forEach(monthYear => {
    console.log(`Creating section for ${monthYear} with ${logsByMonth[monthYear].length} logs`);
    
    // Create month title
    const monthTitle = document.createElement('h2');
    monthTitle.className = 'month-title';
    monthTitle.textContent = monthYear;
    monthTitle.style.color = 'black'; // Ensure title is visible
    prepVisitContent.insertBefore(monthTitle, prepNotesButton);
    
    // Create log cards for this month
    logsByMonth[monthYear].forEach(log => {
      try {
        const date = new Date(log.date);
        const formattedDate = `${date.toLocaleString('default', { month: 'long' })} ${date.getDate()}${getOrdinalSuffix(date.getDate())}, ${date.getFullYear()}`;
        
        // Create a unique ID for this log
        const logId = `${date.toISOString()}-${log.text.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '')}`;
        
        const logCard = document.createElement('div');
        logCard.className = 'health-log-card';
        logCard.dataset.logId = logId;
        
        // Create checkbox HTML
        const checkboxHtml = `
          <div class="checkbox">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0.5" y="0.5" width="23" height="23" rx="3.5" stroke="#AEAEB2"/>
            </svg>
          </div>
        `;
        
        // Use the user's actual avatar
        const avatarSrc = log.avatar || sessionStorage.getItem("selectedAvatar") || "https://placehold.co/67x67";
        
        logCard.innerHTML = `
          <div class="log-avatar-container">
            <img src="${avatarSrc}" alt="User" class="log-avatar">
          </div>
          <div class="log-content">
            <h3 class="log-date">${formattedDate}</h3>
            <p class="log-text">${log.text.substring(0, 60)}${log.text.length > 60 ? '...' : ''}</p>
          </div>
          <div class="log-checkbox">
            ${checkboxHtml}
            <div class="add-log-text">Add<br/>Health Log</div>
          </div>
        `;
        
        prepVisitContent.insertBefore(logCard, prepNotesButton);
        console.log(`Added log card for ${formattedDate}`);
      } catch (error) {
        console.error("Error creating log card:", error);
      }
    });
  });
  
  // Make sure checkbox listeners are attached
  try {
    setupCheckboxListeners();
  } catch (error) {
    console.error("Error setting up checkbox listeners:", error);
  }
  
  console.log("%c FINISHED displayPrepVisitLogs function", "background: #0f0; color: #000; padding: 5px;");
}

// Add this to your JavaScript file
function refreshPrepVisitLogs() {
  console.log("Refreshing prep visit logs with new implementation");
  
  // Get the content area and button
  const prepVisitContent = document.querySelector('.prep-visit-content');
  const prepNotesButton = document.querySelector('.prep-notes-button');
  
  if (!prepVisitContent || !prepNotesButton) {
    console.error("Required elements not found");
    return;
  }
  
  // Clear any existing logs and month titles
  const existingTitles = prepVisitContent.querySelectorAll('.month-title');
  const existingCards = prepVisitContent.querySelectorAll('.health-log-card');
  
  existingTitles.forEach(el => el.remove());
  existingCards.forEach(el => el.remove());
  
  // Get logs from sessionStorage
  let logs = [];
  try {
    logs = JSON.parse(sessionStorage.getItem("healthLogs") || "[]");
    console.log(`Found ${logs.length} logs in storage`);
  } catch (e) {
    console.error("Error parsing logs:", e);
    logs = [];
  }
  
  // If no logs, show a message
  if (!logs || logs.length === 0) {
    const noLogsMsg = document.createElement('div');
    noLogsMsg.style.textAlign = 'center';
    noLogsMsg.style.margin = '40px 0';
    noLogsMsg.style.color = 'black';
    noLogsMsg.style.fontFamily = 'Urbanist, sans-serif';
    noLogsMsg.style.fontSize = '18px';
    noLogsMsg.style.fontWeight = '600';
    noLogsMsg.innerHTML = 'No health logs found.<br>Create a new log using the New Log button below.';
    prepVisitContent.insertBefore(noLogsMsg, prepNotesButton);
    return;
  }
  
  // Group by month
  const logsByMonth = {};
  logs.forEach(log => {
    const date = new Date(log.date);
    if (isNaN(date.getTime())) return;
    
    const monthYear = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
    if (!logsByMonth[monthYear]) {
      logsByMonth[monthYear] = [];
    }
    logsByMonth[monthYear].push(log);
  });
  
  // Display by month
  Object.keys(logsByMonth).forEach(monthYear => {
    // Create month title
    const monthTitle = document.createElement('h2');
    monthTitle.className = 'month-title';
    monthTitle.textContent = monthYear;
    prepVisitContent.insertBefore(monthTitle, prepNotesButton);
    
    // Create log cards
    logsByMonth[monthYear].forEach(log => {
      const date = new Date(log.date);
      const formattedDate = `${date.toLocaleString('default', { month: 'long' })} ${date.getDate()}${getOrdinalSuffix(date.getDate())}, ${date.getFullYear()}`;
      
      // Create card
      const card = document.createElement('div');
      card.className = 'health-log-card';
      
      // Use the avatar from the log or default
      const avatarSrc = log.avatar || sessionStorage.getItem("selectedAvatar") || "https://placehold.co/67x67";
      
      card.innerHTML = `
        <div class="log-avatar-container">
          <img src="${avatarSrc}" alt="User" class="log-avatar">
        </div>
        <div class="log-content">
          <h3 class="log-date">${formattedDate}</h3>
          <p class="log-text">${truncateText(log.text, 60)}</p>
        </div>
        <div class="log-checkbox">
          <div class="checkbox">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0.5" y="0.5" width="23" height="23" rx="3.5" stroke="#AEAEB2"/>
            </svg>
          </div>
          <div class="add-log-text">Add<br/>Health Log</div>
        </div>
      `;
      
      prepVisitContent.insertBefore(card, prepNotesButton);
    });
  });
  setTimeout(() => {
    setupCheckboxListeners();
    console.log("Checkbox listeners set up after cards were created");
  }, 50);
  
  console.log("Prep visit logs refreshed successfully");
}


function setupCheckboxListeners() {
  console.log("Setting up checkbox listeners");
  
  const checkboxContainers = document.querySelectorAll(".log-checkbox");
  console.log(`Found ${checkboxContainers.length} checkboxes to set up`);
  
  checkboxContainers.forEach((container) => {
    // Get the checkbox SVG element
    const checkboxSvg = container.querySelector(".checkbox");
    if (!checkboxSvg) return;
    
    // Remove existing click handlers by cloning
    const newContainer = container.cloneNode(true);
    container.parentNode.replaceChild(newContainer, container);
    
    // Get the new checkbox SVG after cloning
    const newCheckboxSvg = newContainer.querySelector(".checkbox");
    
    // Add click event to the new container
    newContainer.addEventListener("click", function() {
      // Toggle checkbox state
      if (newCheckboxSvg.classList.contains("checked")) {
        // Uncheck
        newCheckboxSvg.classList.remove("checked");
        newCheckboxSvg.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0.5" y="0.5" width="23" height="23" rx="3.5" stroke="#AEAEB2"/>
          </svg>
        `;
      } else {
        // Check
        newCheckboxSvg.classList.add("checked");
        newCheckboxSvg.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0.5" y="0.5" width="23" height="23" rx="3.5" fill="#12B28C"/>
            <path d="M7 12L10 15L17 8" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
      }
      
      // Log for debugging
      const logCard = this.closest(".health-log-card");
      const logDate = logCard ? logCard.querySelector(".log-date").textContent : "unknown";
      console.log(`Toggled selection for log: ${logDate}`);
    });
  });
  
  console.log("Checkbox listeners setup complete");
}

// Helper function for date suffixes (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

// Function to initialize the Health Log Follow-up Page
// Function to initialize the Health Log Follow-up Page
async function initializeHealthLogFollowupPage() {
  // Update user info
  const userAvatar = document.getElementById("followupUserAvatar");
  const userName = document.getElementById("followupUserName");
  const logUserAvatar = document.getElementById("logUserAvatar");
  const logContent = document.getElementById("logTextContent");
  const logDate = document.getElementById("logDate");
  
  // Get stored user data
  const storedAvatar = sessionStorage.getItem("selectedAvatar") || "https://placehold.co/51x51";
  const storedName = sessionStorage.getItem("userName") || "James";
  const lastHealthLog = sessionStorage.getItem("lastHealthLog") || "I woke up this morning feeling really tired, like more than usual. I also had...";
  
  // Set current date for the log
  const currentDate = new Date();
  const options = { weekday: 'short', month: '2-digit', day: '2-digit', year: 'numeric' };
  const formattedDate = currentDate.toLocaleDateString('en-US', options).replace(/,/g, '');
  
  // Update UI elements
  if (userAvatar) userAvatar.src = storedAvatar;
  if (userName) userName.textContent = storedName.split(" ")[0]; // Just show first name
  if (logUserAvatar) logUserAvatar.src = storedAvatar;
  if (logContent) logContent.textContent = lastHealthLog;
  if (logDate) logDate.textContent = formattedDate;
  
  // Create question cards (now async)
  await createQuestionCards();
  
  // Set up event listeners for question cards interactions
  setupQuestionCardInteractions();
  
  // Add the detail card styles
  addDetailCardStyles();
  
  // Add carousel styles
  fixCarouselStyles();
  
  // Fix carousel navigation
  fixCarouselNavigation();
}

// Function to create question cards
async function createQuestionCards() {
  // Try to get questions from API or use default questions
  let questionData;
  
  // Get the last health log text
  const lastHealthLog = sessionStorage.getItem("lastHealthLog");
  
  if (lastHealthLog) {
    try {
      // Get dynamic questions based on the log
      questionData = await getFollowUpQuestions(lastHealthLog);
    } catch (error) {
      console.error("Error getting follow-up questions:", error);
      // Fallback to default questions
      questionData = [
        {
          id: 1,
          number: "01",
          question: "Has the fatigue improved or gotten worse throughout the day?"
        },
        {
          id: 2,
          number: "02",
          question: "Are you eating and drinking enough?"
        },
        {
          id: 3,
          number: "03",
          question: "Any nausea?"
        }
      ];
    }
  } else {
    // No health log found, use default questions
    questionData = [
      {
        id: 1,
        number: "01",
        question: "Has the fatigue improved or gotten worse throughout the day?"
      },
      {
        id: 2,
        number: "02",
        question: "Are you eating and drinking enough?"
      },
      {
        id: 3,
        number: "03",
        question: "Any nausea?"
      }
    ];
  }
  
  const carousel = document.querySelector('.question-card-carousel');
  if (!carousel) {
    console.error("Carousel not found");
    return;
  }
  
  // Clear existing cards
  carousel.innerHTML = '';
  
  // Create cards for each question
  questionData.forEach((question, index) => {
    const card = createQuestionCard(question, index);
    carousel.appendChild(card);
  });
  
  // Initialize the carousel to show the first card
  carousel.style.transform = 'translateX(0)';
  
  // Make sure all cards have proper visibility and positioning
  const cards = carousel.querySelectorAll('.question-card');
  cards.forEach((card, index) => {
    card.style.display = 'block';
    card.style.position = 'relative';
    card.style.flexShrink = '0';
    card.style.width = '312px';
    card.style.minWidth = '312px';
  });
  
  // Log the number of cards created
  console.log(`Created ${cards.length} question cards`);
  
  // Return the number of cards for potential use elsewhere
  return cards.length;
}

// Function to create a single question card
function createQuestionCard(questionData, index) {
  const card = document.createElement('div');
  card.className = 'question-card';
  card.dataset.id = questionData.id;
  
  // Create card content
  card.innerHTML = `
    <div class="question-close">
      <img src="./imgs/black-x-button.png" alt="Close" width="20" height="20">
    </div>
    <div class="question-number">${questionData.number}</div>
    <div class="question-underline"></div>
    <div class="question-content">${questionData.question}</div>
    <div class="question-type-button">
      <img src="./imgs/new-log-icon.png" alt="Type Button">
      <div class="question-type-text">Type</div>
    </div>
    <div class="question-button-container">
      <div class="question-button yes">Yes</div>
      <div class="question-button no">No</div>
    </div>
`;
  
  return card;
}

// Function to set up event listeners for question card interactions
function setupQuestionCardInteractions() {
  const carousel = document.querySelector('.question-card-carousel');
  const cards = document.querySelectorAll('.question-card');
  const container = document.querySelector('.question-cards-container');
  
  if (!carousel || !cards.length || !container) {
    console.error("Required elements not found for question cards");
    return;
  }

  // Save question texts as soon as the page loads
  saveQuestionTexts();
  
  // Calculate card width with gap
  const cardWidth = cards[0].offsetWidth;
  const cardMargin = 20; // Match the gap in CSS
  const totalCardWidth = cardWidth + cardMargin;
  
  // Current card index
  let currentIndex = 0;
  
  // Function to navigate to a specific card index
  const goToCard = (index) => {
    if (index < 0) index = 0;
    if (index >= cards.length) index = cards.length - 1;
    
    currentIndex = index;
    
    // Get the exact width of the card directly from the DOM
    const cardElement = cards[currentIndex];
    const cardRect = cardElement.getBoundingClientRect();
    const cardWidth = cardRect.width;

    // Include the margin in the calculation
    const cardMargin = 20; // Match margin-right in CSS
    const position = index * (cardWidth + cardMargin);

   
    // Apply the transform and log the value
    console.log(`Moving to card ${index}, position: ${position}px, transform: translateX(-${position}px)`);
    carousel.style.transform = `translateX(-${position}px)`;

    // Verify the transform was applied
    setTimeout(() => {
      console.log("Actual transform:", carousel.style.transform);
      console.log("Carousel position:", carousel.getBoundingClientRect());
    }, 50);
      
    updateNavButtons(currentIndex, cards.length);
    
    // Make sure the scrollable area shows the active card
    const contentArea = document.querySelector('.followup-content-area');
    if (contentArea) {
      const cardTop = cards[currentIndex].offsetTop;
      contentArea.scrollTop = cardTop - 100; // Scroll to show the active card with some space above
    }
  };
  
  // Update navigation button visibility
  const updateNavButtons = () => {
    const prevButton = document.querySelector('.question-nav-button.prev');
    const nextButton = document.querySelector('.question-nav-button.next');
    
    if (prevButton) {
      prevButton.addEventListener('click', () => {
        console.log("Previous button clicked, current index:", currentIndex);
        if (currentIndex > 0) {
          goToCard(currentIndex - 1);
        }
      });
    }
    
    if (nextButton) {
      nextButton.addEventListener('click', () => {
        console.log("Next button clicked, current index:", currentIndex);
        if (currentIndex < cards.length - 1) {
          goToCard(currentIndex + 1);
        }
      });
    }
  };
  
  // Initial update
  updateNavButtons(currentIndex, cards.length);
  
  // Handle navigation
  const prevButton = document.querySelector('.question-nav-button.prev');
  const nextButton = document.querySelector('.question-nav-button.next');
  
  console.log("Navigation buttons set up: prev=", !!prevButton, "next=", !!nextButton);

  if (prevButton) {
    prevButton.addEventListener('click', () => {
      console.log("Previous button clicked, current index:", currentIndex);
      if (currentIndex > 0) {
        goToCard(currentIndex - 1);
      }
    });
  }

  if (nextButton) {
    nextButton.addEventListener('click', () => {
      console.log("Next button clicked, current index:", currentIndex);
      if (currentIndex < cards.length - 1) {
        goToCard(currentIndex + 1);
      }
    });
  }
  
  // Handle Yes/No button clicks with improved handling
  cards.forEach((card, index) => {
    const yesButton = card.querySelector('.question-button.yes');
    const noButton = card.querySelector('.question-button.no');
    
    if (yesButton) {
      yesButton.addEventListener('click', () => {
        console.log(`Yes button clicked for card ${index}`);
        // Save the response for this specific question
        handleQuestionResponse(index, 'Yes');
        
        // Wait for card transformation, then move to next question if available
        setTimeout(() => {
          if (currentIndex < cards.length - 1) {
            goToCard(currentIndex + 1);
          }
        }, 500);
      });
    }
    
    if (noButton) {
      noButton.addEventListener('click', () => {
        console.log(`No button clicked for card ${index}`);
        // Save the response for this specific question
        handleQuestionResponse(index, 'No');
        
        // Wait for card transformation, then move to next question if available
        setTimeout(() => {
          if (currentIndex < cards.length - 1) {
            goToCard(currentIndex + 1);
          }
        }, 500);
      });
    }
  });
  
  // Handle Type button clicks
  const typeButtons = document.querySelectorAll('.question-type-button');
  typeButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
      const card = cards[index];
      const questionContent = card.querySelector('.question-content');
      const questionText = questionContent ? questionContent.textContent : `Question ${index + 1}`;
      openTypeModal(questionText, index);
    });
  });
  
  // Handle the type modal submission
  const submitTypeModal = document.getElementById('submitTypeModal');
  if (submitTypeModal) {
    submitTypeModal.addEventListener('click', () => {
      const input = document.getElementById('typeModalInput');
      const modal = document.getElementById('typeModal');
      
      if (input && input.value.trim()) {
        // Get current index based on visible card
        let currentIndex = 0;
        cards.forEach((card, idx) => {
          const cardRect = card.getBoundingClientRect();
          const carouselRect = carousel.getBoundingClientRect();
          if (Math.abs(cardRect.left - carouselRect.left) < 50) {
            currentIndex = idx;
          }
        });
        
        // Handle the response
        handleQuestionResponse(currentIndex, input.value.trim());
        
        // Close the modal
        if (modal) modal.classList.add('hidden');
        
        // Move to next question if available
        setTimeout(() => {
          if (currentIndex < cards.length - 1) {
            goToCard(currentIndex + 1);
          }
        }, 500);
      } else {
        alert('Please enter a response before submitting.');
      }
    });
  }
}

// Function to open the type modal
function openTypeModal(questionText, questionIndex) {
  const modal = document.getElementById('typeModal');
  const questionElement = document.getElementById('typeModalQuestion');
  const input = document.getElementById('typeModalInput');
  const submitButton = document.getElementById('submitTypeModal');
  const closeButton = document.getElementById('closeTypeModal');
  
  if (!modal || !questionElement || !input || !submitButton || !closeButton) return;
  
  // Set the question text
  questionElement.textContent = questionText;
  
  // Clear any previous input
  input.value = '';
  
  // Show the modal
  modal.classList.remove('hidden');
  
  // Focus the input
  setTimeout(() => input.focus(), 100);
  
  // Handle submit
  // Handle submit
const handleSubmit = () => {
  if (input.value.trim()) {
    // Transform the card using our new function
    handleQuestionResponse(questionIndex, input.value.trim());
    
    // Close the modal
    modal.classList.add('hidden');
  } else {
    alert('Please enter a response before submitting.');
  }
};

  // Remove any existing event listeners
  submitButton.replaceWith(submitButton.cloneNode(true));
  closeButton.replaceWith(closeButton.cloneNode(true));
  
  // Add new event listeners
  document.getElementById('submitTypeModal').addEventListener('click', handleSubmit);
  
  document.getElementById('closeTypeModal').addEventListener('click', () => {
    modal.classList.add('hidden');
  });
  
  // Handle Enter key
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  });
}

// Function to save a response (would connect to backend/API)
function saveResponse(questionIndex, response) {
  console.log(`Question ${questionIndex + 1} response:`, response);
  
  // In a real app, you would send this to your backend
  // For now, we'll just store in sessionStorage as an example
  const responses = JSON.parse(sessionStorage.getItem('healthLogResponses') || '[]');
  
  responses[questionIndex] = {
    questionIndex: questionIndex,
    response: response,
    timestamp: new Date().toISOString()
  };
  
  sessionStorage.setItem('healthLogResponses', JSON.stringify(responses));
}

// Function to save question texts for later reference
function saveQuestionTexts() {
  const questionCards = document.querySelectorAll('.question-card');
  const questionTexts = [];
  
  questionCards.forEach(card => {
    const questionContent = card.querySelector('.question-content');
    if (questionContent) {
      questionTexts.push(questionContent.textContent);
      // Also save to the card's data attribute
      card.dataset.questionText = questionContent.textContent;
    } else {
      questionTexts.push('');
    }
  });
  
  // Save to sessionStorage
  sessionStorage.setItem('questionTexts', JSON.stringify(questionTexts));
  console.log("Saved question texts:", questionTexts);
}

// Function to handle question card submission and transformation
function handleQuestionResponse(questionIndex, response) {
  console.log(`Question ${questionIndex + 1} response:`, response);
  
  // Save the response (to sessionStorage or your API)
  saveResponse(questionIndex, response);
  
  // Get the current card
  const carousel = document.querySelector('.question-card-carousel');
  const cards = document.querySelectorAll('.question-card');
  
  if (!carousel || !cards || !cards[questionIndex]) {
    console.error("Card elements not found");
    return;
  }
  
  // Get the current card
  const currentCard = cards[questionIndex];
  
  // Change the card background color to a gradient
  currentCard.style.background = "linear-gradient(180deg, #B579D0 0%, #AE7CD1 24%, #5A93D9 53%)";
  currentCard.classList.add('thanked'); // Add a class to mark it as thanked
  
  // Save original content to data attribute (to restore later if needed)
  currentCard.setAttribute('data-original-content', currentCard.innerHTML);
  
  // Clear current card content
  currentCard.innerHTML = '';
  
  // Create new content for the "thank you" message
  const thankYouHTML = `
    <div class="question-close">
      <img src="./imgs/white-x-button.png" alt="Close" width="20" height="20">
    </div>
    <div class="question-number" style="color: white;">${String(questionIndex + 1).padStart(2, '0')}</div>
    <div class="question-underline" style="background: white;"></div>
    <div class="thank-you-message" style="text-align: center; color: white; font-size: 30px; font-family: 'Urbanist', sans-serif; font-weight: 700; line-height: 37.50px; letter-spacing: 0.60px; margin: 15px 0; padding: 0 20px;">
      Got it! Thanks for following up.
      <br/><br/>
      You can edit or view your response below.
    </div>
  `;
  
  // Set the card's content to the thank you message
  currentCard.innerHTML = thankYouHTML;
  
  // Make sure the additional details section is visible before creating details in it
  console.log("Creating additional details section");
  // Create additional details section if it doesn't exist
  createAdditionalDetailsSection(questionIndex, response);
  
  // Set up the close button event listener
  const closeButton = currentCard.querySelector('.question-close');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      // Currently does nothing, you could add functionality here
      console.log("Close button clicked on thank you card");
    });
  }
}
// Function to create the additional details section
function createAdditionalDetailsSection(questionIndex, response) {
  try {
    console.log("Creating additional details section for response:", response);
    
    // First, find the follow-up content area
    const followupContentArea = document.querySelector('.followup-content-area');
    if (!followupContentArea) {
      console.error("Followup content area not found");
      return;
    }
    
    // Check if the additional details section already exists
    let additionalDetailsSection = document.querySelector('.additional-details-section');
    let sectionTitle = document.querySelector('.additional-details-title');
    
    // If either doesn't exist, create them both
    if (!additionalDetailsSection || !sectionTitle) {
      console.log("Creating new additional details section");
      
      // Create the elements
      sectionTitle = document.createElement('div');
      sectionTitle.className = 'additional-details-title';
      sectionTitle.textContent = 'Additional Details';
      // Apply styles directly, without relying on style properties
      sectionTitle.setAttribute('style', 
        'width: 334px; margin-left: 35px; color: black; font-size: 14px; ' +
        'font-family: Urbanist, sans-serif; font-weight: 600; line-height: 17.50px; ' +
        'letter-spacing: 0.28px; margin-top: 15px; margin-bottom: 10px;'
      );
      
      // Create the section container
      additionalDetailsSection = document.createElement('div');
      additionalDetailsSection.className = 'additional-details-section';
      
      // Simply append them to the follow-up content area directly
      followupContentArea.appendChild(sectionTitle);
      followupContentArea.appendChild(additionalDetailsSection);
      
      console.log("Added section title and container to content area");
    }
    
    // Now create the detail card
    try {
      if (!additionalDetailsSection) {
        console.error("Additional details section still not found");
        return;
      }
      
      // Get the question text from stored values
      const questionTexts = JSON.parse(sessionStorage.getItem('questionTexts') || '[]');
      const questionText = questionIndex < questionTexts.length 
        ? questionTexts[questionIndex] 
        : `Question ${questionIndex + 1}`;
      
      console.log("Creating detail card for question:", questionText);
      
      // Create the card element using document fragment for better performance
      const fragment = document.createDocumentFragment();
      const detailCard = document.createElement('div');
      detailCard.className = 'detail-card';
      
      // Apply styles directly
      detailCard.setAttribute('style', 
        'width: 312px; height: 65px; margin-left: 44px; margin-top: 10px; ' +
        'margin-bottom: 10px; background: rgba(255, 255, 255, 0.50); ' +
        'box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25); border-radius: 12px; ' +
        'position: relative;'
      );
      
      // Create each element separately to avoid innerHTML issues
      const img = document.createElement('img');
      img.src = './imgs/new-log-icon.png';
      img.alt = 'Log Icon';
      img.setAttribute('style', 'width: 56px; height: 56px; position: absolute; left: -17px; top: 0;');
      
      const editButton = document.createElement('div');
      editButton.className = 'detail-edit-button';
      editButton.textContent = 'Edit';
      editButton.setAttribute('style', 
        'position: absolute; width: 36px; height: 13px; left: 38px; top: 21px; ' +
        'text-align: center; color: white; font-size: 8px; font-family: Urbanist, sans-serif; ' +
        'font-weight: 700; line-height: 10px; letter-spacing: 0.16px;'
      );
      
      const questionDiv = document.createElement('div');
      questionDiv.className = 'detail-question';
      questionDiv.textContent = questionText;
      questionDiv.setAttribute('style', 
        'width: 214px; position: absolute; left: 45px; top: 6px; color: black; ' +
        'font-size: 12px; font-family: Urbanist, sans-serif; font-weight: 600; ' +
        'line-height: 15px; letter-spacing: 0.24px;'
      );
      
      const responseDiv = document.createElement('div');
      responseDiv.className = 'detail-response';
      responseDiv.textContent = response.length <= 40 ? response : response.substring(0, 40) + '...';
      responseDiv.setAttribute('style', 
        'width: 246px; position: absolute; left: 44px; top: 35px; color: black; ' +
        'font-size: 12px; font-family: Urbanist, sans-serif; font-weight: 400; ' +
        'line-height: 15px; letter-spacing: 0.24px;'
      );
      
      const editLink = document.createElement('div');
      editLink.className = 'detail-edit-link';
      editLink.textContent = 'Edit';
      editLink.setAttribute('style', 
        'position: absolute; top: 6px; right: 9px; color: #1DA1FA; ' +
        'font-size: 10px; font-family: Urbanist, sans-serif; font-weight: 700; ' +
        'line-height: 12.50px; letter-spacing: 0.20px;'
      );
      
      // Append all elements to card
      detailCard.appendChild(img);
      detailCard.appendChild(editButton);
      detailCard.appendChild(questionDiv);
      detailCard.appendChild(responseDiv);
      detailCard.appendChild(editLink);
      
      // Append card to fragment, then to container
      fragment.appendChild(detailCard);
      additionalDetailsSection.appendChild(fragment);
      
      console.log("Detail card added successfully");
      
      // Set up edit functionality
      editButton.addEventListener('click', function(event) {
        event.stopPropagation();
        console.log("Edit button clicked for response:", response);
        createEditModal(questionIndex, questionText, response, responseDiv);
      });
      
      editLink.addEventListener('click', function(event) {
        event.stopPropagation();
        console.log("Edit link clicked for response:", response);
        createEditModal(questionIndex, questionText, response, responseDiv);
      });
      
    } catch (cardError) {
      console.error("Error creating detail card:", cardError);
    }
    
  } catch (error) {
    console.error("Error in createAdditionalDetailsSection:", error);
  }
}

// Function to create an additional detail card for a response
function createAdditionalDetailCard(questionIndex, response, container) {
  if (!container) {
    console.error("Additional details container not found");
    return;
  }
  
  // Get the question text
  const questionCards = document.querySelectorAll('.question-card');
  console.log("==== createAdditionalDetailCard CALLED ====");
  console.log("questionIndex:", questionIndex);
  console.log("response:", response);
  console.log("container exists:", !!container);

  if (!questionCards || !questionCards[questionIndex]) {
    console.error("Question card not found");
    return;
  }
  
  // Get the question content (original question before transformation)
  const questionContent = questionCards[questionIndex].querySelector('.question-content');
  const questionText = questionContent ? questionContent.textContent : `Question ${questionIndex + 1}`;
  
  // Create the card element
  const detailCard = document.createElement('div');
  detailCard.className = 'detail-card';
  detailCard.style.width = '312px';
  detailCard.style.height = '56px';
  detailCard.style.marginLeft = '44px';
  detailCard.style.marginTop = '10px';
  detailCard.style.marginBottom = '10px';
  detailCard.style.background = 'rgba(255, 255, 255, 0.50)';
  detailCard.style.boxShadow = '0px 4px 4px rgba(0, 0, 0, 0.25)';
  detailCard.style.borderRadius = '12px';
  detailCard.style.position = 'relative';
  
  // Create the card content
  detailCard.innerHTML = `
    <img src="./imgs/new-log-icon.png" alt="Log Icon" style="width: 56px; height: 56px; position: absolute; left: -17px; top: 0;">
    <div class="detail-edit-button" style="position: absolute; width: 36px; height: 13px; left: 38px; top: 21px; text-align: center; color: white; font-size: 8px; font-family: Urbanist, sans-serif; font-weight: 700; line-height: 10px; letter-spacing: 0.16px;">Edit</div>
    <div class="detail-question" style="width: 214px; position: absolute; left: 45px; top: 6px; color: black; font-size: 12px; font-family: Urbanist, sans-serif; font-weight: 600; line-height: 15px; letter-spacing: 0.24px;">${questionText}</div>
    <div class="detail-response" style="width: 246px; position: absolute; left: 44px; top: 25px; color: black; font-size: 12px; font-family: Urbanist, sans-serif; font-weight: 400; line-height: 15px; letter-spacing: 0.24px;">${truncateText(response, 40)}</div>
    <div class="detail-edit-link" style="position: absolute; top: 6px; right: 9px; color: #1DA1FA; font-size: 10px; font-family: Urbanist, sans-serif; font-weight: 700; line-height: 12.50px; letter-spacing: 0.20px;">Edit</div>
  `;
  
  // Add the card to the container
  container.appendChild(detailCard);
  
  // Set up edit functionality in createAdditionalDetailCard
  const editButtons = detailCard.querySelectorAll('.detail-edit-button, .detail-edit-link');
  editButtons.forEach(button => {
    button.addEventListener('click', function(event) {
      event.stopPropagation(); // Prevent event from bubbling up
      console.log("Edit button EVENT triggered", event.type);
      console.log("Edit button clicked by user for response:", response);
      console.log("Edit button element:", this);
      console.log("Button parent chain:", this.parentNode);
      
      // Create a modal inline - no separate function call
      const modal = document.createElement('div');
      modal.style.position = 'fixed';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.width = '100%';
      modal.style.height = '100%';
      modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      modal.style.display = 'flex';
      modal.style.justifyContent = 'center';
      modal.style.alignItems = 'center';
      modal.style.zIndex = '9999';
      
      // Create modal content
      const modalContent = document.createElement('div');
      modalContent.style.backgroundColor = 'white';
      modalContent.style.borderRadius = '10px';
      modalContent.style.padding = '20px';
      modalContent.style.width = '80%';
      modalContent.style.maxWidth = '350px';
      
      // Add heading
      const heading = document.createElement('h3');
      heading.textContent = questionText;
      modalContent.appendChild(heading);
      
      // Add textarea
      const textarea = document.createElement('textarea');
      textarea.value = response;
      textarea.style.width = '100%';
      textarea.style.height = '150px';
      textarea.style.marginTop = '10px';
      textarea.style.padding = '8px';
      textarea.style.boxSizing = 'border-box';
      modalContent.appendChild(textarea);
      
      // Add buttons
      const buttonContainer = document.createElement('div');
      buttonContainer.style.marginTop = '15px';
      buttonContainer.style.display = 'flex';
      buttonContainer.style.justifyContent = 'space-between';
      
      const saveButton = document.createElement('button');
      saveButton.textContent = 'Save';
      saveButton.style.backgroundColor = '#B478CF';
      saveButton.style.color = 'white';
      saveButton.style.border = 'none';
      saveButton.style.padding = '8px 16px';
      saveButton.style.borderRadius = '5px';
      saveButton.style.cursor = 'pointer';
      
      const cancelButton = document.createElement('button');
      cancelButton.textContent = 'Cancel';
      cancelButton.style.backgroundColor = '#f0f0f0';
      cancelButton.style.border = 'none';
      cancelButton.style.padding = '8px 16px';
      cancelButton.style.borderRadius = '5px';
      cancelButton.style.cursor = 'pointer';
      
      buttonContainer.appendChild(cancelButton);
      buttonContainer.appendChild(saveButton);
      modalContent.appendChild(buttonContainer);
      
      // Add content to modal
      modal.appendChild(modalContent);
      
      // Add modal to body
      document.body.appendChild(modal);
      
      // Add event listeners
      cancelButton.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
      
      saveButton.addEventListener('click', () => {
        const newResponse = textarea.value.trim();
        if (newResponse) {
          // Update response in sessionStorage
          const responses = JSON.parse(sessionStorage.getItem('healthLogResponses') || '[]');
          responses[questionIndex] = {
            questionIndex: questionIndex,
            response: newResponse,
            timestamp: new Date().toISOString()
          };
          sessionStorage.setItem('healthLogResponses', JSON.stringify(responses));
          
          // Update UI
          const responseElement = detailCard.querySelector('.detail-response');
          if (responseElement) {
            responseElement.textContent = newResponse.length <= 40 ? 
              newResponse : newResponse.substring(0, 40) + '...';
          }
          
          // Remove modal
          document.body.removeChild(modal);
        } else {
          alert('Please enter a response');
        }
      });
    });
  });
}
function openEditModal(questionIndex, questionText, currentResponse) {
  console.log("Opening edit modal for:", questionText, "with response:", currentResponse);
  
  // Create modal container (create a new one each time)
  const modal = document.createElement('div');
  modal.id = 'editResponseModal';
  modal.className = 'edit-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  modal.style.zIndex = '9999';
  
  // Set modal content
  modal.innerHTML = `
    <div style="width: 90%; max-width: 350px; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);">
      <div style="padding: 15px; background: #f0f0f0; position: relative;">
        <div style="color: black; font-size: 16px; font-family: 'Urbanist', sans-serif; font-weight: 600; text-align: center;">${questionText}</div>
        <button id="closeEditModalBtn" style="position: absolute; top: 10px; right: 10px; background: none; border: none; cursor: pointer; padding: 5px;">✕</button>
      </div>
      <div style="padding: 15px;">
        <textarea id="editResponseInput" style="width: 100%; height: 150px; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-family: 'Urbanist', sans-serif; font-size: 14px; resize: none;" placeholder="Type your response here...">${currentResponse}</textarea>
      </div>
      <div style="padding: 15px; display: flex; justify-content: center;">
        <button id="saveEditBtn" style="background: #B478CF; color: white; border: none; border-radius: 20px; padding: 10px 30px; font-family: 'Urbanist', sans-serif; font-weight: 700; font-size: 16px; cursor: pointer;">Save Changes</button>
      </div>
    </div>
  `;
  
  // Append to body
  document.body.appendChild(modal);
  
  // Add event listener for close button
  document.getElementById('closeEditModalBtn').addEventListener('click', () => {
    console.log("Closing modal");
    document.body.removeChild(modal);
  });
  
  // Add event listener for save button
  document.getElementById('saveEditBtn').addEventListener('click', () => {
    console.log("Save button clicked");
    const newResponse = document.getElementById('editResponseInput').value.trim();
    
    if (newResponse) {
      updateResponse(questionIndex, newResponse);
      document.body.removeChild(modal);
    } else {
      alert('Please enter a response.');
    }
  });
  
  console.log("Modal should now be visible");
}

// Function to update a response
function updateResponse(questionIndex, newResponse) {
  // Save to sessionStorage
  const responses = JSON.parse(sessionStorage.getItem('healthLogResponses') || '[]');
  
  responses[questionIndex] = {
    questionIndex: questionIndex,
    response: newResponse,
    timestamp: new Date().toISOString()
  };
  
  sessionStorage.setItem('healthLogResponses', JSON.stringify(responses));
  
  // Update the UI
  const detailCards = document.querySelectorAll('.detail-card');
  if (detailCards[questionIndex]) {
    const responseElement = detailCards[questionIndex].querySelector('.detail-response');
    if (responseElement) {
      responseElement.textContent = truncateText(newResponse, 40);
    }
  }
  
  console.log(`Updated response for question ${questionIndex + 1} to: ${newResponse}`);
}


// Helper function to truncate text with ellipsis
function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// CSS Styles for the detail card
function addDetailCardStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .additional-details-title {
      margin-top: 15px;
      margin-bottom: 10px;
    }
    
    .detail-card:hover {
      cursor: pointer;
      box-shadow: 0px 6px 6px rgba(0, 0, 0, 0.3);
    }
    
    .detail-edit-button:hover, .detail-edit-link:hover {
      text-decoration: underline;
      cursor: pointer;
    }
    
    .thank-you-message {
      animation: fadeIn 0.5s ease-in;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;
  document.head.appendChild(styleElement);
}

function fixCarouselStyles() {
  console.log("Adding carousel styles");
  const styleElement = document.createElement('style');
  styleElement.textContent = `
      .question-card-carousel {
          display: flex;
          transition: transform 0.3s ease-in-out;
          width: fit-content;
      }
  `;
  document.head.appendChild(styleElement);
}
// Function to ensure navigation buttons are visible and working
function fixCarouselNavigation() {
  // Check if container exists
  const container = document.querySelector('.question-cards-container');
  if (!container) {
    console.error("Question cards container not found");
    return;
  }
  
  // Check if nav buttons exist
  let navButtons = document.querySelector('.question-nav-buttons');
  
  // If they don't exist, create them
  if (!navButtons) {
    console.log("Creating navigation buttons");
    navButtons = document.createElement('div');
    navButtons.className = 'question-nav-buttons';
    navButtons.innerHTML = `
      <div class="question-nav-button prev">&#10094;</div>
      <div class="question-nav-button next">&#10095;</div>
    `;
    container.appendChild(navButtons);
  } else {
    console.log("Navigation buttons already exist");
  }
  
  // Make sure they're visible and properly styled with improved styling
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .question-nav-buttons {
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      width: 100%;
      display: flex;
      justify-content: space-between;
      padding: 0 10px;
      box-sizing: border-box;
      transform: translateY(-50%);
      z-index: 1000;
      pointer-events: none;
    }
    
    .question-nav-button {
      width: 40px;
      height: 40px;
      background: rgba(180, 120, 207, 0.8);
      color: white;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer !important;
      pointer-events: auto !important;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      font-weight: bold;
      user-select: none;
      font-size: 20px;
    }
    
    .question-nav-button:hover {
      background: rgba(180, 120, 207, 1);
    }
    
    /* Ensure both buttons are visible by default */
    .question-nav-button.prev,
    .question-nav-button.next {
      opacity: 1;
      display: flex !important;
    }
    
    /* Use visibility instead of display for smoother transitions */
    .question-nav-button.prev[style*="visibility: hidden"],
    .question-nav-button.next[style*="visibility: hidden"] {
      opacity: 0.3;
      pointer-events: none;
    }
  `;
  document.head.appendChild(styleElement);
  
  // Log information about the buttons
  const prevButton = document.querySelector('.question-nav-button.prev');
  const nextButton = document.querySelector('.question-nav-button.next');
  
  console.log("Navigation buttons found:", 
              "prev=", !!prevButton, 
              "next=", !!nextButton);
  
  // Make sure first card shows both buttons, just disable prev
  updateNavButtons(0, document.querySelectorAll('.question-card').length);
  
  // Add direct event listeners here to make sure they work
  if (prevButton) {
    prevButton.addEventListener('click', () => {
      console.log("Previous button clicked directly");
      // Find current index and go to previous card
      const carousel = document.querySelector('.question-card-carousel');
      const cards = document.querySelectorAll('.question-card');
      if (carousel && cards.length > 0) {
        // Try to determine current index from transform
        const transform = carousel.style.transform || '';
        const match = transform.match(/translateX\(-(\d+)px\)/);
        let currentIndex = 0;
        
        if (match && match[1]) {
          const cardWidth = cards[0].getBoundingClientRect().width;
          const cardMargin = 20;
          currentIndex = Math.round(parseInt(match[1], 10) / (cardWidth + cardMargin));
        }
        
        if (currentIndex > 0) {
          // Go to previous card - get card width directly
          const cardWidth = cards[0].getBoundingClientRect().width;
          const cardMargin = 20;
          const newPosition = (currentIndex - 1) * (cardWidth + cardMargin);
          carousel.style.transform = `translateX(-${newPosition}px)`;
          updateNavButtons(currentIndex - 1, cards.length);
        }
      }
    });
  }
  
  if (nextButton) {
    nextButton.addEventListener('click', () => {
      console.log("Next button clicked directly");
      // Find current index and go to next card
      const carousel = document.querySelector('.question-card-carousel');
      const cards = document.querySelectorAll('.question-card');
      if (carousel && cards.length > 0) {
        // Try to determine current index from transform
        const transform = carousel.style.transform || '';
        const match = transform.match(/translateX\(-(\d+)px\)/);
        let currentIndex = 0;
        
        if (match && match[1]) {
          const cardWidth = cards[0].getBoundingClientRect().width;
          const cardMargin = 20;
          currentIndex = Math.round(parseInt(match[1], 10) / (cardWidth + cardMargin));
        }
        
        if (currentIndex < cards.length - 1) {
          // Go to next card - get card width directly
          const cardWidth = cards[0].getBoundingClientRect().width;
          const cardMargin = 20;
          const newPosition = (currentIndex + 1) * (cardWidth + cardMargin);
          carousel.style.transform = `translateX(-${newPosition}px)`;
          updateNavButtons(currentIndex + 1, cards.length);
        }
      }
    });
  }
}

// Update this to be a separate function that takes parameters
function updateNavButtons(currentIndex, totalCards) {
  const prevButton = document.querySelector('.question-nav-button.prev');
  const nextButton = document.querySelector('.question-nav-button.next');
  
  if (prevButton) {
    prevButton.style.visibility = currentIndex > 0 ? 'visible' : 'hidden';
  }
  
  if (nextButton) {
    nextButton.style.visibility = currentIndex < totalCards - 1 ? 'visible' : 'hidden';
  }
  
  console.log(`Updated nav buttons. Current index: ${currentIndex}, Total cards: ${totalCards}`);
}

/// Modify the error handling in fixSubmitButtonTransition
function fixSubmitButtonTransition() {
  const healthLogPage = document.getElementById("newHealthLogPage");
  if (!healthLogPage) {
    console.error("Health log page not found");
    return;
  }
  
  const submitButton = healthLogPage.querySelector(".submit-button");
  if (!submitButton) {
    console.error("Submit button not found on health log page");
    return;
  }
  
  const newButton = submitButton.cloneNode(true);
  submitButton.parentNode.replaceChild(newButton, submitButton);
  
  newButton.addEventListener("click", async function(event) {
    console.log("Submit button clicked on health log page");
    
    const symptomInput = document.getElementById("symptomInput");
    
    if (!symptomInput || !symptomInput.value.trim()) {
      alert("Please enter your symptoms before submitting.");
      return;
    }
    
    const logText = symptomInput.value.trim();
    console.log("Valid symptom input, proceeding to follow-up page");
    
    try {
      let savedLog;
      try {
        // Attempt to save the log
        savedLog = await callAPI('', 'POST', {
          text: logText,
          date: new Date().toISOString()
        });
        console.log("Log saved to backend:", savedLog);
      } catch (saveError) {
        console.warn("Failed to save log to backend, continuing with local save", saveError);
      }
      
      // Save locally for immediate display
      sessionStorage.setItem("lastHealthLog", logText);
      saveNewHealthLog(logText);
      
      // Generate follow-up questions
      const questions = await testFollowUpQuestions(logText);
      
      // Store the questions
      sessionStorage.setItem("currentQuestions", JSON.stringify(questions));
      
      // Initialize follow-up page
      console.log("Initializing follow-up page");
      initializeHealthLogFollowupPage();
      
      // Transition to follow-up page
      console.log("Transitioning to follow-up page");
      transitionPages("newHealthLogPage", "newHealthLogPage32");
    } catch (error) {
      console.error("Error processing health log:", error);
      
      // Fallback mechanism
      sessionStorage.setItem("lastHealthLog", logText);
      saveNewHealthLog(logText);
      
      // Generate default follow-up questions
      const defaultQuestions = [
        {
          id: 1,
          number: "01",
          question: "How long have you been experiencing these symptoms?"
        },
        {
          id: 2,
          number: "02",
          question: "Have you tried any medications for relief?"
        },
        {
          id: 3,
          number: "03",
          question: "Any changes in your daily routine?"
        }
      ];
      
      sessionStorage.setItem("currentQuestions", JSON.stringify(defaultQuestions));
      
      // Initialize follow-up page with default questions
      initializeHealthLogFollowupPage();
      
      // Transition to follow-up page
      transitionPages("newHealthLogPage", "newHealthLogPage32");
    }
  });
}


// Add this code after your fixSubmitButtonTransition function to check if the page exists
function debugPageElements() {
  console.log("Page 3.0 exists:", !!document.getElementById("newHealthLogPage"));
  console.log("Page 3.2 exists:", !!document.getElementById("newHealthLogPage32"));
  
  // List all pages with IDs for reference
  const allPages = document.querySelectorAll('[id$="Page"]');
  console.log("All page IDs:");
  allPages.forEach(page => console.log(page.id));
}

// New function to create an edit modal
function createEditModal(questionIndex, questionText, currentResponse, responseElement) {
  // Create a modal for editing
  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  modal.style.zIndex = '100000'; // Very high z-index
  
  // Create modal content with the purple gradient background
  const modalContent = document.createElement('div');
  modalContent.style.backgroundColor = 'white';
  modalContent.style.borderRadius = '15px';
  modalContent.style.overflow = 'hidden'; // Keep the rounded corners
  modalContent.style.width = '90%';
  modalContent.style.maxWidth = '350px';
  modalContent.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.3)';
  
  // Add heading with gradient background
  const headerContainer = document.createElement('div');
  headerContainer.style.background = 'linear-gradient(180deg, #B579D0 0%, #AE7CD1 24%, #5A93D9 53%)';
  headerContainer.style.padding = '20px';
  headerContainer.style.position = 'relative';
  headerContainer.style.color = 'white';
  
  const heading = document.createElement('h3');
  heading.textContent = questionText;
  heading.style.margin = '0';
  heading.style.textAlign = 'center';
  heading.style.fontFamily = 'Urbanist, sans-serif';
  heading.style.fontSize = '20px';
  heading.style.fontWeight = '600';
  heading.style.color = 'white';
  headerContainer.appendChild(heading);
  
  // Add close button to header
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '&times;'; // × symbol
  closeButton.style.position = 'absolute';
  closeButton.style.top = '10px';
  closeButton.style.right = '10px';
  closeButton.style.background = 'none';
  closeButton.style.border = 'none';
  closeButton.style.color = 'white';
  closeButton.style.fontSize = '24px';
  closeButton.style.cursor = 'pointer';
  headerContainer.appendChild(closeButton);
  
  modalContent.appendChild(headerContainer);
  
  // Add body content
  const bodyContainer = document.createElement('div');
  bodyContainer.style.padding = '20px';
  
  // If this is a Yes/No question, provide radio buttons
  if (currentResponse === 'Yes' || currentResponse === 'No' || questionText.toLowerCase().includes('nausea')) {
    const radioContainer = document.createElement('div');
    radioContainer.style.display = 'flex';
    radioContainer.style.gap = '20px';
    radioContainer.style.marginBottom = '15px';
    
    // Yes option
    const yesLabel = document.createElement('label');
    yesLabel.style.display = 'flex';
    yesLabel.style.alignItems = 'center';
    yesLabel.style.cursor = 'pointer';
    
    const yesRadio = document.createElement('input');
    yesRadio.type = 'radio';
    yesRadio.name = 'response';
    yesRadio.value = 'Yes';
    yesRadio.checked = currentResponse === 'Yes';
    yesRadio.style.marginRight = '5px';
    
    yesLabel.appendChild(yesRadio);
    yesLabel.appendChild(document.createTextNode('Yes'));
    
    // No option
    const noLabel = document.createElement('label');
    noLabel.style.display = 'flex';
    noLabel.style.alignItems = 'center';
    noLabel.style.cursor = 'pointer';
    
    const noRadio = document.createElement('input');
    noRadio.type = 'radio';
    noRadio.name = 'response';
    noRadio.value = 'No';
    noRadio.checked = currentResponse === 'No';
    noRadio.style.marginRight = '5px';
    
    noLabel.appendChild(noRadio);
    noLabel.appendChild(document.createTextNode('No'));
    
    radioContainer.appendChild(yesLabel);
    radioContainer.appendChild(noLabel);
    
    bodyContainer.appendChild(radioContainer);
  }
  
  // Add textarea for all questions (for additional details on Yes/No questions)
  const textarea = document.createElement('textarea');
  textarea.value = currentResponse !== 'Yes' && currentResponse !== 'No' ? 
                   currentResponse : '';
  textarea.placeholder = 'Type your response here...';
  textarea.style.width = '100%';
  textarea.style.height = '150px';
  textarea.style.padding = '10px';
  textarea.style.boxSizing = 'border-box';
  textarea.style.border = '1px solid #ddd';
  textarea.style.borderRadius = '8px';
  textarea.style.fontFamily = 'Urbanist, sans-serif';
  textarea.style.fontSize = '16px';
  textarea.style.resize = 'none';
  bodyContainer.appendChild(textarea);
  
  modalContent.appendChild(bodyContainer);
  
  // Add footer with save button
  const footerContainer = document.createElement('div');
  footerContainer.style.padding = '0 20px 20px 20px';
  footerContainer.style.display = 'flex';
  footerContainer.style.justifyContent = 'center';
  
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save Changes';
  saveButton.style.backgroundColor = '#B478CF';
  saveButton.style.color = 'white';
  saveButton.style.border = 'none';
  saveButton.style.borderRadius = '20px';
  saveButton.style.padding = '10px 30px';
  saveButton.style.fontFamily = 'Urbanist, sans-serif';
  saveButton.style.fontSize = '16px';
  saveButton.style.fontWeight = '700';
  saveButton.style.cursor = 'pointer';
  
  footerContainer.appendChild(saveButton);
  modalContent.appendChild(footerContainer);
  
  // Add modal to document
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  console.log("Modal added to document body");
  
  // Add event listeners
  closeButton.addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  saveButton.addEventListener('click', () => {
    let newResponse;
    
    // Get the response based on input type
    const radioButtons = modal.querySelectorAll('input[type="radio"]');
    if (radioButtons.length > 0) {
      // Yes/No question
      const selectedRadio = modal.querySelector('input[name="response"]:checked');
      if (selectedRadio) {
        newResponse = selectedRadio.value;
        
        // Add any additional text from textarea
        const additionalText = textarea.value.trim();
        if (additionalText) {
          newResponse = `${newResponse} - ${additionalText}`;
        }
      }
    } else {
      // Free-text question
      newResponse = textarea.value.trim();
    }
    
    // Update the response if not empty
    if (newResponse) {
      // Update response in sessionStorage
      const responses = JSON.parse(sessionStorage.getItem('healthLogResponses') || '[]');
      responses[questionIndex] = {
        questionIndex: questionIndex,
        response: newResponse,
        timestamp: new Date().toISOString()
      };
      sessionStorage.setItem('healthLogResponses', JSON.stringify(responses));
      
      // Update UI
      if (responseElement) {
        responseElement.textContent = newResponse.length <= 40 ? 
          newResponse : newResponse.substring(0, 40) + '...';
      }
      
      // Remove modal
      document.body.removeChild(modal);
      console.log("Modal removed after save");
    } else {
      alert('Please enter a response.');
    }
  });
}

// Menu Component for VitalStory App
function initializeMenu() {
  // Create the menu container
  const menuContainer = document.createElement('div');
  menuContainer.id = 'appMenu';
  menuContainer.className = 'app-menu hidden';
  
  // Create the menu content
  menuContainer.innerHTML = `
    <div class="menu-header">
      <div class="menu-user-info">
        <img id="menuUserAvatar" class="avatar" src="https://placehold.co/134x134" alt="User Avatar">
        <div class="menu-user-details">
          <div id="menuUserName" class="user-name">James</div>
          <div class="user-family">The Quinn Family</div>
        </div>
      </div>
      <div class="menu-close-button">
        <img src="./imgs/black_menu_button.png" alt="Menu">
      </div>
    </div>
    <div class="menu-items">
      <div class="menu-item profile">
        <span class="menu-text">Profile</span>
      </div>
      <div class="menu-item doctors">
        <span class="menu-text">Doctors</span>
      </div>
      <div class="menu-item health-logs">
        <span class="menu-text">Health Logs</span>
      </div>
      <div class="menu-item app-settings">
        <span class="menu-text">App Settings</span>
      </div>
      <div class="menu-item notifications">
        <span class="menu-text">Appointments / Alerts</span>
      </div>
    </div>
    <div class="menu-footer">
      <div class="menu-logo">VitalStory</div>
      <div class="copyright">©</div>
    </div>`;
  
  // Add the menu to the app
  const appWrapper = document.querySelector('.app-wrapper');
  if (appWrapper) {
    appWrapper.appendChild(menuContainer);
  } else {
    console.error("App wrapper not found");
    return;
  }
  
  // Update user info in the menu
  updateMenuUserInfo();
  
  // Set up event listeners for all menu buttons
  setupMenuToggleListeners();
  
  // Set up event listeners for menu items
  setupMenuItemListeners();
  
  console.log("Menu initialized");
}

// Function to update user info in the menu
function updateMenuUserInfo() {
  const menuUserAvatar = document.getElementById('menuUserAvatar');
  const menuUserName = document.getElementById('menuUserName');
  const menuUserFamily = document.querySelector('.user-family');
  
  if (menuUserAvatar && menuUserName) {
    // Get stored user data
    const storedAvatar = sessionStorage.getItem("selectedAvatar") || "https://placehold.co/134x134";
    const storedName = sessionStorage.getItem("userName") || "James Quinn";
    
    // Get first name and family name
    const nameParts = storedName.split(" ");
    const firstName = nameParts[0];
    
    // Update UI
    menuUserAvatar.src = storedAvatar;
    menuUserName.textContent = firstName + ",";
    
    // Update family name if it exists
    if (menuUserFamily && nameParts.length > 1) {
      menuUserFamily.textContent = "The " + nameParts[1] + " Family";
    }
  }
}
// Function to add the menu to the app
function addMenuToApp() {
  console.log("Adding menu to app");
  initializeMenu();
}
// Modified function to add menu button listeners only where needed
function addMenuButtonListeners() {
  // Get the current visible page
  const currentPage = document.querySelector('.page.visible');
  if (!currentPage) {
    console.error("No visible page found");
    return;
  }
  
  // Find menu buttons only on the current page
  const menuButtons = currentPage.querySelectorAll('.menu-button, .menu-button img');
  
  console.log(`Adding menu button listeners on page ${currentPage.id} to ${menuButtons.length} buttons`);
  
  if (menuButtons.length === 0) {
    console.log(`No menu buttons found on page ${currentPage.id}`);
    return; // No menu buttons on this page
  }
  
  // Add click event listeners to menu buttons found on this page
  menuButtons.forEach(button => {
    // Remove existing listeners by cloning
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    // Add new listener
    newButton.addEventListener('click', function(e) {
      e.stopPropagation();
      console.log("Menu button clicked");
      toggleMenu();
    });
  });
}

// Improved setupMenuToggleListeners function
function setupMenuToggleListeners() {
  const menuButtons = document.querySelectorAll('.menu-button, .menu-button img');
  const menuContainer = document.getElementById('appMenu');
  const menuCloseButton = document.querySelector('.menu-close-button');
  
  if (!menuContainer) {
    console.error("Menu container not found");
    initializeMenu(); // Create the menu if it doesn't exist
    return;
  }
  
  // Add click event listeners to all menu buttons
  menuButtons.forEach(button => {
    // Clone to remove any existing listeners
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    newButton.addEventListener('click', function(e) {
      e.stopPropagation(); // Prevent event from bubbling up
      console.log("Menu button clicked");
      toggleMenu();
    });
  });
  
  // Add click event listener to close button
  if (menuCloseButton) {
    const newCloseButton = menuCloseButton.cloneNode(true);
    menuCloseButton.parentNode.replaceChild(newCloseButton, menuCloseButton);
    
    newCloseButton.addEventListener('click', function(e) {
      e.stopPropagation();
      console.log("Menu close button clicked");
      toggleMenu();
    });
  }
}


// Function to toggle menu visibility
function toggleMenu() {
  const menuContainer = document.getElementById('appMenu');
  const currentPage = document.querySelector('.page.visible');
  
  if (!menuContainer) {
    console.error("Menu container not found");
    return;
  }
  
  if (menuContainer.classList.contains('hidden')) {
    // Show menu
    menuContainer.classList.remove('hidden');
    menuContainer.classList.add('visible');
    
    // Add overlay to current page if not already present
    if (currentPage && !currentPage.querySelector('.page-overlay')) {
      const overlay = document.createElement('div');
      overlay.className = 'page-overlay';
      currentPage.appendChild(overlay);
    }
  } else {
    // Hide menu
    menuContainer.classList.remove('visible');
    menuContainer.classList.add('hidden');
    
    // Remove overlay from current page
    if (currentPage) {
      const overlay = currentPage.querySelector('.page-overlay');
      if (overlay) {
        currentPage.removeChild(overlay);
      }
    }
  }
}

// Function to set up event listeners for menu items
function setupMenuItemListeners() {
  const menuItems = document.querySelectorAll('.menu-item');
  
  menuItems.forEach(item => {
    item.addEventListener('click', function() {
      const menuText = this.querySelector('.menu-text').textContent;
      console.log(`Menu item clicked: ${menuText}`);
      
      // Close the menu first
      toggleMenu();
      
      // Handle navigation based on menu item
      switch (menuText) {
        case 'Profile':
          // Navigate to profile page
          // If profile page exists, navigate to it
          break;
        case 'Doctors':
          // Navigate to doctors page
          break;
          case 'Health Logs':
            // Find the active page
            const activePage = document.querySelector('.page.visible');
            if (activePage) {
              // Navigate to health logs page
              const healthLogsPage = document.getElementById('healthHistoryPage');
              if (healthLogsPage) {
                console.log("Transitioning to health history page");
                transitionPages(activePage.id, "healthHistoryPage");
              } else {
                console.error("Health history page not found in DOM");
              }
            }
            break;
        case 'App Settings':
          // Navigate to app settings page
          break;
        case 'Appointements / Alerts':
          // Navigate to notifications settings page
          break;
        default:
          console.log(`No action defined for menu item: ${menuText}`);
      }
    });
  });
}

// Function to update user info on the Health History page
function updateHealthHistoryUserInfo() {
  const userAvatar = document.getElementById("healthHistoryAvatar");
  const userName = document.getElementById("healthHistoryUserName");
  
  if (userAvatar && userName) {
    // Get stored user data
    const storedAvatar = sessionStorage.getItem("selectedAvatar") || "https://placehold.co/40x40";
    const storedName = sessionStorage.getItem("userName") || "James";
    
    // Just show first name with exclamation mark
    userName.textContent = storedName.split(" ")[0] + "!";
    
    // Update avatar
    userAvatar.src = storedAvatar;
  }
}
// Function to update user info on the Prep Visit page
function updatePrepVisitUserInfo() {
  const userAvatar = document.getElementById("prepVisitAvatar");
  const userName = document.getElementById("prepVisitUserName");
  
  if (userAvatar && userName) {
    // Get stored user data
    const storedAvatar = sessionStorage.getItem("selectedAvatar") || "https://placehold.co/40x40";
    const storedName = sessionStorage.getItem("userName") || "James";
    
    // Just show first name with exclamation mark
    userName.textContent = storedName.split(" ")[0] + "!";
    
    // Update avatar
    userAvatar.src = storedAvatar;
  }
  // In the updatePrepVisitUserInfo function
  const userImage = document.getElementById("prepVisitUserImage");
  if (userImage) {
    userImage.src = storedAvatar;
  }
  // Also update the log avatars
  updateLogAvatars();
}

// Update log avatars
function updateLogAvatars() {
  const logAvatars = document.querySelectorAll(".log-avatar");
  const storedAvatar = sessionStorage.getItem("selectedAvatar") || "https://placehold.co/67x67";
  
  logAvatars.forEach(avatar => {
    avatar.src = storedAvatar;
  });
}

// Function to set up event listeners for the Health History page
function setupHealthHistoryEventListeners() {
  // Get all health log cards
  const healthLogCards = document.querySelectorAll(".health-log-card");
  
  // Add click event listeners to all health log cards
  healthLogCards.forEach(card => {
    card.addEventListener("click", function() {
      console.log("Health log card clicked: ", this.querySelector(".log-date").textContent);
      // Would normally navigate to a detail view for this log
      // For now, just log to console
    });
  });
  
  // Add click event listeners to filter buttons
  const filterButtons = document.querySelectorAll(".filter-btn");
  filterButtons.forEach(button => {
    button.addEventListener("click", function() {
      // Remove active class from all buttons
      filterButtons.forEach(btn => btn.classList.remove("active"));
      
      // Add active class to clicked button
      this.classList.add("active");
      
      console.log("Filter selected: ", this.textContent.trim());
      // Would normally filter the logs based on selected timeframe
    });
  });
  
  // Add event listener for search input
  const searchInput = document.querySelector(".search-input");
  if (searchInput) {
    searchInput.addEventListener("input", function() {
      console.log("Searching for: ", this.value);
      // Would normally filter logs based on search term
    });
  }
  
  // Add event listener for footer buttons
  const footerButtons = document.querySelectorAll(".footer-btn");
  footerButtons.forEach(button => {
    if (!button.classList.contains("active")) {
      button.addEventListener("click", function() {
        const buttonText = this.querySelector("span").textContent.trim();
        console.log("Footer button clicked: ", buttonText);
        
        // Navigate to the appropriate page
        if (buttonText === "New Log") {
          transitionPages("healthHistoryPage", "newHealthLogPage");
        } else if (buttonText === "Prep Visit") {
          // Would navigate to Prep Visit page if it exists
          console.log("Would navigate to Prep Visit page");
        }
      });
    }
  });
}
function navigateToHealthHistory() {
  const currentPage = document.querySelector(".page.visible");
  
  if (currentPage && currentPage.id !== "healthHistoryPage") {
    transitionPages(currentPage.id, "healthHistoryPage");
    initializeHealthHistoryPage();
  }
}

// Function to set up event listeners for the Prep Visit page
function setupPrepVisitEventListeners() {
  // Add click event listeners to filter buttons
  const filterButtons = document.querySelectorAll(".visit-filter-buttons .filter-btn");
  filterButtons.forEach(button => {
    button.addEventListener("click", function() {
      // Remove active class from all buttons
      filterButtons.forEach(btn => btn.classList.remove("active"));
      
      // Add active class to clicked button
      this.classList.add("active");
      
      console.log("Filter selected: ", this.textContent.trim());
      // Would normally filter the logs based on selected timeframe
    });
  });

  // Add click event listeners to checkboxes
  const checkboxes = document.querySelectorAll(".log-checkbox");
  checkboxes.forEach(checkbox => {
    // Remove existing listeners by cloning
    const newCheckbox = checkbox.cloneNode(true);
    checkbox.parentNode.replaceChild(newCheckbox, checkbox);
    
    newCheckbox.addEventListener("click", function() {
      const checkboxSvg = this.querySelector(".checkbox");
      
      // Toggle between checked and unchecked
      if (checkboxSvg.classList.contains("checked")) {
        checkboxSvg.classList.remove("checked");
        checkboxSvg.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0.5" y="0.5" width="23" height="23" rx="3.5" stroke="#AEAEB2"/>
          </svg>
        `;
      } else {
        checkboxSvg.classList.add("checked");
        checkboxSvg.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0.5" y="0.5" width="23" height="23" rx="3.5" fill="#12B28C"/>
            <path d="M7 12L10 15L17 8" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
      }
      
      // Log the card that was toggled
      const logDate = this.closest(".health-log-card").querySelector(".log-date").textContent;
      console.log(`Toggled selection for log: ${logDate}`);
    });
  });

  // Add click event listener to prep notes button
  const prepNotesButton = document.querySelector(".prep-notes-button");
  if (prepNotesButton) {
    // Remove existing listeners
    const newButton = prepNotesButton.cloneNode(true);
    prepNotesButton.parentNode.replaceChild(newButton, prepNotesButton);
    
    newButton.addEventListener("click", function() {
      console.log("Prep doctor's notes button clicked");
      
      // Get all selected logs
      const selectedLogs = [];
      document.querySelectorAll(".log-checkbox .checkbox.checked").forEach(checkbox => {
        const card = checkbox.closest(".health-log-card");
        const date = card.querySelector(".log-date").textContent;
        const text = card.querySelector(".log-text").textContent;
        
        selectedLogs.push({
          date: date,
          text: text
        });
      });
      
      // Log selected logs (in a real app, you would process these)
      console.log("Selected logs for doctor's notes:", selectedLogs);
      
      // Example: Show an alert with the selected logs
      if (selectedLogs.length > 0) {
        alert(`Preparing doctor's notes with ${selectedLogs.length} selected logs.`);
      } else {
        alert("Please select at least one health log to prepare doctor's notes.");
      }
    });
  }
}  
  

// Function to fix footer positioning across all pages
function fixAllFooters() {
  console.log("Fixing footer positioning for all pages");
  
  // Apply the fix to newHealthLogPage32
  const newHealthLogPage = document.getElementById('newHealthLogPage32');
  if (newHealthLogPage) {
    // Make sure the page has proper structure
    newHealthLogPage.style.position = 'relative';
    newHealthLogPage.style.height = '100%';
    newHealthLogPage.style.overflow = 'hidden';
    
    // Fix the content area
    const followupContentArea = newHealthLogPage.querySelector('.followup-content-area');
    if (followupContentArea) {
      followupContentArea.style.overflow = 'auto';
      followupContentArea.style.height = 'calc(100% - 120px)'; // Subtract header height
      followupContentArea.style.paddingBottom = '90px'; // Space for footer
    }
    
    // Fix the footer
    const footer = newHealthLogPage.querySelector('.tutorial-footer');
    if (footer) {
      footer.style.position = 'absolute';
      footer.style.bottom = '0';
      footer.style.left = '0';
      footer.style.width = '100%';
      footer.style.zIndex = '999';
    }
  }
  
  // Apply the fix to healthHistoryPage
  const healthHistoryPage = document.getElementById('healthHistoryPage');
  if (healthHistoryPage) {
    // Make sure the page has proper structure
    healthHistoryPage.style.position = 'relative';
    healthHistoryPage.style.height = '100%';
    healthHistoryPage.style.overflow = 'hidden';
    
    // Fix the content area
    const historyContent = healthHistoryPage.querySelector('.health-history-content');
    if (historyContent) {
      historyContent.style.overflow = 'auto';
      historyContent.style.height = 'calc(100% - 114px)'; // Subtract header height
      historyContent.style.paddingBottom = '90px'; // Space for footer
    }
    
    // Fix the footer
    const footer = healthHistoryPage.querySelector('.tutorial-footer');
    if (footer) {
      footer.style.position = 'absolute';
      footer.style.bottom = '0';
      footer.style.left = '0';
      footer.style.width = '100%';
      footer.style.zIndex = '999';
    }
  }
}

// Update the fixAllFooters function to include prepVisitPage
function updateFixAllFooters() {
  const originalFixAllFooters = window.fixAllFooters;
  
  window.fixAllFooters = function() {
    // Call the original function first
    originalFixAllFooters();
    
    // Apply the fix to prepVisitPage
    const prepVisitPage = document.getElementById('prepVisitPage');
    if (prepVisitPage) {
      // Make sure the page has proper structure
      prepVisitPage.style.position = 'relative';
      prepVisitPage.style.height = '100%';
      prepVisitPage.style.overflow = 'hidden';
      
      // Fix the content area
      const visitContent = prepVisitPage.querySelector('.prep-visit-content');
      if (visitContent) {
        visitContent.style.overflow = 'auto';
        visitContent.style.height = 'calc(100% - 114px)'; // Subtract header height
        visitContent.style.paddingBottom = '90px'; // Space for footer
      }
      
      // Fix the footer
      const footer = prepVisitPage.querySelector('.tutorial-footer');
      if (footer) {
        footer.style.position = 'absolute';
        footer.style.bottom = '0';
        footer.style.left = '0';
        footer.style.width = '100%';
        footer.style.zIndex = '999';
      }
    }
  };
}

// Call the function when DOM is loaded
// Call the function when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Fix footer positioning
  fixAllFooters();
  
  // Setting up avatar consistency
  console.log("Setting up avatar consistency");
  
  // Load user data initially
  loadUserData();

  // Set up prep visit transitions
  setupPrepVisitTransition();
  
  // Update fixAllFooters function
  updateFixAllFooters();

  // Add event listener for avatar selection
  document.querySelectorAll(".avatar-item").forEach(item => {
    item.addEventListener("click", function() {
      const imgElement = this.querySelector("img");
      if (imgElement) {
        const imgUrl = imgElement.src;
        selectAvatar(imgUrl);
      }
    });
  });
  
  console.log("Avatar consistency setup complete");
});

// Call footer fix after window resize
window.addEventListener('resize', fixAllFooters);

// Enhance the page transitions function to handle both footer positioning and avatar consistency
// Ensure transitionPages calls displayHealthLogs when going to Health History page
const originalTransitionPages = window.transitionPages;
window.transitionPages = function(fromPageId, toPageId) {
  console.log(`Starting transition from ${fromPageId} to ${toPageId}`);
  
  // Get the pages
  const fromPage = document.getElementById(fromPageId);
  const toPage = document.getElementById(toPageId);
  
  if (!fromPage || !toPage) {
    console.error(`Page transition failed: ${fromPageId} to ${toPageId}`);
    return;
  }
  
  // Perform transition
  fromPage.style.display = "none";
  fromPage.classList.remove("visible");
  fromPage.classList.add("hidden");
  
  toPage.style.display = "block";
  toPage.classList.remove("hidden");
  toPage.classList.add("visible");
  
  // Handle special pages
  if (toPageId === "detailsPage") {
    updateWelcomeName();
    // Fix scrolling on details page
    fixDetailsPageScrolling();
  }
  
  // Delay to ensure page is fully rendered
  setTimeout(function() {
    // Handle page-specific initializations
    if (toPageId === "prepVisitPage") {
      console.log("Initializing Prep Visit page");
      // Make a clean slate for the prep visit page
      refreshPrepVisitLogs();
    } else if (toPageId === "healthHistoryPage") {
      console.log("Refreshing health logs");
      displayHealthLogs();
    } else if (toPageId === "visitRoadmapPage") {
      console.log("Initializing Visit Roadmap page");
      initializeVisitRoadmapPage();
    }
    
    // Common updates for all pages
    fixAllFooters();
    updateAllAvatars();
    updateUserNames();
    
    // Add menu button listeners if needed
    const hasMenuButtons = toPage.querySelectorAll('.menu-button').length > 0;
    if (hasMenuButtons) {
      addMenuButtonListeners();
    }
    
    console.log(`Transition complete from ${fromPageId} to ${toPageId}`);
  }, 200);
};

window.testFallback = async (logText) => {
  console.log("Manually testing fallback mechanism");
  try {
    // Store the original fetch method
    const originalFetch = window.fetch;
    
    // Override fetch to simulate a network error
    window.fetch = () => {
      throw new Error('Simulated network error');
    };

    try {
      const questions = await testFollowUpQuestions(logText || "I'm feeling tired");
      console.log("Fallback questions:", questions);
    } catch (questionsError) {
      console.error("Error generating fallback questions:", questionsError);
    } finally {
      // Always restore the original fetch, even if an error occurs
      window.fetch = originalFetch;
    }
  } catch (error) {
    console.error("Fallback test failed", error);
  }
};
// Improved test logs function
window.addTestLogs = function() {
  const userAvatar = sessionStorage.getItem("selectedAvatar") || "https://placehold.co/67x67";
  const now = new Date();
  
  // Create logs across multiple months for better testing
  const testLogs = [
    {
      date: now.toISOString(),
      text: "Today: Feeling quite tired with a mild headache and some dizziness when standing up quickly.",
      avatar: userAvatar
    },
    {
      date: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      text: "3 days ago: Woke up with slight sore throat and low fever of 99.8°F. Taking fluids and rest.",
      avatar: userAvatar
    },
    {
      date: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last month
      text: "Last month: Annual physical completed. Doctor noted slightly elevated blood pressure at 135/85.",
      avatar: userAvatar
    }
  ];
  
  // Save to storage
  sessionStorage.setItem("healthLogs", JSON.stringify(testLogs));
  console.log(`Added ${testLogs.length} test logs`);
  
  alert("Test logs added! Navigate to Prep Visit page to see them.");
  
  // If on prep visit page already, refresh the display
  const currentPage = document.querySelector('.page.visible');
  if (currentPage && currentPage.id === "prepVisitPage") {
    refreshPrepVisitLogs();
  }
};

// Improved initialization function for the Visit Roadmap page
function initializeVisitRoadmapPage(selectedLogs) {
  console.log("Running improved Visit Roadmap page initialization");
  
  // Update user avatar
  updateRoadmapUserInfo();
  
  // Set up page structure and styles
  setupRoadmapPageStructure();
  
  // Setup navigation buttons with improved handlers
  setupImprovedRoadmapNavigation();
  
  // Process selected logs
  processSelectedLogs(selectedLogs);

  // Add swipe functionality to cards
  addSwipeToRoadmapCards();

  updateQuestionCardIcon();

  // Set up VitalAI panel - add this line
  setupVitalAiPanel();

  // Set up doctor questions screen - add this
  setupDoctorQuestionsScreen();
  
  // Set up question button listeners - add this
  setupQuestionsButtonListeners();
  
  // Fix footer positioning
  fixFooterPositioning();
  
  console.log("Visit Roadmap page initialization complete");
}

// Add this new function to update the question card with the correct styling
function updateQuestionCardIcon() {
  const questionsCard = document.getElementById("questionsCard");
  if (questionsCard) {
    // Apply gradient background to the entire card
    questionsCard.style.background = "linear-gradient(180deg, #B579D0 0%, #AE7CD1 24%, #5A93D9 53%)";
    
    // First, clear ALL existing content
    questionsCard.innerHTML = '';
    
    // Create fresh content with only what we want
    const newContent = document.createElement("div");
    newContent.className = "questions-content";
    newContent.style.display = "flex";
    newContent.style.flexDirection = "column";
    newContent.style.alignItems = "center";
    newContent.style.justifyContent = "center";
    newContent.style.height = "100%";
    newContent.style.padding = "20px";
    
    // Add only the content we want
    newContent.innerHTML = `
      <h2 class="card-title" style="color: white; text-align: center; font-size: 35px; font-weight: 700; margin-bottom: 10px; font-family: 'Urbanist', sans-serif;">Questions</h2>
      <div class="question-underline" style="width: 60px; height: 4px; background: white; margin: 0 auto 20px;"></div>
      
      <p class="question-instruction" style="color: white; text-align: center; font-size: 16px; font-family: 'Urbanist', sans-serif; margin: 20px 0;">
        Tap here to see your prepared questions for your doctor.
      </p>
      
      <!-- Type button without circle background -->
      <div style="text-align: center; margin: 30px auto;">
        <img src="./imgs/type-button.png" alt="Questions" style="width: 75px; height: 75px;">
      </div>
    `;
    
    // Add the new content to the card
    questionsCard.appendChild(newContent);
    
    // Make sure the card has proper styling
    questionsCard.style.borderRadius = "10px";
    questionsCard.style.padding = "20px";
    questionsCard.style.boxShadow = "0px 4px 10px rgba(0, 0, 0, 0.1)";
    
    // This should remove any card-title element that might be elsewhere in the card
    const extraTitles = questionsCard.querySelectorAll('.card-title:not(.questions-content .card-title)');
    extraTitles.forEach(title => title.remove());
    
    // Remove any purple lines that might be from the original card template
    const extraLines = questionsCard.querySelectorAll('div[class*="underline"]:not(.questions-content .question-underline)');
    extraLines.forEach(line => line.remove());
  }
}


// Function to update user info on the roadmap page
function updateRoadmapUserInfo() {
  const userAvatar = document.getElementById("roadmapUserAvatar");
  
  if (userAvatar) {
    // Get stored user data
    const storedAvatar = sessionStorage.getItem("selectedAvatar") || "https://placehold.co/40x40";
    
    // Update avatar
    userAvatar.src = storedAvatar;
  }
}

// Function to setup roadmap navigation buttons
function setupRoadmapNavigation() {
  const navButtons = document.querySelectorAll(".roadmap-nav-btn");
  
  navButtons.forEach(button => {
    button.addEventListener("click", function() {
      // Remove active class from all buttons
      navButtons.forEach(btn => btn.classList.remove("active"));
      
      // Add active class to clicked button
      this.classList.add("active");
      
      // Handle different navigation types
      const target = this.dataset.target;
      handleRoadmapNavigation(target);
    });
  });
}

// Function to handle roadmap navigation based on button clicked
function handleRoadmapNavigation(target) {
  console.log(`Navigation to ${target}`);
  
  // Get the instruction text element
  const instructionText = document.querySelector(".roadmap-instruction");
  
  // Hide/show instruction text based on selected tab
  if (instructionText) {
    if (target === "summary") {
      instructionText.style.display = "block";
    } else {
      instructionText.style.display = "none";
    }
  }
  
  // Handle different targets
  switch(target) {
    case "summary":
      showRoadmapCard("summaryCard");
      break;
    case "vitalai":
      // For now, just show symptoms card
      showRoadmapCard("symptomsCard");
      break;
    case "questions":
      showRoadmapCard("questionsCard");
      break;
    default:
      showRoadmapCard("summaryCard");
  }
}

// Function to show a specific card and hide others
function showRoadmapCard(cardId) {
  // Hide all cards
  const cards = document.querySelectorAll(".roadmap-card");
  cards.forEach(card => card.classList.remove("visible"));
  
  // Show the requested card
  const targetCard = document.getElementById(cardId);
  if (targetCard) {
    targetCard.classList.add("visible");
  }
}

// Function to setup card switching with buttons
function setupCardSwitching() {
  // Array of card IDs in order
  const cardIds = ["summaryCard", "symptomsCard", "timelineCard", "impactCard", "questionsCard"];
  
  // Setup expand buttons to navigate to next card
  const expandButtons = document.querySelectorAll(".card-btn.expand");
  expandButtons.forEach(button => {
    button.addEventListener("click", function() {
      const currentCard = this.closest(".roadmap-card");
      const currentIndex = cardIds.indexOf(currentCard.id);
      
      // Show next card if available, otherwise stay on current
      const nextIndex = currentIndex < cardIds.length - 1 ? currentIndex + 1 : currentIndex;
      showRoadmapCard(cardIds[nextIndex]);
    });
  });
  
  // Questions card onclick handler
  const questionsCard = document.getElementById("questionsCard");
  if (questionsCard) {
    questionsCard.addEventListener("click", function() {
      // Show questions dialog or expand card
      console.log("Questions card clicked");
      
      // For now, just show an alert as example
      alert("This would show detailed questions for your doctor.");
    });
  }
}

// Function to process selected logs through API and update cards
async function processSelectedLogs(selectedLogs) {
  try {
    console.log("Processing logs through API...");
    
    // If no logs provided, try to get from sessionStorage
    if (!selectedLogs || selectedLogs.length === 0) {
      console.log("No logs provided, checking sessionStorage");
      
      // Get selected log IDs
      const selectedLogIds = JSON.parse(sessionStorage.getItem("selectedLogs") || "[]");
      
      // Get all logs
      const allLogs = JSON.parse(sessionStorage.getItem("healthLogs") || "[]");
      
      // Filter to only selected logs
      selectedLogs = allLogs.filter(log => {
        const logId = `${new Date(log.date).toISOString()}-${log.text.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '')}`;
        return selectedLogIds.includes(logId);
      });
      
      console.log("Retrieved selected logs from storage:", selectedLogs);
    }
    
    // If still no logs, show placeholder content
    if (!selectedLogs || selectedLogs.length === 0) {
      console.log("No logs to process, showing placeholder content");
      return;
    }
    
    // For full implementation, you would call your API here
    // For now, we'll simulate a response
    
    // Mock API call (replace with actual API call)
    const apiResponse = await simulateApiCall(selectedLogs);
    
    // Update cards with API response
    updateCardsWithApiResponse(apiResponse);
    
  } catch (error) {
    console.error("Error processing logs:", error);
  }
}

// Function to simulate API call (replace with actual API call)
async function simulateApiCall(logs) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Create a simulated response based on the logs
  const symptoms = [];
  const timeline = [];
  const impact = [];
  
  // Extract information from logs
  logs.forEach(log => {
    const text = log.text.toLowerCase();
    
    // Extract symptoms (simplified for demo)
    if (text.includes("headache")) symptoms.push("Headaches");
    if (text.includes("tired") || text.includes("fatigue")) symptoms.push("Fatigue");
    if (text.includes("cough")) symptoms.push("Cough");
    if (text.includes("fever")) symptoms.push("Fever");
    
    // Add to timeline
    timeline.push({
      date: new Date(log.date),
      text: log.text
    });
    
    // Extract impact (simplified for demo)
    if (text.includes("work") || text.includes("job")) impact.push("Work performance");
    if (text.includes("sleep")) impact.push("Sleep quality");
    if (text.includes("exercise")) impact.push("Exercise routine");
  });
  
  // Create a summary based on common symptoms
  const uniqueSymptoms = [...new Set(symptoms)];
  const summary = `You've been experiencing ${uniqueSymptoms.join(", ")} that have affected your daily life. These symptoms started recently and are concerning to you.`;
  
  // Sort timeline by date
  timeline.sort((a, b) => a.date - b.date);
  
  // Create a timeline summary
  const timelineText = timeline.length > 0 ? 
    `Your symptoms began around ${timeline[0].date.toLocaleDateString()}. ${uniqueSymptoms.join(", ")} have been consistent since then.` :
    "Your symptoms have been developing over the past few weeks.";
  
  // Create an impact summary
  const uniqueImpact = [...new Set(impact)];
  const impactText = uniqueImpact.length > 0 ?
    `These symptoms have affected your ${uniqueImpact.join(", ")}.` :
    "These symptoms have been affecting your daily activities.";
  
  // Create questions for the doctor
  const questions = [
    "What could be causing these symptoms?",
    "Should I get any tests done?",
    "What treatments would you recommend?",
    "Are there any lifestyle changes I should make?"
  ];
  
  // Return the simulated API response
  return {
    summary,
    symptoms: uniqueSymptoms,
    timeline: timelineText,
    impact: impactText,
    questions
  };
}

// Function to update cards with API response
function updateCardsWithApiResponse(apiResponse) {
  // Update summary card
  const summaryContent = document.querySelector("#summaryCard .card-content");
  if (summaryContent) {
    summaryContent.innerHTML = `
      <p class="card-paragraph">
        <strong>Summary:</strong>
      </p>
      <p class="card-paragraph">
        ${apiResponse.summary}
      </p>
    `;
  }
  
  // Update symptoms card
  const symptomsContent = document.querySelector("#symptomsCard .card-content");
  if (symptomsContent) {
    let symptomsHtml = '';
    apiResponse.symptoms.forEach(symptom => {
      symptomsHtml += `
        <p class="card-symptom">
          <strong>${symptom}:</strong> Noted in your health logs
        </p>
      `;
    });
    symptomsContent.innerHTML = symptomsHtml;
  }
  
  // Update timeline card
  const timelineContent = document.querySelector("#timelineCard .card-content");
  if (timelineContent) {
    timelineContent.innerHTML = `
      <p class="card-paragraph">
        ${apiResponse.timeline}
      </p>
    `;
  }
  
  // Update impact card
  const impactContent = document.querySelector("#impactCard .card-content");
  if (impactContent) {
    impactContent.innerHTML = `
      <p class="card-paragraph">
        ${apiResponse.impact}
      </p>
    `;
  }
}

// Function to handle the "Prep my doctor's notes" button click
function prepDoctorsNotes() {
  // Get selected logs
  const selectedLogIds = JSON.parse(sessionStorage.getItem("selectedLogs") || "[]");
  
  // If no logs selected, show alert
  if (selectedLogIds.length === 0) {
    alert("Please select at least one health log to prepare doctor's notes.");
    return;
  }
  
  // Transition to visit roadmap page
  const currentPage = document.querySelector('.page.visible');
  if (currentPage && currentPage.id !== "visitRoadmapPage") {
    transitionPages(currentPage.id, "visitRoadmapPage");
    
    // Initialize the visit roadmap page after transition
    setTimeout(() => {
      initializeVisitRoadmapPage();
    }, 200);
  }
}

// Fix the "Prep my doctor's notes" button to properly transition to the Visit Roadmap page
function setupPrepNotesButtonHandler() {
  console.log("Setting up improved prep notes button handler");
  
  // Find all prep notes buttons in the app
  const prepNotesButtons = document.querySelectorAll(".prep-notes-button");
  
  if (prepNotesButtons.length === 0) {
    console.error("Prep notes button not found in the DOM");
    return;
  }
  
  console.log(`Found ${prepNotesButtons.length} prep notes buttons`);
  
  // Set up each button
  prepNotesButtons.forEach(button => {
    // Clone to remove existing listeners
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    // Add click event listener
    newButton.addEventListener("click", function(event) {
      // Prevent any default behavior
      event.preventDefault();
      event.stopPropagation();
      
      console.log("Prep doctor's notes button clicked");
      
      // Collect selected logs
      const selectedLogs = [];
      const selectedLogIds = [];
      const checkboxes = document.querySelectorAll(".log-checkbox .checkbox.checked");
      
      console.log(`Found ${checkboxes.length} checked checkboxes`);
      
      checkboxes.forEach(checkbox => {
        const card = checkbox.closest(".health-log-card");
        if (card) {
          const dateElement = card.querySelector(".log-date");
          const textElement = card.querySelector(".log-text");
          
          if (dateElement && textElement) {
            const date = dateElement.textContent;
            const text = textElement.textContent;
            
            // Add to selected logs array
            selectedLogs.push({
              date: date,
              text: text
            });
            
            // Create a unique ID
            const logId = `${date}-${text.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '')}`;
            selectedLogIds.push(logId);
          }
        }
      });
      
      console.log(`Selected ${selectedLogs.length} logs for doctor's notes`);
      
      // Store in sessionStorage
      sessionStorage.setItem("selectedLogs", JSON.stringify(selectedLogIds));
      sessionStorage.setItem("selectedLogsData", JSON.stringify(selectedLogs));
      
      // Show alert if no logs selected
      if (selectedLogs.length === 0) {
        alert("Please select at least one health log to prepare doctor's notes.");
        return;
      }
      
      // Force-fix the Visit Roadmap page visibility
      const visitRoadmapPage = document.getElementById("visitRoadmapPage");
      if (visitRoadmapPage) {
        // Ensure page is in the correct state before transition
        visitRoadmapPage.style.display = "none";
        visitRoadmapPage.classList.remove("visible");
        visitRoadmapPage.classList.add("hidden");
        
        console.log("Visit Roadmap page prepared for transition");
      } else {
        console.error("Visit Roadmap page element not found!");
        return;
      }
      
      // Get current visible page
      const currentPage = document.querySelector(".page.visible");
      if (!currentPage) {
        console.error("No visible page found");
        return;
      }
      
      console.log(`Current page: ${currentPage.id}, transitioning to visitRoadmapPage`);
      
      // Transition to visit roadmap page using direct DOM manipulation
      // instead of relying on the transitionPages function
      currentPage.style.display = "none";
      currentPage.classList.remove("visible");
      currentPage.classList.add("hidden");
      
      visitRoadmapPage.style.display = "block";
      visitRoadmapPage.classList.remove("hidden");
      visitRoadmapPage.classList.add("visible");
      
      // Initialize the roadmap page content
      setTimeout(() => {
        console.log("Initializing Visit Roadmap page content");
        initializeVisitRoadmapPage(selectedLogs);
      }, 100);
    });
  });
  
  console.log("Prep notes button handler improved successfully");
}

function debugVisitRoadmapPage() {
  const visitRoadmapPage = document.getElementById("visitRoadmapPage");
  console.log("Visit Roadmap page exists:", !!visitRoadmapPage);
  
  if (visitRoadmapPage) {
    console.log("Visit Roadmap page display:", window.getComputedStyle(visitRoadmapPage).display);
    console.log("Visit Roadmap page visibility:", window.getComputedStyle(visitRoadmapPage).visibility);
    console.log("Visit Roadmap page classes:", visitRoadmapPage.className);
  }
  
  // Check if the page is in the right place in the DOM
  const appWrapper = document.querySelector(".app-wrapper");
  if (appWrapper) {
    const isDirectChild = Array.from(appWrapper.children).some(child => child.id === "visitRoadmapPage");
    console.log("Visit Roadmap page is direct child of app-wrapper:", isDirectChild);
  }
}
// Fix the roadmap page structure
function setupRoadmapPageStructure() {
  const visitRoadmapPage = document.getElementById("visitRoadmapPage");
  
  if (!visitRoadmapPage) {
    console.error("Visit Roadmap page not found");
    return;
  }
  
  // Ensure the page has the right structure
  visitRoadmapPage.style.position = "relative";
  visitRoadmapPage.style.height = "100%";
  visitRoadmapPage.style.overflow = "hidden";
  
  // Fix the content area
  const roadmapContent = visitRoadmapPage.querySelector(".roadmap-content");
  if (roadmapContent) {
    roadmapContent.style.overflow = "auto";
    roadmapContent.style.height = "calc(100% - 114px)"; // Subtract header height
    roadmapContent.style.paddingBottom = "90px"; // Space for footer
    
    // Make sure cards take full width
    const cardContainer = roadmapContent.querySelector(".roadmap-cards-container");
    if (cardContainer) {
      cardContainer.style.width = "100%";
      cardContainer.style.position = "relative";
      cardContainer.style.minHeight = "300px";
      
      // Fix positioning of all cards
      const cards = cardContainer.querySelectorAll(".roadmap-card");
      cards.forEach(card => {
        card.style.position = "absolute";
        card.style.top = "0";
        card.style.left = "0";
        card.style.width = "100%";
        card.style.opacity = "0";
        card.style.pointerEvents = "none";
        card.style.transition = "opacity 0.3s ease-in-out";
        
        // Add card indices for swipe navigation
        for (let i = 0; i < cards.length; i++) {
          cards[i].dataset.index = i;
        }
      });
      
      // Make the first card visible
      if (cards.length > 0) {
        cards[0].style.opacity = "1";
        cards[0].style.pointerEvents = "auto";
        cards[0].classList.add("visible");
      }
    }
  }
  
  // Fix the footer
  const footer = visitRoadmapPage.querySelector(".tutorial-footer");
  if (footer) {
    footer.style.position = "absolute";
    footer.style.bottom = "0";
    footer.style.left = "0";
    footer.style.width = "100%";
    footer.style.zIndex = "999";
  }
}

// Set up improved roadmap navigation
function setupImprovedRoadmapNavigation() {
  const navButtons = document.querySelectorAll(".roadmap-nav-btn");
  
  if (navButtons.length === 0) {
    console.error("Navigation buttons not found");
    return;
  }
  
  // Remove existing listeners by cloning
  navButtons.forEach(button => {
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    // Add click event listener
    newButton.addEventListener("click", function(event) {
      // Prevent default behavior
      event.preventDefault();
      event.stopPropagation();
      
      // Remove active class from all buttons
      navButtons.forEach(btn => btn.classList.remove("active"));
      
      // Add active class to clicked button
      this.classList.add("active");
      
      // Get target
      const target = this.dataset.target;
      
      // Handle navigation
      handleImprovedRoadmapNavigation(target);
    });
  });
  
  // Make sure the summary button is active by default
  const summaryButton = document.querySelector(".roadmap-nav-btn[data-target='summary']");
  if (summaryButton) {
    summaryButton.classList.add("active");
  }
}

// Update handleImprovedRoadmapNavigation to show questions when Questions button is clicked
function handleImprovedRoadmapNavigation(target) {
  console.log(`Navigation to ${target}`);
  
  // Hide all questions list if visible
  const questionsListContainer = document.getElementById("doctorQuestionsList");
  if (questionsListContainer) {
    questionsListContainer.classList.remove("visible");
  }
  
  // Reset page title
  const roadmapTitle = document.querySelector(".roadmap-title");
  if (roadmapTitle) {
    roadmapTitle.textContent = "Visit Roadmap";
  }
  
  // Get all cards
  const cards = document.querySelectorAll(".roadmap-card");
  
  // Hide all cards
  cards.forEach(card => {
    card.style.opacity = "0";
    card.style.pointerEvents = "none";
    card.classList.remove("visible");
  });
  
  // Get all nav buttons
  const navButtons = document.querySelectorAll(".roadmap-nav-btn");
  
  // Reset all button colors
  navButtons.forEach(btn => {
    if (btn.dataset.target === 'summary') {
      btn.style.backgroundColor = "#B478CF"; // Purple
    } else if (btn.dataset.target === 'vitalai') {
      btn.style.backgroundColor = "#B478CF"; // Purple
    } else if (btn.dataset.target === 'questions') {
      btn.style.backgroundColor = "#4E95D9"; // Blue
    }
  });
  
  // Show the appropriate content based on target
  switch(target) {
    case "summary":
      showRoadmapCardById("summaryCard");
      // Hide VitalAI panel if visible
      const vitalAiPanel = document.getElementById("vitalAiPanel");
      if (vitalAiPanel) vitalAiPanel.classList.remove("visible");
      
      // Show navigation buttons
      const navButtons = document.querySelector(".roadmap-card-nav");
      if (navButtons) navButtons.style.display = "flex";
      break;
    case "vitalai":
      showRoadmapCardById("symptomsCard");
      // Change button color to blue
      const vitalAiButton = document.querySelector(".roadmap-nav-btn[data-target='vitalai']");
      if (vitalAiButton) vitalAiButton.style.backgroundColor = "#4E95D9"; // Blue
      
      // Show navigation buttons
      const navButtons2 = document.querySelector(".roadmap-card-nav");
      if (navButtons2) navButtons2.style.display = "flex";
      break;
    case "questions":
      // Show doctor questions instead of the questions card
      showDoctorQuestions();
      
      // Change button color to blue
      const questionsButton = document.querySelector(".roadmap-nav-btn[data-target='questions']");
      if (questionsButton) questionsButton.style.backgroundColor = "#4E95D9"; // Blue
      
      // Hide VitalAI panel if visible
      const vitalAiPanel2 = document.getElementById("vitalAiPanel");
      if (vitalAiPanel2) vitalAiPanel2.classList.remove("visible");
      break;
    default:
      showRoadmapCardById("summaryCard");
      // Hide VitalAI panel if visible
      const vitalAiPanel3 = document.getElementById("vitalAiPanel");
      if (vitalAiPanel3) vitalAiPanel3.classList.remove("visible");
      
      // Show navigation buttons
      const navButtons3 = document.querySelector(".roadmap-card-nav");
      if (navButtons3) navButtons3.style.display = "flex";
  }
}

// Add event listener for question card click to show the questions view
function setupQuestionsCardListener() {
  const questionsCard = document.getElementById("questionsCard");
  if (questionsCard) {
    questionsCard.addEventListener("click", function() {
      // Get the questions button
      const questionsButton = document.querySelector(".roadmap-nav-btn[data-target='questions']");
      if (questionsButton) {
        // Simulate clicking the questions button
        questionsButton.click();
      }
    });
  }
}

// Show a specific roadmap card by ID
function showRoadmapCardById(cardId) {
  const card = document.getElementById(cardId);
  
  if (!card) {
    console.error(`Card ${cardId} not found`);
    return;
  }
  
  // Show the card
  card.style.opacity = "1";
  card.style.pointerEvents = "auto";
  card.classList.add("visible");
  
  // Scroll to the top of the card content
  const cardContent = card.querySelector(".card-content");
  if (cardContent) {
    cardContent.scrollTop = 0;
  }
  
  console.log(`Showed card: ${cardId}`);
}

// Add swipe functionality to roadmap cards
function addSwipeToRoadmapCards() {
  const cardContainer = document.querySelector(".roadmap-cards-container");
  
  if (!cardContainer) {
    console.error("Card container not found");
    return;
  }
  
  const cards = cardContainer.querySelectorAll(".roadmap-card");
  
  if (cards.length === 0) {
    console.error("No cards found");
    return;
  }
  
  // Add navigation buttons
  const navButtons = document.createElement("div");
  navButtons.className = "roadmap-card-nav";
  navButtons.innerHTML = `
    <div class="roadmap-card-nav-button prev">❮</div>
    <div class="roadmap-card-nav-button next">❯</div>
  `;
  
  // Append to container
  cardContainer.appendChild(navButtons);
  
  // Style the navigation buttons
  const styleElement = document.createElement("style");
  styleElement.textContent = `
    .roadmap-card-nav {
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      width: 100%;
      display: flex;
      justify-content: space-between;
      padding: 0 10px;
      box-sizing: border-box;
      transform: translateY(-50%);
      z-index: 1000;
      pointer-events: none;
    }
    
    .roadmap-card-nav-button {
      width: 40px;
      height: 40px;
      background: rgba(180, 120, 207, 0.8);
      color: white;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      pointer-events: auto;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      font-weight: bold;
      user-select: none;
      font-size: 20px;
      opacity: 0.9;
      margin: 0 5px;
    }
    
    .roadmap-card-nav-button:hover {
      background: rgba(180, 120, 207, 1);
      opacity: 1;
    }
    
    /* Make sure the card content doesn't get blocked by arrows */
    .roadmap-card .card-content {
      padding: 0 50px;
      margin: 0 auto;
      max-width: 280px;
    }
    
    /* Special styling for questions card */
    #questionsCard .card-title {
      font-size: 35px;
      font-weight: 700;
      color: black;
      text-align: left;
      margin-bottom: 10px;
      font-family: 'Urbanist', sans-serif;
    }
    
    #questionsCard .question-underline {
      width: 60px;
      height: 4px;
      background: #B478CF;
      margin-bottom: 20px;
    }
    
    /* Additional button styling fix for card navigation */
    .card-btn {
      z-index: 10;
      position: relative;
    }
  `;
  
  document.head.appendChild(styleElement);
  
  // Set up touch and click event listeners
  let currentIndex = 0;
  
  // Touch variables
  let touchStartX = 0;
  let touchEndX = 0;
  
  // Add touch event listeners to cards for swipe
  cards.forEach(card => {
    card.addEventListener("touchstart", function(e) {
      touchStartX = e.changedTouches[0].screenX;
    });
    
    card.addEventListener("touchend", function(e) {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    });
  });
  
  // Handle swipe logic
  function handleSwipe() {
    const swipeThreshold = 50; // Minimum distance to register a swipe
    
    if (touchEndX < touchStartX - swipeThreshold) {
      // Swipe left (next)
      navigateCard(1);
    } else if (touchEndX > touchStartX + swipeThreshold) {
      // Swipe right (previous)
      navigateCard(-1);
    }
  }
  
  // Set up click navigation
  const prevButton = navButtons.querySelector(".roadmap-card-nav-button.prev");
  const nextButton = navButtons.querySelector(".roadmap-card-nav-button.next");
  
  if (prevButton && nextButton) {
    prevButton.addEventListener("click", function() {
      navigateCard(-1);
    });
    
    nextButton.addEventListener("click", function() {
      navigateCard(1);
    });
  }
  
  // Navigation function
  function navigateCard(direction) {
    // Get current visible card
    const visibleCard = document.querySelector(".roadmap-card.visible");
    
    if (!visibleCard) {
      // If no card is visible, show the first one
      showRoadmapCardById("summaryCard");
      return;
    }
    
    // Get current index
    currentIndex = parseInt(visibleCard.dataset.index || "0");
    
    // Calculate new index
    let newIndex = currentIndex + direction;
    
    // Boundary check
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= cards.length) newIndex = cards.length - 1;
    
    // If index didn't change, do nothing
    if (newIndex === currentIndex) return;
    
    // Hide all cards
    cards.forEach(card => {
      card.style.opacity = "0";
      card.style.pointerEvents = "none";
      card.classList.remove("visible");
    });
    
    // Show the new card
    cards[newIndex].style.opacity = "1";
    cards[newIndex].style.pointerEvents = "auto";
    cards[newIndex].classList.add("visible");
    
    // Update current index
    currentIndex = newIndex;
    
    console.log(`Navigated to card index: ${currentIndex}`);
    
    // Update navigation tab if needed
    updateNavTabForCard(cards[currentIndex].id);
  }
  
  // Update navigation tab to match current card
  function updateNavTabForCard(cardId) {
    const navButtons = document.querySelectorAll(".roadmap-nav-btn");
    
    // Remove active class from all buttons
    navButtons.forEach(btn => btn.classList.remove("active"));
    
    // Set the appropriate button as active
    let targetTab = "summary";
    
    if (cardId === "questionsCard") {
      targetTab = "questions";
    } else if (cardId === "symptomsCard" || cardId === "timelineCard" || cardId === "impactCard") {
      targetTab = "vitalai";
    }
    
    // Find and activate the right button
    const activeButton = document.querySelector(`.roadmap-nav-btn[data-target='${targetTab}']`);
    if (activeButton) {
      activeButton.classList.add("active");
    }
  }
  
  console.log("Swipe navigation added to roadmap cards");
}

// Make sure these changes run once the DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
  console.log("Adding Visit Roadmap Page fixes");
  
  // Setup the improved prep notes button handler
  setupPrepNotesButtonHandler();
  
  // Make sure the Visit Roadmap page has proper structure
  const visitRoadmapPage = document.getElementById("visitRoadmapPage");
  if (visitRoadmapPage) {
    setupRoadmapPageStructure();
  }
});

// Add this function to handle the VitalAI slide-up panel
function setupVitalAiPanel() {
  // First, add the VitalAI panel HTML structure to the page
  const visitRoadmapPage = document.getElementById("visitRoadmapPage");
  if (!visitRoadmapPage) return;
  
  // Create the VitalAI slide-up panel
  const vitalAiPanel = document.createElement("div");
  vitalAiPanel.id = "vitalAiPanel";
  vitalAiPanel.className = "vital-ai-panel";
  vitalAiPanel.innerHTML = `
    <div class="vital-ai-content">
      <button class="close-ai-panel">
        <img src="./imgs/white-x-button.png" alt="Close">
      </button>
      
      <h2 class="vital-ai-title">Ask questions you can't remember...</h2>
      
      <div class="record-container">
          <img src="./imgs/record-button.png" alt="Record" class="record-button">
          <div class="record-text">Hold to talk</div>
      </div>
      
      <div class="toggle-container">
        <span class="toggle-text">Toggle to type</span>
        <label class="toggle-switch">
          <input type="checkbox" id="aiToggleInput" class="toggle-checkbox">
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
  `;
  
  // Add the panel to the page
  visitRoadmapPage.appendChild(vitalAiPanel);
  
  // Add styling for the panel
  const styleElement = document.createElement("style");
  styleElement.textContent = `
    .vital-ai-panel {
      position: absolute;
      width: 390px;
      height: 616px;
      bottom: -616px; /* Start off-screen */
      left: 0;
      z-index: 1000;
      background: linear-gradient(180deg, #B579D0 0%, #AE7CD1 24%, #5A93D9 53%);
      border-radius: 20px 20px 0 0;
      transition: bottom 0.3s ease-in-out;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.2);
    }
    
    .vital-ai-panel.visible {
      bottom: 0; /* Slide up to visible position */
    }
    
    .vital-ai-content {
      padding: 30px 20px;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      color: white;
    }
    
    .close-ai-panel {
      position: absolute;
      top: 20px;
      right: 20px;
      background: transparent;
      border: none;
      cursor: pointer;
    }
    
    .close-ai-panel img {
      width: 24px;
      height: 24px;
    }
    
    .vital-ai-title {
      font-size: 28px;
      font-weight: 600;
      text-align: center;
      margin-top: 40px;
      font-family: 'Urbanist', sans-serif;
      color: white;
    }
    
    .record-container {
      margin-top: 60px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    
    .record-button-container {
      width: 130px;
      height: 130px;
      background: white;
      border-radius: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .record-button {
      width: 100px;
      height: 100px;
    }
    
    .record-text {
      font-size: 18px;
      font-weight: 600;
      margin-top: 10px;
      font-family: 'Urbanist', sans-serif;
    }
    
    .toggle-container {
      margin-top: auto;
      margin-bottom: 40px;
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .toggle-text {
      font-size: 16px;
      font-weight: 600;
      font-family: 'Urbanist', sans-serif;
    }
    
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 48px;
      height: 24px;
    }
    
    .toggle-checkbox {
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      border-radius: 34px;
      transition: .4s;
    }
    
    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      border-radius: 50%;
      transition: .4s;
    }
    
    .toggle-checkbox:checked + .toggle-slider {
      background-color: #7F56D9;
    }
    
    .toggle-checkbox:checked + .toggle-slider:before {
      transform: translateX(24px);
    }
  `;
  document.head.appendChild(styleElement);
  
  // Set up event listeners for VitalAI button
  setupVitalAiToggle();
}

// Add this function to toggle the VitalAI panel
function setupVitalAiToggle() {
  // Get the VitalAI navigation button
  const vitalAiButton = document.querySelector(".roadmap-nav-btn[data-target='vitalai']");
  const vitalAiPanel = document.getElementById("vitalAiPanel");
  const closeButton = document.querySelector(".close-ai-panel");
  
  if (!vitalAiButton || !vitalAiPanel || !closeButton) return;
  
  // Set up click event for the VitalAI button
  vitalAiButton.addEventListener("click", function() {
    // Show the panel when VitalAI button is selected
    vitalAiPanel.classList.add("visible");
    
    // Make sure the button is active
    const navButtons = document.querySelectorAll(".roadmap-nav-btn");
    navButtons.forEach(btn => btn.classList.remove("active"));
    vitalAiButton.classList.add("active");
    vitalAiButton.style.backgroundColor = "#4E95D9"; // Make it blue
  });
  
  // Set up close button
  closeButton.addEventListener("click", function() {
    vitalAiPanel.classList.remove("visible");
  });
  
  // Set up toggle behavior
  const toggleInput = document.getElementById("aiToggleInput");
  if (toggleInput) {
    toggleInput.addEventListener("change", function() {
      // In a real app, this would toggle between voice and text input
      console.log("Toggle changed:", toggleInput.checked);
    });
  }
}

// Add this function to handle displaying the doctor questions screen
function setupDoctorQuestionsScreen() {
  // We'll create the doctor questions content differently
  // Instead of a separate screen, we'll create content that replaces the cards
  
  // Create questions container
  const questionsListContainer = document.createElement("div");
  questionsListContainer.id = "doctorQuestionsList";
  questionsListContainer.className = "doctor-questions-list";
  
  // Style for questions section
  const styleElement = document.createElement("style");
  styleElement.textContent = `
    .doctor-questions-list {
      display: none;
      flex-direction: column;
      width: 100%;
      padding: 15px;
      margin-top: 20px;
    }
    
    .doctor-questions-list.visible {
      display: flex;
    }
    
    .doctor-questions-title {
      width: 335px;
      height: 39px;
      margin: 0 auto 15px;
      font-family: 'Urbanist', sans-serif;
      font-weight: 600;
      font-size: 25px;
      line-height: 125%;
      letter-spacing: 0.5px;
      text-align: center;
      color: black;
    }
    
    .questions-instruction {
      width: 353px;
      height: 44px;
      margin: 0 auto 20px;
      font-family: 'Urbanist', sans-serif;
      font-weight: 400;
      font-size: 14px;
      line-height: 125%;
      letter-spacing: 0.28px;
      text-align: center;
      color: black;
    }
    
    .questions-container {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 20px;
    }
    
    .question-item {
      width: 322px;
      height: 56px;
      margin: 0 auto;
      background: white;
      border-radius: 5px;
      box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
      display: flex;
      align-items: center;
      padding: 0 15px;
      position: relative;
    }
    
    .question-text {
      flex: 1;
      font-family: 'Urbanist', sans-serif;
      font-weight: 600;
      font-size: 12px;
      color: black;
    }
    
    .question-actions {
      display: flex;
      gap: 10px;
    }
    
    .action-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 47px;
    }
    
    .action-label {
      font-family: 'Urbanist', sans-serif;
      font-weight: 400;
      font-size: 8px;
      line-height: 125%;
      letter-spacing: 0.16px;
      text-align: center;
      color: black;
      margin-bottom: 2px;
    }
    
    .action-button {
      width: 20px;
      height: 20px;
      border: 1px solid black;
      border-radius: 3px;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
    }
    
    .answered-button {
      background-color: #20B5C4;
      color: white;
    }
    
    .remove-button {
      background-color: white;
      color: black;
    }
    
    .check-icon {
      font-size: 14px;
      font-weight: bold;
    }
    
    .x-icon {
      font-size: 14px;
      font-weight: bold;
    }
    
    .add-question-container {
      display: flex;
      align-items: center;
      margin-top: 10px;
      padding: 0 30px;
    }
    
    .add-question-button {
      width: 40px;
      height: 40px;
      background: white;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      margin-right: 15px;
      box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
    }
    
    .plus-icon {
      font-size: 24px;
      font-weight: bold;
      color: #B478CF;
    }
    
    .add-question-text {
      font-family: 'Urbanist', sans-serif;
      font-weight: 600;
      font-size: 16px;
      color: black;
    }
  `;
  document.head.appendChild(styleElement);
  
  // Add the container to the roadmap content area
  const roadmapContent = document.querySelector(".roadmap-content");
  if (roadmapContent) {
    roadmapContent.appendChild(questionsListContainer);
  }
}



// Function to show doctor questions
function showDoctorQuestions() {
  // Update page title
  const roadmapTitle = document.querySelector(".roadmap-title");
  if (roadmapTitle) {
    roadmapTitle.textContent = "Questions for your Doctor";
  }
  
  // Hide all roadmap cards
  const roadmapCards = document.querySelectorAll(".roadmap-card");
  roadmapCards.forEach(card => {
    card.style.display = "none";
  });
  
  // Hide card navigation buttons
  const navButtons = document.querySelector(".roadmap-card-nav");
  if (navButtons) {
    navButtons.style.display = "none";
  }
  
  // Get or create the questions list container
  let questionsListContainer = document.getElementById("doctorQuestionsList");
  if (!questionsListContainer) {
    // Create container if it doesn't exist
    questionsListContainer = document.createElement("div");
    questionsListContainer.id = "doctorQuestionsList";
    questionsListContainer.className = "doctor-questions-list";
    
    // Add it to roadmap content
    const roadmapContent = document.querySelector(".roadmap-content");
    if (roadmapContent) {
      roadmapContent.appendChild(questionsListContainer);
    }
  }
  
  // Show and populate questions content
  questionsListContainer.classList.add("visible");
  questionsListContainer.innerHTML = `
    <p class="questions-instruction">
      Add any questions you want to ask your doctor. Use this list to ensure you get the information you need.
    </p>
    
    <div class="questions-container">
      <!-- Questions will be added here -->
    </div>
    
    <div class="add-question-container">
      <div class="add-question-button">
        <span class="plus-icon">+</span>
      </div>
      <p class="add-question-text">Question missing?<br>Not a problem, click to add</p>
    </div>
  `;
  
  // Generate and add questions
  generateDoctorQuestions(questionsListContainer.querySelector(".questions-container"));
}

// Function to generate 5 doctor questions
function generateDoctorQuestions(container) {
  // Sample questions for the prototype
  const sampleQuestions = [
    "What is the expected timeline for recovery?",
    "Are there any support groups available?",
    "Could this have to do with my new protein powder?",
    "What are the next steps that I should take?",
    "How can I prevent this condition from recurring in the future?"
  ];
  
  // Clear container first
  container.innerHTML = '';
  
  // Add the questions to the container
  sampleQuestions.forEach(question => {
    const questionItem = document.createElement("div");
    questionItem.className = "question-item";
    questionItem.innerHTML = `
      <div class="question-text">${question}</div>
      <div class="question-actions">
        <div class="action-container">
          <div class="action-label">Answered</div>
          <div class="action-button answered-button">
            <span class="check-icon">✓</span>
          </div>
        </div>
        <div class="action-container">
          <div class="action-label">Remove</div>
          <div class="action-button remove-button">
            <span class="x-icon">✕</span>
          </div>
        </div>
      </div>
    `;
    
    container.appendChild(questionItem);
  });
  
  // Set up action button events
  const answeredButtons = container.querySelectorAll(".answered-button");
  const removeButtons = container.querySelectorAll(".remove-button");
  
  answeredButtons.forEach(button => {
    button.addEventListener("click", function(event) {
      // Stop the event from propagating
      event.stopPropagation();
      
      // Toggle answered state
      this.classList.toggle("answered-button");
      if (this.classList.contains("answered-button")) {
        this.innerHTML = '<span class="check-icon">✓</span>';
      } else {
        this.innerHTML = '';
      }
    });
  });
  
  removeButtons.forEach(button => {
    button.addEventListener("click", function(event) {
      // Stop the event from propagating
      event.stopPropagation();
      
      // Remove the question item
      const questionItem = this.closest(".question-item");
      if (questionItem) {
        questionItem.remove();
      }
    });
  });
}

// Setup event listeners for the Questions button and icon
function setupQuestionsButtonListeners() {
  // Get the Questions button and Questions icon
  const questionsButton = document.querySelector(".roadmap-nav-btn[data-target='questions']");
  const questionsCard = document.getElementById("questionsCard");
  
  if (questionsButton) {
    questionsButton.addEventListener("click", function() {
      showDoctorQuestionsScreen();
    });
  }
  
  if (questionsCard) {
    questionsCard.addEventListener("click", function() {
      showDoctorQuestionsScreen();
    });
  }
}

// Add this line at the end of your JavaScript file
document.addEventListener("click", function(e) {
  if (e.target && e.target.matches(".roadmap-nav-btn[data-target='questions'], .roadmap-nav-btn[data-target='questions'] *")) {
    // Directly hide the instruction text with a delay to ensure it works
    setTimeout(function() {
      const instructionText = document.querySelector(".roadmap-instruction");
      if (instructionText) {
        instructionText.style.display = "none";
        instructionText.style.height = "0";
        instructionText.style.margin = "0";
        instructionText.style.padding = "0";
      }
    }, 10);
  }
});

// Also check if we need to hide it on page load
window.addEventListener("load", function() {
  const questionsButton = document.querySelector(".roadmap-nav-btn[data-target='questions']");
  if (questionsButton && questionsButton.classList.contains("active")) {
    const instructionText = document.querySelector(".roadmap-instruction");
    if (instructionText) {
      instructionText.style.display = "none";
      instructionText.style.height = "0";
      instructionText.style.margin = "0";
      instructionText.style.padding = "0";
    }
  }
});

window.addMenuToApp = addMenuToApp;