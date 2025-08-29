
        // Detect any navigation attempts
        window.addEventListener('beforeunload', function(e) {
            console.log("Page is trying to unload/reload!");
            console.trace();
        });

        // Add error handler to catch any uncaught errors
        window.addEventListener('error', function(e) {
            console.error('Window error:', e);
            e.preventDefault();
        });

        // Prevent any form submissions on the page
        document.addEventListener('submit', function(e) {
            e.preventDefault();
            return false;
        });

        let chatbutton = document.querySelector(".chatbutton");
        let chatbot = document.querySelector(".chatbot");
        let message = document.querySelector("#message");
        let AI_messages = document.querySelector(".showmessage");
        let closeBtn = document.querySelector(".open-close-button");
        let sendBtn = document.querySelector(".send-btn");
        let starterButtons = document.querySelectorAll(".starter-button");
        let conversationStarted = false;

        // Get user's timezone
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        console.log("Detected user timezone:", userTimezone);

        // Add timezone indicator to the chat interface
        function addTimezoneIndicator() {
            const topsection = document.querySelector(".chatbot");
            if (!document.querySelector(".timezone-indicator")) {
                const tzIndicator = document.createElement("div");
                tzIndicator.className = "timezone-indicator";
                tzIndicator.textContent = `Your timezone: ${userTimezone}`;
                topsection.appendChild(tzIndicator);
            }
        }

        function scrollToBottom() {
            AI_messages.scrollTop = AI_messages.scrollHeight;
        }

        function toggleChatbot() {
            console.log("Toggle chatbot called!");
            console.trace(); // This will show us what called this function
            
            if (chatbot.classList.contains("open")) {
                console.log("Closing chatbot");
                chatbot.classList.remove("open");
                chatbutton.classList.remove("active");
            } else {
                console.log("Opening chatbot");
                chatbot.classList.add("open");
                chatbutton.classList.add("active");
                addTimezoneIndicator();
                if (!conversationStarted) {
                    setTimeout(() => {
                        message.focus();
                    }, 400);
                }
            }
        }

        function hideConversationStarters() {
            const starters = document.querySelector(".conversation-starters");
            if (starters) {
                starters.style.animation = "fadeOut 0.3s ease";
                setTimeout(() => {
                    starters.style.display = "none";
                }, 300);
            }
        }

        function formatBotMessage(text) {
            // Convert markdown-style formatting to HTML
            let formatted = text
                // Bold text
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                // Lists
                .replace(/^- (.*?)$/gm, '<li>$1</li>')
                .replace(/^\d+\. (.*?)$/gm, '<li>$1</li>')
                // Wrap consecutive list items in ul/ol tags
                .replace(/(<li>.*?<\/li>\n?)+/g, function(match) {
                    return '<ul>' + match + '</ul>';
                });
            
            return formatted;
        }

        async function chatWithAgent(quest, session_eyed){
            try {
                const response = await fetch("https://gcloud-ragagent-hojaoplease-918547323210.europe-west2.run.app/chat", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        'X-User-Timezone': userTimezone,
                        "ngrok-skip-browser-warning": "true"  // Add this for ngrok
                    },
                    body : JSON.stringify({
                        question: quest,
                        session_id: session_eyed,
                        user_timezone: userTimezone
                    })
                    
                });
                
                return response;
            } catch (error) {
                console.error("Fetch error:", error);
                throw error;
            }
        }

        async function getApiResponse(messageText) {
            const sessionIdKey = "chatSession";

            // Generate & store session id if not already present
            let sessionId;
            try {
                sessionId = sessionStorage.getItem(sessionIdKey);
                if (!sessionId) {
                    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    sessionStorage.setItem(sessionIdKey, sessionId);
                }
            } catch (error) {
                // Fallback if sessionStorage is not available
                sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            }

            try {
                
                let response = await chatWithAgent(messageText, sessionId);

                
                if(response.ok){
                    console.log(response)
                    
                }
                

                
                


                if (!response.ok) {
                    console.error("Server error:", data.error || data.detail || "Unknown error");
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                let data = await response.json();
                

                

                // Log timezone info if included in response
                if (data.user_timezone) {
                    console.log("Server acknowledged timezone:", data.user_timezone);
                }

                // Return the response, formatting line breaks and markdown
                return data.response ? formatBotMessage(data.response.replace(/\n/g, "<br>")) : "I'm sorry, I didn't receive a proper response.";
            } catch (err) {
                console.error("API error:", err);
                return "Sorry, I'm having trouble connecting right now. Please try again in a moment.";
            }
        }

        // Function to handle direct booking requests (if needed in future)
        async function bookMeetingDirect(meetingData) {
            try {
                const response = await fetch("https://rag-agent-146607786099.europe-west1.run.app/book-meeting", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-User-Timezone": userTimezone
                    },
                    body: JSON.stringify({
                        ...meetingData,
                        user_timezone: userTimezone
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                return await response.json();
            } catch (err) {
                console.error("Booking error:", err);
                return { success: false, error: "Failed to book meeting" };
            }
        }
        
        async function sendMessage(messageText) {
            console.log("=== SEND MESSAGE START ===");
            console.log("Message text:", messageText);
            console.log("Chatbot open?", chatbot.classList.contains("open"));
            
            if (!messageText.trim()) return;

            // Clear the input immediately to prevent double-sending
            message.value = "";

            if (!conversationStarted) {
                hideConversationStarters();
                conversationStarted = true;
            }

            // Create user message element
            let userMessage = document.createElement("div");
            userMessage.textContent = messageText;
            userMessage.classList.add("displaymessage");
            AI_messages.appendChild(userMessage);
            scrollToBottom();

            // Create typing indicator
            let typingIndicator = document.createElement("div");
            typingIndicator.classList.add("chatbotmessage");
            typingIndicator.innerHTML = "Typing<span class='typing-dots'>...</span>";
            typingIndicator.style.opacity = "0.7";
            AI_messages.appendChild(typingIndicator);
            scrollToBottom();

            try {
                console.log("About to call API...");
                let response = await getApiResponse(messageText);
                console.log("API Response received");
                console.log("Chatbot still open?", chatbot.classList.contains("open"));

                // Remove typing indicator
                if (typingIndicator && typingIndicator.parentNode) {
                    AI_messages.removeChild(typingIndicator);
                }

                // Add bot response
                let botMessage = document.createElement("div");
                botMessage.classList.add("chatbotmessage");
                botMessage.innerHTML = response;  // innerHTML to render formatted content
                AI_messages.appendChild(botMessage);
                scrollToBottom();
                
                console.log("=== SEND MESSAGE END ===");
                console.log("Chatbot still open after everything?", chatbot.classList.contains("open"));
            } catch (error) {
                console.error("Error in sendMessage:", error);
                // Remove typing indicator if it still exists
                if (typingIndicator && typingIndicator.parentNode) {
                    AI_messages.removeChild(typingIndicator);
                }
                let errorMessage = document.createElement("div");
                errorMessage.textContent = "Sorry, something went wrong. Please try again.";
                errorMessage.classList.add("chatbotmessage");
                AI_messages.appendChild(errorMessage);
                scrollToBottom();
            }
        }

        // Prevent clicks inside the chatbot from closing it
        chatbot.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
        });

        // Event listeners
        chatbutton.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleChatbot();
        });
        
        closeBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleChatbot();
        });

        sendBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const messageText = message.value.trim();
            if (messageText) {
                sendMessage(messageText);
            }
        });

        message.addEventListener("keypress", (event) => {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                const messageText = message.value.trim();
                if (messageText) {
                    sendMessage(messageText);
                }
            }
        });

        // Conversation starter buttons
        starterButtons.forEach(button => {
            button.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const messageText = button.getAttribute("data-message");
                sendMessage(messageText);
            });
        });

        // Add typing animation styles
        const style = document.createElement("style");
        style.textContent = `
            .typing-dots {
                animation: typingDots 1.5s infinite;
            }
            
            @keyframes typingDots {
                0%, 20% { content: '.'; }
                40% { content: '..'; }
                60%, 100% { content: '...'; }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(-10px); }
            }
        `;
        document.head.appendChild(style);

        // Log timezone info on page load
        console.log("Chat initialized with timezone support");
        console.log("User timezone:", userTimezone);
        console.log("Current time:", new Date().toLocaleString('en-US', { timeZone: userTimezone, timeZoneName: 'short' }));
    