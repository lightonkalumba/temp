from flask import Flask, request, jsonify
from flask_cors import CORS
import anthropic
import json
import re

app = Flask(__name__)
CORS(app)

client = anthropic.Anthropic(
    api_key="sk-ant-api03-V97JYiAXfv4Go5Ek9M4cBsrP0u2Ul51y4tAA"
)

@app.route("/analyze", methods=["POST"])
def analyze_email():
    data = request.json
    email_text = data.get("text", "")

    prompt = f"""
You are a cybersecurity analyst specializing in social engineering attacks.

Analyze the email below and return ONLY valid JSON with these exact fields:
- scam_probability: integer 0-100
- emotional_triggers: array of strings (fear, urgency, authority, reward, guilt, scarcity, curiosity)
- mitre_attack: array of strings with MITRE ATT&CK technique IDs (e.g., "T1566.002 - Phishing: Spearphishing Link")
- recommendation: one short actionable sentence

Return ONLY the JSON object, no markdown formatting, no explanation.

Email:
\"\"\"{email_text}\"\"\"
"""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=800,
            temperature=0,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        response_text = message.content[0].text.strip()
        # Remove markdown code blocks if present
        response_text = re.sub(r'^```json\s*|\s*```$', '', response_text, flags=re.MULTILINE)
        result = json.loads(response_text)
        return jsonify(result)
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            "error": f"Processing error: {str(e)}",
            "raw": message.content[0].text if 'message' in locals() else "No response"
        }), 500


if __name__ == "__main__":
    print("Starting Flask server on http://localhost:5000")
    app.run(port=5000, debug=True)