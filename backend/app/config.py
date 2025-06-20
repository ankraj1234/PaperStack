from dotenv import load_dotenv
from pathlib import Path
import os

env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# print("Loaded key from:", env_path)
# print("Key:", repr(GROQ_API_KEY))

if not GROQ_API_KEY:
    raise EnvironmentError("GROQ_API_KEY not found in .env file")

os.environ["GROQ_API_KEY"] = GROQ_API_KEY
