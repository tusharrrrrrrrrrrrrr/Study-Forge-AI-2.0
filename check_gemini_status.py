import os
# pyrefly: ignore [missing-import]
import google.generativeai as genai
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# Load the environment variables from the root folder
load_dotenv(".env")

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("Error: GEMINI_API_KEY not found in .env")
    exit(1)

genai.configure(api_key=api_key)

print("Checking Gemini API Status...")
print("Note: Google AI Studio does not provide an endpoint to check exact remaining daily quota.")
print("If this script succeeds, you have available quota. If it fails with 429, you are currently rate-limited.")
print("-" * 50)

try:
    model = genai.GenerativeModel("gemini-3.6-flash")
    response = model.generate_content("Hello! This is a simple ping to check if my API key has available quota.")
    print("SUCCESS! Your API key is active and you have available quota.")
    print(f"Response from Gemini: {response.text.strip()}")
    print("-" * 50)
    print("Tip: Since you hit a limit after only 3-4 uses, you likely hit the 'Tokens Per Minute' (TPM) limit,")
    print("not the daily limit. The free tier allows 1,500 requests per day, but only 1 million tokens per minute.")
    print("Uploading a large PDF and generating a Mock Exam sends the whole PDF text as context, consuming tokens fast.")
except Exception as e:
    print("FAILED! You are currently rate-limited or there is an API error.")
    print(f"Error Details: {e}")
