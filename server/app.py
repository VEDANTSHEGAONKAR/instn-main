from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import os
import google.generativeai as genai
from dotenv import load_dotenv
import json
import traceback
import requests
import random

load_dotenv()

# Unsplash API configuration
# Using the Unsplash demo key for both development and production
UNSPLASH_DEMO_KEY = "ab3411e4ac868c2646c0ed488dfd919ef612b04c264f3374c97fff98ed253dc9"

# We'll use a text description of the CSS rules instead of actual CSS code to avoid Python parsing issues

app = Flask(__name__)
# Configure CORS to allow requests from your React app
allowed_origins = os.getenv('ALLOWED_ORIGINS', '*')  # Default to all origins if not specified
origins_list = [origin.strip() for origin in allowed_origins.split(',')]

CORS(app, resources={
    r"/api/*": {
        "origins": origins_list,
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Type"],
        "supports_credentials": True
    }
})

# Initialize Gemini client with error handling
try:
    api_key = os.getenv('GOOGLE_API_KEY')
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not found in environment variables")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.0-flash')
except Exception as e:
    print(f"Error initializing Gemini client: {str(e)}")
    traceback.print_exc()

def get_unsplash_image(query, count=1):
    """
    Fetch images from Unsplash API based on a search query
    """
    try:
        # Clean up the query to make it more search-friendly
        clean_query = query.strip().lower()

        # If the query is a phrase, try to extract the most meaningful parts
        if len(clean_query.split()) > 2:
            # Remove common words that don't add much to image search
            stop_words = ['the', 'and', 'or', 'a', 'an', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'website', 'page']
            query_words = [word for word in clean_query.split() if word not in stop_words]
            if query_words:
                clean_query = ' '.join(query_words[:3])  # Use up to 3 most relevant words

        print(f"Searching Unsplash for: '{clean_query}'")

        url = "https://api.unsplash.com/search/photos"
        headers = {
            "Authorization": f"Client-ID {UNSPLASH_DEMO_KEY}"
        }
        params = {
            "query": clean_query,
            "per_page": max(count * 3, 10),  # Request more images to have better selection
            "orientation": "landscape",
            "content_filter": "high"
        }

        response = requests.get(url, headers=headers, params=params)
        data = response.json()

        if response.status_code == 200 and data.get('results'):
            # If we got results, select the most relevant ones
            results = data['results']

            # Sort by relevance (Unsplash already does this, but we can prioritize certain attributes)
            # For example, prioritize images with descriptions that match our query
            if len(results) > count:
                # If we have more results than needed, try to select the best ones
                # This is a simple heuristic - we could make this more sophisticated
                selected_results = []

                # First, try to find images with matching descriptions
                for img in results:
                    alt_desc = img.get('alt_description', '') or ''
                    alt_desc = alt_desc.lower()

                    desc = img.get('description', '') or ''
                    desc = desc.lower()

                    if clean_query in alt_desc or clean_query in desc:
                        selected_results.append(img)
                        if len(selected_results) >= count:
                            break

                # If we still need more images, add from the remaining results
                if len(selected_results) < count:
                    remaining = [img for img in results if img not in selected_results]
                    selected_results.extend(remaining[:count - len(selected_results)])

                results = selected_results[:count]
            else:
                results = results[:count]

            images = []
            for img in results:
                # Use smaller image sizes to prevent oversized images
                images.append({
                    "url": img['urls']['small'],  # Use small size by default (max 400px wide)
                    "regular_url": img['urls']['regular'],  # Keep regular size as an option
                    "thumb_url": img['urls']['thumb'],  # Thumbnail size (max 200px wide)
                    "alt": img.get('alt_description', clean_query) or clean_query,
                    "credit": f"Photo by {img['user']['name']} on Unsplash",
                    "download_url": img['links']['download'],
                    "topic": clean_query
                })
            return images
        else:
            print(f"Error fetching Unsplash images: {data}")
            return None
    except Exception as e:
        print(f"Error in get_unsplash_image: {str(e)}")
        traceback.print_exc()
        return None

