import os, requests
from dotenv import load_dotenv
load_dotenv('backend/.env')
url = 'https://api.groq.com/openai/v1/models'
headers = {'Authorization': f'Bearer {os.getenv("GROQ_API_KEY")}'}
resp = requests.get(url, headers=headers).json()
for m in resp.get('data', []):
    print(m.get('id'))
