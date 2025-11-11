document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Clear activity select options (keep the placeholder)
      while (activitySelect.options.length > 1) {
        activitySelect.remove(1);
      }

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

          // Build participants list with a delete button for each participant
          const participantsHtml = details.participants.length
            ? `<div class="participants">
                 <strong>Participants:</strong>
                 <ul class="participants-list">
                   ${details.participants
                     .map(
                       (p) =>
                         `<li class="participant-item" data-email="${p}">
                            <span class="participant-email">${p}</span>
                            <button type="button" class="participant-delete" aria-label="Remove participant">✕</button>
                          </li>`
                     )
                     .join("")}
                 </ul>
               </div>`
            : `<div class="participants">
                 <strong>Participants:</strong>
                 <p class="no-participants">No participants yet</p>
               </div>`;

          activityCard.dataset.activity = name;
          activityCard.innerHTML = `
            <h4>${name}</h4>
            <p>${details.description}</p>
            <p><strong>Schedule:</strong> ${details.schedule}</p>
            <p><strong>Availability:</strong> <span class="spots-left">${spotsLeft}</span> spots left</p>
            ${participantsHtml}
          `;

          // Event delegation for delete buttons inside this card
          activityCard.addEventListener("click", async (e) => {
            const btn = e.target.closest(".participant-delete");
            if (!btn) return;

            // Find the li and email
            const li = btn.closest(".participant-item");
            if (!li) return;
            const email = li.dataset.email;
            const activityName = activityCard.dataset.activity;

            // Confirm removal (lightweight)
            if (!confirm(`Remove ${email} from ${activityName}?`)) return;

            try {
              const res = await fetch(
                `/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(email)}`,
                { method: "DELETE" }
              );

              const payload = await res.json();
              if (res.ok) {
                // Remove li from DOM
                li.remove();

                // Update spots-left count (increase by 1)
                const spotsEl = activityCard.querySelector(".spots-left");
                if (spotsEl) {
                  const cur = parseInt(spotsEl.textContent, 10) || 0;
                  spotsEl.textContent = String(cur + 1);
                }

                // If no participants left, show the no-participants message
                const list = activityCard.querySelectorAll(".participant-item");
                if (!list.length) {
                  const participantsDiv = activityCard.querySelector(".participants");
                  if (participantsDiv) {
                    participantsDiv.innerHTML = `
                      <strong>Participants:</strong>
                      <p class="no-participants">No participants yet</p>
                    `;
                  }
                }

                // Show a transient success message
                messageDiv.textContent = payload.message || "Participant removed";
                messageDiv.className = "success";
                messageDiv.classList.remove("hidden");
                setTimeout(() => messageDiv.classList.add("hidden"), 4000);
              } else {
                messageDiv.textContent = payload.detail || "Failed to remove participant";
                messageDiv.className = "error";
                messageDiv.classList.remove("hidden");
              }
            } catch (err) {
              console.error("Error removing participant:", err);
              messageDiv.textContent = "Failed to remove participant. Try again.";
              messageDiv.className = "error";
              messageDiv.classList.remove("hidden");
            }
          });

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
