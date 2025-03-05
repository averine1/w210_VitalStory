// 1) STARTUP PAGE → LOGIN PAGE (FADE OUT)
window.onload = function() {
  setTimeout(function() {
    const startupPage = document.getElementById("startupPage");
    // Fade out the startup page by switching classes
    startupPage.classList.remove("visible");
    startupPage.classList.add("fade-out");

    // After 1s fade, hide startup & show login
    setTimeout(function() {
      startupPage.style.display = "none";

      const loginPage = document.getElementById("loginPage");
      loginPage.style.display = "block";  // Unhide the login
      // Make sure it's visible
      loginPage.classList.remove("fade-out");
      loginPage.classList.add("visible");
    }, 1000);

  }, 3000);
};

// 2) LOGIN PAGE → SIGN-UP PAGE (INSTANT)
document.getElementById("signupLink").onclick = function() {
  const loginPage = document.getElementById("loginPage");
  // Instantly hide login page
  loginPage.style.display = "none";
  loginPage.classList.remove("visible");
  loginPage.classList.add("hidden");

  // Instantly show signup page
  const signupPage = document.getElementById("signupPage");
  signupPage.style.display = "block";
  signupPage.classList.remove("hidden");
  signupPage.classList.add("visible");
};

// 3) TOGGLE AVATAR DROPDOWN
function toggleAvatarDropdown() {
  const dropdown = document.getElementById('avatarDropdown');
  dropdown.style.display = (dropdown.style.display === 'block') ? 'none' : 'block';
}

// 4) SELECT AVATAR
function selectAvatar(imgUrl) {
  const chosenAvatar = document.getElementById('chosenAvatar');
  if (chosenAvatar) chosenAvatar.src = imgUrl;

  const detailsAvatar = document.getElementById('detailsAvatar');
  if (detailsAvatar) detailsAvatar.src = imgUrl;

  toggleAvatarDropdown();
}

// 5) SIGN-UP PAGE → DETAILS PAGE (INSTANT)
document.getElementById("createAccountButton").onclick = function() {
  const signupPage = document.getElementById("signupPage");
  signupPage.style.display = "none";
  signupPage.classList.remove("visible");
  signupPage.classList.add("hidden");

  const detailsPage = document.getElementById("detailsPage");
  detailsPage.style.display = "block";
  detailsPage.classList.remove("hidden");
  detailsPage.classList.add("visible");

  // Set welcome name
  document.getElementById("welcomeName").innerText = "Welcome James Quinn 👋";
};

// 6) DETAILS PAGE → HIPAA PAGE (INSTANT)
document.getElementById("getStartedButton")?.addEventListener("click", function() {
  const detailsPage = document.getElementById("detailsPage");
  detailsPage.style.display = "none";
  detailsPage.classList.remove("visible");
  detailsPage.classList.add("hidden");

  const hipaaPage = document.getElementById("hipaaPage");
  hipaaPage.style.display = "block";
  hipaaPage.classList.remove("hidden");
  hipaaPage.classList.add("visible");
});

// 7) HIPAA → TUTORIAL PAGE 2.0 (INSTANT)
document.getElementById("agreeButton").onclick = function() {
    console.log("Agree button clicked!");
  
    // Hide HIPAA page
    let hipaaPage = document.getElementById("hipaaPage");
    console.log("hipaaPage =>", hipaaPage);  // Check it's not null
    hipaaPage.style.display = "none";
    hipaaPage.classList.remove("visible");
    hipaaPage.classList.add("hidden");
    
    // Show tutorial page 2.0
    const tutorialPage2 = document.getElementById("tutorialPage2");
    tutorialPage2.style.display = "block";
    tutorialPage2.classList.remove("hidden");
    
  };
  document.getElementById("tutorialPage2").addEventListener("click", function() {
    // Hide page 2.0
    const page2 = document.getElementById("tutorialPage2");
    page2.style.display = "none";
    page2.classList.add("hidden");
  
    // Show page 2.1
    const page21 = document.getElementById("tutorialPage21");
    page21.style.display = "block";
    page21.classList.remove("hidden");
  });
  document.getElementById("tutorialPage21").addEventListener("click", function() {
    // Hide page 2.1
    const page21 = document.getElementById("tutorialPage21");
    page21.style.display = "none";
    page21.classList.add("hidden");
  
    // Show page 2.2
    const page22 = document.getElementById("tutorialPage22");
    page22.style.display = "block";
    page22.classList.remove("hidden");
  });
  
  

// 8) HIPAA → CANCEL
document.getElementById("cancelButton").onclick = function() {
  alert("Sign up cancelled. Exiting...");
};