def stream_response(response):
    try:
        for chunk in response:
            if hasattr(chunk, 'text'):
                yield f"data: {json.dumps({'text': chunk.text})}\n\n"
    except Exception as e:
        print(f"Error in stream_response: {str(e)}")
        traceback.print_exc()
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

@app.route('/api/generate-website', methods=['POST'])
def generate_website():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No JSON data received'}), 400

        description = data.get('description')
        if not description:
            return jsonify({'error': 'No description provided'}), 400

        print(f"Received description: {description}")  # Debug log

        # Check if this is a request for a game, simulation, or interactive application rather than a website
        application_keywords = [
            # Games
            'game', 'snake game', 'tetris', 'puzzle game', 'chess', 'tic tac toe', 'memory game', 'pong',
            # Physics simulations
            'simulation', 'physics simulation', 'solar system', 'planetary model', 'physics model',
            'particle simulation', 'gravity simulation', 'pendulum simulation', 'wave simulation',
            # Interactive models
            'interactive model', '3d model', 'interactive visualization', 'interactive demo',
            # Other interactive applications
            'calculator', 'drawing app', 'paint app', 'clock', 'timer', 'stopwatch', 'todo app',
            'weather app', 'music player', 'drum machine', 'synthesizer', 'piano'
        ]

        # Action words that indicate the user wants something interactive
        action_words = ['create', 'make', 'build', 'develop', 'simulate', 'model', 'interactive']

        description_lower = description.lower()

        # Check if the description contains any of the application keywords
        contains_app_keyword = any(keyword in description_lower for keyword in application_keywords)

        # Check if the description contains action words followed by relevant terms
        contains_action_phrase = False
        for action in action_words:
            if action in description_lower:
                # Look for phrases like "create a solar system" or "build a physics model"
                action_index = description_lower.find(action)
                after_action = description_lower[action_index + len(action):]
                if any(keyword in after_action for keyword in ['simulation', 'model', 'system', 'visualization', 'interactive']):
                    contains_action_phrase = True
                    break

        # If the description explicitly asks for an interactive application and doesn't mention 'website'
        if (contains_app_keyword or contains_action_phrase) and 'website' not in description_lower:
            print(f"Detected interactive application request: {description}")
            return generate_application(description)


        # Use Gemini to extract relevant image topics from the description
        topic_prompt = f"""
        Based on this website description: "{description}"

        Extract 3-5 specific keywords that would make good search terms for relevant images.
        Focus on concrete objects, scenes, or themes that would be visually represented on the website.

        Return only a comma-separated list of single words or short phrases, nothing else.
        Example: "mountains, hiking, adventure gear, camping, nature"
        """

        try:
            topic_response = model.generate_content(
                topic_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.2,  # Low temperature for more deterministic results
                    max_output_tokens=100,
                )
            )

            # Parse the response to get image topics
            if hasattr(topic_response, 'text'):
                image_topics_text = topic_response.text.strip()
                image_topics = [topic.strip() for topic in image_topics_text.split(',') if topic.strip()]
                print(f"Generated image topics: {image_topics}")
            else:
                # Fallback to basic keyword extraction
                image_topics = []
                keywords = description.split()
                potential_topics = [word for word in keywords if len(word) > 4]  # Simple heuristic for meaningful words

                # Select up to 3 random topics if we have enough
                if len(potential_topics) > 3:
                    image_topics = random.sample(potential_topics, 3)
                else:
                    image_topics = potential_topics
        except Exception as e:
            print(f"Error generating image topics: {str(e)}")
            # Fallback to basic extraction
            image_topics = []
            keywords = description.split()
            potential_topics = [word for word in keywords if len(word) > 4]
            if len(potential_topics) > 3:
                image_topics = random.sample(potential_topics, 3)
            else:
                image_topics = potential_topics

        # Add some general topics based on common website needs if we don't have enough
        if not image_topics:
            general_topics = ['business', 'nature', 'technology', 'people', 'food']
            image_topics = random.sample(general_topics, 3)
        elif len(image_topics) < 3:
            general_topics = ['business', 'nature', 'technology', 'people', 'food']
            additional_topics = random.sample(general_topics, 3 - len(image_topics))
            image_topics.extend(additional_topics)

        # Fetch images for each topic
        image_data = []
        for topic in image_topics:
            images = get_unsplash_image(topic, 1)
            if images:
                image_data.append({
                    'topic': topic,
                    'image': images[0]
                })

        # Create image references for the prompt
        image_references = ""
        if image_data:
            image_references = "\nUse the following Unsplash images in your website, matching each image to the most appropriate context:\n"
            for i, data in enumerate(image_data):
                topic = data['image'].get('topic', 'general')
                image_references += f"Image {i+1} (Topic: {topic}):\n"
                image_references += f"- Small (recommended): {data['image']['url']}\n"
                image_references += f"- Thumbnail: {data['image']['thumb_url']}\n"
                image_references += f"- Regular: {data['image']['regular_url']}\n"
                image_references += f"Description: {data['image']['alt']}\n"
                image_references += f"Credit: {data['image']['credit']}\n\n"

        # Use the responsive_image_css defined at the top of the file

        # Prompt engineering for website generation
        prompt = f"""
        Create a website based on this description: {description}

        {image_references}

        IMPORTANT INSTRUCTIONS FOR IMAGES:
        1. Instead of using placeholder images or lorem ipsum, use the provided Unsplash images.
        2. Match each image to the most appropriate section of the website based on its topic and description.
        3. Make sure to include the photographer credit in the website footer or directly below/near each image.
        4. Use the images in a way that enhances the website's content and purpose.
        5. ALWAYS include CSS for ALL images to ensure they are responsive and properly sized with these rules:
           - Set max-width: 100% and height: auto on all images
           - Add display: block and appropriate margins
           - Limit content images to max-width: 600px
           - Add a photo-credit class with smaller font size (12px) and italic style
        6. Keep images reasonably sized - use the small or thumbnail versions when appropriate.
        7. If you need additional images beyond what's provided, use descriptive alt text instead of placeholder URLs.

        Return only the HTML, CSS, and JavaScript code without any explanations.
        Format the response exactly as:
        ```html
        [HTML code here]
        ```
        ```css
        [CSS code here]
        ```
        ```javascript
        [JavaScript code here]
        ```
        Make sure the code is complete, functional, and properly handles user interactions.
        The JavaScript code should be properly scoped and not interfere with the parent window.
        """

        print("Sending request to Gemini...")  # Debug log

        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                top_p=0.8,
                top_k=40,
                max_output_tokens=2048,
            ),
            stream=True
        )

        print("Received response from Gemini")  # Debug log

        return Response(
            stream_response(response),
            mimetype='text/event-stream'
        )

    except Exception as e:
        print(f"Error in generate_website: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/modify-website', methods=['POST'])
def modify_website():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No JSON data received'}), 400

        modification = data.get('modificationDescription')
        current_html = data.get('currentHtml')
        current_css = data.get('currentCss')
        current_js = data.get('currentJs', '')  # Optional JavaScript code

        if not all([modification, current_html, current_css]):
            return jsonify({'error': 'Missing required fields'}), 400

        # Use Gemini to extract relevant image topics from the modification request
        topic_prompt = f"""
        Based on this website modification request: "{modification}"

        Extract 2-3 specific keywords that would make good search terms for relevant images.
        Focus on concrete objects, scenes, or themes that would be visually represented on the website.

        Return only a comma-separated list of single words or short phrases, nothing else.
        Example: "mountains, hiking, adventure gear"
        """

        try:
            topic_response = model.generate_content(
                topic_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.2,  # Low temperature for more deterministic results
                    max_output_tokens=100,
                )
            )

            # Parse the response to get image topics
            if hasattr(topic_response, 'text'):
                image_topics_text = topic_response.text.strip()
                image_topics = [topic.strip() for topic in image_topics_text.split(',') if topic.strip()]
                print(f"Generated image topics for modification: {image_topics}")
            else:
                # Fallback to basic keyword extraction
                image_topics = []
                keywords = modification.split()
                potential_topics = [word for word in keywords if len(word) > 4]  # Simple heuristic for meaningful words

                # Select up to 2 random topics if we have enough
                if len(potential_topics) > 2:
                    image_topics = random.sample(potential_topics, 2)
                else:
                    image_topics = potential_topics
        except Exception as e:
            print(f"Error generating image topics for modification: {str(e)}")
            # Fallback to basic extraction
            image_topics = []
            keywords = modification.split()
            potential_topics = [word for word in keywords if len(word) > 4]
            if len(potential_topics) > 2:
                image_topics = random.sample(potential_topics, 2)
            else:
                image_topics = potential_topics

        # Fetch images for each topic
        image_data = []
        for topic in image_topics:
            images = get_unsplash_image(topic, 1)
            if images:
                image_data.append({
                    'topic': topic,
                    'image': images[0]
                })

        # Create image references for the prompt
        image_references = ""
        if image_data:
            image_references = "\nYou can use these additional Unsplash images in your modifications, matching each image to the most appropriate context:\n"
            for i, data in enumerate(image_data):
                topic = data['image'].get('topic', 'general')
                image_references += f"Image {i+1} (Topic: {topic}):\n"
                image_references += f"- Small (recommended): {data['image']['url']}\n"
                image_references += f"- Thumbnail: {data['image']['thumb_url']}\n"
                image_references += f"- Regular: {data['image']['regular_url']}\n"
                image_references += f"Description: {data['image']['alt']}\n"
                image_references += f"Credit: {data['image']['credit']}\n\n"

        # Reuse the responsive image CSS from above
        prompt = f"""
        Modify this website according to this description: {modification}

        Current HTML:
        ```html
        {current_html}
        ```

        Current CSS:
        ```css
        {current_css}
        ```

        Current JavaScript:
        ```javascript
        {current_js}
        ```

        {image_references}

        IMPORTANT INSTRUCTIONS FOR IMAGES:
        1. Preserve all existing Unsplash image credits and attributions in the current website
        2. If adding new images, use the provided Unsplash images with proper attribution
        3. Match each new image to the most appropriate section based on its topic and description
        4. Include the photographer credit directly below/near each image or in the footer
        5. Only replace existing images if specifically requested in the modification
        6. Use the images in a way that enhances the website's content and purpose
        7. ALWAYS include CSS for ALL images to ensure they are responsive and properly sized with these rules:
           - Set max-width: 100% and height: auto on all images
           - Add display: block and appropriate margins
           - Limit content images to max-width: 600px
           - Add a photo-credit class with smaller font size (12px) and italic style
        8. Keep images reasonably sized - use the small or thumbnail versions when appropriate
        9. If you need additional images beyond what's provided, use descriptive alt text instead of placeholder URLs

        Return only the modified HTML, CSS, and JavaScript code without any explanations.
        Format the response exactly as:
        ```html
        [Modified HTML code here]
        ```
        ```css
        [Modified CSS code here]
        ```
        ```javascript
        [Modified JavaScript code here]
        ```
        Make sure the code is complete, functional, and properly handles user interactions.
        The JavaScript code should be properly scoped and not interfere with the parent window.
        """

        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                top_p=0.8,
                top_k=40,
                max_output_tokens=2048,
            ),
            stream=True
        )

        return Response(
            stream_response(response),
            mimetype='text/event-stream'
        )

    except Exception as e:
        print(f"Error in modify_website: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/unsplash-images', methods=['GET'])
def get_unsplash_images():
    try:
        query = request.args.get('query')
        count = request.args.get('count', default=1, type=int)

        if not query:
            return jsonify({'error': 'No query provided'}), 400

        images = get_unsplash_image(query, count)

        if images:
            return jsonify({'images': images})
        else:
            return jsonify({'error': 'Failed to fetch images'}), 500

    except Exception as e:
        print(f"Error in get_unsplash_images: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/generate-application', methods=['POST'])
def generate_application(description=None):
    try:
        # If description is not provided as a parameter, get it from the request
        if description is None:
            data = request.json
            if not data:
                return jsonify({'error': 'No JSON data received'}), 400

            description = data.get('description')
            if not description:
                return jsonify({'error': 'No description provided'}), 400

        print(f"Generating application: {description}")  # Debug log

        # Determine the type of application being requested
        description_lower = description.lower()
        is_game = any(keyword in description_lower for keyword in ['game', 'tetris', 'chess', 'tic tac toe', 'pong'])
        is_simulation = any(keyword in description_lower for keyword in ['simulation', 'solar system', 'physics', 'model'])

        # Customize the prompt based on the type of application
        specific_instructions = ""
        if is_game:
            specific_instructions = """
            For this game:
            - Include proper game mechanics, scoring, and win/lose conditions
            - Add keyboard/mouse controls that are intuitive and responsive
            - Include game state management (start, pause, restart, game over)
            - Add sound effects if appropriate (with mute option)
            """
        elif is_simulation:
            specific_instructions = """
            For this simulation:
            - Create a visually accurate and scientifically correct simulation
            - Use appropriate physics formulas and calculations
            - Add interactive controls to adjust parameters (speed, gravity, etc.)
            - Include animations that accurately represent the physical phenomena
            - For solar system or planetary models, use correct relative sizes and orbital mechanics
            - Add informational tooltips or labels to explain what's happening
            """
        else:  # General interactive application
            specific_instructions = """
            For this interactive application:
            - Create a clean, intuitive user interface
            - Ensure all interactive elements work correctly
            - Add appropriate feedback for user actions
            - Include error handling for invalid inputs
            - Make sure the application state is maintained correctly
            """

        # Prompt engineering for application/game/simulation generation
        prompt = f"""
        Create a standalone, functional {description} using HTML, CSS, and JavaScript.

        IMPORTANT INSTRUCTIONS:
        1. Focus on creating a WORKING, INTERACTIVE application, not just a website about it.
        2. The JavaScript should contain all the application logic and functionality.
        3. Use canvas for graphics if appropriate for the application.
        4. Include clear instructions for the user on how to use the application.
        5. Make sure the code is complete, functional, and properly handles user interactions.
        6. The application should work entirely in the browser without requiring any server-side code.
        7. The JavaScript code should be properly scoped and not interfere with the parent window.
        8. Do not include any placeholder functionality - everything should actually work.
        9. Use requestAnimationFrame for smooth animations where appropriate.
        10. Ensure the application is responsive and works on different screen sizes.

        {specific_instructions}

        Return only the HTML, CSS, and JavaScript code without any explanations.
        Format the response exactly as:
        ```html
        [HTML code here]
        ```
        ```css
        [CSS code here]
        ```
        ```javascript
        [JavaScript code here]
        ```
        """

        print("Sending application generation request to Gemini...")  # Debug log

        # Set a higher token limit for simulations which might need more complex code
        max_tokens = 6144 if is_simulation else 4096

        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                top_p=0.8,
                top_k=40,
                max_output_tokens=max_tokens,  # Increased token limit for more complex applications
            ),
            stream=True
        )

        print("Received application response from Gemini")  # Debug log

        return Response(
            stream_response(response),
            mimetype='text/event-stream'
        )

    except Exception as e:
        print(f"Error in generate_application: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

# For local development
if __name__ == '__main__':
    port = int(os.getenv('PORT', 3001))
    app.run(host='0.0.0.0', port=port, debug=os.getenv('FLASK_DEBUG', 'True').lower() == 'true')