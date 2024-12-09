from interpreter import Interpreter
interpreter = Interpreter()

interpreter.tts = "elevenlabs"
interpreter.stt = "deepgram"

interpreter.model = "claude-3-5-sonnet-20240620"
interpreter.provider = "anthropic"
interpreter.auto_run = True

interpreter.instructions = "Be very concise in your responses."
