const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

// This will hold the history of the conversation for context.
const conversationHistory = [];

/**
 * A simple markdown to HTML converter.
 * Supports:
 * - Bold: **text**
 * - Unordered lists: * item
 * - Paragraphs for other text.
 * @param {string} text The markdown text.
 * @returns {string} The converted HTML.
 */
function markdownToHtml(text) {
  // Process bold formatting first
  let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  const lines = html.split('\n');
  const newLines = [];
  let inList = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check for list items
    if (trimmedLine.startsWith('* ')) {
      const content = trimmedLine.substring(2); // Get content after '* '
      if (!inList) {
        newLines.push('<ul>');
        inList = true;
      }
      newLines.push(`<li>${content}</li>`);
    } else {
      // If we were in a list, close it
      if (inList) {
        newLines.push('</ul>');
        inList = false;
      }
      // Wrap non-empty, non-list lines in <p> tags
      if (trimmedLine) {
        newLines.push(`<p>${trimmedLine}</p>`);
      }
    }
  }

  // Close any open list at the end
  if (inList) {
    newLines.push('</ul>');
  }

  return newLines.join('');
}


form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  // Add user message to UI and history
  appendMessage('user', userMessage);
  // The Gemini API uses 'user' and 'model' roles for conversation history.
  conversationHistory.push({ role: 'user', content: userMessage });
  input.value = '';

  // Create a placeholder for the bot's response and get a reference to it
  const botMessageElement = appendMessage('bot', 'Gemini is thinking...');

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Send the entire conversation history to the backend
      body: JSON.stringify({ messages: conversationHistory }),
    });

    if (!response.ok) {
      // Try to get a more specific error from the backend response body
      let errorMsg = `Failed to get response. Status: ${response.status}`;
      try {
        const errorData = await response.json();
        // Use the error message from the backend if available
        errorMsg = errorData.error || errorMsg;
      } catch (jsonError) {
        // The response was not JSON, so we stick with the status code message.
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    const botResponse = data.result || 'Sorry, no response received.';
    
    // Update the placeholder with the actual response, rendered as HTML
    botMessageElement.innerHTML = markdownToHtml(botResponse);

    // Add bot response to history for the next turn
    conversationHistory.push({ role: 'model', content: botResponse });

  } catch (error) {
    console.error('Error fetching chat response:', error);
    botMessageElement.innerHTML = `<p>Failed to get response from server.</p>`;
  }
});

/**
 * Appends a new message to the chat box.
 * @param {string} sender - The sender of the message ('user' or 'bot').
 * @param {string} text - The message content.
 * @returns {HTMLElement} The created message element.
 */
function appendMessage(sender, text) {
  const msg = document.createElement('div');
  msg.classList.add('message', sender);
  msg.textContent = text;
  chatBox.appendChild(msg);
  // Scroll to the bottom of the chat box to show the latest message
  chatBox.scrollTop = chatBox.scrollHeight;
  // Return the element so it can be updated later (for the "thinking" message)
  return msg;
}
