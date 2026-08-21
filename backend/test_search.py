import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

try:
    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents="What is the stock price of google today?",
        config=types.GenerateContentConfig(
            tools=[{"google_search": {}}]
        )
    )
    print("SUCCESS with google_search dict")
    print(response.text)
except Exception as e:
    print(f"FAILED with google_search dict: {e}")

try:
    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents="What is the stock price of apple today?",
        config=types.GenerateContentConfig(
            tools=[types.Tool(google_search=types.GoogleSearch())]
        )
    )
    print("SUCCESS with types.Tool")
    print(response.text)
except Exception as e:
    print(f"FAILED with types.Tool: {e}")
