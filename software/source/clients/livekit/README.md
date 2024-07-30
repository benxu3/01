# Expo Client

**_WORK IN PROGRESS_**

This repository contains the source code for a basic 01 Expo app compatible on both iOS and Android. Work in progress, we will continue to improve this application to get it working properly.

Feel free to improve this and make a pull request!

Follow the instructions below to install the development version on your mobile device.

## Setup Instructions

Follow the **[software setup steps](https://github.com/OpenInterpreter/01?tab=readme-ov-file#software)** in the main repo's README first before you read this

### Client Setup

Install dependencies
```shell
cd software/source/clients/livekit/interpreter-app
npm install
```

### Livekit Server Setup

Set the following environment variables:
```shell
export LIVEKIT_URL=<your LiveKit server URL>
export LIVEKIT_API_KEY=<your API Key>
export LIVEKIT_API_SECRET=<your API Secret>
export ELEVEN_API_KEY=<your ElevenLabs API key>
export DEEPGRAM_API_KEY=<your Deepgram API key>
export OPENAI_API_KEY=<your OpenAI API key>
```

Install the necessary Python packages in the `software` directory,:
```shell
poetry add \
livekit \
livekit-agents \
livekit-plugins-deepgram \
livekit-plugins-openai \
livekit-plugins-elevenlabs \
livekit-plugins-silero \
livekit-api \
python-dotenv
```

to install livekit server
```shell
brew install livekit
```

## Run the App

Run the Livekit local development server setup
```shell
cd software
poetry run 01 --livekit
```

Start the Expo development server
```shell
cd software/source/clients/livekit/interpreter-app
npx expo start
```

Open the app on your device, press _Scan QR code_ to scan the QR code produced by the `poetry run 01 --livekit` command.



## Development Scripts
```shell
npx expo install expo-dev-client
brew install livekit-cli
npx expo prebuild --clean           # update changes
```
