# InstantCraft

A web application that generates websites and interactive applications using AI.

## Local Development

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up the Python environment:
   ```
   cd server
   python -m venv venv
   venv\Scripts\activate  # On Windows
   pip install -r requirements.txt
   ```
4. Create `.env` files:
   - In the root directory, create a `.env` file with:
     ```
     REACT_APP_BACKEND_URL=http://localhost:3001
     ```
   - In the server directory, create a `.env` file with:
     ```
     GOOGLE_API_KEY=your_google_gemini_api_key_here
     ALLOWED_ORIGINS=http://localhost:3000
     FLASK_DEBUG=True
     ```
   - Note: The application uses the Unsplash demo key for image fetching
5. Start the development server:
   ```
   npm run dev
   ```

## Deployment to Vercel

1. Create a new project on Vercel
2. Link your GitHub repository
3. Set the following environment variables in Vercel:
   - `GOOGLE_API_KEY`: Your Google Gemini API key
   - `ALLOWED_ORIGINS`: Comma-separated list of allowed origins (e.g., `https://your-app.vercel.app,https://your-custom-domain.com`)
   - `FLASK_DEBUG`: Set to `False` for production
   - Note: The application uses the Unsplash demo key for image fetching
4. Deploy the project

## Project Structure

- `/server`: Flask backend with AI integration
- `/src`: React frontend
- `/public`: Static assets

## Features

- Generate complete websites from text descriptions
- Create interactive applications and games
- Modify existing websites with natural language instructions
- Download generated code as a ZIP file
- Light and dark mode support
- Mobile-responsive design
