import os
import html
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from google.cloud import translate_v2 as translate
from google.cloud import speech
from google.cloud import texttospeech

#os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = 'keys.json'

app = Flask(__name__)
CORS(app, resources={r"/*": {
    "origins": "*", 
    "methods": ["GET", "POST", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"]
}})

# Initialize Clients
translate_client = translate.Client()
speech_client = speech.SpeechClient()
tts_client = texttospeech.TextToSpeechClient()

@app.route('/translate', methods=['POST', 'OPTIONS'])
def handle_translate():
    if request.method == 'OPTIONS':
        return '', 200
    data = request.json
    text = data.get('text')
    target = data.get('target')
    
    # 1. Translate Text
    result = translate_client.translate(text, target_language=target)
    translated_text = html.unescape(result['translatedText'])
    
    response = {"translatedText": translated_text}

    # 2. If Voice Out is requested, generate audio
    if data.get('voiceOut'):
        synthesis_input = texttospeech.SynthesisInput(text=translated_text)
        
        voice_name = data.get('voice')
        speed = data.get('speed', 1.0)

        voice_selection_params = {
            "language_code": target
        }
        
        if voice_name and voice_name != 'default':
            voice_selection_params["name"] = voice_name
        else:
            voice_selection_params["ssml_gender"] = texttospeech.SsmlVoiceGender.NEUTRAL

        voice = texttospeech.VoiceSelectionParams(**voice_selection_params)
        
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=float(speed)
        )
        
        tts_response = tts_client.synthesize_speech(
            input=synthesis_input, voice=voice, audio_config=audio_config
        )
        
        # Save temp audio file
        audio_path = "output.mp3"
        with open(audio_path, "wb") as out:
            out.write(tts_response.audio_content)
        response["audioUrl"] = "/get-audio"

    return jsonify(response)

@app.route('/get-audio')
def get_audio():
    return send_file("output.mp3", mimetype="audio/mp3")

@app.route('/transcribe', methods=['POST', 'OPTIONS'])
def handle_transcribe():
    if request.method == 'OPTIONS':
        return '', 200
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file"}), 400
    
    audio_file = request.files['audio'].read()
    audio = speech.RecognitionAudio(content=audio_file)
    
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
        sample_rate_hertz=48000,
        language_code=request.form.get('lang', 'it'),
    )

    response = speech_client.recognize(config=config, audio=audio)
    
    transcript = ""
    for result in response.results:
        transcript += result.alternatives[0].transcript

    return jsonify({"text": transcript})

if __name__ == '__main__':
    # Cloud Run dynamically assigns a port, default to 5000 for local dev
    port = int(os.environ.get("PORT", 5000))
    # '0.0.0.0' tells Flask to listen to all public requests, not just localhost
    # debug=False is safer for production
    app.run(host='0.0.0.0', port=port, debug=False)