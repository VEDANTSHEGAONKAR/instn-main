// In production with Vercel, we use relative paths
// In development, we use the full URL from .env
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
console.log('Using backend URL:', BACKEND_URL);

// Helper function to process streaming response for both website and application generation
async function processStreamingResponse(response, onUpdate, initialState = { html: '', css: '', js: '' }) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let accumulatedText = '';
  let lastUpdate = initialState;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        const { text } = data;

        // Accumulate the text
        accumulatedText += text;

        // Extract HTML, CSS, and JavaScript from the accumulated response
        const htmlMatch = accumulatedText.match(/```html\n([\s\S]*?)\n```/);
        const cssMatch = accumulatedText.match(/```css\n([\s\S]*?)\n```/);
        const jsMatch = accumulatedText.match(/```javascript\n([\s\S]*?)\n```/);

        // Process partial matches to show incremental updates
        let partialHtml = lastUpdate.html;
        let partialCss = lastUpdate.css;
        let partialJs = lastUpdate.js;

        // If we have a complete match, use it
        if (htmlMatch) {
          partialHtml = htmlMatch[1].trim();
        }
        // Otherwise look for partial HTML content (still being generated)
        else if (accumulatedText.includes('```html\n')) {
          const partialHtmlMatch = accumulatedText.match(/```html\n([\s\S]*)$/);
          if (partialHtmlMatch && !partialHtmlMatch[1].includes('```css')) {
            partialHtml = partialHtmlMatch[1].trim();
          }
        }

        // Same for CSS
        if (cssMatch) {
          partialCss = cssMatch[1].trim();
        }
        else if (accumulatedText.includes('```css\n')) {
          const partialCssMatch = accumulatedText.match(/```css\n([\s\S]*)$/);
          if (partialCssMatch && !partialCssMatch[1].includes('```javascript')) {
            partialCss = partialCssMatch[1].trim();
          }
        }

        // And JavaScript
        if (jsMatch) {
          partialJs = jsMatch[1].trim();
        }
        else if (accumulatedText.includes('```javascript\n')) {
          const partialJsMatch = accumulatedText.match(/```javascript\n([\s\S]*)$/);
          if (partialJsMatch) {
            partialJs = partialJsMatch[1].trim();
          }
        }

        const update = {
          html: partialHtml,
          css: partialCss,
          js: partialJs
        };

        // Only update if there are actual changes
        if (update.html !== lastUpdate.html ||
            update.css !== lastUpdate.css ||
            update.js !== lastUpdate.js) {
          console.log('New update:', update);
          lastUpdate = { ...update };
          onUpdate(update);
        }
      }
    }
  }

  // Final update with complete code
  const finalHtmlMatch = accumulatedText.match(/```html\n([\s\S]*?)\n```/);
  const finalCssMatch = accumulatedText.match(/```css\n([\s\S]*?)\n```/);
  const finalJsMatch = accumulatedText.match(/```javascript\n([\s\S]*?)\n```/);

  if (finalHtmlMatch || finalCssMatch || finalJsMatch) {
    const finalUpdate = {
      html: finalHtmlMatch ? finalHtmlMatch[1].trim() : lastUpdate.html,
      css: finalCssMatch ? finalCssMatch[1].trim() : lastUpdate.css,
      js: finalJsMatch ? finalJsMatch[1].trim() : lastUpdate.js
    };
    console.log('Final update:', finalUpdate);
    onUpdate(finalUpdate);
  }

  return lastUpdate;
}

export async function generateWebsite(description, onUpdate) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/generate-website`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ description }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    await processStreamingResponse(response, onUpdate);
  } catch (error) {
    console.error('Error calling backend API:', error);
    throw new Error('Failed to generate website: ' + error.message);
  }
}

export async function generateApplication(description, onUpdate) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/generate-application`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ description }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    await processStreamingResponse(response, onUpdate);
  } catch (error) {
    console.error('Error calling backend API:', error);
    throw new Error('Failed to generate application: ' + error.message);
  }
}

export async function modifyWebsite(modificationDescription, currentHtml, currentCss, currentJs, onUpdate) {
  try {
    // Validate inputs before sending
    if (!modificationDescription?.trim()) {
      throw new Error('Modification description is required');
    }

    if (!currentHtml?.trim()) {
      throw new Error('Current HTML code is required');
    }

    const payload = {
      modificationDescription: modificationDescription.trim(),
      currentHtml: currentHtml.trim(),
      currentCss: currentCss?.trim() || '',
      currentJs: currentJs?.trim() || ''
    };

    console.log('Sending modification request to:', `${BACKEND_URL}/api/modify-website`);
    console.log('Request payload:', payload);

    const response = await fetch(`${BACKEND_URL}/api/modify-website`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(payload),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response body:', errorText);

      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || `Server error: ${response.status}`);
      } catch (e) {
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
    }

    // Use the initial state with the current content
    const initialState = { html: currentHtml, css: currentCss, js: currentJs };
    await processStreamingResponse(response, onUpdate, initialState);
  } catch (error) {
    console.error('Error in modifyWebsite:', error);
    throw error;
  }
}